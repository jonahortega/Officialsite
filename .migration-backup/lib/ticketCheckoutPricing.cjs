'use strict';

/**
 * US card pricing ballpark (Stripe published standard): ~2.9% + $0.30 per charge.
 * Applied to the full Checkout total; we fold an estimate into the buyer total so the
 * host still receives the full listed ticket via Connect (application_fee = total − list).
 *
 * Keep in sync with `src/utils/ticketCheckoutPricing.js`.
 */
const STRIPE_CARD_FEE_BPS = 290; // 2.9% = 290 basis points / 10000 for cents math
const STRIPE_CARD_FIXED_CENTS = 30;

/**
 * @param {number} listPriceCents - Org's posted ticket price (integer cents)
 * @returns {{
 *   listCents: number,
 *   platformCents: number,
 *   stripePassThroughCents: number,
 *   totalCents: number,
 *   applicationFeeCents: number,
 * }}
 */
function computeTicketCheckoutAmounts(listPriceCents) {
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

module.exports = {
  computeTicketCheckoutAmounts,
  STRIPE_CARD_FEE_BPS,
  STRIPE_CARD_FIXED_CENTS,
};
