"use client";
import { useEffect, useRef, useState } from "react";
import { AssetImg } from "@/components/AssetImg";
import { ASSETS } from "@/lib/assets";
import type { RestockStatus, ShopServices } from "../shop/services";
import { Sheet } from "./Sheet";

const STATE_TEXT: Record<RestockStatus["state"], string> = {
  idle: "Prices are up to date.",
  queued: "Restock queued: waiting for a runner…",
  in_progress: "Restocking: checking every shop's prices…",
  completed: "Restock finished.",
};

/** Owner-only "restock now" (shown only to OWNER_EMAILS): starts the scrape workflow and shows its progress. */
export function RestockSheet({ services, onClose, onFinished }: { services: ShopServices; onClose: () => void; onFinished: () => void }) {
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
      setStatus(await restock.start());
      poll();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const running = status?.state === "queued" || status?.state === "in_progress";

  return (
    <Sheet title="Restock the shop" onClose={onClose} side="center">
      <div className="flex items-start gap-3">
        <AssetImg src={running ? ASSETS.mascot.ride : ASSETS.mascot.point} alt="" className="h-20 w-auto shrink-0" />
        {!restock ? (
          <p className="text-sm text-muted">
            This test build is a snapshot of the shops. To refresh it, ask Claude in your chat: <b className="text-ink">&quot;restock the shop&quot;</b>. The live site restocks itself every night and has a Restock button for you.
          </p>
        ) : (
          <p className="text-sm text-muted">Re-checks every shop now instead of waiting for tonight. Takes about 25 minutes; prices update when it&apos;s done.</p>
        )}
      </div>
      {restock && (
        <div className="mt-4 flex flex-col gap-2">
          {status && <p className="note-info !text-sm" role="status">{STATE_TEXT[status.state]}{status.conclusion && status.state === "completed" ? ` (${status.conclusion})` : ""}</p>}
          {!running && <button type="button" className="btn-primary" disabled={busy} onClick={start}>{busy ? "Starting…" : "Restock now"}</button>}
          {error && <p className="text-sm font-medium text-sale" role="alert">{error}</p>}
          {status?.url && <a href={status.url} target="_blank" rel="noopener noreferrer" className="link text-xs">See progress on GitHub</a>}
        </div>
      )}
    </Sheet>
  );
}
