import {
  BadgeCheckIcon,
  CircleDashedIcon,
  CircleXIcon,
  ClockIcon,
  LoaderCircleIcon,
  PauseIcon,
  type LucideIcon,
} from "lucide-react"

export const badgeColors = {
  yellow: {
    bg: "bg-yellow-400",
    text: "text-yellow-950",
    fg: "text-yellow-600 dark:text-yellow-400",
  },
  orange: {
    bg: "bg-orange-500",
    text: "text-white",
    fg: "text-orange-600 dark:text-orange-400",
  },
  red: {
    bg: "bg-red-500",
    text: "text-white",
    fg: "text-red-600 dark:text-red-400",
  },
  pink: {
    bg: "bg-pink-500",
    text: "text-white",
    fg: "text-pink-600 dark:text-pink-400",
  },
  purple: {
    bg: "bg-violet-500",
    text: "text-white",
    fg: "text-violet-600 dark:text-violet-400",
  },
  blue: {
    bg: "bg-blue-500",
    text: "text-white",
    fg: "text-blue-600 dark:text-blue-400",
  },
  cyan: {
    bg: "bg-cyan-500",
    text: "text-white",
    fg: "text-cyan-600 dark:text-cyan-400",
  },
  teal: {
    bg: "bg-teal-500",
    text: "text-white",
    fg: "text-teal-600 dark:text-teal-400",
  },
  green: {
    bg: "bg-emerald-500",
    text: "text-white",
    fg: "text-emerald-600 dark:text-emerald-400",
  },
  gray: {
    bg: "bg-zinc-500",
    text: "text-white",
    fg: "text-zinc-600 dark:text-zinc-400",
  },
} as const

export type BadgeColor = keyof typeof badgeColors

export const statusBadgeConfig: Record<
  string,
  { icon: LucideIcon; color: BadgeColor }
> = {
  Active: { icon: BadgeCheckIcon, color: "green" },
  Published: { icon: BadgeCheckIcon, color: "green" },
  Draft: { icon: CircleDashedIcon, color: "yellow" },
  Running: { icon: LoaderCircleIcon, color: "cyan" },
  Queued: { icon: ClockIcon, color: "yellow" },
  Succeeded: { icon: BadgeCheckIcon, color: "green" },
  Failed: { icon: CircleXIcon, color: "red" },
  Paused: { icon: PauseIcon, color: "gray" },
}

export function getBadgeColor(color: BadgeColor | string | undefined) {
  if (color && color in badgeColors) {
    return badgeColors[color as BadgeColor]
  }
  return badgeColors.gray
}
