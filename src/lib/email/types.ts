/** Datos de un pedido tal como los necesitan los emails. */
export type EmailOrder = {
  id: string;
  orderNumber: number;
  publicToken: string;
  orderStatus: string;
  paymentStatus: string;
  customerName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string;
  department: string;
  city: string;
  address: string;
  doorNumber: string;
  apartment: string | null;
  postalCode: string | null;
  notes: string | null;
  subtotal: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  paidAt: string | null;
  tracking: { company: string | null; number: string | null; url: string | null };
  needsAttention: boolean;
  attentionReason: string | null;
  items: { name: string; quantity: number; unitPrice: number; subtotal: number }[];
};

/** Datos de la tienda que se repiten en todos los emails. */
export type EmailContext = {
  siteName: string;
  /** Sin barra final. */
  siteUrl: string;
  /** Contacto de la tienda; los que sean null no se muestran. */
  contact: { email: string | null; whatsapp: string | null; instagram: string | null };
};

export type RenderedEmail = { subject: string; html: string; text: string };

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Evita duplicados si un envío se reintenta por un error de red. */
  idempotencyKey: string;
};

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

export type Mailer = (email: OutgoingEmail) => Promise<SendResult>;
