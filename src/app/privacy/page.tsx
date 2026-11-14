import type { Metadata } from "next";
import { contactEmail, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Privacy policy · BoardBuddy" };

export default function Privacy() {
  const email = contactEmail();
  return (
    <LegalPage title="Privacy policy" updated="14 November 2026">
      <p>BoardBuddy helps you find snowboards that fit you and compares prices from online shops. We collect as little as we can. This page explains what we store, why, and how to delete it.</p>

      <h2>Without an account</h2>
      <p>You can use BoardBuddy as a guest. Your rider setup (height, weight, boot size, riding style, skill, budget), your buddies and the boards you hold are stored <b>only in your own browser</b> (local storage). We don&apos;t receive them. Clearing your browser data removes them.</p>

      <h2>With an account</h2>
      <p>If you sign in with Google, Apple or an email link, we store:</p>
      <ul>
        <li>Your name, email address and profile picture URL, as provided by the sign-in method.</li>
        <li>Your riders and buddies (names you choose and their measurements and preferences), the boards you hold, and your ship-to country and currency.</li>
        <li>Your deal-email settings and a record of which boards we already emailed you, so we don&apos;t repeat them.</li>
        <li>Sign-in sessions (a session cookie, plus your IP address and browser type at sign-in, for security).</li>
      </ul>
      <p>We use this only to run BoardBuddy for you: to sync your setup across devices and, if you turn them on, to send deal emails. We don&apos;t sell your data or share it for advertising.</p>

      <h2>Deal emails</h2>
      <p>Deal emails are off unless you turn them on. Every email has a one-click unsubscribe link, and you can change or stop them any time in your profile.</p>

      <h2>Analytics</h2>
      <p>We use Vercel Web Analytics to count page views. It doesn&apos;t use cookies and doesn&apos;t identify you personally.</p>

      <h2>Services we use</h2>
      <ul>
        <li><b>Vercel</b>: hosts the website.</li>
        <li><b>Neon</b>: stores the database (EU region).</li>
        <li><b>Google / Apple</b>: only if you choose to sign in with them.</li>
        <li><b>Resend</b>: sends sign-in links and deal emails.</li>
      </ul>
      <p>Links to shops take you to their own websites, which have their own privacy policies. Prices and product details come from the shops&apos; public pages.</p>

      <h2>Deleting your data</h2>
      <p>Open your profile and tap <b>Delete account</b>. This permanently deletes your account, riders, holds and email settings straight away. If you can&apos;t sign in anymore, email us and we&apos;ll help.</p>

      <h2>Your rights</h2>
      <p>You can ask to see, correct, export or delete your data. If you&apos;re in the EU or UK, you also have the rights described in the GDPR, including the right to complain to your data protection authority.</p>

      <h2>Contact</h2>
      <p>Questions or requests: <a href={`mailto:${email}`}>{email}</a></p>
    </LegalPage>
  );
}
