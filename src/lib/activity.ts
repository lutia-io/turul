export const ACTIVITY_DAYS = 14

export type ActivityDay = {
  label: string
  records: number
  files: number
  runs: number
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function dayKeyFromIso(iso: string) {
  return dayKey(new Date(iso))
}

export function lastNDays(count: number, now = new Date()) {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() - (count - 1 - index))

    return {
      key: dayKey(date),
      label: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }
  })
}

export function percentChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }

  return Math.round(((current - previous) / previous) * 100)
}

export function bucketActivity({
  days = ACTIVITY_DAYS,
  records,
  files,
  runs,
}: {
  days?: number
  records: { createdAt: string }[]
  files: { createdAt: string }[]
  runs: { createdAt: string }[]
}): ActivityDay[] {
  const window = lastNDays(days)
  const counts = new Map(
    window.map((day) => [day.key, { records: 0, files: 0, runs: 0 }])
  )

  for (const record of records) {
    const bucket = counts.get(dayKeyFromIso(record.createdAt))
    if (bucket) bucket.records += 1
  }

  for (const file of files) {
    const bucket = counts.get(dayKeyFromIso(file.createdAt))
    if (bucket) bucket.files += 1
  }

  for (const run of runs) {
    const bucket = counts.get(dayKeyFromIso(run.createdAt))
    if (bucket) bucket.runs += 1
  }

  return window.map((day) => ({
    label: day.label,
    ...counts.get(day.key)!,
  }))
}

export function summarizeActivity(activity: ActivityDay[]) {
  const sum = (slice: ActivityDay[], key: keyof Omit<ActivityDay, "label">) =>
    slice.reduce((total, day) => total + day[key], 0)
  const recent = activity.slice(-7)
  const previous = activity.slice(0, 7)
  const recentTotal =
    sum(recent, "records") + sum(recent, "files") + sum(recent, "runs")
  const previousTotal =
    sum(previous, "records") + sum(previous, "files") + sum(previous, "runs")

  return {
    total:
      sum(activity, "records") + sum(activity, "files") + sum(activity, "runs"),
    change: percentChange(recentTotal, previousTotal),
    recordsThisWeek: sum(recent, "records"),
    filesThisWeek: sum(recent, "files"),
  }
}
