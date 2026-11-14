/**
 * Email templates in BoardBuddy's style: dark "night shop" background, acid
 * accents, sticker-white cards. Table layout + inline styles for email clients.
 */
import { appUrl } from "./send";

const C = { asphalt: "#15161a", concrete: "#2a2c31", paper: "#fafaf7", acid: "#d4ff3a", pink: "#ff3d8b", muted: "#a7a8ad" };
const FONT = "font-family:'Barlow Condensed','Arial Narrow',Arial,sans-serif";
const BODY = "font-family:Inter,Arial,sans-serif";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function frame(inner: string, preheader: string, footer: string) {
  const base = appUrl();
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;background:${C.asphalt};${BODY};color:${C.paper}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.asphalt}"><tr><td align="center" style="padding:16px 8px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.concrete};border:3px solid ${C.paper};border-radius:20px;overflow:hidden">
<tr><td><a href="${base}"><img src="${base}/assets/email-header.png" width="600" alt="BoardBuddy" style="display:block;width:100%;height:auto;border:0;background:${C.asphalt};color:${C.acid};${FONT};font-size:28px;font-weight:800;font-style:italic"></a></td></tr>
<tr><td style="padding:24px 24px 8px">${inner}</td></tr>
<tr><td style="padding:16px 24px 24px;color:${C.muted};font-size:12px;line-height:18px">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:${C.acid};color:${C.asphalt};${FONT};font-size:20px;font-weight:800;font-style:italic;text-transform:uppercase;text-decoration:none;padding:12px 22px;border:3px solid ${C.asphalt};border-radius:12px">${esc(label)}</a>`;

export function magicLinkEmail(url: string) {
  const inner = `<h1 style="margin:0 0 8px;${FONT};font-size:36px;font-weight:800;font-style:italic;text-transform:uppercase;color:${C.paper}">Your sign-in link</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:22px">Tap the button to sign in to BoardBuddy. The link works once and expires in 5 minutes.</p>
<p style="margin:0 0 20px">${button(url, "Sign in")}</p>
<p style="margin:0;font-size:12px;color:${C.muted}">Didn't ask for this? You can ignore this email.</p>`;
  return {
    subject: "Your BoardBuddy sign-in link",
    html: frame(inner, "Your BoardBuddy sign-in link", "BoardBuddy · snowboards that fit you"),
    text: `Sign in to BoardBuddy: ${url}\n\nThe link works once and expires in 5 minutes. Didn't ask for this? Ignore this email.`,
  };
}

export interface DigestBoard {
  boardUrl: string;
  image: string | null;
  brand: string;
  model: string;
  price: string;
  msrp: string | null;
  discountPct: number;
  rank: string;
  shop: string;
  reason: string;
  sizes: string;
}
export interface DigestSection {
  title: string;
  boards: DigestBoard[];
}

export function dealsDigestEmail({ name, sections, unsubscribeUrl, manageUrl, intro }: {
  name: string;
  sections: DigestSection[];
  unsubscribeUrl: string;
  manageUrl: string;
  intro: string;
}) {
  const card = (b: DigestBoard) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;background:${C.asphalt};border:2px solid #3a3c42;border-radius:14px">
<tr>
<td width="96" style="padding:10px" valign="top">${b.image ? `<img src="${b.image}" height="120" alt="" style="display:block;height:120px;width:auto;max-width:76px;border-radius:10px;background:${C.paper};border:3px solid ${C.paper}">` : ""}</td>
<td style="padding:12px 12px 12px 0" valign="top">
<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted}">${esc(b.brand)} · Rank ${esc(b.rank)}</div>
<div style="${FONT};font-size:24px;font-weight:800;font-style:italic;text-transform:uppercase;color:${C.paper};line-height:26px">${esc(b.model)}</div>
<div style="margin:6px 0;font-size:20px;font-weight:700;color:${C.paper}">${esc(b.price)} ${b.discountPct > 0 ? `<span style="font-size:13px;background:${C.acid};color:${C.asphalt};padding:2px 6px;border-radius:6px">-${b.discountPct}%</span>` : ""} ${b.msrp ? `<span style="font-size:13px;color:${C.muted};text-decoration:line-through">${esc(b.msrp)}</span>` : ""}</div>
<div style="font-size:13px;color:${C.muted}">${esc(b.reason)} · sizes ${esc(b.sizes)} · at ${esc(b.shop)}</div>
<div style="margin-top:8px"><a href="${b.boardUrl}" style="color:${C.acid};font-weight:700;font-size:14px">See it in the shop →</a></div>
</td></tr></table>`;

  const inner = `<h1 style="margin:0 0 6px;${FONT};font-size:34px;font-weight:800;font-style:italic;text-transform:uppercase;color:${C.paper}">Hey ${esc(name)}!</h1>
<p style="margin:0 0 18px;font-size:15px;line-height:22px">${esc(intro)}</p>
${sections.map((s) => `<h2 style="margin:18px 0 10px;${FONT};font-size:24px;font-weight:800;font-style:italic;text-transform:uppercase;color:${C.acid}">${esc(s.title)}</h2>${s.boards.map(card).join("")}`).join("")}
<p style="margin:18px 0 6px">${button(appUrl(), "Open the shop")}</p>`;

  const footer = `Prices are delivered prices to your country at the time of sending and can change at the shop.<br>
You get this because you turned on deal alerts. <a href="${manageUrl}" style="color:${C.paper}">Change alert settings</a> · <a href="${unsubscribeUrl}" style="color:${C.paper}">Unsubscribe</a>`;

  const text = [`Hey ${name}!`, intro, "", ...sections.flatMap((s) => [s.title.toUpperCase(), ...s.boards.map((b) => `- ${b.brand} ${b.model}: ${b.price}${b.discountPct > 0 ? ` (-${b.discountPct}%)` : ""} at ${b.shop} · ${b.boardUrl}`), ""]), `Change settings: ${manageUrl}`, `Unsubscribe: ${unsubscribeUrl}`].join("\n");
  return { html: frame(inner, intro, footer), text };
}
