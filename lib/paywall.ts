// "Files unlock after payment": a portal with lock_until_paid on and an
// unpaid invoice keeps its files from the client (they still see the list).
// The owner and team always have access. Shared by the server routes that
// enforce it and the pages that show it.
export type PaywallFields = {
  lock_until_paid?: boolean | null
  invoice_amount?: number | string | null
  invoice_paid?: boolean | null
}

export const awaitingPayment = (p: PaywallFields) =>
  !!p.lock_until_paid && Number(p.invoice_amount) > 0 && !p.invoice_paid
