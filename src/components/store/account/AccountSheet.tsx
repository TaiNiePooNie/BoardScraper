"use client";
import clsx from "clsx";
import { FitWord } from "../look";
import { SCREEN_HUE } from "@/lib/look";
import { LogOut, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AssetImg } from "@/components/AssetImg";
import type { AlertSettings } from "@/lib/account";
import { ASSETS } from "@/lib/assets";
import type { Buddy } from "@/lib/profile";
import type { AccountServices, AccountUser, Providers } from "../../shop/services";
import { Group, Sheet } from "../Sheet";
import { AlertSettingsForm } from "./AlertSettingsForm";
import { Avatar } from "./Avatar";
import { SignInOptions } from "./SignInOptions";

export interface AccountState {
  available: boolean;
  providers: Providers;
  user: AccountUser | null;
}

/** Profile: who you are, the riders you shop for, deal emails, log out / delete. */
export function AccountSheet({ account, state, buddies, activeId, alerts, onAlerts, onEdit, onAdd, onRemove, onSwitch, onClose, summary, extra }: {
  account?: AccountServices;
  state: AccountState;
  buddies: Buddy[];
  activeId: string;
  alerts: AlertSettings;
  onAlerts: (a: AlertSettings) => void;
  onEdit: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onSwitch: (id: string) => void;
  onClose: () => void;
  summary: (b: Buddy) => string;
  /** Extra links (feedback & support, owner tools) shown under the header. */
  extra?: React.ReactNode;
}) {
  const [removing, setRemoving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const me = buddies[0];
  const signedIn = !!state.user;

  const signOut = async () => {
    if (!account) return;
    setBusy(true);
    await account.signOut().catch(() => {});
    location.href = "/";
  };
  const deleteAccount = async () => {
    if (!account) return;
    setBusy(true);
    setError("");
    try {
      await account.deleteAccount();
      try {
        localStorage.clear();
      } catch {
        /* ignore */
      }
      location.href = "/?deleted=1";
    } catch (e) {
      setError(`${(e as Error).message} If it keeps failing, sign out, sign in again and retry.`);
      setBusy(false);
    }
  };

  return (
    <Sheet title="Profile" label="Profile" onClose={onClose} wide hue={SCREEN_HUE.profile} hero={
      <div>
        <p className="eyebrow pr-10">{state.user ? state.user.email : "Guest · saved on this device"}</p>
        <div className="mt-4 flex items-end gap-4">
          {me && <span className="shrink-0 rounded-full border-[3px] border-word bg-word"><Avatar n={me.avatar} name={me.name} size={84} /></span>}
          <FitWord as="p" max={120} min={32} className="min-w-0 flex-1">{(me?.name && me.name !== "Me" ? me.name : state.user?.name) || me?.name || "Guest"}</FitWord>
          {me && <button type="button" onClick={() => onEdit(me.id)} className="icon-btn shrink-0 text-word hover:bg-white/10" aria-label="Change your name and sizes"><Pencil className="h-4 w-4" /></button>}
        </div>
      </div>
    }>
      {/* sign in */}
      {!signedIn && (
        <section className="relative mb-4 mt-3 overflow-hidden rounded-card border-[1.5px] border-line bg-paper p-4">
          <AssetImg src={ASSETS.mascotCard} alt="" className="pointer-events-none absolute -right-3 -top-2 h-24 w-24 rotate-6" fallback={<AssetImg src={ASSETS.mascot.wave} alt="" className="pointer-events-none absolute -right-3 -top-2 h-24 w-24 rotate-6" />} />
          <h3 className="pr-20 font-display text-lg font-black uppercase leading-tight tracking-tight">Keep it everywhere</h3>
          <p className="mb-3 mt-1 pr-20 text-sm text-muted">Your sizes, riders and saved boards on every device, plus price-drop emails. Free, and you can delete it any time.</p>
          {state.available && account ? (
            <SignInOptions account={account} providers={state.providers} defaultName={me?.name === "Me" ? "" : me?.name} />
          ) : (
            <p className="rounded-control bg-white p-3 text-sm text-muted">Accounts aren&apos;t switched on here yet. You can keep using BoardBuddy as a guest: your setup is saved on this device.</p>
          )}
        </section>
      )}

      {extra && <div className="pb-4">{extra}</div>}

      <Group title="Riders" hint="You and the buddies you shop for. Tap one to shop in their size.">
        <ul className="card divide-y divide-line">
          {buddies.map((b, i) => {
            const on = b.id === activeId;
            return (
              <li key={b.id}>
                <div className={clsx("flex items-center gap-1 py-1 pl-3 pr-1", on && "bg-surface", i === 0 && "rounded-t-card", i === buddies.length - 1 && removing !== b.id && "rounded-b-card")}>
                  <button type="button" onClick={() => onSwitch(b.id)} aria-pressed={on} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-control text-left">
                    <Avatar n={b.avatar} name={b.name} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">{b.name}{i === 0 && <span className="ml-2 text-xs font-medium text-muted">you</span>}{on && <span className="ml-2 rounded-full bg-acid px-1.5 py-0.5 text-2xs font-bold">shopping for</span>}</span>
                      <span className="block truncate text-xs text-muted">{summary(b)}</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => onEdit(b.id)} className="icon-btn" aria-label={`Edit ${b.name}`}><Pencil className="h-4 w-4" /></button>
                  {i > 0 && (
                    <button type="button" onClick={() => setRemoving(b.id)} className="icon-btn" aria-label={`Remove ${b.name}`}><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                {removing === b.id && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-alert-bg px-3 py-2 text-sm text-alert" role="alert">
                    <span className="font-medium">Remove {b.name}?</span>
                    <span className="flex gap-2">
                      <button type="button" onClick={() => setRemoving(null)} className="btn-ghost btn-sm">Keep</button>
                      <button type="button" onClick={() => { onRemove(b.id); setRemoving(null); }} className="btn-danger btn-sm" data-solid>Remove</button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={onAdd} className="mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-card border border-dashed border-line text-sm font-semibold text-muted transition hover:border-ink hover:text-ink">
          <Plus className="h-4 w-4" />Add a buddy
        </button>
      </Group>

      <Group title="Deals in your inbox">
        {signedIn ? (
          <>
            {alerts.enabled && state.user?.emailVerified === false && (
              <p className="note-warn mb-3" role="status">
                Confirm your email first: we sent a link to {state.user.email}. Deal emails start once it&apos;s confirmed.
              </p>
            )}
            <AlertSettingsForm value={alerts} onChange={onAlerts} buddies={buddies} />
          </>
        ) : (
          <p className="text-sm text-muted">Sign in to get boards that fit you by email: a weekly roundup on a day you choose, or as soon as a new board fits. Off by default, one tap to unsubscribe.</p>
        )}
      </Group>

      {signedIn && account && (
        <Group title="Account">
          <div className="flex flex-col gap-2">
            <button type="button" onClick={signOut} disabled={busy} className="btn-ghost"><LogOut className="h-4 w-4" />Log out</button>
            {!deleting ? (
              <button type="button" onClick={() => setDeleting(true)} className="btn-danger"><Trash2 className="h-4 w-4" />Delete account</button>
            ) : (
              <div className="rounded-card border border-alert/40 p-4">
                <p className="text-sm">This permanently deletes your account, riders, saved boards and email settings. Boards and prices stay in the shop. Type <b>DELETE</b> to confirm.</p>
                <label htmlFor="delete-confirm" className="sr-only">Type DELETE</label>
                <input id="delete-confirm" className="input mt-3" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" autoCapitalize="characters" />
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => { setDeleting(false); setConfirmText(""); }} className="btn-ghost flex-1">Cancel</button>
                  <button type="button" disabled={confirmText !== "DELETE" || busy} onClick={deleteAccount} className="btn-danger flex-1" data-solid>
                    {busy ? "Deleting…" : "Delete forever"}
                  </button>
                </div>
                {error && <p className="mt-2 text-sm font-medium text-alert" role="alert">{error}</p>}
              </div>
            )}
          </div>
        </Group>
      )}

      <p className="border-t border-line pt-4 text-xs text-muted">
        <a href="/privacy" className="link !font-medium !text-muted">Privacy policy</a> · <a href="/terms" className="link !font-medium !text-muted">Terms</a>
      </p>
    </Sheet>
  );
}
