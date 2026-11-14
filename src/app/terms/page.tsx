import type { Metadata } from "next";
import { contactEmail, LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = { title: "Terms of service · BoardBuddy" };

export default function Terms() {
  const email = contactEmail();
  return (
    <LegalPage title="Terms of service" updated="14 November 2026">
      <p>By using BoardBuddy you agree to these terms. They&apos;re short on purpose.</p>

      <h2>What BoardBuddy is</h2>
      <p>BoardBuddy is a free tool that suggests snowboard sizes and compares prices from online shops. We don&apos;t sell boards; you buy them from the shop you choose, on that shop&apos;s terms.</p>

      <h2>Prices and advice</h2>
      <ul>
        <li>Prices, stock, shipping, VAT and import costs are collected automatically and estimated. They can be out of date or wrong. Always check the final price on the shop&apos;s checkout page.</li>
        <li>Size and flex suggestions are general guidance based on common sizing practice, not a professional fitting. Try boards and boots in person when you can.</li>
        <li>Deal ranks and &quot;best for you&quot; scores are our own opinion, calculated automatically.</li>
      </ul>

      <h2>Your account</h2>
      <p>You&apos;re responsible for your account and for the information you enter. You can delete your account at any time from your profile. We may remove accounts that abuse the service.</p>

      <h2>Fair use</h2>
      <p>Don&apos;t try to break, overload or scrape BoardBuddy, or use it for anything unlawful.</p>

      <h2>No warranty</h2>
      <p>BoardBuddy is provided &quot;as is&quot;, without guarantees. To the extent the law allows, we&apos;re not liable for losses from using it, including decisions based on prices or size suggestions shown.</p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version.</p>

      <h2>Contact</h2>
      <p><a href={`mailto:${email}`}>{email}</a></p>
    </LegalPage>
  );
}
