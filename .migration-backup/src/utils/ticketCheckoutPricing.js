/**
 * Mirror of `lib/ticketCheckoutPricing.cjs` — keep fee constants and loop identical.
 * Used for Pay button totals; server is authoritative for Checkout.
 */
const STRIPE_CARD_FEE_BPS = 290;
const STRIPE_CARD_FIXED_CENTS = 30;

export function computeTicketCheckoutAmounts(listPriceCents) {
  const L = Math.max(0, Math.round(Number(listPriceCents) || 0));
  const platformCents = Math.round((L * 5) / 100);

  let totalCents = L + platformCents + STRIPE_CARD_FIXED_CENTS;
  for (let i = 0; i < 20; i++) {
    const stripePassThroughCents =
      Math.round((STRIPE_CARD_FEE_BPS * totalCents) / 10000) + STRIPE_CARD_FIXED_CENTS;
    const nextTotal = L + platformCents + stripePassThroughCents;
    if (nextTotal === totalCents) break;
    totalCents = nextTotal;
  }

  const stripePassThroughCents = totalCents - L - platformCents;
  const applicationFeeCents = totalCents - L;

  return {
    listCents: L,
    platformCents,
    stripePassThroughCents,
    totalCents,
    applicationFeeCents,
  };
}
