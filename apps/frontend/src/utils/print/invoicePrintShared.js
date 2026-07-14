export function formatWorkspaceAddress(settings = {}) {
  return [settings.addressLine1, settings.addressLine2, [settings.postalCode, settings.city].filter(Boolean).join(" "), settings.country]
    .filter(Boolean)
    .join(" · ");
}

export function formatWorkspaceContact(settings = {}) {
  return [settings.phone, settings.email, settings.website].filter(Boolean).join(" · ");
}

export function formatWorkspaceServices(settings = {}) {
  return String(settings.services || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(" · ");
}
