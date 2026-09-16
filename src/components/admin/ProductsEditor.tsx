"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Image from "next/image";
import { saveProductImages, saveVariant, setProductActive } from "@/app/admin/actions";
import { uploadAdminMedia } from "@/lib/utils/upload";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "./ui";
import { minorToRupees, formatNpr } from "@/lib/utils/money";
import type { Product, ProductVariant } from "@/types";
import { saveProductCopy } from "@/app/admin/content-actions";

export function ProductsEditor({ products }: { products: Product[] }) {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();

  if (!products.length) {
    return (
      <Notice tone="warn">
        No products in Firestore yet. Run <code>pnpm seed</code> to create the TMG
        Cleaner product and its sizes from the bundled defaults.
      </Notice>
    );
  }

  return (
    <div className="space-y-6">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {products.map((product) => (
        <Panel key={product.id} title={product.name}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/12 px-5 py-3">
            <p className="text-[0.8125rem] text-muted">
              {product.variants.length} size
              {product.variants.length === 1 ? "" : "s"} . {product.active ? "Visible" : "Hidden"}
            </p>
            <ToggleActive
              productId={product.id}
              active={product.active}
              onDone={setMessage}
            />
          </div>

          <ProductCopy product={product} onDone={setMessage} />
          <ul className="divide-y divide-charcoal/10">
            {product.variants.map((variant) => (
              <VariantRow
                key={variant.id}
                productId={product.id}
                variant={variant}
                onDone={setMessage}
              />
            ))}
          </ul>

          <ImageManager
            productId={product.id}
            images={product.images}
            onDone={setMessage}
          />
        </Panel>
      ))}
    </div>
  );
}

type Notify = (m: { tone: "success" | "error"; text: string }) => void;

function ProductCopy({ product, onDone }: { product: Product; onDone: Notify }) {
  const [s,setS]=useState({id:product.id,name:product.name,shortDescription:product.shortDescription,description:product.description});
  const [pending,start]=useTransition(); const router=useRouter();
  return <form className="grid gap-3 border-b border-charcoal/10 p-5" onSubmit={e=>{e.preventDefault();start(async()=>{const r=await saveProductCopy(s);onDone({tone:r.ok?'success':'error',text:r.ok?'Product description saved.':r.error??'Could not save.'});if(r.ok)router.refresh();});}}>
    {(['name','shortDescription','description'] as const).map(key=><label key={key} className="grid gap-1 text-xs text-muted">{{name:'Product name',shortDescription:'Short description',description:'Full description'}[key]}<textarea required rows={key==='description'?3:2} className="rounded-lg border bg-paper p-3 text-sm text-charcoal" value={s[key]} onChange={e=>setS({...s,[key]:e.target.value})}/></label>)}
    <div><Button type="submit" disabled={pending}>Save product copy</Button></div>
  </form>;
}

function ToggleActive({
  productId,
  active,
  onDone,
}: {
  productId: string;
  active: boolean;
  onDone: Notify;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setProductActive(productId, !active);
          onDone(
            r.ok
              ? { tone: "success", text: `Product ${!active ? "is now visible" : "is now hidden"}.` }
              : { tone: "error", text: r.error ?? "That did not save." },
          );
          if (r.ok) router.refresh();
        })
      }
    >
      <span>{active ? "Hide from store" : "Show in store"}</span>
    </Button>
  );
}

function VariantRow({
  productId,
  variant,
  onDone,
}: {
  productId: string;
  variant: ProductVariant;
  onDone: Notify;
}) {
  const [label, setLabel] = useState(variant.label);
  const [price, setPrice] = useState(String(minorToRupees(variant.priceMinor)));
  const [stock, setStock] = useState(String(variant.stock));
  const [active, setActive] = useState(variant.active);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty =
    label !== variant.label ||
    Number(price) !== minorToRupees(variant.priceMinor) ||
    Number(stock) !== variant.stock ||
    active !== variant.active;

  const save = () =>
    start(async () => {
      const result = await saveVariant({
        productId,
        variantId: variant.id,
        label: label.trim(),
        priceRupees: Number(price),
        stock: Number(stock),
        active,
        sortOrder: variant.sortOrder,
      });
      onDone(
        result.ok
          ? { tone: "success", text: `${label} saved.` }
          : { tone: "error", text: result.error ?? "That did not save." },
      );
      if (result.ok) router.refresh();
    });

  return (
    <li className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_8rem_7rem_auto_auto] sm:items-end">
      <Small label="Size">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={INPUT}
          aria-label="Size label"
        />
      </Small>

      <Small label="Price, Rs.">
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={`${INPUT} tabular`}
          aria-label="Price in rupees"
        />
      </Small>

      <Small label="Stock">
        <input
          type="number"
          min={0}
          step={1}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className={`${INPUT} tabular`}
          aria-label="Units in stock"
        />
      </Small>

      <label className="flex h-10 items-center gap-2 text-[0.8125rem] text-charcoal">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-forest)]"
        />
        For sale
      </label>

      <Button size="sm" disabled={!dirty || pending} onClick={save}>
        <span>{pending ? "Saving..." : dirty ? "Save" : "Saved"}</span>
      </Button>

      <p className="tabular text-[0.75rem] text-muted sm:col-span-5">
        SKU {variant.sku} . currently live at {formatNpr(variant.priceMinor)}
        {variant.isDefault ? " . pre-selected on the storefront" : ""}
      </p>
    </li>
  );
}

const INPUT =
  "h-10 w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 text-[0.875rem] text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";

/**
 * Product photography. The first image is the one the storefront uses as the
 * hero bottle, so ordering matters and is stated plainly.
 */
function ImageManager({
  productId,
  images,
  onDone,
}: {
  productId: string;
  images: string[];
  onDone: Notify;
}) {
  const [list, setList] = useState<string[]>(images);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const dirty = JSON.stringify(list) !== JSON.stringify(images);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAdminMedia(file, "products");
      setList((l) => [...l, url]);
      onDone({ tone: "success", text: "Uploaded. Press Save images to publish." });
    } catch (err) {
      onDone({ tone: "error", text: (err as Error)?.message || "Could not upload that image." });
    } finally {
      setUploading(false);
    }
  };

  const save = () =>
    start(async () => {
      const r = await saveProductImages(productId, list);
      onDone(
        r.ok
          ? { tone: "success", text: "Product images saved." }
          : { tone: "error", text: r.error ?? "That did not save." },
      );
      if (r.ok) router.refresh();
    });

  return (
    <div className="border-t border-charcoal/12 p-5">
      <h3 className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-muted">
        Product images
      </h3>

      <ul className="mt-4 flex flex-wrap gap-3">
        {list.map((src, i) => (
          <li key={src} className="relative">
            <Image
              src={src}
              alt=""
              width={84}
              height={104}
              unoptimized
              className="h-[104px] w-[84px] rounded-[10px] border border-charcoal/12 bg-stone object-contain p-1"
            />
            {i === 0 && (
              <span className="mt-1 block text-center text-[0.625rem] font-semibold text-brass-ink">
                Main
              </span>
            )}
            {list.length > 1 && (
              <button
                type="button"
                onClick={() => setList((l) => l.filter((x) => x !== src))}
                aria-label="Remove this image"
                className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-charcoal/15 bg-paper text-charcoal shadow-sm hover:bg-charcoal hover:text-paper"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
                  <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label
          htmlFor={`product-img-${productId}`}
          className="cursor-pointer rounded-[10px] border border-charcoal/18 bg-paper px-4 py-2 text-[0.8125rem] font-semibold text-charcoal hover:border-charcoal/45"
        >
          {uploading ? "Uploading..." : "Upload image"}
        </label>
        <input
          id={`product-img-${productId}`}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <Button size="sm" disabled={!dirty || pending} onClick={save}>
          <span>{pending ? "Saving..." : dirty ? "Save images" : "Saved"}</span>
        </Button>
      </div>

      <p className="mt-3 text-[0.75rem] text-muted">
        The first image is the one used across the storefront. Transparent PNGs
        work best: the bottle sits on the page without a background.
      </p>
    </div>
  );
}

function Small({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
