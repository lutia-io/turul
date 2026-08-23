import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
} from "recharts"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ACTIVITY_DAYS, type ActivityDay } from "@/lib/activity"

export const activityChartConfig = {
  records: {
    label: "Records",
    color: "var(--chart-1)",
  },
  files: {
    label: "Files",
    color: "var(--chart-2)",
  },
  runs: {
    label: "Workflow runs",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

export const runStatusChartConfig = {
  running: {
    label: "Running",
    color: "oklch(0.72 0.12 215)",
  },
  pending: {
    label: "Queued",
    color: "oklch(0.83 0.14 85)",
  },
  completed: {
    label: "Completed",
    color: "oklch(0.7 0.15 155)",
  },
  failed: {
    label: "Failed",
    color: "oklch(0.64 0.22 27)",
  },
} satisfies ChartConfig

export type RunStatusKey = keyof typeof runStatusChartConfig

export type RunStatusSlice = {
  status: RunStatusKey
  value: number
}

export function ActivityChart({
  data,
  total,
  change,
  title = "Workspace activity",
  description,
}: {
  data: ActivityDay[]
  total: number
  change: number
  title?: string
  description?: string
}) {
  const TrendIcon = change < 0 ? TrendingDownIcon : TrendingUpIcon

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description ??
            `Records, files, and workflow runs over the last ${ACTIVITY_DAYS} days.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={activityChartConfig}
          className="aspect-auto h-[220px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{ left: 8, right: 8, top: 8 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="equidistantPreserveStart"
              minTickGap={24}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="records"
              type="monotone"
              fill="var(--color-records)"
              fillOpacity={0.35}
              stroke="var(--color-records)"
              strokeWidth={1.5}
              stackId="activity"
            />
            <Area
              dataKey="files"
              type="monotone"
              fill="var(--color-files)"
              fillOpacity={0.35}
              stroke="var(--color-files)"
              strokeWidth={1.5}
              stackId="activity"
            />
            <Area
              dataKey="runs"
              type="monotone"
              fill="var(--color-runs)"
              fillOpacity={0.4}
              stroke="var(--color-runs)"
              strokeWidth={1.5}
              stackId="activity"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="gap-2 text-sm">
        {total === 0 ? (
          <span className="text-muted-foreground">
            No records, files, or runs in this window.
          </span>
        ) : (
          <>
            <TrendIcon className="size-4" />
            <span className="font-medium tabular-nums">
              {total.toLocaleString()} events
            </span>
            <span className="text-muted-foreground">
              {change === 0
                ? "even with the prior 7 days"
                : `${Math.abs(change)}% ${change > 0 ? "up" : "down"} from the prior 7 days`}
            </span>
          </>
        )}
      </CardFooter>
    </Card>
  )
}

export function RunStatusChart({
  data,
  total,
  title = "Workflow health",
  description = "Run status across the workspace.",
}: {
  data: RunStatusSlice[]
  total: number
  title?: string
  description?: string
}) {
  const slices = data.filter((item) => item.value > 0)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No workflow runs yet.
          </p>
        ) : (
          <ChartContainer
            config={runStatusChartConfig}
            className="mx-auto aspect-square max-h-[220px]"
          >
            <PieChart>
              <ChartTooltip
                content={<ChartTooltipContent hideLabel nameKey="status" />}
              />
              <Pie
                data={slices.map((item) => ({
                  ...item,
                  fill: `var(--color-${item.status})`,
                }))}
                dataKey="value"
                nameKey="status"
                innerRadius={62}
                strokeWidth={5}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-semibold"
                          >
                            {total.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy ?? 0) + 22}
                            className="fill-muted-foreground text-xs"
                          >
                            runs
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        {data.map((item) => (
          <div
            key={item.status}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{
                  backgroundColor: runStatusChartConfig[item.status].color,
                }}
              />
              {runStatusChartConfig[item.status].label}
            </span>
            <span className="font-medium tabular-nums">{item.value}</span>
          </div>
        ))}
      </CardFooter>
    </Card>
  )
}
