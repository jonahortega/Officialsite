/**
 * One row per (user_id, event_id). Paid checkout updates an existing row instead of INSERTing again.
 */
export async function reservePaidCheckoutRegistration(supabase, { userId, eventId, ticketCode }) {
  const { data: existing, error: selErr } = await supabase
    .from('registrations')
    .select('payment_status')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (selErr) return { error: selErr };

  if (existing && String(existing.payment_status || '').toLowerCase() === 'paid') {
    return {
      error: Object.assign(new Error('You already have a paid ticket for this event.'), {
        code: 'ALREADY_PAID',
      }),
    };
  }

  if (existing) {
    const { error: upErr } = await supabase
      .from('registrations')
      .update({
        payment_status: 'pending',
        ticket_code: ticketCode,
        scanned: false,
      })
      .eq('user_id', userId)
      .eq('event_id', eventId);
    return { error: upErr };
  }

  const { error: insErr } = await supabase.from('registrations').insert({
    user_id: userId,
    event_id: eventId,
    payment_status: 'pending',
    ticket_code: ticketCode,
    scanned: false,
  });
  return { error: insErr };
}
