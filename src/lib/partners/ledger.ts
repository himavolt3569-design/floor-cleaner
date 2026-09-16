import type { PartnerEntry } from "../../types/partners";

export const ENTRY_LABELS = { stock_in: "Stock received by company", stock_out: "Unsold stock returned to us", sale: "External sale", return: "External sale returned to company", collection: "Customer money collected", remittance: "Money paid to us", fee: "Company fee deducted", refund: "Customer money refunded" } as const;

export function summarizeLedger(entries: PartnerEntry[]) {
  const stock: Record<string, { received: number; sold: number; returned: number; withdrawn: number; remaining: number }> = {};
  const totals = { salesMinor: 0, collectedMinor: 0, remittedMinor: 0, feesMinor: 0, refundedMinor: 0, heldMinor: 0, soldUnits: 0, remainingUnits: 0 };
  for (const entry of entries) {
    if (["stock_in", "stock_out", "sale", "return"].includes(entry.kind)) {
      const row = stock[entry.sku] ??= { received: 0, sold: 0, returned: 0, withdrawn: 0, remaining: 0 };
      if (entry.kind === "stock_in") row.received += entry.quantity;
      if (entry.kind === "stock_out") row.withdrawn += entry.quantity;
      if (entry.kind === "sale") { row.sold += entry.quantity; totals.salesMinor += entry.amountMinor; }
      if (entry.kind === "return") { row.returned += entry.quantity; totals.salesMinor -= entry.amountMinor; }
    }
    if (entry.kind === "collection") totals.collectedMinor += entry.amountMinor;
    if (entry.kind === "remittance") totals.remittedMinor += entry.amountMinor;
    if (entry.kind === "fee") totals.feesMinor += entry.amountMinor;
    if (entry.kind === "refund") totals.refundedMinor += entry.amountMinor;
  }
  for (const row of Object.values(stock)) {
    row.remaining = row.received - row.withdrawn - row.sold + row.returned;
    totals.remainingUnits += row.remaining;
    totals.soldUnits += row.sold - row.returned;
  }
  totals.heldMinor = totals.collectedMinor - totals.remittedMinor - totals.feesMinor - totals.refundedMinor;
  return { stock, ...totals };
}

export function validateLedgerBalance(entries: PartnerEntry[]) {
  const balance = summarizeLedger(entries);
  for (const [sku, row] of Object.entries(balance.stock)) {
    if (row.remaining < 0) throw new Error(`Not enough allocated stock for ${sku}. Record stock received first.`);
    if (row.returned > row.sold) throw new Error(`Returned units exceed external sales for ${sku}.`);
  }
  if (balance.salesMinor < 0) throw new Error("Returned sale value exceeds recorded sales.");
  if (balance.heldMinor < 0) throw new Error("Remittances, fees and refunds exceed collected money. Record the collection first.");
}

/** Quote every cell and neutralize spreadsheet formulas before CSV export. */
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
