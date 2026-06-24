-- =============================================================================
-- Admin query: see how much each organization is owed from paid tickets.
-- Run in Supabase SQL Editor whenever you need to check balances.
-- NOT a migration — just a read-only report query.
-- =============================================================================

SELECT
  o.name AS org_name,
  o.user_id AS org_user_id,
  COUNT(r.event_id) AS total_paid_tickets,
  SUM(e.price) AS total_revenue,
  ROUND(SUM(e.price) * 0.05, 2) AS platform_fee_5pct,
  ROUND(SUM(e.price) * 0.95, 2) AS org_payout,
  op.payout_method,
  COALESCE(op.venmo_handle, op.paypal_email, op.zelle_identifier,
    CASE WHEN op.bank_routing_number IS NOT NULL
         THEN 'Bank ****' || RIGHT(op.bank_account_number, 4)
         ELSE NULL END,
    '(not set)') AS payout_destination
FROM public.registrations r
JOIN public.events e ON e.id = r.event_id
JOIN public.organizations o ON o.user_id = e.created_by
LEFT JOIN public.organization_payouts op ON op.user_id = e.created_by
WHERE r.payment_status = 'paid'
  AND e.price > 0
GROUP BY o.name, o.user_id, op.payout_method, op.venmo_handle,
         op.paypal_email, op.zelle_identifier,
         op.bank_routing_number, op.bank_account_number
ORDER BY org_payout DESC;
