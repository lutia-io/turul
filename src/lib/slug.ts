export function slugifyId(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "item"
}

export function uniqueId(base: string, taken: (id: string) => boolean) {
  const root = slugifyId(base)
  if (!taken(root)) {
    return root
  }

  let suffix = 2
  while (taken(`${root}-${suffix}`)) {
    suffix += 1
  }

  return `${root}-${suffix}`
}

export function toFieldName(value: string) {
  const parts = value
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)

  if (parts.length === 0) {
    return "field"
  }

  return parts
    .map((part, index) => {
      const lower = part.toLowerCase()
      if (index === 0) {
        return lower
      }

      return lower.slice(0, 1).toUpperCase() + lower.slice(1)
    })
    .join("")
}
