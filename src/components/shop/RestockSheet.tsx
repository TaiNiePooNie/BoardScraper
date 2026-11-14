"use client";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ASSETS } from "@/lib/assets";
import type { RestockStatus, ShopServices } from "./services";

const PASS_KEY = "boardbuddy.restock.pass";
const readPass = () => {
  try {
    return localStorage.getItem(PASS_KEY) ?? "";
  } catch {
    return "";
  }
};

const STATE_TEXT: Record<RestockStatus["state"], string> = {
  idle: "Racks are stocked.",
  queued: "Restock queued: waiting for a runner…",
  in_progress: "Restocking: checking every shop's prices…",
  completed: "Restock finished.",
};

/** Owner-only "restock now": starts the scrape workflow and shows its progress. */
export function RestockSheet({ services, onClose, onFinished }: { services: ShopServices; onClose: () => void; onFinished: () => void }) {
  const [pass, setPass] = useState(readPass);
  const [status, setStatus] = useState<RestockStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const restock = services.restock;

  const poll = () => {
    if (!restock) return;
    clearInterval(timer.current);
    timer.current = setInterval(async () => {
      try {
        const s = await restock.status();
        setStatus(s);
        if (s.state === "completed") {
          clearInterval(timer.current);
          onFinished();
        }
      } catch {
        /* keep polling */
      }
    }, 10_000);
  };

  useEffect(() => {
    if (!restock) return;
    restock.status().then((s) => {
      setStatus(s);
      if (s.state === "queued" || s.state === "in_progress") poll();
    }).catch(() => {});
    return () => clearInterval(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    if (!restock) return;
    setBusy(true);
    setError(null);
    try {
      try {
        localStorage.setItem(PASS_KEY, pass);
      } catch {
        /* ignore */
      }
      setStatus(await restock.start(pass));
      poll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const running = status?.state === "queued" || status?.state === "in_progress";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-asphalt/70 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Restock the shop" onClick={onClose}>
      <div className="sticker relative w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} className="absolute right-3 top-3 rounded-full p-1" aria-label="Close"><X className="h-5 w-5" /></button>
        <img src={running ? ASSETS.mascot.ride : ASSETS.mascot.point} alt="" className="mx-auto -mt-16 h-28 w-auto" />
        <h2 className="headline mt-1 text-3xl">Restock the shop</h2>

        {!restock ? (
          <p className="mt-2 text-sm text-paper/75">
            This test build is a snapshot of the racks. To refresh it, ask Claude in your chat: <b className="text-paper">&quot;restock the shop&quot;</b>. The live site restocks itself every night and has a Restock button for you.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-paper/75">Re-checks every shop now instead of waiting for tonight. Takes about 25 minutes; the racks update when it&apos;s done.</p>
            {status && <p className="mt-3 rounded-lg bg-paper/5 px-3 py-2 text-sm font-semibold">{STATE_TEXT[status.state]}{status.conclusion && status.state === "completed" ? ` (${status.conclusion})` : ""}</p>}
            {!running && (
              <div className="mt-3 flex flex-col gap-2">
                <label htmlFor="restock-pass" className="text-xs font-bold uppercase tracking-[0.14em] text-paper/60">Owner passcode</label>
                <input id="restock-pass" type="password" autoComplete="current-password" className="input" value={pass} onChange={(e) => setPass(e.target.value)} />
                <button type="button" className="btn-acid mt-1" disabled={busy || !pass} onClick={start}>{busy ? "Starting…" : "Restock now"}</button>
              </div>
            )}
            {error && <p className="mt-2 text-sm font-semibold text-orange">{error}</p>}
            {status?.url && <a href={status.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-acid underline">See progress on GitHub</a>}
          </>
        )}
      </div>
    </div>
  );
}
