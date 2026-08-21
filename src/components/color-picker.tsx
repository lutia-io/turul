import { badgeColors, getBadgeColor, type BadgeColor } from "@/lib/badge"
import { cn } from "@/lib/utils"

const colorOptions = Object.keys(badgeColors) as BadgeColor[]

export function ColorPicker({
  value,
  onChange,
}: {
  value: BadgeColor
  onChange: (color: BadgeColor) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colorOptions.map((color) => {
        const tone = getBadgeColor(color)
        const selected = color === value

        return (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={color}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            className={cn(
              "size-6 rounded-md ring-offset-background transition-shadow",
              tone.bg,
              selected
                ? "ring-2 ring-ring ring-offset-2"
                : "hover:ring-2 hover:ring-border hover:ring-offset-2"
            )}
          />
        )
      })}
    </div>
  )
}
