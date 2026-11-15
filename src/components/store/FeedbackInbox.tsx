"use client";
import clsx from "clsx";
import { Mail, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { KIND_LABEL } from "@/lib/feedback";
import type { FeedbackItem, FeedbackServices } from "../shop/services";
import { Sheet } from "./Sheet";

const STATUS_STYLE: Record<FeedbackItem["status"], string> = { new: "bg-sale text-white", read: "bg-surface text-ink", done: "bg-ok/15 text-ok" };

/** Owner-only list of Feedback & support messages with their attachments. */
export function FeedbackInbox({ service, onClose }: { service: FeedbackServices; onClose: () => void }) {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(() => {
    service.inbox.list().then(setItems).catch((e) => setError((e as Error).message));
  }, [service]);
  useEffect(load, [load]);

  const set = async (id: number, status: FeedbackItem["status"]) => {
    setItems((xs) => xs?.map((x) => (x.id === id ? { ...x, status } : x)) ?? null);
    await service.inbox.setStatus(id, status).catch(load);
  };
  const remove = async (id: number) => {
    if (!confirm("Delete this message and its attachments?")) return;
    setItems((xs) => xs?.filter((x) => x.id !== id) ?? null);
    await service.inbox.remove(id).catch(load);
  };
  const open = (it: FeedbackItem) => {
    setOpenId(openId === it.id ? null : it.id);
    if (it.status === "new") set(it.id, "read");
  };

  const shown = (items ?? []).filter((x) => filter === "all" || x.status !== "done");
  const nNew = (items ?? []).filter((x) => x.status === "new").length;

  return (
    <Sheet title={`Feedback inbox${nNew ? ` (${nNew} new)` : ""}`} onClose={onClose} wide>
      <div className="mb-3 flex gap-1.5" role="radiogroup" aria-label="Show">
        {(["open", "all"] as const).map((f) => <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)} className="chip">{f === "open" ? "To do" : "Everything"}</button>)}
      </div>
      {error && <p className="text-sm text-sale">{error}</p>}
      {!items && !error && <p className="text-sm text-muted">Loading…</p>}
      {items && shown.length === 0 && <p className="py-8 text-center text-sm text-muted">Nothing here. 🎉</p>}
      <ul className="flex flex-col gap-2">
        {shown.map((it) => (
          <li key={it.id} className="rounded-2xl border border-line">
            <button type="button" onClick={() => open(it)} className="flex w-full items-start gap-3 px-4 py-3 text-left" aria-expanded={openId === it.id}>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className={clsx("rounded-full px-2 py-0.5 font-bold", STATUS_STYLE[it.status])}>{it.status}</span>
                  <span className="font-semibold">{KIND_LABEL[it.kind]}</span>
                  <span className="text-muted">· {new Date(it.createdAt).toLocaleString()}{it.media.length ? ` · ${it.media.length} file${it.media.length > 1 ? "s" : ""}` : ""}</span>
                </span>
                <span className="mt-0.5 block truncate font-semibold">{it.subject}</span>
                <span className="block truncate text-sm text-muted">{it.email ?? "No email"}</span>
              </span>
            </button>
            {openId === it.id && (
              <div className="border-t border-line px-4 py-3 text-sm">
                <p className="whitespace-pre-wrap">{it.message}</p>
                {it.media.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {it.media.map((m) => (
                      <a key={m.id} href={service.inbox.mediaUrl(m.id)} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-xl border border-line bg-surface">
                        {m.mime.startsWith("video/")
                          ? <video src={service.inbox.mediaUrl(m.id)} controls preload="metadata" className="aspect-square w-full object-cover" />
                          // eslint-disable-next-line @next/next/no-img-element
                          : <img src={service.inbox.mediaUrl(m.id)} alt={m.filename} loading="lazy" className="aspect-square w-full object-cover" />}
                      </a>
                    ))}
                  </div>
                )}
                {it.context && (
                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer font-semibold text-muted">Technical info</summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all text-muted">{JSON.stringify(it.context, null, 2)}</pre>
                  </details>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {it.email && <a className="btn-primary !px-4 !py-2 !text-sm" href={`mailto:${it.email}?subject=${encodeURIComponent(`Re: ${it.subject}`)}`}><Mail className="h-4 w-4" />Reply</a>}
                  {it.status !== "done" ? <button type="button" className="btn-ghost !py-2" onClick={() => set(it.id, "done")}>Mark done</button> : <button type="button" className="btn-ghost !py-2" onClick={() => set(it.id, "read")}>Reopen</button>}
                  <button type="button" className="btn-ghost ml-auto !py-2 text-sale" onClick={() => remove(it.id)} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
