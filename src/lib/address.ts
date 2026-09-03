import type { JsonObject, JsonValue } from "@/lib/json-definition"

export const ADDRESS_FORMAT = "address"

export const ADDRESS_FIELDS = [
  {
    name: "line1",
    label: "Address line 1",
    required: true,
    autoComplete: "address-line1",
    placeholder: "1 Market St",
  },
  {
    name: "line2",
    label: "Address line 2",
    required: false,
    autoComplete: "address-line2",
    placeholder: "Suite 100",
  },
  {
    name: "city",
    label: "City",
    required: true,
    autoComplete: "address-level2",
    placeholder: "San Francisco",
  },
  {
    name: "region",
    label: "State / region",
    required: false,
    autoComplete: "address-level1",
    placeholder: "CA",
  },
  {
    name: "postalCode",
    label: "Postal code",
    required: false,
    autoComplete: "postal-code",
    placeholder: "94105",
  },
  {
    name: "country",
    label: "Country",
    required: true,
    autoComplete: "country",
    placeholder: "US",
  },
] as const

export type AddressFieldName = (typeof ADDRESS_FIELDS)[number]["name"]
export type AddressValue = Partial<Record<AddressFieldName, string>>

export const ADDRESS_REQUIRED_FIELDS = ADDRESS_FIELDS.filter(
  (field) => field.required
).map((field) => field.name)

export function emptyAddress(): AddressValue {
  return {}
}

export function parseAddress(value: unknown): AddressValue {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return emptyAddress()
    }
    try {
      return parseAddress(JSON.parse(trimmed) as unknown)
    } catch {
      return emptyAddress()
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyAddress()
  }

  const source = value as Record<string, unknown>
  const address: AddressValue = {}
  for (const field of ADDRESS_FIELDS) {
    const next = source[field.name]
    if (typeof next === "string") {
      address[field.name] = next
    }
  }
  return address
}

export function addressToObject(address: AddressValue): JsonObject | undefined {
  const data: JsonObject = {}
  for (const field of ADDRESS_FIELDS) {
    const value = address[field.name]?.trim()
    if (value) {
      data[field.name] = value
    }
  }
  return Object.keys(data).length > 0 ? data : undefined
}

export function serializeAddress(address: AddressValue) {
  const data: JsonObject = {}
  for (const field of ADDRESS_FIELDS) {
    const value = address[field.name]
    if (value) {
      data[field.name] = value
    }
  }
  return Object.keys(data).length > 0 ? JSON.stringify(data) : ""
}

export function isEmptyAddress(address: AddressValue) {
  return ADDRESS_FIELDS.every((field) => !address[field.name]?.trim())
}

function addressPart(value: string | undefined) {
  return value?.trim() || undefined
}

export function formatAddressLine(value: unknown) {
  const address = parseAddress(value)
  const line = [addressPart(address.line1), addressPart(address.line2)]
    .filter(Boolean)
    .join(", ")
  const locality = [addressPart(address.city), addressPart(address.region)]
    .filter(Boolean)
    .join(", ")
  const localityPostal = [locality, addressPart(address.postalCode)]
    .filter(Boolean)
    .join(" ")
  return [line, localityPostal, addressPart(address.country)]
    .filter(Boolean)
    .join(", ")
}

export function formatAddressLines(value: unknown) {
  const address = parseAddress(value)
  const line = [addressPart(address.line1), addressPart(address.line2)]
    .filter(Boolean)
    .join("\n")
  const locality = [addressPart(address.city), addressPart(address.region)]
    .filter(Boolean)
    .join(", ")
  const localityPostal = [locality, addressPart(address.postalCode)]
    .filter(Boolean)
    .join(" ")
  return [line, localityPostal, addressPart(address.country)].filter(Boolean)
}

export function addressPropertySchema(): JsonObject {
  const properties: JsonObject = {}
  for (const field of ADDRESS_FIELDS) {
    properties[field.name] = {
      type: "string",
      description: field.label,
    }
  }
  return properties
}

export function isAddressValue(value: JsonValue | undefined) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}
