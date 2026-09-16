"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, useCallback, useRef } from "react";
import { saveComparison, deleteComparison } from "@/app/admin/actions";
import { uploadAdminMedia } from "@/lib/utils/upload";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "./ui";
import type { ComparisonEntry } from "@/types";

const INPUT =
  "h-10 w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 text-[0.875rem] text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";
const AREA =
  "w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 py-2 text-[0.875rem] leading-relaxed text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";

type Msg = { tone: "success" | "error"; text: string };

export function ComparisonsEditor({
  comparisons,
}: {
  comparisons: ComparisonEntry[];
}) {
  const [list, setList] = useState(comparisons);
  const [message, setMessage] = useState<Msg>();

  const add = () => {
    const id = `comparison-${Date.now().toString(36)}`;
    setList((l) => [
      ...l,
      {
        id,
        label: "New Surface",
        caption: "Visible result after cleaning with TMG Cleaner.",
        beforeImage: "/results/marble-before.webp",
        afterImage: "/results/marble-after.webp",
        sortOrder: (l.length + 1) * 1,
      },
    ]);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[1.5rem] leading-none tracking-[-0.02em] text-charcoal">
            Before & After Comparisons
          </h2>
          <p className="mt-1.5 max-w-[56ch] text-[0.8125rem] text-muted">
            The interactive split-screen slider shown in the Results section. Add before
            and after photographs of surfaces cleaned with TMG Cleaner.
          </p>
        </div>
        <Button variant="secondary" onClick={add}>
          Add comparison
        </Button>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="space-y-6">
        {list.map((item) => (
          <ComparisonRow
            key={item.id}
            item={item}
            onDone={setMessage}
            onDeleted={(id) => setList((prev) => prev.filter((x) => x.id !== id))}
          />
        ))}
      </div>
    </section>
  );
}

function ComparisonRow({
  item,
  onDone,
  onDeleted,
}: {
  item: ComparisonEntry;
  onDone: (m: Msg) => void;
  onDeleted: (id: string) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [caption, setCaption] = useState(item.caption);
  const [beforeImage, setBeforeImage] = useState(item.beforeImage);
  const [afterImage, setAfterImage] = useState(item.afterImage);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [uploadingBefore, setUploadingBefore] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const uploadBefore = async (file: File) => {
    setUploadingBefore(true);
    try {
      const url = await uploadAdminMedia(file, "comparisons");
      setBeforeImage(url);
      onDone({ tone: "success", text: "Before image uploaded. Press Save to publish." });
    } catch (err) {
      onDone({ tone: "error", text: (err as Error)?.message || "Upload failed." });
    } finally {
      setUploadingBefore(false);
    }
  };

  const uploadAfter = async (file: File) => {
    setUploadingAfter(true);
    try {
      const url = await uploadAdminMedia(file, "comparisons");
      setAfterImage(url);
      onDone({ tone: "success", text: "After image uploaded. Press Save to publish." });
    } catch (err) {
      onDone({ tone: "error", text: (err as Error)?.message || "Upload failed." });
    } finally {
      setUploadingAfter(false);
    }
  };

  const save = () =>
    start(async () => {
      if (!beforeImage.trim()) {
        onDone({ tone: "error", text: "Please provide a Before image." });
        return;
      }
      if (!afterImage.trim()) {
        onDone({ tone: "error", text: "Please provide an After image." });
        return;
      }

      const r = await saveComparison({
        id: item.id,
        label: label.trim(),
        caption: caption.trim(),
        beforeImage: beforeImage.trim(),
        afterImage: afterImage.trim(),
        sortOrder: Number(sortOrder || 0),
      });

      onDone(
        r.ok
          ? { tone: "success", text: `Saved comparison: ${label}.` }
          : { tone: "error", text: r.error ?? "Failed to save comparison." },
      );
      if (r.ok) router.refresh();
    });

  const remove = () =>
    start(async () => {
      const r = await deleteComparison(item.id);
      if (r.ok) {
        onDone({ tone: "success", text: `Deleted ${label}.` });
        onDeleted(item.id);
        router.refresh();
      } else {
        onDone({ tone: "error", text: r.error ?? "Could not remove that comparison." });
      }
    });

  return (
    <Panel title={`${label || item.id} (Order ${sortOrder})`}>
      <div className="grid gap-6 p-5 lg:grid-cols-12">
        {/* Left Form Controls */}
        <div className="space-y-4 lg:col-span-7">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Surface Label">
              <input
                className={INPUT}
                value={label}
                placeholder="e.g. Marble, Ceramic Tile, Granite"
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>

            <Field label="Sort Order">
              <input
                type="number"
                className={INPUT}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Caption / Result Note">
            <textarea
              rows={2}
              className={AREA}
              value={caption}
              placeholder="e.g. Cleans tough dirt and stubborn marks."
              onChange={(e) => setCaption(e.target.value)}
            />
          </Field>

          {/* Before & After Image Inputs */}
          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-charcoal/10">
            {/* Before image */}
            <div className="space-y-2">
              <label className="text-[0.75rem] font-semibold uppercase tracking-wider text-charcoal/70">
                Before Photo
              </label>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-charcoal/5 border border-charcoal/15">
                  {beforeImage ? (
                    <Image
                      src={beforeImage}
                      alt="Before preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-[0.6875rem] text-muted">
                      None
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-[7px] border border-charcoal/20 bg-paper px-2.5 py-1.5 text-[0.75rem] font-medium text-charcoal hover:bg-cream">
                    {uploadingBefore ? "Uploading..." : "Upload photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingBefore}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadBefore(f);
                      }}
                    />
                  </label>
                  <input
                    className="h-7 w-full rounded border border-charcoal/15 bg-paper px-2 text-[0.75rem] text-charcoal"
                    placeholder="or image URL"
                    value={beforeImage}
                    onChange={(e) => setBeforeImage(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* After image */}
            <div className="space-y-2">
              <label className="text-[0.75rem] font-semibold uppercase tracking-wider text-charcoal/70">
                After Photo
              </label>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[8px] bg-charcoal/5 border border-charcoal/15">
                  {afterImage ? (
                    <Image
                      src={afterImage}
                      alt="After preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-[0.6875rem] text-muted">
                      None
                    </span>
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-[7px] border border-charcoal/20 bg-paper px-2.5 py-1.5 text-[0.75rem] font-medium text-charcoal hover:bg-cream">
                    {uploadingAfter ? "Uploading..." : "Upload photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAfter}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadAfter(f);
                      }}
                    />
                  </label>
                  <input
                    className="h-7 w-full rounded border border-charcoal/15 bg-paper px-2 text-[0.75rem] text-charcoal"
                    placeholder="or image URL"
                    value={afterImage}
                    onChange={(e) => setAfterImage(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-charcoal/10">
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="text-[0.8125rem] font-medium text-terracotta hover:underline disabled:opacity-50"
            >
              Remove
            </button>
            <Button variant="primary" onClick={save} disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Right Live Interactive Preview */}
        <div className="space-y-2 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="text-[0.75rem] font-semibold uppercase tracking-wider text-charcoal/70">
              Live Slider Preview
            </span>
            <span className="text-[0.6875rem] text-muted">
              Drag handle to test
            </span>
          </div>

          <AdminSliderPreview
            label={label}
            beforeImage={beforeImage}
            afterImage={afterImage}
          />
        </div>
      </div>
    </Panel>
  );
}

function AdminSliderPreview({
  label,
  beforeImage,
  afterImage,
}: {
  label: string;
  beforeImage: string;
  afterImage: string;
}) {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const setFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setFromClientX(e.clientX);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    const el = e.currentTarget as HTMLElement;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  const validBefore = beforeImage.trim() || "/results/marble-before.webp";
  const validAfter = afterImage.trim() || "/results/marble-after.webp";

  return (
    <div
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-[14px] bg-charcoal shadow-inner"
    >
      {/* After image underneath */}
      <Image
        src={validAfter}
        alt={`${label} after`}
        fill
        unoptimized
        className="object-cover"
        draggable={false}
      />

      {/* Before image on top with clipPath */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={validBefore}
          alt={`${label} before`}
          fill
          unoptimized
          className="object-cover"
          draggable={false}
        />
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute left-2 top-2 rounded bg-charcoal/80 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-paper">
        Before
      </span>
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-charcoal/80 px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase tracking-wider text-paper">
        After
      </span>

      {/* Divider */}
      <div
        className="pointer-events-none absolute inset-y-0 w-[2px] bg-paper shadow"
        style={{ left: `${position}%` }}
      />

      {/* Handle */}
      <div
        className="absolute top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full bg-paper text-charcoal shadow-md"
        style={{ left: `${position}%` }}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l-3 3 3 3m8-6l3 3-3 3" />
        </svg>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
