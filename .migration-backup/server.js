const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const { computeTicketCheckoutAmounts } = require('./lib/ticketCheckoutPricing.cjs');

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const { createClient } = require('@supabase/supabase-js');
const supabaseAdmin =
  process.env.REACT_APP_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.REACT_APP_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

/** Shared account prefix after pk_/sk_ (Stripe uses same start for paired keys). */
function stripeKeyRollFragment(key) {
  if (!key || typeof key !== 'string') return null;
  const prefixes = ['pk_test_', 'sk_test_', 'pk_live_', 'sk_live_'];
  for (const p of prefixes) {
    if (key.startsWith(p)) return key.slice(p.length, p.length + 16);
  }
  return null;
}

if (stripe) {
  const pkRoll = stripeKeyRollFragment(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
  const skRoll = stripeKeyRollFragment(process.env.STRIPE_SECRET_KEY);
  if (pkRoll && skRoll && pkRoll !== skRoll) {
    console.warn(
      '⚠️ Stripe: REACT_APP_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY look like different accounts — payments will not show in the Dashboard you expect.'
    );
  } else if (skRoll) {
    console.log(
      `💳 Stripe: secret key account prefix \`${skRoll.slice(0, 14)}…\` — open Payments in the Dashboard for this same test/Sandbox account.`
    );
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.log(
      '💳 Stripe webhook: STRIPE_WEBHOOK_SECRET not set — events are accepted without signature verify (dev only). For production set whsec_ from Stripe CLI or Dashboard.'
    );
  }
  if (!supabaseAdmin) {
    console.warn(
      '⚠️ SUPABASE_SERVICE_ROLE_KEY not set — checkout works but webhooks cannot set registrations.payment_status in Supabase.'
    );
  }
}

const app = express();
/* express-rate-limit validates X-Forwarded-For; CRA/webpack-dev-server proxy sends it. Trust one proxy hop in dev. */
{
  const raw = process.env.TRUST_PROXY_HOPS;
  if (raw === '0' || raw === 'false') {
    app.set('trust proxy', false);
  } else if (raw != null && String(raw).trim() !== '') {
    app.set('trust proxy', Number(raw));
  } else {
    app.set('trust proxy', 1);
  }
}
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Import routes
const dataRoutes = require('./routes/data');
const analyticsRoutes = require('./routes/analytics');

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

const corsOriginOption = (() => {
  const raw = process.env.CORS_ORIGIN;
  if (raw && String(raw).trim()) {
    const parts = String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 1) return parts[0];
    return parts;
  }
  return ['http://localhost:3000', 'http://127.0.0.1:3000'];
})();

app.use(
  cors({
    origin: corsOriginOption,
    credentials: true,
  })
);

// Rate limiting (skip OPTIONS so CORS preflight is not throttled)
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.method === 'OPTIONS',
});
app.use(limiter);

// Stripe webhook needs raw body for signature verification — must come before express.json()
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (endpointSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const meta = session.metadata || {};
    const { supabaseEventId, supabaseUserId } = meta;
    const checkoutKind = meta.checkoutKind || 'ticket';
    console.log('💳 Stripe checkout completed:', {
      supabaseEventId,
      supabaseUserId,
      checkoutKind,
      amount: session.amount_total,
    });

    if (!supabaseAdmin || !supabaseEventId || !supabaseUserId) {
      /* handled below */
    } else if (checkoutKind === 'fundraiser') {
      const listCents = parseInt(String(meta.list_price_cents || '0'), 10);
      if (listCents >= 50) {
        const { error: fcErr } = await supabaseAdmin.from('fundraiser_contributions').insert({
          event_id: supabaseEventId,
          user_id: supabaseUserId,
          amount_list_cents: listCents,
          stripe_checkout_session_id: session.id,
        });
        if (fcErr) {
          const dup =
            fcErr.code === '23505' ||
            String(fcErr.message || '').toLowerCase().includes('duplicate');
          if (!dup) console.error('Failed to insert fundraiser_contributions:', fcErr.message);
        } else {
          console.log('✅ Fundraiser donation recorded in Supabase');
        }
      }
    } else {
      const { error } = await supabaseAdmin
        .from('registrations')
        .update({ payment_status: 'paid' })
        .eq('event_id', supabaseEventId)
        .eq('user_id', supabaseUserId);
      if (error) console.error('Failed to update registration payment_status:', error.message);
      else console.log('✅ Registration marked as paid in Supabase');
    }
  }

  if (event.type === 'account.updated' && supabaseAdmin && stripe) {
    const account = event.data.object;
    const ready = Boolean(account.charges_enabled && account.details_submitted);
    const { error } = await supabaseAdmin
      .from('organization_payouts')
      .update({ stripe_onboarding_complete: ready, updated_at: new Date().toISOString() })
      .eq('stripe_account_id', account.id);
    if (error) console.error('account.updated → organization_payouts:', error.message);
    else console.log('💳 Connect account updated:', account.id, 'ready=', ready);
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes (register before static files so /api/* is never ambiguous)
app.use('/api/data', dataRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'The Greek Life App API is running',
    timestamp: new Date().toISOString()
  });
});

/** Where the browser should land after Stripe Checkout / Connect (frontend origin). */
function checkoutRedirectOrigin(req) {
  const trim = (s) =>
    String(s || '')
      .trim()
      .replace(/^\ufeff/, '')
      .replace(/\/$/, '');
  const rawEnv = process.env.CLIENT_APP_ORIGIN || process.env.CORS_ORIGIN;
  if (rawEnv) {
    const first = String(rawEnv).split(',')[0].trim();
    const fromEnv = trim(first);
    if (fromEnv) return fromEnv;
  }
  const hdr = trim(req.headers.origin);
  if (hdr && /localhost:3001\b/.test(hdr)) return 'http://localhost:3000';
  if (hdr) return hdr;
  return 'http://localhost:3000';
}

function assertHttpUrl(label, value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol');
    return u.href.split('#')[0];
  } catch (e) {
    throw new Error(`${label} must be a valid http(s) URL, got: ${String(value)}`);
  }
}

/** Stripe Dashboard → Connect settings for the same mode as STRIPE_SECRET_KEY (test vs live). */
function stripeConnectSettingsDashboardUrl() {
  const sk = process.env.STRIPE_SECRET_KEY || '';
  if (sk.startsWith('sk_test_')) return 'https://dashboard.stripe.com/test/settings/connect';
  return 'https://dashboard.stripe.com/settings/connect';
}

function isStripeConnectPlatformNotActivatedError(err) {
  const msg = String(err?.message || '');
  return (
    /signed up for Connect/i.test(msg) ||
    /You can only create new accounts if you/i.test(msg) ||
    /dashboard\.stripe\.com\/connect/i.test(msg)
  );
}

// Ticket pricing: see lib/ticketCheckoutPricing.cjs (list price to host; buyer pays list + 5% + Stripe est.)

// Stripe Connect: start or refresh Express onboarding (individual-style defaults)
app.post('/api/stripe-connect-onboarding', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured on server' });
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Supabase service role not configured',
      message: 'Add SUPABASE_SERVICE_ROLE_KEY to .env on the server.',
    });
  }

  const { supabaseUserId, userEmail } = req.body || {};
  if (!supabaseUserId || typeof supabaseUserId !== 'string') {
    return res.status(400).json({ error: 'supabaseUserId is required' });
  }

  const origin = checkoutRedirectOrigin(req);
  // CRA serves the SPA at "/" — there is no /settings path. Stripe validates these URLs strictly.
  const returnUrl = assertHttpUrl(
    'return_url',
    `${origin}/?stripe_payout_return=1`
  );
  const refreshUrl = assertHttpUrl(
    'refresh_url',
    `${origin}/?stripe_payout_refresh=1`
  );

  try {
    const { data: row, error: selErr } = await supabaseAdmin
      .from('organization_payouts')
      .select('stripe_account_id')
      .eq('user_id', supabaseUserId)
      .maybeSingle();

    if (selErr) {
      console.error('stripe-connect-onboarding select:', selErr.message);
      return res.status(500).json({ error: selErr.message });
    }

    let accountId = row?.stripe_account_id || null;

    if (!accountId) {
      const trimUrl = (s) => String(s || '').trim().replace(/\/$/, '');
      // Stripe rejects placeholder sites; prefer a real https URL (your Supabase project is fine for dev).
      const businessUrl =
        trimUrl(process.env.STRIPE_CONNECT_BUSINESS_URL) ||
        trimUrl(process.env.REACT_APP_SUPABASE_URL) ||
        'https://stripe.com';

      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: typeof userEmail === 'string' && userEmail.includes('@') ? userEmail : undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '7999',
          url: businessUrl,
        },
      });
      accountId = account.id;

      const { error: upErr } = await supabaseAdmin.from('organization_payouts').upsert(
        {
          user_id: supabaseUserId,
          stripe_account_id: accountId,
          stripe_onboarding_complete: false,
          payout_method: 'bank',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (upErr) {
        console.error('stripe-connect-onboarding upsert:', upErr.message);
        return res.status(500).json({ error: upErr.message });
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error('stripe-connect-onboarding error:', err.message);
    if (isStripeConnectPlatformNotActivatedError(err)) {
      const openStripeConnect = stripeConnectSettingsDashboardUrl();
      return res.status(422).json({
        code: 'STRIPE_CONNECT_PLATFORM_DISABLED',
        error: err.message,
        message:
          'Stripe Connect is not turned on for this Stripe account yet. Open the link below in the same Stripe login you use for your API keys (Test mode if you use test keys), finish Connect setup, then click “Set up automatic payouts” again.',
        openStripeConnect,
      });
    }
    res.status(500).json({ error: err.message });
  }
});

// Stripe Connect Express: one-time link to the connected account dashboard (bank, tax, payouts)
app.post('/api/stripe-connect-login-link', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured on server' });
  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Supabase service role not configured',
      message: 'Add SUPABASE_SERVICE_ROLE_KEY to .env on the server.',
    });
  }

  const { supabaseUserId } = req.body || {};
  if (!supabaseUserId || typeof supabaseUserId !== 'string') {
    return res.status(400).json({ error: 'supabaseUserId is required' });
  }

  try {
    const { data: row, error: selErr } = await supabaseAdmin
      .from('organization_payouts')
      .select('stripe_account_id')
      .eq('user_id', supabaseUserId)
      .maybeSingle();

    if (selErr) {
      console.error('stripe-connect-login-link select:', selErr.message);
      return res.status(500).json({ error: selErr.message });
    }
    if (!row?.stripe_account_id) {
      return res.status(400).json({
        code: 'NO_STRIPE_ACCOUNT',
        error: 'No Stripe account yet',
        message: 'Use “Set up automatic payouts” first, then you can edit payout details in Stripe.',
      });
    }

    const login = await stripe.accounts.createLoginLink(row.stripe_account_id);
    res.json({ url: login.url });
  } catch (err) {
    console.error('stripe-connect-login-link error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stripe Connect: onboarding / payout readiness for an org auth user
app.get('/api/stripe-connect-status', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured on server' });
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase service role not configured' });
  }

  const supabaseUserId = req.query.supabaseUserId;
  if (!supabaseUserId || typeof supabaseUserId !== 'string') {
    return res.status(400).json({ error: 'supabaseUserId query param is required' });
  }

  try {
    const { data: row, error: selErr } = await supabaseAdmin
      .from('organization_payouts')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('user_id', supabaseUserId)
      .maybeSingle();

    if (selErr) return res.status(500).json({ error: selErr.message });
    if (!row?.stripe_account_id) {
      return res.json({
        hasConnectAccount: false,
        charges_enabled: false,
        details_submitted: false,
        payouts_enabled: false,
        stripe_onboarding_complete: false,
      });
    }

    const account = await stripe.accounts.retrieve(row.stripe_account_id);
    const charges_enabled = Boolean(account.charges_enabled);
    const details_submitted = Boolean(account.details_submitted);
    const payouts_enabled = Boolean(account.payouts_enabled);
    const ready = charges_enabled && details_submitted;

    if (ready !== Boolean(row.stripe_onboarding_complete)) {
      await supabaseAdmin
        .from('organization_payouts')
        .update({ stripe_onboarding_complete: ready, updated_at: new Date().toISOString() })
        .eq('user_id', supabaseUserId);
    }

    res.json({
      hasConnectAccount: true,
      stripe_account_id: row.stripe_account_id,
      charges_enabled,
      details_submitted,
      payouts_enabled,
      stripe_onboarding_complete: ready,
    });
  } catch (err) {
    console.error('stripe-connect-status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Stripe: create a Checkout Session for a paid event (Connect: full list price to host; platform fee + Stripe est. on top)
app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe not configured on server' });

  const {
    eventTitle,
    priceInCents,
    supabaseEventId,
    supabaseUserId,
    userEmail,
    checkoutKind,
  } = req.body || {};
  const kind = checkoutKind === 'fundraiser' ? 'fundraiser' : 'ticket';

  if (!priceInCents || priceInCents < 50) {
    return res.status(400).json({ error: 'Amount must be at least $0.50' });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({
      error: 'Supabase service role not configured',
      message: 'Add SUPABASE_SERVICE_ROLE_KEY to .env so paid checkout can verify the host payout account.',
    });
  }

  if (!supabaseEventId) {
    return res.status(400).json({ error: 'supabaseEventId is required' });
  }

  try {
    const { data: ev, error: evErr } = await supabaseAdmin
      .from('events')
      .select('id, created_by, max_attendance, is_fundraiser')
      .eq('id', supabaseEventId)
      .maybeSingle();

    if (evErr || !ev?.created_by) {
      return res.status(400).json({
        error: 'EVENT_HOST_MISSING',
        message: 'This event could not be linked to a host account for payouts.',
      });
    }

    const isFundraiserEvent = Boolean(ev.is_fundraiser);
    if (kind === 'fundraiser') {
      if (!isFundraiserEvent) {
        return res.status(400).json({
          code: 'NOT_FUNDRAISER_EVENT',
          error: 'NOT_FUNDRAISER_EVENT',
          message: 'This event is not set up for donations.',
        });
      }
    } else if (isFundraiserEvent) {
      return res.status(400).json({
        code: 'USE_FUNDRAISER_CHECKOUT',
        error: 'USE_FUNDRAISER_CHECKOUT',
        message: 'This is a fundraiser — use the donation amount flow.',
      });
    }

    if (kind === 'ticket') {
      const capRaw = ev.max_attendance;
      const cap =
        capRaw != null && capRaw !== ''
          ? parseInt(String(capRaw), 10)
          : null;
      if (cap != null && !Number.isNaN(cap) && cap > 0) {
        const { count, error: cntErr } = await supabaseAdmin
          .from('registrations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', supabaseEventId);
        if (!cntErr && typeof count === 'number' && count >= cap) {
          return res.status(409).json({
            code: 'EVENT_FULL',
            error: 'EVENT_FULL',
            message: 'This event is full — no more tickets available.',
          });
        }
      }
    }

    const { data: payout, error: poErr } = await supabaseAdmin
      .from('organization_payouts')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('user_id', ev.created_by)
      .maybeSingle();

    if (poErr) {
      console.error('create-checkout-session payout select:', poErr.message);
      return res.status(500).json({ error: poErr.message });
    }

    const destination = payout?.stripe_account_id || null;
    if (!destination) {
      return res.status(422).json({
        code: 'HOST_NEEDS_STRIPE_PAYOUTS',
        error: 'HOST_NEEDS_STRIPE_PAYOUTS',
        message:
          'The event host must connect Stripe payouts before paid tickets can be sold. (Settings → Payout Information → Set up automatic payouts.)',
      });
    }

    let hostAccount;
    try {
      hostAccount = await stripe.accounts.retrieve(destination);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid host Stripe account.', message: e.message });
    }

    if (!hostAccount.charges_enabled) {
      return res.status(422).json({
        code: 'HOST_STRIPE_NOT_READY',
        error: 'HOST_STRIPE_NOT_READY',
        message:
          'The event host has not finished Stripe verification yet. Try again after they complete payout setup.',
      });
    }

    const listCents = Math.round(priceInCents);
    const quote = computeTicketCheckoutAmounts(listCents);
    const application_fee_amount = quote.applicationFeeCents;

    const origin = checkoutRedirectOrigin(req);
    const ticketName = (eventTitle || (kind === 'fundraiser' ? 'Donation' : 'Event ticket')).trim();
    const listLabel = kind === 'fundraiser' ? 'donation' : 'ticket';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `${ticketName} (${listLabel})` },
            unit_amount: quote.listCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: { name: 'Platform fee (5%)' },
            unit_amount: quote.platformCents,
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Estimated card processing',
              description: 'Approximates Stripe US card pricing on this total; actual fee may vary.',
            },
            unit_amount: quote.stripePassThroughCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      payment_intent_data: {
        application_fee_amount,
        transfer_data: { destination },
        metadata: {
          checkoutKind: kind,
          supabaseEventId: String(supabaseEventId),
          supabaseUserId: String(supabaseUserId || ''),
          hostUserId: String(ev.created_by),
          list_price_cents: String(quote.listCents),
          platform_fee_cents: String(quote.platformCents),
          stripe_estimate_cents: String(quote.stripePassThroughCents),
        },
      },
      success_url: `${origin}/?payment=success&event=${encodeURIComponent(supabaseEventId || '')}${kind === 'fundraiser' ? '&kind=fundraiser' : ''}`,
      cancel_url: `${origin}/?payment=cancelled`,
      customer_email: userEmail || undefined,
      metadata: {
        checkoutKind: kind,
        supabaseEventId: supabaseEventId || '',
        supabaseUserId: supabaseUserId || '',
        eventTitle: eventTitle || '',
        hostUserId: String(ev.created_by),
        list_price_cents: String(quote.listCents),
        platform_fee_cents: String(quote.platformCents),
        stripe_estimate_cents: String(quote.stripePassThroughCents),
      },
    });

    res.json({
      url: session.url,
      sessionId: session.id,
      application_fee_amount,
      listCents: quote.listCents,
      platformCents: quote.platformCents,
      stripePassThroughCents: quote.stripePassThroughCents,
      totalCents: quote.totalCents,
    });
  } catch (err) {
    console.error('Stripe checkout session error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Production React build (optional on API-only hosts like Render without `npm run build`)
function resolveSpaBuild() {
  const candidates = [
    path.join(__dirname, 'build', 'index.html'),
    path.join(__dirname, '..', 'build', 'index.html'),
  ];
  for (const indexPath of candidates) {
    if (fs.existsSync(indexPath)) {
      return { indexPath, staticDir: path.dirname(indexPath) };
    }
  }
  return null;
}
const spaBuild = resolveSpaBuild();
if (spaBuild) {
  app.use(express.static(spaBuild.staticDir));
} else {
  console.warn(
    '⚠️ No React build found (build/index.html). API routes work; SPA is skipped until you deploy a `build` folder or run `npm run build`.'
  );
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  socket.on('user-data', (data) => {
    console.log('Received user data:', data);
    // Broadcast to dashboard
    io.emit('new-user-data', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Serve the React app for non-API routes (SPA), or a tiny landing page if no build
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'Route not found' });
  }
  if (!spaBuild) {
    res.type('html');
    return res.status(200).send(
      '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Greek Life API</title></head><body><p>API is running. Open <a href="/api/health">/api/health</a>.</p></body></html>'
    );
  }
  res.sendFile(spaBuild.indexPath, (err) => {
    if (err) next(err);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`🚀 The Greek Life App listening on http://${HOST}:${PORT}`);
  console.log(`📍 Main website: http://localhost:${PORT}`);
  console.log(`📍 Admin dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`📍 API health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 