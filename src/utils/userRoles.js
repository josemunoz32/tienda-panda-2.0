const value = (role) => String(role || "").trim().toLowerCase();

export const isSuperAdmin = (user) => ["admin", "super_admin", "superadmin"].includes(value(user?.role));

export const hasResellerBenefits = (user) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (typeof user === "string") {
    return ["revendedor", "reseller", "reseller_active", "mayorista"].includes(value(user));
  }
  return ["revendedor", "reseller", "reseller_active", "mayorista"].includes(value(user?.role)) ||
    ["revendedor", "reseller", "reseller_active", "mayorista"].includes(value(user?.userRole)) ||
    ["aprobado", "approved", "activo", "active"].includes(value(user?.resellerStatus));
};

export const hasSteamDistributorAccess = (user) => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  if (typeof user === "string") {
    return ["distribuidor", "distribuidor_steam", "steam_distributor"].includes(value(user));
  }
  return ["distribuidor", "distribuidor_steam", "steam_distributor"].includes(value(user?.role)) ||
    user?.steam_distributor === true || user?.steamDistributor === true;
};

// Acceso operativo al portal Steam. A diferencia de hasSteamDistributorAccess,
// este chequeo considera una suspensión administrativa y la vigencia del plan.
// El rol histórico puede seguir apareciendo en listados, pero nunca habilita
// emitir licencias si el plan no está vigente.
export const hasActiveSteamDistributorAccess = (user) => {
  if (!user || typeof user === "string") return false;
  if (isSuperAdmin(user)) return true;

  const hasDistributorFlag = user?.steam_distributor === true || user?.steamDistributor === true;
  const status = value(user?.distributor_status || "active");
  if (!hasDistributorFlag || status !== "active") return false;

  const expiresAt = user?.distributor_expires_at;
  if (!expiresAt) return true;
  const expiration = new Date(expiresAt);
  return !Number.isNaN(expiration.getTime()) && expiration.getTime() > Date.now();
};

// Beneficios operativos B2B: ambos perfiles compran neto y pueden usar saldo.
// No se usa para descuentos de catálogo, que siguen siendo exclusivos de Revendedor.
export const hasB2BAccess = (user) =>
  isSuperAdmin(user) || hasResellerBenefits(user) || hasSteamDistributorAccess(user);

export const getUserRoleLabels = (user) => {
  if (!user) return ["Invitado"];
  const roles = [];
  if (isSuperAdmin(user)) roles.push("Super Admin");
  if (hasResellerBenefits(user)) roles.push("Revendedor");
  if (hasSteamDistributorAccess(user)) roles.push("Distribuidor Steam");
  return roles.length ? roles : ["Cliente"];
};

export const hasMultipleBusinessRoles = (user) =>
  hasResellerBenefits(user) && hasSteamDistributorAccess(user);
