"use client";
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

/** Open dialogs, bottom to top. Only the top one reacts to Escape and Tab. */
const stack: symbol[] = [];

/**
 * Modal behaviour for sheets and the product page:
 *  - focus moves into the dialog when it opens and returns to the opener when it closes;
 *  - Tab / Shift+Tab stay inside the top dialog; Escape closes only the top dialog;
 *  - the page behind doesn't scroll.
 * Give the container `tabIndex={-1}` and pass its ref.
 */
export function useDialog(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const id = Symbol("dialog");
    stack.push(id);
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current;
    // Focus the dialog itself (not its first button), so screen readers announce its label
    // and phones don't pop the keyboard for an input.
    if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id || !el) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((n) => n.getClientRects().length > 0);
      if (!items.length) { e.preventDefault(); el.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement as HTMLElement | null;
      if (!at || !el.contains(at)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && (at === first || at === el)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      stack.splice(stack.indexOf(id), 1);
      document.body.style.overflow = prevOverflow;
      if (opener && opener.isConnected && typeof opener.focus === "function") opener.focus({ preventScroll: true });
    };
  }, [ref]);
}
