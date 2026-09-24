export function formatWorkspaceAddress(settings = {}) {
  return [settings.addressLine1, settings.addressLine2, [settings.postalCode, settings.city].filter(Boolean).join(" "), settings.country]
    .filter(Boolean)
    .join(" · ");
}

export function formatWorkspaceContact(settings = {}) {
  return [settings.phone, settings.phone2, settings.email, settings.website].filter(Boolean).join(" · ");
}

export function formatWorkspaceLegalInfo(settings = {}) {
  return [
    settings.rccm && `RCCM : ${settings.rccm}`,
    settings.idNat && `Id.Nat : ${settings.idNat}`,
    settings.taxNumber && `N° impôt : ${settings.taxNumber}`
  ].filter(Boolean).join(" · ");
}
