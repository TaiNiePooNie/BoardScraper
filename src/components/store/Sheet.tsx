"use client";
import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** Bottom sheet on phones, right-side drawer (or centred dialog) on larger screens. */
export function Sheet({ title, onClose, children, footer, side = "right", wide = false, label }: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  side?: "right" | "center";
  wide?: boolean;
  label?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={label ?? (typeof title === "string" ? title : undefined)}>
      <button type="button" aria-label="Close" className="absolute inset-0 animate-[fade_.2s_ease-out] bg-ink/40" onClick={onClose} />
      <div
        className={clsx(
          "absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col rounded-t-3xl bg-white shadow-2xl animate-[sheet-up_.25s_cubic-bezier(.2,.8,.2,1)]",
          side === "right"
            ? "sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:rounded-none sm:rounded-l-3xl sm:animate-[sheet-left_.25s_cubic-bezier(.2,.8,.2,1)]"
            : "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl",
          side === "right" ? (wide ? "sm:w-[520px]" : "sm:w-[420px]") : wide ? "sm:w-[640px]" : "sm:w-[460px]",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-line sm:hidden" aria-hidden />
        {title !== undefined && (
          <div className="flex shrink-0 items-center gap-3 px-5 pb-2 pt-3 sm:pt-5">
            <h2 className="min-w-0 flex-1 text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} className="-mr-1 rounded-full p-2 hover:bg-surface" aria-label="Close"><X className="h-5 w-5" /></button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
