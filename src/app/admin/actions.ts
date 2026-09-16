"use server";

import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { requireSuperAdmin, NotAuthorisedError } from "@/lib/auth/session";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS, SETTINGS_DOC } from "@/lib/firebase/collections";
import { rupeesToMinor } from "@/lib/utils/money";

/**
 * Every admin mutation.
 *
 * Each action re-verifies the session and the superAdmin claim before touching
 * anything: being able to call a Server Action is not authorisation. Inputs are
 * validated with zod, and every write records an audit event.
 */

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function guard() {
  try {
    return await requireSuperAdmin();
  } catch {
    throw new NotAuthorisedError();
  }
}

function fail(error: unknown): ActionResult {
  if (error instanceof NotAuthorisedError) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }
  console.error("[admin action]", error);
  return { ok: false, error: "That did not save. Please try again." };
}

async function audit(
  orderId: string | null,
  type: string,
  message: string,
  actorEmail: string | null,
) {
  const db = requireDb();
  await db.collection(COLLECTIONS.orderEvents).add({
    orderId,
    type,
    message,
    actor: actorEmail ?? "admin",
    createdAt: FieldValue.serverTimestamp(),
  });
}

/* ---------------------------------------------------------------- orders */

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

const PAYMENT_STATUSES = [
  "unpaid",
  "pending",
  "pending_verification",
  "paid",
  "failed",
  "refunded",
] as const;

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z.enum(ORDER_STATUSES).safeParse(status);
    if (!parsed.success) return { ok: false, error: "Unknown order status." };

    const db = requireDb();
    await db.collection(COLLECTIONS.orders).doc(orderId).update({
      orderStatus: parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await audit(orderId, "status_changed", `Order marked ${parsed.data}.`, admin.email);
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * The only path that can mark a manual payment as paid, and it is admin-only
 * and audited. Nothing the customer does can reach this state.
 */
export async function setPaymentStatus(
  orderId: string,
  status: string,
  note?: string,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z.enum(PAYMENT_STATUSES).safeParse(status);
    if (!parsed.success) return { ok: false, error: "Unknown payment status." };

    const db = requireDb();
    const ref = db.collection(COLLECTIONS.orders).doc(orderId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Order not found");

      const update: Record<string, unknown> = {
        paymentStatus: parsed.data,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Confirming payment on a still-pending order also moves it forward.
      if (parsed.data === "paid" && snap.data()?.orderStatus === "pending") {
        update.orderStatus = "confirmed";
      }
      tx.update(ref, update);
    });

    await audit(
      orderId,
      "payment_status_changed",
      note
        ? `Payment marked ${parsed.data}. ${note}`
        : `Payment marked ${parsed.data}.`,
      admin.email,
    );
    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------------------- products */

const variantSchema = z.object({
  productId: z.string().min(1).max(120),
  variantId: z.string().min(1).max(120),
  label: z.string().trim().min(1).max(60),
  priceRupees: z.number().min(0).max(10_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  active: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export async function saveVariant(
  input: z.input<typeof variantSchema>,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = variantSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const v = parsed.data;
    const db = requireDb();

    await db
      .collection(COLLECTIONS.products)
      .doc(v.productId)
      .collection(COLLECTIONS.variants)
      .doc(v.variantId)
      .set(
        {
          label: v.label,
          priceMinor: rupeesToMinor(v.priceRupees),
          stock: v.stock,
          active: v.active,
          sortOrder: v.sortOrder,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await audit(
      null,
      "variant_updated",
      `${v.label} set to Rs. ${v.priceRupees} with ${v.stock} in stock.`,
      admin.email,
    );
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setProductActive(
  productId: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await guard();
    const db = requireDb();
    await db.collection(COLLECTIONS.products).doc(productId).update({
      active,
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------- payment and delivery */

const paymentMethodSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240),
  kind: z.enum(["cod", "qr", "bank_transfer", "esewa", "khalti", "fonepay", "custom"]),
  enabled: z.boolean(),
  requiresVerification: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
  instructions: z.string().trim().max(600).optional(),
  accountTitle: z.string().trim().max(120).optional(),
  accountNumber: z.string().trim().max(60).optional(),
  qrImageUrl: z.string().trim().max(600).optional(),
});

export async function savePaymentMethod(
  input: z.input<typeof paymentMethodSchema>,
): Promise<ActionResult> {
  try {
    await guard();
    const parsed = paymentMethodSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const { id, ...rest } = parsed.data;
    const db = requireDb();
    await db
      .collection(COLLECTIONS.paymentMethods)
      .doc(id)
      .set({ ...rest, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    revalidatePath("/admin/payments");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const deliveryMethodSchema = z.object({
  id: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240),
  kind: z.enum(["home", "valley", "outside_valley", "pickup", "same_day"]),
  enabled: z.boolean(),
  feeRupees: z.number().min(0).max(1_000_000),
  estimate: z.string().trim().max(60),
  sortOrder: z.number().int().min(0).max(999),
  provinces: z.array(z.string().trim().max(40)).max(10),
  districts: z.array(z.string().trim().max(40)).max(80),
  freeDeliveryThresholdRupees: z.number().min(0).max(10_000_000).nullable(),
  minimumOrderRupees: z.number().min(0).max(10_000_000).nullable(),
});

export async function saveDeliveryMethod(
  input: z.input<typeof deliveryMethodSchema>,
): Promise<ActionResult> {
  try {
    await guard();
    const parsed = deliveryMethodSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const {
      id,
      feeRupees,
      freeDeliveryThresholdRupees,
      minimumOrderRupees,
      ...rest
    } = parsed.data;

    const db = requireDb();
    await db
      .collection(COLLECTIONS.deliveryMethods)
      .doc(id)
      .set(
        {
          ...rest,
          feeMinor: rupeesToMinor(feeRupees),
          freeDeliveryThresholdMinor:
            freeDeliveryThresholdRupees === null
              ? null
              : rupeesToMinor(freeDeliveryThresholdRupees),
          minimumOrderMinor:
            minimumOrderRupees === null ? null : rupeesToMinor(minimumOrderRupees),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    revalidatePath("/admin/delivery");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* -------------------------------------------------- content and settings */

const settingsSchema = z.object({
  announcement: z.string().trim().max(200),
  announcementEnabled: z.boolean(),
  heroEyebrow: z.string().trim().max(80),
  heroHeadline: z.string().trim().max(200),
  heroBody: z.string().trim().max(600),
  heroSupport: z.string().trim().max(200),
  introEyebrow: z.string().trim().max(80),
  introHeadline: z.string().trim().max(200),
  introBody: z.string().trim().max(900),
  whyHeadline: z.string().trim().max(200),
  whyBody: z.string().trim().max(2000),
  usageNote: z.string().trim().max(600),
  phone: z.string().trim().max(40),
  whatsapp: z.string().trim().max(40),
  email: z.string().trim().max(120),
  address: z.string().trim().max(200),
});

export async function saveSettings(
  input: z.input<typeof settingsSchema>,
): Promise<ActionResult> {
  try {
    await guard();
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const s = parsed.data;
    const db = requireDb();

    await db
      .collection(COLLECTIONS.siteSettings)
      .doc(SETTINGS_DOC)
      .set(
        {
          announcement: s.announcement || null,
          announcementEnabled: s.announcementEnabled,
          hero: {
            eyebrow: s.heroEyebrow,
            // One line per row keeps the hero's line breaks in the editor's hands.
            headline: s.heroHeadline.split("\n").map((l) => l.trim()).filter(Boolean),
            body: s.heroBody,
            support: s.heroSupport,
          },
          intro: {
            eyebrow: s.introEyebrow,
            headline: s.introHeadline,
            body: s.introBody,
          },
          why: {
            headline: s.whyHeadline,
            body: s.whyBody.split("\n\n").map((p) => p.trim()).filter(Boolean),
          },
          usageNote: s.usageNote || null,
          contact: {
            phone: s.phone,
            whatsapp: s.whatsapp,
            email: s.email,
            address: s.address,
          },
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    revalidatePath("/admin/settings");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const faqSchema = z.object({
  id: z.string().trim().min(1).max(60),
  question: z.string().trim().min(3).max(240),
  answer: z.string().trim().min(3).max(1200),
  sortOrder: z.number().int().min(0).max(999),
  active: z.boolean(),
});

export async function saveFaq(
  input: z.input<typeof faqSchema>,
): Promise<ActionResult> {
  try {
    await guard();
    const parsed = faqSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const { id, ...rest } = parsed.data;
    const db = requireDb();
    await db
      .collection(COLLECTIONS.faqs)
      .doc(id)
      .set({ ...rest, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  try {
    await guard();
    const db = requireDb();
    await db.collection(COLLECTIONS.faqs).doc(id).delete();
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ------------------------------------------------- editorial collections */

/**
 * Benefits, how-to-use steps and surfaces share the same shape, so they share
 * one action. The collection name is checked against a whitelist rather than
 * passed straight through, so a crafted call cannot reach `orders` or
 * `paymentMethods`.
 */
const EDITABLE = {
  benefits: COLLECTIONS.benefits,
  steps: COLLECTIONS.steps,
  surfaces: COLLECTIONS.surfaces,
} as const;

type EditableKey = keyof typeof EDITABLE;

const contentItemSchema = z.object({
  kind: z.enum(["benefits", "steps", "surfaces"]),
  id: z.string().trim().min(1).max(60),
  /** Benefits and steps call this `title`; surfaces call it `name`. */
  heading: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(600),
  sortOrder: z.number().int().min(0).max(999),
  /** Surfaces only. An empty string clears the photograph. */
  image: z.string().trim().max(600).optional(),
});

export async function saveContentItem(
  input: z.input<typeof contentItemSchema>,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = contentItemSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the values." };
    }

    const { kind, id, heading, body, sortOrder, image } = parsed.data;
    const collection = EDITABLE[kind as EditableKey];

    const data: Record<string, unknown> = { body, sortOrder };
    if (kind === "surfaces") {
      data.name = heading;
      data.image = image ? image : null;
    } else {
      data.title = heading;
    }

    const db = requireDb();
    await db
      .collection(collection)
      .doc(id)
      .set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    await audit(null, "content_updated", `Updated ${kind}: ${heading}.`, admin.email);
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteContentItem(
  kind: string,
  id: string,
): Promise<ActionResult> {
  try {
    await guard();
    const parsedKind = z.enum(["benefits", "steps", "surfaces"]).safeParse(kind);
    if (!parsedKind.success) return { ok: false, error: "Unknown content type." };

    const db = requireDb();
    await db.collection(EDITABLE[parsedKind.data]).doc(id).delete();
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

const validImageRef = z
  .string()
  .trim()
  .min(1, "Image path or URL is required")
  .max(1000)
  .refine(
    (val) =>
      val.startsWith("/") ||
      val.startsWith("http://") ||
      val.startsWith("https://") ||
      val.startsWith("data:"),
    "Image must be a valid URL or relative path",
  );

/** Replaces a product's image list. URLs come from uploads or external media. */
export async function saveProductImages(
  productId: string,
  images: string[],
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = z
      .array(validImageRef)
      .min(1, "Keep at least one product image")
      .max(8)
      .safeParse(images);

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the images." };
    }

    const db = requireDb();
    await db.collection(COLLECTIONS.products).doc(productId).update({
      images: parsed.data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await audit(null, "product_images_updated", `Updated product imagery.`, admin.email);
    revalidatePath("/admin/products");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/* ---------------------------------------------------- before & after comparisons */

const comparisonSchema = z.object({
  id: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  caption: z.string().trim().max(600),
  beforeImage: validImageRef,
  afterImage: validImageRef,
  sortOrder: z.number().int().min(0).max(999),
});

export async function saveComparison(
  input: z.input<typeof comparisonSchema>,
): Promise<ActionResult> {
  try {
    const admin = await guard();
    const parsed = comparisonSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the comparison values." };
    }

    const { id, label, caption, beforeImage, afterImage, sortOrder } = parsed.data;
    const db = requireDb();
    await db
      .collection(COLLECTIONS.comparisons)
      .doc(id)
      .set(
        {
          label,
          caption,
          beforeImage,
          afterImage,
          sortOrder,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    await audit(null, "comparison_updated", `Updated comparison: ${label}.`, admin.email);
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteComparison(id: string): Promise<ActionResult> {
  try {
    const admin = await guard();
    const db = requireDb();
    await db.collection(COLLECTIONS.comparisons).doc(id).delete();
    await audit(null, "comparison_deleted", `Deleted comparison: ${id}.`, admin.email);
    revalidatePath("/admin/content");
    revalidatePath("/");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
