"use client";
import { useState } from "react";

export function ControlCenter({ sections, initial = "copy" }: { sections: { id: string; label: string; content: React.ReactNode }[]; initial?: string }) {
  const [active, setActive] = useState(sections.some(s => s.id === initial) ? initial : sections[0].id);
  return <div>
    <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-charcoal/10 bg-paper p-2" role="tablist" aria-label="Store controls">
      {sections.map((section, i) => <button key={section.id} id={`tab-${section.id}`} role="tab" aria-selected={active === section.id} aria-controls={`panel-${section.id}`} tabIndex={active === section.id ? 0 : -1} onKeyDown={e => { const index = e.key === "ArrowRight" ? (i + 1) % sections.length : e.key === "ArrowLeft" ? (i + sections.length - 1) % sections.length : e.key === "Home" ? 0 : e.key === "End" ? sections.length - 1 : -1; if (index >= 0) { e.preventDefault(); setActive(sections[index].id); document.getElementById(`tab-${sections[index].id}`)?.focus(); } }} onClick={() => setActive(section.id)} className={`rounded-xl px-4 py-3 text-sm font-semibold ${active === section.id ? "bg-forest text-paper" : "text-muted hover:bg-ivory"}`}>{section.label}</button>)}
    </div>
    {sections.map(section => <section key={section.id} id={`panel-${section.id}`} role="tabpanel" aria-labelledby={`tab-${section.id}`} hidden={active !== section.id} tabIndex={0}>{section.content}</section>)}
  </div>;
}
