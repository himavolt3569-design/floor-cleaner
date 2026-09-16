"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSettings } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "./ui";
import type { SiteSettings } from "@/types";

const INPUT =
  "h-10 w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 text-[0.875rem] text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";
const AREA =
  "w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 py-2 text-[0.875rem] leading-relaxed text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [s, setS] = useState({
    announcement: settings.announcement ?? "",
    announcementEnabled: settings.announcementEnabled,
    heroEyebrow: settings.hero.eyebrow,
    heroHeadline: settings.hero.headline.join("\n"),
    heroBody: settings.hero.body,
    heroSupport: settings.hero.support,
    introEyebrow: settings.intro.eyebrow,
    introHeadline: settings.intro.headline,
    introBody: settings.intro.body,
    whyHeadline: settings.why.headline,
    whyBody: settings.why.body.join("\n\n"),
    usageNote: settings.usageNote ?? "",
    phone: settings.contact.phone,
    whatsapp: settings.contact.whatsapp,
    email: settings.contact.email,
    address: settings.contact.address,
  });
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();
  const [pending, start] = useTransition();
  const router = useRouter();

  const patch = (p: Partial<typeof s>) => setS((prev) => ({ ...prev, ...p }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    start(async () => {
      const r = await saveSettings(s);
      setMessage(
        r.ok
          ? { tone: "success", text: "Saved. The storefront is updated." }
          : { tone: "error", text: r.error ?? "That did not save." },
      );
      if (r.ok) router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Panel title="Announcement bar">
        <div className="grid gap-4 p-5">
          <Field label="Message">
            <input
              className={INPUT}
              value={s.announcement}
              onChange={(e) => patch({ announcement: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-[0.875rem] text-charcoal">
            <input
              type="checkbox"
              checked={s.announcementEnabled}
              onChange={(e) => patch({ announcementEnabled: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-forest)]"
            />
            Show the bar at the top of the page
          </label>
        </div>
      </Panel>

      <Panel title="Hero">
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <Field label="Eyebrow">
            <input className={INPUT} value={s.heroEyebrow} onChange={(e) => patch({ heroEyebrow: e.target.value })} />
          </Field>
          <Field label="Support line">
            <input className={INPUT} value={s.heroSupport} onChange={(e) => patch({ heroSupport: e.target.value })} />
          </Field>
          <Field label="Headline, one line per row" className="lg:col-span-2">
            <textarea
              rows={3}
              className={AREA}
              value={s.heroHeadline}
              onChange={(e) => patch({ heroHeadline: e.target.value })}
            />
            <p className="mt-1.5 text-[0.75rem] text-muted">
              Each row becomes one line of the big heading, and each animates in
              separately.
            </p>
          </Field>
          <Field label="Body" className="lg:col-span-2">
            <textarea rows={3} className={AREA} value={s.heroBody} onChange={(e) => patch({ heroBody: e.target.value })} />
          </Field>
        </div>
      </Panel>

      <Panel title="Introduction">
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <Field label="Eyebrow">
            <input className={INPUT} value={s.introEyebrow} onChange={(e) => patch({ introEyebrow: e.target.value })} />
          </Field>
          <Field label="Headline">
            <input className={INPUT} value={s.introHeadline} onChange={(e) => patch({ introHeadline: e.target.value })} />
          </Field>
          <Field label="Body" className="lg:col-span-2">
            <textarea rows={4} className={AREA} value={s.introBody} onChange={(e) => patch({ introBody: e.target.value })} />
          </Field>
        </div>
      </Panel>

      <Panel title="Why TMG">
        <div className="grid gap-4 p-5">
          <Field label="Headline">
            <input className={INPUT} value={s.whyHeadline} onChange={(e) => patch({ whyHeadline: e.target.value })} />
          </Field>
          <Field label="Paragraphs, separated by a blank line">
            <textarea rows={7} className={AREA} value={s.whyBody} onChange={(e) => patch({ whyBody: e.target.value })} />
          </Field>
        </div>
      </Panel>

      <Panel title="How to use">
        <div className="grid gap-4 p-5">
          <Field label="Manufacturer note, optional">
            <textarea
              rows={3}
              className={AREA}
              placeholder="Add the dilution and application guidance once the manufacturer supplies it."
              value={s.usageNote}
              onChange={(e) => patch({ usageNote: e.target.value })}
            />
            <p className="mt-1.5 text-[0.75rem] text-muted">
              Leave blank and no note is shown. Do not invent dilution ratios.
            </p>
          </Field>
        </div>
      </Panel>

      <Panel title="Contact">
        <div className="grid gap-4 p-5 lg:grid-cols-2">
          <Field label="Phone">
            <input className={`${INPUT} tabular`} value={s.phone} onChange={(e) => patch({ phone: e.target.value })} />
          </Field>
          <Field label="WhatsApp">
            <input className={`${INPUT} tabular`} value={s.whatsapp} onChange={(e) => patch({ whatsapp: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className={INPUT} type="email" value={s.email} onChange={(e) => patch({ email: e.target.value })} />
          </Field>
          <Field label="Address">
            <input className={INPUT} value={s.address} onChange={(e) => patch({ address: e.target.value })} />
          </Field>
        </div>
      </Panel>

      <Button type="submit" size="lg" disabled={pending}>
        <span>{pending ? "Saving..." : "Save all settings"}</span>
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </span>
      {children}
    </div>
  );
}
