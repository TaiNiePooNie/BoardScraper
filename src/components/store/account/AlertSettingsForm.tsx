"use client";
import clsx from "clsx";
import type { AlertSettings } from "@/lib/account";
import type { Buddy } from "@/lib/profile";
import { Toggle } from "../Sheet";
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
    <fieldset disabled={disabled} className={clsx("flex flex-col gap-3", disabled && "opacity-50")}>
      <Toggle label="Email me deals" hint="Boards that fit you, in your budget. Unsubscribe in one tap." on={value.enabled} onChange={(v) => set("enabled", v)} />

      {value.enabled && (
        <>
          <div role="radiogroup" aria-label="How often" className="grid grid-cols-2 gap-2">
            {([["weekly", "Weekly roundup", "One email on a day you pick"], ["new-match", "When a new board fits", "As it happens, max one a day"]] as const).map(([id, label, hint]) => (
              <button key={id} type="button" role="radio" aria-checked={value.mode === id} onClick={() => set("mode", id)} className={clsx("rounded-card border px-3 py-2.5 text-left transition", value.mode === id ? "border-ink bg-surface" : "border-line hover:border-ink")}>
                <span className="block text-sm font-bold text-ink">{label}</span>
                <span className="block text-xs font-normal text-muted">{hint}</span>
              </button>
            ))}
          </div>
          {value.mode === "weekly" && (
            <label htmlFor="alerts-day" className="flex items-center justify-between gap-3 text-sm font-semibold">
              Send it on
              <select id="alerts-day" className="input !w-auto" value={value.weekday} onChange={(e) => set("weekday", Number(e.target.value))}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
          )}
          <Toggle label="Price drops on saved boards" hint="Tell me when a board I saved gets cheaper" on={value.priceDrops} onChange={(v) => set("priceDrops", v)} />
          {buddies.length > 1 && (
            <div>
              <p className="label mb-1.5">Deals for</p>
              <div className="flex flex-wrap gap-1.5">
                {buddies.map((b) => (
                  <button key={b.id} type="button" aria-pressed={included(b.id)} onClick={() => toggleBuddy(b.id)} className="chip !pl-1.5">
                    <Avatar n={b.avatar} name={b.name} size={26} />{b.name}
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
