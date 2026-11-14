"use client";
import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/shop/Logo";
import { ASSETS } from "@/lib/assets";

/** Landing page from the "reset your password" email. */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    const { authClient } = await import("@/lib/auth-client");
    const r = await authClient.resetPassword({ newPassword: password, token });
    setBusy(false);
    if (r.error) setError(r.error.message ?? "That link didn't work. Ask for a new one.");
    else setDone(true);
  };

  return (
    <main className="app-gutter mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 py-10">
      <Logo height={40} />
      <div className="sticker relative p-5">
        <img src={ASSETS.mascotCard} alt="" className="pointer-events-none absolute -right-3 -top-14 h-24 w-24 rotate-6" />
        <h1 className="headline text-4xl">New password</h1>
        {done ? (
          <>
            <p className="mt-2 text-sm text-paper/75">Done! Sign in with your new password.</p>
            <a href="/?profile=1" className="btn-acid mt-4 block text-center">Sign in</a>
          </>
        ) : !token || linkError ? (
          <>
            <p className="mt-2 text-sm text-paper/75">This reset link has expired or was already used. Ask for a new one from the sign-in screen (Email → Sign in → Forgot password).</p>
            <a href="/?profile=1" className="btn-ghost mt-4 block text-center">Back to BoardBuddy</a>
          </>
        ) : (
          <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
            <div className="relative">
              <label htmlFor="new-password" className="sr-only">New password</label>
              <input id="new-password" type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)"
                value={password} onChange={(e) => setPassword(e.target.value)} className="input !py-3 !pr-11 !text-base" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-paper/60" aria-label={show ? "Hide password" : "Show password"}>
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <button type="submit" disabled={busy} className="btn-acid">{busy ? "Saving…" : "Save new password"}</button>
            {error && <p className="text-sm font-semibold text-orange">{error}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
