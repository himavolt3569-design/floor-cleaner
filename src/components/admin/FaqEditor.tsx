"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteFaq, saveFaq } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "./ui";
import type { Faq } from "@/types";

const INPUT =
  "h-10 w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 text-[0.875rem] text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";
const AREA =
  "w-full rounded-[9px] border border-charcoal/18 bg-paper px-3 py-2 text-[0.875rem] leading-relaxed text-charcoal focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/18";

export function FaqEditor({ faqs }: { faqs: Faq[] }) {
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string }>();
  const [newFaqId, setNewFaqId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      {faqs.map((faq) => (
        <Row key={faq.id} faq={faq} onDone={setMessage} />
      ))}

      {newFaqId ? (
        <Row
          faq={{
            id: newFaqId,
            question: "",
            answer: "",
            sortOrder: faqs.length + 1,
            active: true,
          }}
          isNew
          onDone={(m) => {
            setMessage(m);
            if (m.tone === "success") setNewFaqId(null);
          }}
        />
      ) : (
        <Button
          variant="secondary"
          onClick={() => setNewFaqId(`faq-${Date.now()}`)}
        >
          <span>Add a question</span>
        </Button>
      )}
    </div>
  );
}

function Row({
  faq,
  isNew,
  onDone,
}: {
  faq: Faq;
  isNew?: boolean;
  onDone: (m: { tone: "success" | "error"; text: string }) => void;
}) {
  const [question, setQuestion] = useState(faq.question);
  const [answer, setAnswer] = useState(faq.answer);
  const [active, setActive] = useState(faq.active);
  const [sortOrder, setSortOrder] = useState(String(faq.sortOrder));
  const [pending, start] = useTransition();
  const router = useRouter();

  const save = () =>
    start(async () => {
      const r = await saveFaq({
        id: faq.id,
        question: question.trim(),
        answer: answer.trim(),
        active,
        sortOrder: Number(sortOrder || 0),
      });
      onDone(
        r.ok
          ? { tone: "success", text: "Question saved." }
          : { tone: "error", text: r.error ?? "That did not save." },
      );
      if (r.ok) router.refresh();
    });

  const remove = () =>
    start(async () => {
      const r = await deleteFaq(faq.id);
      onDone(
        r.ok
          ? { tone: "success", text: "Question removed." }
          : { tone: "error", text: r.error ?? "Could not remove that." },
      );
      if (r.ok) router.refresh();
    });

  return (
    <Panel title={isNew ? "New question" : question || faq.id}>
      <div className="grid gap-4 p-5">
        <div>
          <span className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
            Question
          </span>
          <input className={INPUT} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </div>

        <div>
          <span className="mb-1.5 block text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-muted">
            Answer
          </span>
          <textarea rows={3} className={AREA} value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-[0.875rem] text-charcoal">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-forest)]"
            />
            Show on the site
          </label>

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
