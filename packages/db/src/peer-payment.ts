/** Max cents payer can send recipient: capped by payer debt and recipient credit. */
export function maxPeerPaymentCents(
  payerBalanceCents: number,
  recipientBalanceCents: number,
): number {
  if (payerBalanceCents >= 0 || recipientBalanceCents <= 0) return 0;
  return Math.min(-payerBalanceCents, recipientBalanceCents);
}
