import { hasResellerBenefits, hasSteamDistributorAccess } from "./userRoles";

export const PAYMENT_SETTINGS_DOC = ["system_config", "payment_methods"];

export const DEFAULT_PAYMENT_SETTINGS = {
  mercadoPago: {
    enabled: true,
    label: "Tarjeta débito / crédito (Chile)",
    description: "Tarjetas de débito y crédito · hasta 12 cuotas",
    audiences: { clients: true, resellers: true, steamDistributors: true },
  },
  transfer: {
    enabled: true,
    audiences: { clients: true, resellers: true, steamDistributors: true },
    accounts: [
      { id: "mercadopago", enabled: true, name: "Mercado Pago", type: "Cuenta Vista", holder: "José Roberto Muñoz Osses", rut: "21.715.187-2", number: "1095508563", email: "comprobantesswitch2@gmail.com", logo: "/logos%20bancos/mercadopago.jpg", color: "#009ee3", audiences: { clients: true, resellers: true, steamDistributors: true } },
      { id: "bancoestado", enabled: true, name: "BancoEstado", type: "Cuenta RUT", holder: "Matías Muñoz", rut: "236326845", number: "236326845", email: "comprobantesswitch2@gmail.com", logo: "/logos%20bancos/banco%20estado.png", color: "#f5a623", audiences: { clients: true, resellers: true, steamDistributors: true } },
      { id: "santander", enabled: true, name: "Banco Santander", type: "Cuenta Corriente", holder: "José Roberto Muñoz Osses", rut: "21.715.187-2", number: "0 000 97 74931 0", email: "comprobantesswitch2@gmail.com", logo: "/logos%20bancos/santander.png", color: "#e53935", audiences: { clients: true, resellers: true, steamDistributors: true } },
    ],
  },
  crypto: {
    enabled: true,
    name: "USDT",
    network: "BEP20 (BSC)",
    address: "0x7320E27e6FEB10d2bA387928c5bb6675b2AD2965",
    audiences: { clients: true, resellers: true, steamDistributors: true },
  },
};

const mergeAudiences = (value) => ({ ...DEFAULT_PAYMENT_SETTINGS.mercadoPago.audiences, ...(value || {}) });

// Las cuentas configurables del admin pueden venir con campos omitidos. Firestore
// no acepta `undefined` dentro de un documento, por lo que cada flujo de pago
// debe recibir valores serializables y seguros antes de guardar una solicitud.
const normalizeBankAccount = (account = {}) => {
  const fallback = DEFAULT_PAYMENT_SETTINGS.transfer.accounts.find((item) => item.id === account.id) || {};
  return {
    ...fallback,
    ...account,
    id: String(account.id || fallback.id || "cuenta"),
    name: String(account.name || fallback.name || "Cuenta bancaria"),
    type: String(account.type || fallback.type || "Cuenta oficial"),
    holder: String(account.holder || fallback.holder || "No informado"),
    rut: String(account.rut || fallback.rut || "No informado"),
    number: String(account.number || fallback.number || "No informado"),
    email: String(account.email || fallback.email || "No informado"),
    logo: String(account.logo || fallback.logo || ""),
    color: String(account.color || fallback.color || "#a259ff"),
    enabled: account.enabled !== false,
    audiences: mergeAudiences(account.audiences),
  };
};

export function normalizePaymentSettings(value = {}) {
  const transfer = { ...DEFAULT_PAYMENT_SETTINGS.transfer, ...(value.transfer || {}) };
  transfer.audiences = mergeAudiences(value.transfer?.audiences);
  transfer.accounts = (Array.isArray(value.transfer?.accounts) ? value.transfer.accounts : DEFAULT_PAYMENT_SETTINGS.transfer.accounts)
    .map(normalizeBankAccount);
  return {
    mercadoPago: { ...DEFAULT_PAYMENT_SETTINGS.mercadoPago, ...(value.mercadoPago || {}), enabled: true, audiences: mergeAudiences(value.mercadoPago?.audiences) },
    transfer,
    crypto: { ...DEFAULT_PAYMENT_SETTINGS.crypto, ...(value.crypto || {}), audiences: mergeAudiences(value.crypto?.audiences) },
  };
}

export function audienceForUser(user) {
  if (hasSteamDistributorAccess(user)) return "steamDistributors";
  if (hasResellerBenefits(user)) return "resellers";
  return "clients";
}

export function visibleForUser(item, user) {
  return item?.enabled !== false && Boolean((item?.audiences || {}).hasOwnProperty(audienceForUser(user)) ? item.audiences[audienceForUser(user)] : true);
}

export function visibleBankAccounts(settings, user) {
  return (settings?.transfer?.accounts || []).filter((account) => visibleForUser(account, user));
}

export function validatePaymentProofFile(file) {
  if (!file) return "Adjunta el comprobante de pago.";
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const allowedExtension = /\.(jpe?g|png|webp|pdf)$/i.test(file.name || "");
  if (!allowedTypes.includes(file.type) && !allowedExtension) {
    return "El comprobante debe ser una imagen JPG, PNG, WEBP o un PDF.";
  }
  if (file.size > 10 * 1024 * 1024) return "El comprobante no puede superar los 10 MB.";
  return "";
}
