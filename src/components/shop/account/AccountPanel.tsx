"use client";
import clsx from "clsx";
import { LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { AlertSettings } from "@/lib/account";
import { ASSETS } from "@/lib/assets";
import type { Buddy } from "@/lib/profile";
import { Logo } from "../Logo";
import type { AccountServices, AccountUser, Providers } from "../services";
import { AlertSettingsForm } from "./AlertSettingsForm";
import { Avatar } from "./Avatar";
import { SignInOptions } from "./SignInOptions";

export interface AccountState {
  available: boolean;
  providers: Providers;
  user: AccountUser | null;
}

/** Profile page: who you are, your buddies, deal emails, log out / delete. */
export function AccountPanel({ account, state, buddies, activeId, alerts, onAlerts, onEdit, onAdd, onRemove, onSwitch, onClose, summary }: {
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
    <div className="fixed inset-0 z-[55] overflow-y-auto overflow-x-hidden bg-asphalt" role="dialog" aria-modal="true" aria-label="Your profile">
      <div className="app-gutter mx-auto flex max-w-2xl flex-col gap-6 pb-16 pt-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="rounded-full border-2 border-paper/30 p-2" aria-label="Back to the shop"><X className="h-5 w-5" /></button>
          <Logo height={34} />
        </div>

        {/* who */}
        <section className="flex items-center gap-4">
          {me && <Avatar n={me.avatar} name={me.name} size={72} />}
          <div className="min-w-0">
            <h1 className="headline text-4xl">{state.user?.name || me?.name || "Guest"}</h1>
            <p className="truncate text-sm text-paper/60">{state.user ? state.user.email : "Guest · saved on this device only"}</p>
          </div>
        </section>

        {/* sign in */}
        {!signedIn && (
          <section className="sticker relative overflow-hidden p-5">
            <img src={ASSETS.mascotCard} alt="" className="pointer-events-none absolute -right-6 -top-4 h-32 w-32 rotate-6" onError={(e) => ((e.target as HTMLImageElement).src = ASSETS.mascot.wave)} />
            <h2 className="headline pr-24 text-3xl">Join the crew</h2>
            <p className="mb-4 mt-1 pr-20 text-sm text-paper/70">Keep your setup and buddies on every device and get deals that fit you by email. Free, and you can delete it any time.</p>
            {state.available && account ? (
              <SignInOptions account={account} providers={state.providers} defaultName={me?.name === "Me" ? "" : me?.name} />
            ) : (
              <p className="rounded-xl bg-paper/5 p-3 text-sm text-paper/70">Accounts aren&apos;t switched on here yet. You can keep using BoardBuddy as a guest: your setup is saved on this device.</p>
            )}
          </section>
        )}

        {/* buddies */}
        <section>
          <h2 className="headline mb-1 text-3xl">Riders</h2>
          <p className="mb-3 text-sm text-paper/60">You and the buddies you shop for. Tap one to shop for them.</p>
          <ul className="flex flex-col gap-2">
            {buddies.map((b, i) => (
              <li key={b.id} className={clsx("rounded-2xl border-2 p-2", b.id === activeId ? "border-acid" : "border-paper/15")}>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => onSwitch(b.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar n={b.avatar} name={b.name} size={44} />
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{b.name}{i === 0 && <span className="ml-2 text-xs font-semibold text-paper/50">you</span>}</span>
                      <span className="block truncate text-xs text-paper/60">{summary(b)}</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => onEdit(b.id)} className="rounded-lg p-2 hover:text-acid" aria-label={`Edit ${b.name}`}><Pencil className="h-4 w-4" /></button>
                  {i > 0 && (
                    <button type="button" onClick={() => setRemoving(b.id)} className="rounded-lg p-2 hover:text-orange" aria-label={`Remove ${b.name}`}><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
                {removing === b.id && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-orange/10 p-2 text-sm">
                    <span>Remove {b.name}?</span>
                    <span className="flex gap-2">
                      <button type="button" onClick={() => setRemoving(null)} className="btn-ghost !py-1.5">Keep</button>
                      <button type="button" onClick={() => { onRemove(b.id); setRemoving(null); }} className="rounded-xl bg-orange px-3 py-1.5 font-bold text-ink">Remove</button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button type="button" onClick={onAdd} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-paper/25 p-3 font-semibold text-acid hover:border-acid">
            <Plus className="h-5 w-5" />Add a buddy
          </button>
        </section>

        {/* deal emails */}
        <section className="sticker p-5">
          <h2 className="headline mb-3 text-3xl">Deals in your inbox</h2>
          {signedIn ? (
            <>
              {alerts.enabled && state.user?.emailVerified === false && (
                <p className="mb-3 rounded-xl bg-orange/15 px-3 py-2 text-sm font-semibold text-orange">
                  Confirm your email first: we sent a link to {state.user.email}. Deal emails start once it&apos;s confirmed.
                </p>
              )}
              <AlertSettingsForm value={alerts} onChange={onAlerts} buddies={buddies} />
            </>
          ) : (
            <p className="text-sm text-paper/70">Sign in above to get boards that fit you by email: a weekly roundup on a day you choose, or as soon as a new board fits. Off by default, one tap to unsubscribe.</p>
          )}
        </section>

        {/* account */}
        {signedIn && account && (
          <section className="flex flex-col gap-3">
            <h2 className="headline text-3xl">Account</h2>
            <button type="button" onClick={signOut} disabled={busy} className="btn-ghost flex items-center justify-center gap-2"><LogOut className="h-4 w-4" />Log out</button>
            {!deleting ? (
              <button type="button" onClick={() => setDeleting(true)} className="flex items-center justify-center gap-2 rounded-xl border-2 border-orange/40 px-4 py-2.5 font-semibold text-orange hover:border-orange">
                <Trash2 className="h-4 w-4" />Delete account
              </button>
            ) : (
              <div className="rounded-2xl border-2 border-orange p-4">
                <p className="text-sm">This permanently deletes your account, riders, holds and email settings. Boards and prices stay in the shop. Type <b>DELETE</b> to confirm.</p>
                <label htmlFor="delete-confirm" className="sr-only">Type DELETE</label>
                <input id="delete-confirm" className="input mt-3" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => { setDeleting(false); setConfirmText(""); }} className="btn-ghost flex-1">Cancel</button>
                  <button type="button" disabled={confirmText !== "DELETE" || busy} onClick={deleteAccount} className="flex-1 rounded-xl bg-orange px-4 py-2.5 font-bold text-ink disabled:opacity-40">
                    {busy ? "Deleting…" : "Delete forever"}
                  </button>
                </div>
                {error && <p className="mt-2 text-sm text-orange">{error}</p>}
              </div>
            )}
          </section>
        )}

        <p className="text-xs text-paper/45">
          <a href="/privacy" className="underline hover:text-paper">Privacy policy</a> · <a href="/terms" className="underline hover:text-paper">Terms</a>
        </p>
      </div>
    </div>
  );
}
