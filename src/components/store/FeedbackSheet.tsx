"use client";
import clsx from "clsx";
import { Bug, CheckCircle2, CircleHelp, Film, Heart, ImagePlus, Lightbulb, MessageSquare, Paperclip, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ALLOWED_MIME, FEEDBACK_LIMITS, FeedbackInput, KIND_LABEL, mediaLimitError, type FeedbackKind } from "@/lib/feedback";
import type { FeedbackServices } from "../shop/services";
import { Sheet } from "./Sheet";

const KINDS: { id: FeedbackKind; icon: typeof Bug; hint: string }[] = [
  { id: "question", icon: CircleHelp, hint: "Ask us anything" },
  { id: "bug", icon: Bug, hint: "Something's broken" },
  { id: "feature", icon: Lightbulb, hint: "An idea for the app" },
  { id: "feedback", icon: Heart, hint: "Tell us what you think" },
  { id: "other", icon: MessageSquare, hint: "Anything else" },
];

const TEMPLATE: Record<FeedbackKind, { subject: string; message: string }> = {
  question: { subject: "e.g. Which size should I get for powder?", message: "Your question…" },
  bug: { subject: "e.g. Prices don't load on the surf tab", message: "What happened?\n\nWhat did you expect?\n\nSteps to make it happen again:\n1. \n2. " },
  feature: { subject: "e.g. Compare two boards side by side", message: "What would you like the app to do?\n\nWhy would it help you?" },
  feedback: { subject: "e.g. Love the size finder!", message: "What do you like, and what could be better?" },
  other: { subject: "Subject", message: "Your message…" },
};

const fmtMB = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Big phone photos → ≤ 2000 px JPEG so uploads are quick. Falls back to the original. */
async function shrinkImage(f: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) || f.size < 1.5 * 1024 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob && blob.size < f.size ? new File([blob], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

interface Attached { file: File; url: string; error: string | null }

export function FeedbackSheet({ service, email, page, onClose, initialKind = "feedback" }: {
  service: FeedbackServices;
  email?: string | null;
  /** Extra context (page, sport, board) the sender can choose to include. */
  page: Record<string, unknown>;
  onClose: () => void;
  initialKind?: FeedbackKind;
}) {
  const [kind, setKind] = useState<FeedbackKind>(initialKind);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [mail, setMail] = useState(email ?? "");
  const [website, setWebsite] = useState("");
  const [includeTech, setIncludeTech] = useState(true);
  const [files, setFiles] = useState<Attached[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { failed: string[] }>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => files.forEach((a) => URL.revokeObjectURL(a.url)), [files]);
  // Message starts from the kind's template until the user types.
  const touched = useRef(false);
  useEffect(() => { if (!touched.current) setMessage(kind === "bug" || kind === "feature" ? TEMPLATE[kind].message : ""); }, [kind]);

  const tech = useMemo(() => ({
    ...page,
    url: typeof location !== "undefined" ? location.href : undefined,
    screen: typeof window !== "undefined" ? `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x` : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    language: typeof navigator !== "undefined" ? navigator.language : undefined,
    time: new Date().toISOString(),
  }), [page]);

  const addFiles = async (list: FileList | null) => {
    if (!list) return;
    const room = FEEDBACK_LIMITS.files - files.length;
    const picked = [...list].slice(0, Math.max(0, room));
    const next: Attached[] = [];
    for (const raw of picked) {
      const f = await shrinkImage(raw);
      const type = f.type || (/\.mov$/i.test(f.name) ? "video/quicktime" : "");
      const file = type === f.type ? f : new File([f], f.name, { type });
      const error = !ALLOWED_MIME.test(file.type) ? "Only photos and videos" : mediaLimitError({ mime: file.type, size: file.size });
      next.push({ file, url: URL.createObjectURL(file), error });
    }
    if (list.length > picked.length) setError(`Up to ${FEEDBACK_LIMITS.files} files per message.`);
    setFiles((cur) => [...cur, ...next]);
  };
  const total = files.reduce((n, a) => n + (a.error ? 0 : a.file.size), 0);
  const overTotal = total > FEEDBACK_LIMITS.totalBytes;

  const submit = async () => {
    setError(null);
    const payload: FeedbackInput = { kind, subject, message, email: mail.trim(), website, context: includeTech ? tech : { ...page } };
    const parsed = FeedbackInput.safeParse(payload);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the form"); return; }
    if (message.trim() === TEMPLATE[kind].message.trim()) { setError("Fill in the message: tell us what happened."); return; }
    if (kind === "question" && !mail.trim()) { setError("Add your email so we can answer your question."); return; }
    if (overTotal) { setError(`Attachments can total up to ${FEEDBACK_LIMITS.totalBytes / 1024 / 1024} MB.`); return; }
    setBusy(true);
    try {
      const r = await service.send(parsed.data, files.filter((a) => !a.error).map((a) => a.file), setProgress);
      setDone({ failed: r.failedFiles });
    } catch (e) {
      setError((e as Error).message || "Couldn't send. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Sheet title="Feedback & support" onClose={onClose} side="center" footer={<button type="button" className="btn-primary w-full" onClick={onClose}>Back to the shop</button>}>
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-ok" />
          <h3 className="text-xl font-bold">Thanks, we got it!</h3>
          <p className="text-sm text-muted">{mail.trim() ? `We'll reply to ${mail.trim()} if we need more info.` : "You didn't leave an email, so we can't reply, but we read everything."}</p>
          {done.failed.length > 0 && <p className="text-sm text-[#8a5a00]">These files didn&apos;t upload: {done.failed.join(", ")}.</p>}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Feedback & support"
      onClose={onClose}
      wide
      footer={
        <div>
          {error && <p className="mb-2 text-sm font-medium text-sale" role="alert">{error}</p>}
          {busy && files.length > 0 && <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-ink transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} /></div>}
          <button type="button" className="btn-primary w-full" disabled={busy} onClick={submit}>{busy ? (files.length ? `Uploading… ${Math.round(progress * 100)}%` : "Sending…") : `Send ${KIND_LABEL[kind].toLowerCase()}`}</button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="What's it about?" className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {KINDS.map(({ id, icon: Icon, hint }) => (
            <button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => setKind(id)} title={hint}
              className={clsx("flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 text-xs font-semibold transition", kind === id ? "border-ink bg-surface" : "border-line text-muted hover:border-ink")}>
              <Icon className="h-5 w-5" />{KIND_LABEL[id]}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Subject</span>
          <input className="input mt-1 !py-2.5 !text-base" maxLength={140} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={TEMPLATE[kind].subject} />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Message</span>
          <textarea className="input mt-1 min-h-[140px] resize-y !text-base leading-relaxed" maxLength={5000} value={message}
            onChange={(e) => { touched.current = true; setMessage(e.target.value); }} placeholder={TEMPLATE[kind].message} />
        </label>

        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">Screenshots or video</span>
            <span className="text-xs text-muted">{files.length}/{FEEDBACK_LIMITS.files}{total ? ` · ${fmtMB(total)}` : ""}</span>
          </div>
          <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {files.map((a, i) => (
              <div key={a.url} className={clsx("relative aspect-square overflow-hidden rounded-xl border bg-surface", a.error ? "border-sale" : "border-line")}>
                {a.file.type.startsWith("video/") ? (
                  <div className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center text-[10px] text-muted"><Film className="h-6 w-6" /><span className="line-clamp-2 break-all">{a.file.name}</span></div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.file.name} className="h-full w-full object-cover" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-ink/70 px-1 text-center text-[10px] text-white">{a.error ?? fmtMB(a.file.size)}</span>
                <button type="button" onClick={() => setFiles((cur) => cur.filter((_, k) => k !== i))} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 shadow" aria-label={`Remove ${a.file.name}`}><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {files.length < FEEDBACK_LIMITS.files && (
              <button type="button" onClick={() => input.current?.click()} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs font-semibold text-muted hover:border-ink hover:text-ink">
                <ImagePlus className="h-6 w-6" />Add
              </button>
            )}
          </div>
          <input ref={input} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Paperclip className="h-3 w-3" />Photos up to {FEEDBACK_LIMITS.imageBytes / 1024 / 1024} MB, videos up to {FEEDBACK_LIMITS.videoBytes / 1024 / 1024} MB.</p>
        </div>

        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Your email {kind === "question" ? "(so we can answer)" : "(optional)"}</span>
          <input type="email" inputMode="email" autoComplete="email" className="input mt-1 !py-2.5 !text-base" value={mail} onChange={(e) => setMail(e.target.value)} placeholder="you@example.com" />
        </label>
        {/* honeypot */}
        <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />

        <details className="rounded-2xl border border-line px-4 py-3 text-sm">
          <summary className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={includeTech} onChange={(e) => setIncludeTech(e.target.checked)} onClick={(e) => e.stopPropagation()} className="h-4 w-4 accent-ink" />
            <span className="font-semibold">Include technical info</span><span className="text-muted">(helps with bugs)</span>
          </summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-all text-xs text-muted">{JSON.stringify(tech, null, 2)}</pre>
        </details>
      </div>
    </Sheet>
  );
}
