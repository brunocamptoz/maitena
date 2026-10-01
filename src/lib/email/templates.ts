import { formatPrice } from "../format.ts";
import type { EmailContext, EmailOrder, RenderedEmail } from "./types.ts";

/**
 * Emails de Maitena Joyas. HTML con tablas y estilos en línea (lo único que funciona igual en Gmail,
 * Outlook y Apple Mail). TODO dato que viene del comprador se escapa: un nombre como "<script>" no puede
 * romper el correo ni inyectar enlaces.
 */

const INK = "#0b0b0b";
const PAPER = "#faf8f5";
const STONE = "#7d7870";
const LINE = "#e6e1d9";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const e = escapeHtml;

/** Solo enlaces http(s): cualquier otra cosa (javascript:, data:, etc.) se descarta. */
export function safeUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

const dateLong = new Intl.DateTimeFormat("es-UY", { dateStyle: "long", timeZone: "America/Montevideo" });
const dateTime = new Intl.DateTimeFormat("es-UY", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Montevideo",
});

const orderUrl = (order: EmailOrder, ctx: EmailContext) => `${ctx.siteUrl}/pedido/${order.publicToken}`;

// ── Piezas de HTML ───────────────────────────────────────────────────

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;"><tr>
<td style="background:${INK};"><a href="${e(href)}" target="_blank" style="display:inline-block;padding:16px 32px;font-family:${SANS};font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:${PAPER};text-decoration:none;">${e(label)}</a></td>
</tr></table>`;
}

function heading(text: string) {
  return `<h1 style="margin:0;font-family:${SERIF};font-size:32px;line-height:1.15;font-weight:400;color:${INK};">${e(text)}</h1>`;
}

function paragraph(html: string, extra = "") {
  return `<p style="margin:16px 0 0;font-family:${SANS};font-size:15px;line-height:1.65;color:${STONE};${extra}">${html}</p>`;
}

function label(text: string) {
  return `<p style="margin:0 0 10px;font-family:${SANS};font-size:10px;letter-spacing:0.26em;text-transform:uppercase;color:${STONE};">${e(text)}</p>`;
}

function itemsTable(order: EmailOrder) {
  const rows = order.items
    .map(
      (item) => `<tr>
<td style="padding:14px 0;border-bottom:1px solid ${LINE};font-family:${SERIF};font-size:17px;color:${INK};">${e(item.name)}<span style="font-family:${SANS};font-size:13px;color:${STONE};"> &nbsp;× ${item.quantity}</span></td>
<td align="right" style="padding:14px 0;border-bottom:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${INK};white-space:nowrap;">${e(formatPrice(item.subtotal))}</td>
</tr>`,
    )
    .join("");

  const row = (name: string, value: string, strong = false) => `<tr>
<td style="padding:${strong ? "16px" : "8px"} 0 0;font-family:${SANS};font-size:${strong ? "11px" : "14px"};${strong ? "letter-spacing:0.24em;text-transform:uppercase;" : ""}color:${strong ? INK : STONE};">${e(name)}</td>
<td align="right" style="padding:${strong ? "16px" : "8px"} 0 0;font-family:${strong ? SERIF : SANS};font-size:${strong ? "26px" : "14px"};color:${INK};white-space:nowrap;">${e(value)}</td>
</tr>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}
${row("Subtotal", formatPrice(order.subtotal))}
${row("Envío", order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost))}
${row("Total", formatPrice(order.total), true)}
</table>`;
}

function addressBlock(order: EmailOrder, withPhone = false) {
  const line2 = [order.apartment ? `apto. ${order.apartment}` : null, order.postalCode ? `CP ${order.postalCode}` : null]
    .filter(Boolean)
    .join(" · ");
  return `<p style="margin:0;font-family:${SANS};font-size:15px;line-height:1.7;color:${INK};">
${e(order.customerName)} ${e(order.customerLastName)}<br>
<span style="color:${STONE};">${e(order.address)} ${e(order.doorNumber)}${line2 ? `<br>${e(line2)}` : ""}<br>${e(order.city)}, ${e(order.department)}${withPhone ? `<br>Tel. ${e(order.customerPhone)}` : ""}</span>
</p>`;
}

function footer(ctx: EmailContext, note: string) {
  const contacts = [
    ctx.contact.email ? `<a href="mailto:${e(ctx.contact.email)}" style="color:${STONE};">${e(ctx.contact.email)}</a>` : null,
    ctx.contact.whatsapp
      ? `<a href="https://wa.me/${e(ctx.contact.whatsapp)}" style="color:${STONE};">WhatsApp</a>`
      : null,
    ctx.contact.instagram
      ? `<a href="https://instagram.com/${e(ctx.contact.instagram)}" style="color:${STONE};">Instagram</a>`
      : null,
  ].filter(Boolean);

  return `<p style="margin:0;font-family:${SANS};font-size:12px;line-height:1.7;color:${STONE};">${e(note)}${
    contacts.length ? `<br>¿Dudas? ${contacts.join(" · ")}` : ""
  }<br><a href="${e(ctx.siteUrl)}" style="color:${STONE};">${e(ctx.siteName)}</a> · Envíos a todo Uruguay</p>`;
}

function layout(ctx: EmailContext, preheader: string, content: string, footerNote: string) {
  return `<!doctype html>
<html lang="es-UY">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${e(ctx.siteName)}</title>
</head>
<body style="margin:0;padding:0;background:#efebe4;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${e(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efebe4;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${PAPER};">
<tr><td align="center" style="background:${INK};padding:34px 24px 30px;">
<div style="font-family:${SERIF};font-size:28px;letter-spacing:0.32em;text-transform:uppercase;color:${PAPER};">Maitena</div>
<div style="margin-top:6px;font-family:${SANS};font-size:9px;letter-spacing:0.5em;text-transform:uppercase;color:#a29d93;">Joyas</div>
</td></tr>
<tr><td style="padding:48px 40px 40px;">${content}</td></tr>
<tr><td style="padding:0 40px 40px;"><div style="border-top:1px solid ${LINE};padding-top:24px;">${footer(ctx, footerNote)}</div></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Emails ───────────────────────────────────────────────────────────

/** Al comprador, cuando Mercado Pago confirma el pago. */
export function confirmationEmail(order: EmailOrder, ctx: EmailContext): RenderedEmail {
  const url = orderUrl(order, ctx);
  const html = layout(
    ctx,
    `Pedido #${order.orderNumber} · Recibimos tu pago y estamos preparando tu pedido.`,
    `${label(`Pedido #${order.orderNumber} · ${dateLong.format(new Date(order.paidAt ?? order.createdAt))}`)}
${heading(`Gracias por tu compra, ${order.customerName}.`)}
${paragraph("Recibimos tu pago y ya estamos preparando tu pedido.")}
<div style="margin:36px 0 0;">${itemsTable(order)}</div>
<div style="margin:40px 0 0;">${label("Envío a")}${addressBlock(order)}</div>
<div style="margin:32px 0 0;">${label("Pago")}<p style="margin:0;font-family:${SANS};font-size:15px;color:${INK};">Pago confirmado a través de Mercado Pago.</p></div>
<div style="margin:40px 0 0;padding:24px;border:1px solid ${LINE};">
<p style="margin:0;font-family:${SERIF};font-size:18px;line-height:1.5;color:${INK};">Estamos preparando tu pedido. En breve recibirás otro correo con los datos de seguimiento una vez que sea despachado.</p>
</div>
${button(url, "Ver mi pedido")}`,
    "Recibiste este correo porque realizaste una compra en nuestra tienda.",
  );

  const text = [
    `Gracias por tu compra, ${order.customerName}.`,
    "",
    `Pedido #${order.orderNumber} — ${dateLong.format(new Date(order.paidAt ?? order.createdAt))}`,
    "Recibimos tu pago y ya estamos preparando tu pedido.",
    "",
    ...order.items.map((i) => `· ${i.name} × ${i.quantity} — ${formatPrice(i.subtotal)}`),
    "",
    `Subtotal: ${formatPrice(order.subtotal)}`,
    `Envío: ${order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost)}`,
    `Total: ${formatPrice(order.total)}`,
    "",
    "Envío a:",
    `${order.customerName} ${order.customerLastName}`,
    `${order.address} ${order.doorNumber}${order.apartment ? `, apto. ${order.apartment}` : ""}`,
    `${order.city}, ${order.department}`,
    "",
    "Estamos preparando tu pedido. En breve recibirás otro correo con los datos de seguimiento una vez que sea despachado.",
    "",
    `Ver mi pedido: ${url}`,
    "",
    `${ctx.siteName} · ${ctx.siteUrl}`,
  ].join("\n");

  return { subject: `Recibimos tu compra — ${ctx.siteName}`, html, text };
}

/** Al administrador, cuando entra una venta pagada. */
export function adminSaleEmail(order: EmailOrder, ctx: EmailContext): RenderedEmail {
  const adminUrl = `${ctx.siteUrl}/admin/pedidos/${order.id}`;
  const attention = order.needsAttention
    ? `<div style="margin:28px 0 0;padding:16px 20px;border:1px solid #9b3b34;background:#fbf1f0;font-family:${SANS};font-size:14px;line-height:1.6;color:#9b3b34;"><strong>Este pedido requiere tu atención</strong> (${e(order.attentionReason ?? "revisar")}). Revisalo en el panel antes de despacharlo.</div>`
    : "";

  const row = (name: string, value: string) => `<tr>
<td style="padding:6px 16px 6px 0;font-family:${SANS};font-size:13px;color:${STONE};vertical-align:top;white-space:nowrap;">${e(name)}</td>
<td style="padding:6px 0;font-family:${SANS};font-size:14px;color:${INK};">${value}</td>
</tr>`;

  const html = layout(
    ctx,
    `Pedido #${order.orderNumber} · ${order.customerName} ${order.customerLastName} · ${formatPrice(order.total)}`,
    `${label(`Pedido #${order.orderNumber} · ${dateTime.format(new Date(order.paidAt ?? order.createdAt))}`)}
${heading("Nueva venta en Maitena Joyas")}
${paragraph(`${e(order.customerName)} ${e(order.customerLastName)} acaba de pagar <strong style="color:${INK};">${e(formatPrice(order.total))}</strong>.`)}
${attention}
<div style="margin:32px 0 0;">${itemsTable(order)}</div>
<div style="margin:36px 0 0;">${label("Cliente")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
${row("Nombre", `${e(order.customerName)} ${e(order.customerLastName)}`)}
${row("Email", `<a href="mailto:${e(order.customerEmail)}" style="color:${INK};">${e(order.customerEmail)}</a>`)}
${row("Teléfono", e(order.customerPhone))}
</table></div>
<div style="margin:32px 0 0;">${label("Dirección de envío")}${addressBlock(order)}
${order.notes ? `<p style="margin:12px 0 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${STONE};"><em>Notas del cliente:</em> ${e(order.notes)}</p>` : ""}</div>
${button(adminUrl, "Ver pedido en el panel")}`,
    "Aviso automático de tu tienda.",
  );

  const text = [
    `Nueva venta en Maitena Joyas — Pedido #${order.orderNumber}`,
    `${dateTime.format(new Date(order.paidAt ?? order.createdAt))}`,
    "",
    order.needsAttention ? `⚠ REQUIERE ATENCIÓN (${order.attentionReason ?? "revisar"})\n` : "",
    `Cliente: ${order.customerName} ${order.customerLastName}`,
    `Email: ${order.customerEmail}`,
    `Teléfono: ${order.customerPhone}`,
    "",
    ...order.items.map((i) => `· ${i.name} × ${i.quantity} — ${formatPrice(i.subtotal)}`),
    "",
    `Subtotal: ${formatPrice(order.subtotal)} · Envío: ${order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost)} · Total: ${formatPrice(order.total)}`,
    "",
    "Enviar a:",
    `${order.address} ${order.doorNumber}${order.apartment ? `, apto. ${order.apartment}` : ""}`,
    `${order.city}, ${order.department}`,
    order.notes ? `Notas: ${order.notes}` : "",
    "",
    `Ver pedido en el panel: ${adminUrl}`,
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");

  return {
    subject: `Nueva venta en Maitena Joyas — Pedido #${order.orderNumber} (${formatPrice(order.total)})`,
    html,
    text,
  };
}

/** Al comprador, cuando el administrador despacha el pedido y carga el seguimiento. */
export function shippedEmail(order: EmailOrder, ctx: EmailContext): RenderedEmail {
  const url = orderUrl(order, ctx);
  const trackUrl = safeUrl(order.tracking.url);
  const trackRows = [
    order.tracking.company ? ["Empresa de transporte", e(order.tracking.company)] : null,
    order.tracking.number
      ? ["Código de seguimiento", `<strong style="letter-spacing:0.04em;">${e(order.tracking.number)}</strong>`]
      : null,
  ].filter((r): r is string[] => r !== null);

  const html = layout(
    ctx,
    `Pedido #${order.orderNumber} · Tu pedido fue enviado${order.tracking.number ? ` · Seguimiento ${order.tracking.number}` : ""}`,
    `${label(`Pedido #${order.orderNumber}`)}
${heading("Tu pedido fue enviado.")}
${paragraph(`Hola ${e(order.customerName)}, ya despachamos tu pedido y está en camino.`)}
${
  trackRows.length
    ? `<div style="margin:36px 0 0;padding:24px;border:1px solid ${LINE};"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${trackRows
        .map(
          ([n, v]) =>
            `<tr><td style="padding:6px 16px 6px 0;font-family:${SANS};font-size:13px;color:${STONE};white-space:nowrap;">${e(n)}</td><td style="padding:6px 0;font-family:${SANS};font-size:15px;color:${INK};">${v}</td></tr>`,
        )
        .join("")}</table></div>`
    : ""
}
${trackUrl ? button(trackUrl, "Seguir mi envío") : ""}
<div style="margin:40px 0 0;">${label("Se envía a")}${addressBlock(order)}</div>
<p style="margin:28px 0 0;font-family:${SANS};font-size:14px;line-height:1.6;color:${STONE};">También podés ver el estado de tu pedido en <a href="${e(url)}" style="color:${INK};">${e(url)}</a>.</p>`,
    "Recibiste este correo porque realizaste una compra en nuestra tienda.",
  );

  const text = [
    "Tu pedido fue enviado.",
    "",
    `Hola ${order.customerName}, ya despachamos tu pedido #${order.orderNumber} y está en camino.`,
    order.tracking.company ? `Empresa de transporte: ${order.tracking.company}` : "",
    order.tracking.number ? `Código de seguimiento: ${order.tracking.number}` : "",
    trackUrl ? `Seguir mi envío: ${trackUrl}` : "",
    "",
    "Se envía a:",
    `${order.customerName} ${order.customerLastName}`,
    `${order.address} ${order.doorNumber}${order.apartment ? `, apto. ${order.apartment}` : ""}`,
    `${order.city}, ${order.department}`,
    "",
    `Estado de tu pedido: ${url}`,
    "",
    `${ctx.siteName} · ${ctx.siteUrl}`,
  ]
    .filter((l, i, arr) => !(l === "" && arr[i - 1] === ""))
    .join("\n");

  return { subject: `Tu pedido fue enviado — ${ctx.siteName}`, html, text };
}
