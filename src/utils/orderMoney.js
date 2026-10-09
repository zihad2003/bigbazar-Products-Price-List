/** Expected advance from the delivery rule. Admin can record a different amount. */
export function suggestedAdvance(order) {
  const charge = Number(order?.delivery_charge) || 0;
  if (order?.is_exclusive_order) return 500;
  if (order?.delivery_area === 'mirsarai' && charge === 0) return 100;
  return charge;
}

export function paymentConfirmed(order) {
  return Boolean(order?.is_advance_paid)
    || order?.payment_status === 'Advance Paid'
    || order?.payment_status === 'Fully Paid';
}

/** Money already received. Uses the amount an admin typed, otherwise the old 100 / 150 / 500 rule. */
export function receivedAdvance(order) {
  if (!paymentConfirmed(order)) return 0;
  const raw = order?.advance_paid_amount;
  if (raw !== null && raw !== undefined && raw !== '' && Number.isFinite(Number(raw))) {
    return Math.max(0, Number(raw));
  }
  return suggestedAdvance(order);
}

export function orderTotal(order) {
  if (typeof order?.total_amount === 'string') {
    return Number(String(order.total_amount).replace(/[^0-9.]/g, '')) || 0;
  }
  return Number(order?.total_amount) || 0;
}

export function balanceDue(order) {
  if (order?.payment_status === 'Fully Paid') return 0;
  return Math.max(0, orderTotal(order) - receivedAdvance(order));
}
