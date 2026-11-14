"use client";
import clsx from "clsx";
import type { AlertSettings } from "@/lib/account";
import type { Buddy } from "@/lib/profile";
import { Avatar } from "./Avatar";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Deal-alert email settings. Opt-in; nothing is sent while "enabled" is off. */
export function AlertSettingsForm({ value, onChange, buddies, disabled }: { value: AlertSettings; onChange: (a: AlertSettings) => void; buddies: Buddy[]; disabled?: boolean }) {
  const set = <K extends keyof AlertSettings>(k: K, v: AlertSettings[K]) => onChange({ ...value, [k]: v });
  const toggleBuddy = (id: string) => {
    const all = value.buddyIds.length === 0 ? buddies.map((b) => b.id) : value.buddyIds;
    const next = all.includes(id) ? all.filter((x) => x !== id) : [...all, id];
    set("buddyIds", next.length === buddies.length ? [] : next);
  };
  const included = (id: string) => value.buddyIds.length === 0 || value.buddyIds.includes(id);

  return (
    <fieldset disabled={disabled} className={clsx("flex flex-col gap-4", disabled && "opacity-50")}>
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-semibold">Email me deals</span>
          <span className="block text-xs text-paper/60">Boards that fit you, in your budget. Unsubscribe in one tap.</span>
        </span>
        <input id="alerts-enabled" type="checkbox" role="switch" checked={value.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-7 w-12 cursor-pointer appearance-none rounded-full bg-paper/20 transition before:block before:h-6 before:w-6 before:translate-x-0.5 before:rounded-full before:bg-paper before:transition checked:bg-acid checked:before:translate-x-[22px]" />
      </label>

      {value.enabled && (
        <>
          <div role="radiogroup" aria-label="How often" className="grid grid-cols-2 gap-2">
            {([["weekly", "Weekly roundup", "One email on a day you pick"], ["new-match", "When a new board fits", "As it happens, max one a day"]] as const).map(([id, label, hint]) => (
              <button key={id} type="button" role="radio" aria-checked={value.mode === id} onClick={() => set("mode", id)}
                className={clsx("rounded-xl border-2 p-3 text-left", value.mode === id ? "border-acid bg-acid/10" : "border-paper/15")}>
                <span className="block text-sm font-bold">{label}</span>
                <span className="block text-[11px] text-paper/60">{hint}</span>
              </button>
            ))}
          </div>
          {value.mode === "weekly" && (
            <label htmlFor="alerts-day" className="flex items-center justify-between gap-3 text-sm">
              Send it on
              <select id="alerts-day" className="input w-auto" value={value.weekday} onChange={(e) => set("weekday", Number(e.target.value))}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
          )}
          <label className="flex items-center gap-3 text-sm">
            <input id="alerts-drops" type="checkbox" checked={value.priceDrops} onChange={(e) => set("priceDrops", e.target.checked)} className="h-5 w-5 accent-[var(--color-acid)]" />
            Also tell me when a board I&apos;m holding drops in price
          </label>
          {buddies.length > 1 && (
            <div>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-paper/60">Deals for</div>
              <div className="flex flex-wrap gap-2">
                {buddies.map((b) => (
                  <button key={b.id} type="button" aria-pressed={included(b.id)} onClick={() => toggleBuddy(b.id)}
                    className={clsx("flex items-center gap-1.5 rounded-full border-2 py-1 pl-1 pr-3 text-sm font-semibold", included(b.id) ? "border-acid" : "border-paper/20 opacity-60")}>
                    <Avatar n={b.avatar} name={b.name} size={24} />{b.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
