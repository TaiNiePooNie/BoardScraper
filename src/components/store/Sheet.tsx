"use client";
import clsx from "clsx";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { useDialog } from "./useDialog";

/**
 * The one overlay for everything that isn't the shop or a product: a bottom sheet on phones,
 * a right-side drawer (or a centred dialog) on larger screens. Title, scrolling body, optional
 * sticky footer for the main action.
 */
export function Sheet({ title, onClose, children, footer, side = "right", wide = false, label }: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "center";
  wide?: boolean;
  label?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useDialog(panel, onClose);

  return (
    <div className="fixed inset-0 z-[60]">
      <div aria-hidden className="absolute inset-0 animate-[fade_.2s_ease-out] bg-ink/40" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label ?? (typeof title === "string" ? title : undefined)}
        data-dialog-panel
        className={clsx(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-sheet bg-white shadow-sheet animate-[sheet-up_.25s_cubic-bezier(.2,.8,.2,1)]",
          side === "right"
            ? "sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:rounded-none sm:rounded-l-sheet sm:animate-[sheet-left_.25s_cubic-bezier(.2,.8,.2,1)]"
            : "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-sheet sm:animate-[fade_.2s_ease-out]",
          side === "right" ? (wide ? "sm:w-[520px]" : "sm:w-[420px]") : wide ? "sm:w-[640px]" : "sm:w-[460px]",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />
        {title !== undefined && (
          <div className="flex shrink-0 items-center gap-3 pb-1 pl-5 pr-2 pt-1 sm:pt-3">
            <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} className="icon-btn" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** A titled block inside a sheet; blocks are separated by a hairline. */
export function Group({ title, hint, action, children }: { title: string; hint?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-t border-line py-4 first:border-t-0 first:pt-1">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold">{title}</h3>
        {action}
      </div>
      {hint && <p className="-mt-1 mb-3 text-xs text-muted">{hint}</p>}
      {children}
    </section>
  );
}

/** Full-width on/off row. */
export function Toggle({ label, hint, on, onChange, disabled }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} className="flex min-h-11 w-full items-center gap-3 py-1.5 text-left disabled:opacity-50">
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
      <span className="switch" data-on={on} aria-hidden />
    </button>
  );
}
