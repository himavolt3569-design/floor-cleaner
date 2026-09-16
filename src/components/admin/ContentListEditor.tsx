"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteContentItem, saveContentItem } from "@/app/admin/actions";
import { uploadAdminMedia } from "@/lib/utils/upload";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "./ui";

const INPUT =
  "h-10 w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 text-[0.875rem] text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";
const AREA =
  "w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 py-2 text-[0.875rem] leading-relaxed text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";

export type ContentKind = "benefits" | "steps" | "surfaces";

export interface ContentItem {
  id: string;
  heading: string;
  body: string;
  sortOrder: number;
  image?: string | null;
}

const LABELS: Record<ContentKind, { one: string; heading: string; add: string }> = {
  benefits: { one: "benefit", heading: "Title", add: "Add a benefit" },
  steps: { one: "step", heading: "Title", add: "Add a step" },
  surfaces: { one: "surface", heading: "Surface name", add: "Add a surface" },
};

type Msg = { tone: "success" | "error"; text: string };

export function ContentListEditor({
  kind,
  items,
  title,
  description,
}: {
  kind: ContentKind;
  items: ContentItem[];
  title: string;
  description: string;
}) {
  const [message, setMessage] = useState<Msg>();
  const [newId, setNewId] = useState<string | null>(null);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-[1.5rem] leading-none tracking-[-0.02em] text-charcoal">
          {title}
        </h2>
        <p className="mt-1.5 max-w-[56ch] text-[0.8125rem] text-muted">{description}</p>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {items.map((item) => (
        <Row key={item.id} kind={kind} item={item} onDone={setMessage} />
      ))}

      {newId ? (
        <Row
          kind={kind}
          isNew
          item={{ id: newId, heading: "", body: "", sortOrder: items.length + 1, image: null }}
          onDone={(m) => {
            setMessage(m);
            if (m.tone === "success") setNewId(null);
          }}
        />
      ) : (
        <Button
          variant="secondary"
          onClick={() => setNewId(`${kind}-${Date.now()}`)}
        >
          <span>{LABELS[kind].add}</span>
        </Button>
      )}
    </section>
  );
}

function Row({
  kind,
  item,
  isNew,
  onDone,
}: {
  kind: ContentKind;
  item: ContentItem;
  isNew?: boolean;
  onDone: (m: Msg) => void;
}) {
  const [heading, setHeading] = useState(item.heading);
  const [body, setBody] = useState(item.body);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [image, setImage] = useState(item.image ?? "");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const save = () =>
    start(async () => {
      const r = await saveContentItem({
        kind,
        id: item.id,
        heading: heading.trim(),
        body: body.trim(),
        sortOrder: Number(sortOrder || 0),
        image: kind === "surfaces" ? image.trim() : undefined,
      });
      onDone(
        r.ok
          ? { tone: "success", text: `Saved ${heading || LABELS[kind].one}.` }
          : { tone: "error", text: r.error ?? "That did not save." },
      );
      if (r.ok) router.refresh();
    });

  const remove = () =>
    start(async () => {
      const r = await deleteContentItem(kind, item.id);
      onDone(
        r.ok
          ? { tone: "success", text: "Removed." }
          : { tone: "error", text: r.error ?? "Could not remove that." },
      );
      if (r.ok) router.refresh();
    });

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadAdminMedia(file, "surfaces");
      setImage(url);
      onDone({ tone: "success", text: "Uploaded. Press Save to publish it." });
    } catch (err) {
      onDone({ tone: "error", text: (err as Error)?.message || "Could not upload that image." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Panel title={isNew ? `New ${LABELS[kind].one}` : heading || item.id}>
      <div className="grid gap-4 p-5">
        <Field label={LABELS[kind].heading}>
          <input className={INPUT} value={heading} onChange={(e) => setHeading(e.target.value)} />
        </Field>

        <Field label="Description">
          <textarea rows={2} className={AREA} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>

        {kind === "surfaces" && (
          <Field label="Photograph">
            <div className="flex flex-wrap items-center gap-4">
              {image ? (
                <Image
                  src={image}
                  alt=""
                  width={96}
                  height={76}
                  unoptimized
                  className="h-[76px] w-[96px] rounded-[10px] border border-charcoal/12 object-cover"
                />
              ) : (
                <span className="grid h-[76px] w-[96px] place-items-center rounded-[10px] border border-dashed border-charcoal/25 text-center text-[0.6875rem] leading-tight text-muted">
                  No photo
                </span>
              )}
              <label
                htmlFor={`img-${item.id}`}
                className="cursor-pointer rounded-[10px] border border-charcoal/18 bg-paper px-4 py-2 text-[0.8125rem] font-semibold text-charcoal hover:border-charcoal/45"
              >
                {uploading ? "Uploading..." : "Upload photo"}
              </label>
              <input
                id={`img-${item.id}`}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
              {image && (
                <button
                  type="button"
                  onClick={() => setImage("")}
                  className="text-[0.8125rem] text-muted underline underline-offset-4 hover:text-charcoal"
                >
                  Remove photo
                </button>
              )}
            </div>
            <p className="mt-2 text-[0.75rem] text-muted">
              Surfaces without a photograph are shown as a typographic block
              instead, never with stock imagery.
            </p>
          </Field>
        )}

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-[0.8125rem] text-muted">
            Order
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={`${INPUT} tabular w-20`}
            />
          </label>

          <div className="ml-auto flex gap-2">
            {!isNew && (
              <Button variant="secondary" disabled={pending} onClick={remove}>
                <span>Remove</span>
              </Button>
            )}
            <Button disabled={pending} onClick={save}>
              <span>{pending ? "Saving..." : "Save"}</span>
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
