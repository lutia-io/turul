import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react"

import {
  Card,
  CardAction,
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
import {
  ACTIVITY_DAYS,
  summarizeOutcomes,
  type ActivityDay,
  type OutcomeDay,
  type VolumeRow,
} from "@/lib/activity"

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

export function runStatusSlices(counts: {
  running: number
  pending: number
  completed: number
  failed: number
}): RunStatusSlice[] {
  return [
    { status: "running", value: counts.running },
    { status: "pending", value: counts.pending },
    { status: "completed", value: counts.completed },
    { status: "failed", value: counts.failed },
  ]
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
  emptyHint = "No workflow runs yet. Status will fill in as executions start.",
}: {
  data: RunStatusSlice[]
  total: number
  title?: string
  description?: string
  emptyHint?: string
}) {
  const hasRuns = total > 0
  const completed = data.find((item) => item.status === "completed")?.value ?? 0
  const successRate = hasRuns ? Math.round((completed / total) * 100) : null
  const pieData = hasRuns
    ? data
        .filter((item) => item.value > 0)
        .map((item) => ({
          ...item,
          fill: `var(--color-${item.status})`,
        }))
    : [{ status: "empty", value: 1, fill: "var(--border)" }]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {successRate != null ? (
          <CardAction>
            <p className="text-sm font-medium text-muted-foreground tabular-nums">
              <span className="text-foreground">{successRate}%</span> succeeded
            </p>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex min-h-[200px] flex-1 flex-col items-center justify-center">
        <ChartContainer
          config={runStatusChartConfig}
          className="aspect-square h-[200px] w-[200px]"
          initialDimension={{ width: 200, height: 200 }}
        >
          <PieChart>
            {hasRuns ? (
              <ChartTooltip
                content={<ChartTooltipContent hideLabel nameKey="status" />}
              />
            ) : null}
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="status"
              innerRadius={58}
              strokeWidth={4}
              stroke="var(--card)"
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
                          {total === 1 ? "run" : "runs"}
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        {hasRuns ? null : (
          <p className="text-xs text-muted-foreground">{emptyHint}</p>
        )}
        {data.map((item) => {
          const share = hasRuns ? (item.value / total) * 100 : 0

          return (
            <div key={item.status} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3 text-sm">
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
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{
                    width: `${share}%`,
                    backgroundColor: runStatusChartConfig[item.status].color,
                  }}
                />
              </div>
            </div>
          )
        })}
      </CardFooter>
    </Card>
  )
}

export const outcomeChartConfig = {
  completed: {
    label: "Succeeded",
    color: "oklch(0.7 0.15 155)",
  },
  failed: {
    label: "Failed",
    color: "oklch(0.64 0.22 27)",
  },
} satisfies ChartConfig

function truncateTick(value: string) {
  return value.length > 16 ? `${value.slice(0, 15)}…` : value
}

export function VolumeChart({
  data,
  title,
  description,
  series = ["records", "files", "runs"],
  emptyLabel = "Nothing to compare yet.",
}: {
  data: VolumeRow[]
  title: string
  description: string
  series?: ("records" | "files" | "runs")[]
  emptyLabel?: string
}) {
  const total = data.reduce(
    (sum, row) => sum + series.reduce((count, key) => count + row[key], 0),
    0
  )
  const height = Math.max(200, data.length * 42 + 16)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </p>
        ) : (
          <ChartContainer
            config={activityChartConfig}
            className="aspect-auto w-full"
            style={{ height }}
            initialDimension={{ width: 360, height }}
          >
            <BarChart
              accessibilityLayer
              data={data}
              layout="vertical"
              margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={104}
                tickLine={false}
                axisLine={false}
                tickFormatter={truncateTick}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              {series.length > 1 ? (
                <ChartLegend content={<ChartLegendContent />} />
              ) : null}
              {series.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="volume"
                  fill={`var(--color-${key})`}
                  radius={
                    index === series.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {total === 0
          ? emptyLabel
          : `${total.toLocaleString()} ${series.length === 1 ? "rows" : "events"} across ${data.length} ${data.length === 1 ? "group" : "groups"}`}
      </CardFooter>
    </Card>
  )
}

export function OutcomeChart({
  data,
  title = "Run outcomes",
  description,
}: {
  data: OutcomeDay[]
  title?: string
  description: string
}) {
  const totals = summarizeOutcomes(data)
  const total = totals.completed + totals.failed

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {total > 0 ? (
          <CardAction>
            <p className="text-sm font-medium text-muted-foreground tabular-nums">
              <span className="text-foreground">{totals.completed}</span>{" "}
              succeeded
            </p>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={outcomeChartConfig}
          className="aspect-auto h-[220px] w-full"
        >
          <BarChart
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
            <Bar
              dataKey="completed"
              stackId="outcomes"
              fill="var(--color-completed)"
            />
            <Bar
              dataKey="failed"
              stackId="outcomes"
              fill="var(--color-failed)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        {total === 0
          ? "No finished runs in this window."
          : `${totals.failed.toLocaleString()} failed · ${totals.completed.toLocaleString()} succeeded over ${ACTIVITY_DAYS} days`}
      </CardFooter>
    </Card>
  )
}
