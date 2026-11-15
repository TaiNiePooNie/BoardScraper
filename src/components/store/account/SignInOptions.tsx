"use client";
import clsx from "clsx";
import { Eye, EyeOff, Mail } from "lucide-react";
import { useState } from "react";
import type { AccountServices, Providers } from "../../shop/services";

type Mode = "signup" | "signin" | "forgot";

/* Provider marks keep their own brand colours. */
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" /><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" /></svg>
);
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8 2.2-1.3 3.1-2.5a10 10 0 0 0 1.4-2.9 4.4 4.4 0 0 1-2.7-4.1zM13.9 4.9A4.3 4.3 0 0 0 14.9 1.7a4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3.1 3.7 3.7 0 0 0 2.9-1.4z" /></svg>
);

/**
 * Sign-in methods: Google, Apple, and email. Email opens an email + password form
 * (create account / sign in), with "forgot password" and passwordless links when
 * email sending is set up.
 */
export function SignInOptions({ account, providers, beforeSignIn, defaultName = "" }: {
  account: AccountServices;
  providers: Providers;
  /** Save anything in progress before we leave the page. */
  beforeSignIn?: () => void;
  defaultName?: string;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const done = () => {
    location.href = `${location.pathname}?signedin=1`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    beforeSignIn?.();
    try {
      if (mode === "signup") {
        await account.signUpEmail(email.trim(), password, defaultName);
        done();
      } else if (mode === "signin") {
        await account.signInEmail(email.trim(), password);
        done();
      } else {
        await account.requestPasswordReset(email.trim());
        setNotice(`If ${email.trim()} has an account, a reset link is on its way. Check your inbox.`);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const magicLink = async () => {
    setBusy(true);
    setError("");
    beforeSignIn?.();
    try {
      await account.sendMagicLink(email.trim());
      setNotice(`Check your inbox: we sent a sign-in link to ${email.trim()}. It works for 5 minutes.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {providers.google && (
        <button type="button" onClick={() => { beforeSignIn?.(); account.signInSocial("google"); }} className="btn-ghost w-full">
          <GoogleIcon />Continue with Google
        </button>
      )}
      {providers.apple && (
        <button type="button" onClick={() => { beforeSignIn?.(); account.signInSocial("apple"); }} className="btn-primary w-full">
          <AppleIcon />Continue with Apple
        </button>
      )}
      {providers.password && (
        <button type="button" onClick={() => setEmailOpen((o) => !o)} aria-expanded={emailOpen} className={clsx("btn-ghost w-full", emailOpen && "!border-ink")}>
          <Mail className="h-5 w-5" />Continue with email
        </button>
      )}

      {emailOpen && (
        <form onSubmit={submit} className="card mt-1 flex flex-col gap-2.5 p-3">
          {mode !== "forgot" ? (
            <div role="tablist" aria-label="Account" className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1 text-sm font-semibold">
              {(["signup", "signin"] as const).map((m) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(""); }}
                  className={clsx("min-h-9 rounded-full px-2 transition", mode === m ? "bg-white shadow-card" : "text-muted")}>
                  {m === "signup" ? "Create account" : "Sign in"}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm font-bold">Reset your password</p>
          )}

          <label htmlFor="acct-email" className="sr-only">Email</label>
          <input id="acct-email" type="email" required autoComplete="email" inputMode="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />

          {mode !== "forgot" && (
            <div className="relative">
              <label htmlFor="acct-password" className="sr-only">Password</label>
              <input
                id="acct-password"
                type={show ? "text" : "password"}
                required
                minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "Password (8+ characters)" : "Password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input !pr-12"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="icon-btn absolute right-0 top-1/2 -translate-y-1/2 !text-muted hover:!bg-transparent" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          )}

          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "One sec…" : mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send reset link"}
          </button>

          {error && <p className="text-sm font-medium text-sale" role="alert">{error}</p>}
          {notice && <p className="note-info !text-sm" role="status">{notice}</p>}

          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
            {mode === "signin" && providers.passwordReset && (
              <button type="button" onClick={() => { setMode("forgot"); setError(""); }} className="link py-1.5">Forgot password?</button>
            )}
            {mode === "forgot" && (
              <button type="button" onClick={() => setMode("signin")} className="link py-1.5">Back to sign in</button>
            )}
            {providers.email && mode !== "forgot" && (
              <button type="button" disabled={busy || !email.includes("@")} onClick={magicLink} className="link py-1.5 disabled:opacity-50">Email me a sign-in link instead</button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
