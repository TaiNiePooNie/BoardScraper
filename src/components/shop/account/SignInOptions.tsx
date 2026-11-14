"use client";
import { Mail } from "lucide-react";
import { useState } from "react";
import type { AccountServices } from "../services";

/** Google / Apple / email-link buttons; only configured providers are shown. */
export function SignInOptions({ account, providers, beforeSignIn }: {
  account: AccountServices;
  providers: { google: boolean; apple: boolean; email: boolean };
  /** Save anything in progress before we leave the page / send the link. */
  beforeSignIn?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    beforeSignIn?.();
    try {
      await account.sendMagicLink(email.trim());
      setState("sent");
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {providers.google && (
        <button type="button" onClick={() => { beforeSignIn?.(); account.signInSocial("google"); }} className="flex items-center justify-center gap-2 rounded-xl border-2 border-paper bg-paper px-4 py-3 font-semibold text-asphalt">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" /><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" /><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" /><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" /></svg>
          Continue with Google
        </button>
      )}
      {providers.apple && (
        <button type="button" onClick={() => { beforeSignIn?.(); account.signInSocial("apple"); }} className="flex items-center justify-center gap-2 rounded-xl border-2 border-paper bg-black px-4 py-3 font-semibold text-white">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8 2.2-1.3 3.1-2.5a10 10 0 0 0 1.4-2.9 4.4 4.4 0 0 1-2.7-4.1zM13.9 4.9A4.3 4.3 0 0 0 14.9 1.7a4.4 4.4 0 0 0-2.9 1.5 4.1 4.1 0 0 0-1 3.1 3.7 3.7 0 0 0 2.9-1.4z" /></svg>
          Continue with Apple
        </button>
      )}
      {providers.email && (
        state === "sent" ? (
          <p className="rounded-xl bg-acid/15 px-3 py-3 text-sm font-semibold text-acid">Check your inbox: we sent a sign-in link to {email}. It works for 5 minutes.</p>
        ) : (
          <form onSubmit={sendLink} className="flex flex-col gap-2">
            {(providers.google || providers.apple) && <div className="text-center text-xs uppercase tracking-[0.2em] text-paper/45">or</div>}
            <label htmlFor="signin-email" className="sr-only">Email</label>
            <input id="signin-email" type="email" required autoComplete="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input !py-3 !text-base" />
            <button type="submit" disabled={state === "sending"} className="btn-ghost flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />{state === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
            {state === "error" && <p className="text-sm text-orange">{error}</p>}
          </form>
        )
      )}
    </div>
  );
}
