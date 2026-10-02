// Invoice amounts. Stripe Checkout takes at most $999,999.99 in one USD
// payment, so a larger invoice could never be paid; we stop it at entry.
export const MAX_INVOICE = 999_999.99

export const formatMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

/** Typing filter for the amount field: digits and up to two decimal places */
export function cleanAmountInput(raw: string, current: string) {
  const v = raw.replace(/[^0-9.]/g, '')
  return /^\d*(\.\d{0,2})?$/.test(v) ? v : current
}

/** The message to show under the field, or null when the amount is fine */
export function invoiceAmountError(value: string): string | null {
  if (!value) return null
  const n = Number(value)
  if (!Number.isFinite(n)) return 'Enter an amount like 1500 or 1500.00.'
  if (n > MAX_INVOICE) return `Invoices can be up to ${formatMoney(MAX_INVOICE)}. For more, split it across portals.`
  return null
}
