"use server";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/session";
import { requireDb } from "@/lib/firebase/admin";
import { validateLedgerBalance } from "@/lib/partners/ledger";
import type { PartnerEntry } from "@/types/partners";

const id = z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/, "Use letters, numbers, hyphens or underscores for IDs.");
const partnerSchema = z.object({ id, name: z.string().trim().min(2).max(100), kind: z.enum(["marketplace", "courier", "distributor", "other"]), active: z.boolean(), contact: z.string().trim().max(160), accountReference: z.string().trim().max(120), notes: z.string().trim().max(1500) });
const entrySchema = z.object({ partnerId: id, kind: z.enum(["stock_in", "stock_out", "sale", "return", "collection", "remittance", "fee", "refund"]), sku: z.string().trim().max(120), quantity: z.number().int().min(0).max(1000000), amountMinor: z.number().int().min(0).max(100000000000), reference: z.string().trim().min(1).max(120), orderId: id.nullable(), occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, "Use a valid date."), note: z.string().trim().max(1000) }).superRefine((v, ctx) => {
  const inventory = ["stock_in", "stock_out", "sale", "return"].includes(v.kind);
  if (inventory && (!v.sku || v.quantity < 1)) ctx.addIssue({ code: "custom", message: "Inventory entries need a SKU and quantity of at least one." });
  if (!inventory && (v.quantity !== 0 || v.sku !== "")) ctx.addIssue({ code: "custom", message: "Money entries must have no SKU and zero quantity." });
  if (["stock_in", "stock_out"].includes(v.kind) && v.amountMinor !== 0) ctx.addIssue({ code: "custom", message: "Stock movements have no money amount." });
  if (!["stock_in", "stock_out"].includes(v.kind) && v.amountMinor <= 0) ctx.addIssue({ code: "custom", message: "Enter a positive money amount." });
  if (["sale", "return"].includes(v.kind) && v.orderId) ctx.addIssue({ code: "custom", message: "External sales must not also link a website order. Use the order's company assignment to avoid double counting." });
});
const errorResult = (e: unknown) => ({ ok: false, error: e instanceof z.ZodError ? e.issues[0].message : e instanceof Error ? e.message : "Could not save." });
const refresh = () => { revalidatePath("/admin/partners"); revalidatePath("/admin/orders"); revalidatePath("/admin/content"); };

export async function savePartner(input: z.input<typeof partnerSchema>) {
  try {
    const user = await requireSuperAdmin();
    const { id: partnerId, ...data } = partnerSchema.parse(input);
    const db = requireDb();
    const batch = db.batch();
    batch.set(db.collection("partners").doc(partnerId), { ...data, integrationMode: "manual", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(db.collection("orderEvents").doc(), { type: "partner_updated", partnerId, actor: user.email, createdAt: FieldValue.serverTimestamp() });
    await batch.commit(); refresh(); return { ok: true };
  } catch (e) { return errorResult(e); }
}

export async function recordPartnerEntries(input: z.input<typeof entrySchema>[]) {
  try {
    const user = await requireSuperAdmin();
    const entries = z.array(entrySchema).min(1).max(100).parse(input);
    const partnerId = entries[0].partnerId;
    if (entries.some(e => e.partnerId !== partnerId)) throw new Error("Import one company at a time.");
    const db = requireDb();
    const partnerRef = db.collection("partners").doc(partnerId);
    await db.runTransaction(async tx => {
      const company = await tx.get(partnerRef);
      if (!company.exists || !company.data()?.active) throw new Error("Choose an active company.");
      const existing = await tx.get(db.collection("partnerEntries").where("partnerId", "==", partnerId));
      const refs = entries.map(e => db.collection("partnerEntries").doc(createHash("sha256").update(`${partnerId}:${e.kind}:${e.reference.toLowerCase()}:${e.sku.toLowerCase()}`).digest("hex")));
      const hashes = new Set<string>();
      for (const ref of refs) { if (hashes.has(ref.id)) throw new Error("Duplicate references in this import."); hashes.add(ref.id); }
      const existingIds = new Set(existing.docs.map(d => d.id));
      if (refs.some(r => existingIds.has(r.id))) throw new Error("This reference and entry type were already recorded. Nothing was imported.");
      for (const entry of entries.filter(e => e.orderId)) {
        const order = await tx.get(db.collection("orders").doc(entry.orderId!));
        const data = order.data();
        if (!data || ![data.salesPartnerId, data.courierPartnerId].includes(partnerId)) throw new Error("The referenced website order must be assigned to this company first.");
      }
      const combined = [...existing.docs.map(d => ({ ...d.data(), id: d.id } as PartnerEntry)), ...entries as PartnerEntry[]];
      validateLedgerBalance(combined);
      entries.forEach((e, i) => tx.create(refs[i], { ...e, actor: user.email ?? user.uid, createdAt: FieldValue.serverTimestamp() }));
      // Serialize ledger writes per company so two concurrent withdrawals
      // cannot both spend the same remaining stock or money.
      tx.update(partnerRef, { ledgerVersion: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
      tx.create(db.collection("orderEvents").doc(), { type: "partner_entries_recorded", partnerId, count: entries.length, actor: user.email, createdAt: FieldValue.serverTimestamp() });
    });
    refresh(); return { ok: true };
  } catch (e) { return errorResult(e); }
}

export async function assignOrderPartners(input: { orderId: string; salesPartnerId: string | null; courierPartnerId: string | null; externalReference: string; trackingNumber: string }) {
  try {
    const user = await requireSuperAdmin();
    const parsed = z.object({ orderId: id, salesPartnerId: id.nullable(), courierPartnerId: id.nullable(), externalReference: z.string().trim().max(120), trackingNumber: z.string().trim().max(120) }).parse(input);
    const { orderId, ...data } = parsed;
    const db = requireDb();
    await db.runTransaction(async tx => {
      const ref = db.collection("orders").doc(orderId);
      const order = await tx.get(ref);
      if (!order.exists) throw new Error("Order not found.");
      for (const partnerId of [data.salesPartnerId, data.courierPartnerId].filter(Boolean)) {
        const company = await tx.get(db.collection("partners").doc(partnerId!));
        if (!company.exists || !company.data()?.active) throw new Error("Choose an active company.");
      }
      // Attribution cannot silently orphan already-recorded collections.
      const ledger = await tx.get(db.collection("partnerEntries").where("orderId", "==", orderId));
      if (ledger.docs.some(d => ![data.salesPartnerId, data.courierPartnerId].includes(d.data().partnerId))) throw new Error("This company has money entries for the order. Keep its assignment to preserve reconciliation.");
      tx.update(ref, { ...data, updatedAt: FieldValue.serverTimestamp() });
      tx.create(db.collection("orderEvents").doc(), { orderId, type: "partner_assignment", ...data, actor: user.email, createdAt: FieldValue.serverTimestamp() });
    });
    refresh(); return { ok: true };
  } catch (e) { return errorResult(e); }
}
