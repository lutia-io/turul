const TIME_INPUT = /^(\d{2}):(\d{2})(?::(\d{2}))?$/
const RFC3339_TIME = /^(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/i

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function clockInRange(hour: number, minute: number, second: number) {
  return (
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59
  )
}

function parseRfc3339Time(value: string) {
  const match = value.match(RFC3339_TIME)
  if (!match) {
    return undefined
  }

  const now = new Date()
  const zone = match[4].toUpperCase() === "Z" ? "Z" : match[4]
  const iso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${match[1]}:${match[2]}:${match[3]}${zone}`
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }
  return date
}

// toTimeInputValue converts a stored time into the local HH:MM:SS value an
// <input type="time"> accepts. Bare clock times are kept as entered.
export function toTimeInputValue(value: string) {
  const trimmed = value.trim()
  const plain = trimmed.match(TIME_INPUT)
  if (plain && !/[zZ+-]/.test(trimmed)) {
    const hour = Number(plain[1])
    const minute = Number(plain[2])
    const second = Number(plain[3] ?? 0)
    if (!clockInRange(hour, minute, second)) {
      return ""
    }
    return `${plain[1]}:${plain[2]}:${plain[3] ?? "00"}`
  }

  const date = parseRfc3339Time(trimmed)
  if (!date) {
    return ""
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// fromTimeInputValue stores a local clock time as an RFC 3339 full-time in
// UTC, which JSON Schema format "time" requires.
export function fromTimeInputValue(value: string) {
  const match = value.trim().match(TIME_INPUT)
  if (!match) {
    return undefined
  }

  const hour = Number(match[1])
  const minute = Number(match[2])
  const second = Number(match[3] ?? 0)
  if (!clockInRange(hour, minute, second)) {
    return undefined
  }

  const date = new Date()
  date.setHours(hour, minute, second, 0)
  return `${date.toISOString().slice(11, 19)}Z`
}

export function formatTimeValue(value: string) {
  const stored = parseRfc3339Time(value.trim())
  if (stored) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(stored)
  }

  const local = toTimeInputValue(value)
  if (!local) {
    return value
  }
  const [hour, minute] = local.split(":")
  const date = new Date()
  date.setHours(Number(hour), Number(minute), 0, 0)
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}
