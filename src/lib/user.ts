export type UserRef = {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function userDisplayName(user?: UserRef | null) {
  if (!user) {
    return ""
  }
  const name = `${user.firstName} ${user.lastName}`.trim()
  return name || user.email
}

export function userInitials(user?: UserRef | null) {
  const name = userDisplayName(user)
  if (!name) {
    return ""
  }
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}
