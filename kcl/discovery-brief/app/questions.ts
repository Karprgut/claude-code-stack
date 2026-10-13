export type Option = { value: string; label: string };

// ─── Step 1 · Empresa & contacto ────────────────────────────────
export const BUSINESS_TYPES: Option[] = [
  { value: "digital_products", label: "Productos digitales (templates, presets, ebooks)" },
  { value: "courses", label: "Cursos / contenido on-demand" },
  { value: "subscriptions", label: "Suscripciones recurrentes" },
  { value: "services", label: "Servicios empaquetados / retainers" },
  { value: "physical", label: "Productos físicos / merch" },
  { value: "hybrid", label: "Híbrido (físico + digital)" },
];

export const HAS_ECOMMERCE: Option[] = [
  { value: "shopify", label: "Sí, en Shopify" },
  { value: "woocommerce", label: "Sí, en WooCommerce" },
  { value: "wix_squarespace", label: "Sí, en Wix / Squarespace" },
  { value: "custom", label: "Sí, plataforma custom" },
  { value: "other", label: "Sí, otra" },
  { value: "no", label: "No, primera vez" },
];

export const BUDGET_OPTIONS: Option[] = [
  { value: "b_under_5k", label: "Menos de $5,000 USD" },
  { value: "b_5_15k", label: "$5,000 - $15,000 USD" },
  { value: "b_15_50k", label: "$15,000 - $50,000 USD" },
  { value: "b_50_150k", label: "$50,000 - $150,000 USD" },
  { value: "b_150k_plus", label: "$150,000+ USD" },
  { value: "b_undefined", label: "Aún no definido" },
];

// ─── Step 2 · Proyecto ──────────────────────────────────────────
export const LAUNCH_TIMELINE: Option[] = [
  { value: "asap", label: "Lo más pronto posible (<1 mes)" },
  { value: "short", label: "1-3 meses" },
  { value: "medium", label: "3-6 meses" },
  { value: "long", label: "6-12 meses" },
  { value: "no_rush", label: "Sin urgencia" },
];

export const SKU_RANGES: Option[] = [
  { value: "under_10", label: "Menos de 10" },
  { value: "10_50", label: "10 - 50" },
  { value: "50_200", label: "50 - 200" },
  { value: "200_1000", label: "200 - 1,000" },
  { value: "1000_plus", label: "Más de 1,000" },
];

export const MARKETS: Option[] = [
  { value: "mexico", label: "México" },
  { value: "latam", label: "Latinoamérica" },
  { value: "us", label: "Estados Unidos" },
  { value: "europe", label: "Europa" },
  { value: "global", label: "Global" },
];

export const LANGUAGES: Option[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
  { value: "fr", label: "Francés" },
];

export const CURRENCIES: Option[] = [
  { value: "mxn", label: "MXN" },
  { value: "usd", label: "USD" },
  { value: "eur", label: "EUR" },
  { value: "other", label: "Otra" },
];

export const KPI_PRIMARY: Option[] = [
  { value: "conversion_rate", label: "Tasa de conversión" },
  { value: "revenue", label: "Revenue / facturación" },
  { value: "aov", label: "Ticket promedio (AOV)" },
  { value: "subscribers", label: "Suscriptores activos" },
  { value: "retention", label: "Retención / LTV" },
  { value: "ltv_cac", label: "LTV/CAC ratio" },
];

export const TRANSACTION_VOLUMES: Option[] = [
  { value: "under_100", label: "Menos de 100 / mes" },
  { value: "100_500", label: "100 - 500 / mes" },
  { value: "500_2k", label: "500 - 2,000 / mes" },
  { value: "2k_10k", label: "2,000 - 10,000 / mes" },
  { value: "10k_plus", label: "Más de 10,000 / mes" },
];

// ─── Step 3 · Features y stack ──────────────────────────────────
export const PLATFORMS: Option[] = [
  { value: "shopify", label: "Shopify (headless con Next.js)" },
  { value: "medusa", label: "Medusa.js (self-hosted, open-source)" },
  { value: "stripe_custom", label: "Stripe + backend custom" },
  { value: "other", label: "Otra" },
  { value: "undefined", label: "No tengo preferencia, recomienden" },
];

export const FEATURES: Option[] = [
  { value: "search", label: "Búsqueda con filtros avanzados" },
  { value: "wishlist", label: "Wishlist / favoritos" },
  { value: "reviews", label: "Reviews y ratings" },
  { value: "quick_view", label: "Quick view en catálogo" },
  { value: "recommendations", label: "Recomendaciones / cross-sell" },
  { value: "multilang", label: "Multi-idioma" },
  { value: "multicurrency", label: "Multi-moneda" },
  { value: "guest_checkout", label: "Guest checkout" },
  { value: "social_login", label: "Login social (Google, Apple)" },
  { value: "subscriptions", label: "Suscripciones recurrentes" },
  { value: "loyalty", label: "Programa de lealtad / puntos" },
  { value: "coupons", label: "Cupones y descuentos" },
  { value: "gift_cards", label: "Gift cards" },
  { value: "blog", label: "Blog editorial integrado" },
  { value: "library", label: "Área de cliente con biblioteca digital" },
  { value: "live_chat", label: "Chat / soporte en vivo" },
];

export const PAYMENT_METHODS: Option[] = [
  { value: "stripe", label: "Stripe (tarjetas internacionales)" },
  { value: "apple_google_pay", label: "Apple Pay / Google Pay" },
  { value: "mercado_pago", label: "Mercado Pago" },
  { value: "paypal", label: "PayPal" },
  { value: "oxxo", label: "OXXO / efectivo (México)" },
  { value: "transfer", label: "Transferencia bancaria" },
  { value: "klarna_afterpay", label: "Klarna / Afterpay (BNPL)" },
];

export const INVOICING_OPTIONS: Option[] = [
  { value: "yes_cfdi", label: "Sí, CFDI México" },
  { value: "yes_other", label: "Sí, otra (US, EU, etc.)" },
  { value: "no", label: "No requerida" },
];

export const EXISTING_INTEGRATIONS: Option[] = [
  { value: "klaviyo", label: "Klaviyo" },
  { value: "mailchimp", label: "Mailchimp" },
  { value: "hubspot", label: "HubSpot" },
  { value: "salesforce", label: "Salesforce" },
  { value: "intercom", label: "Intercom" },
  { value: "zendesk", label: "Zendesk" },
  { value: "ga4", label: "Google Analytics 4" },
  { value: "meta_pixel", label: "Meta Pixel" },
  { value: "erp", label: "ERP / contabilidad" },
  { value: "none", label: "Ninguna" },
];

export const SUPPORT_CHANNELS: Option[] = [
  { value: "email", label: "Email" },
  { value: "live_chat", label: "Chat en sitio" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Teléfono" },
  { value: "instagram_dm", label: "Instagram DMs" },
];

// ─── Step 4 · Marca & evaluación ────────────────────────────────
export const BRAND_GUIDE_OPTIONS: Option[] = [
  { value: "yes", label: "Sí, manual completo" },
  { value: "wip", label: "Parcial / en construcción" },
  { value: "no", label: "No, hay que crear" },
];

export const PALETTE_APPROVAL: Option[] = [
  { value: "approved", label: "Aprobada — usar tal cual" },
  { value: "adjust", label: "Aprobada con pequeños ajustes" },
  { value: "change", label: "Cambiar paleta" },
];

export const BRAND_VOICE: Option[] = [
  { value: "premium", label: "Premium / aspiracional" },
  { value: "warm", label: "Cercano / cálido" },
  { value: "editorial", label: "Editorial / curado" },
  { value: "brutalist", label: "Brutalist / directo" },
  { value: "minimal", label: "Minimalista" },
  { value: "playful", label: "Lúdico / divertido" },
  { value: "professional", label: "Profesional / B2B" },
  { value: "disruptive", label: "Disruptivo / contracultura" },
];

export const EVALUATION_CRITERIA_KEYS = [
  "price",
  "design",
  "strategy",
  "technology",
  "timeline",
  "support",
] as const;

export type CriterionKey = (typeof EVALUATION_CRITERIA_KEYS)[number];

export const CRITERIA_LABELS: Record<CriterionKey, string> = {
  price: "Precio",
  design: "Diseño y experiencia",
  strategy: "Estrategia de negocio",
  technology: "Arquitectura técnica",
  timeline: "Tiempos de entrega",
  support: "Soporte post-launch",
};

// ─── Free email providers (rechazados) ──────────────────────────
export const FREE_EMAIL_PROVIDERS = [
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.es",
  "outlook.com",
  "outlook.es",
  "live.com",
  "yahoo.com",
  "yahoo.es",
  "yahoo.com.mx",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
];

// ─── Form state shape ───────────────────────────────────────────
export type FormState = {
  // Step 1
  companyName: string;
  companyCountry: string;
  companyCity: string;
  contactName: string;
  contactEmail: string;
  contactRole: string;
  contactPhone: string;
  isDecisionMaker: boolean;
  hasExistingEcommerce: string;
  existingPlatformNotes: string;
  businessTypes: string[];
  projectBudget: string;

  // Step 2
  launchTimeline: string;
  proposalDeadline: string;
  skuRange: string;
  markets: string[];
  languages: string[];
  currencies: string[];
  primaryKpi: string;
  transactionVolume: string;
  buyerPersona: string;

  // Step 3
  preferredPlatform: string;
  features: string[];
  paymentMethods: string[];
  invoicing: string;
  existingIntegrations: string[];
  supportChannels: string[];

  // Step 4
  hasBrandGuide: string;
  paletteApproval: string;
  paletteNotes: string;
  brandVoice: string[];
  evaluationCriteria: CriterionKey[];
  mustSucceed: string;
  extraNotes: string;
};

export const INITIAL_FORM: FormState = {
  companyName: "",
  companyCountry: "",
  companyCity: "",
  contactName: "",
  contactEmail: "",
  contactRole: "",
  contactPhone: "",
  isDecisionMaker: false,
  hasExistingEcommerce: "",
  existingPlatformNotes: "",
  businessTypes: [],
  projectBudget: "",

  launchTimeline: "",
  proposalDeadline: "",
  skuRange: "",
  markets: [],
  languages: [],
  currencies: [],
  primaryKpi: "",
  transactionVolume: "",
  buyerPersona: "",

  preferredPlatform: "",
  features: [],
  paymentMethods: [],
  invoicing: "",
  existingIntegrations: [],
  supportChannels: [],

  hasBrandGuide: "",
  paletteApproval: "",
  paletteNotes: "",
  brandVoice: [],
  evaluationCriteria: [...EVALUATION_CRITERIA_KEYS],
  mustSucceed: "",
  extraNotes: "",
};

export const STEPS = ["Empresa", "Proyecto", "Stack & Features", "Marca", "Revisar"];

// Helper para obtener label de un value
export function labelOf(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function labelsOf(options: Option[], values: string[]): string {
  if (values.length === 0) return "—";
  return values.map((v) => labelOf(options, v)).join(", ");
}
