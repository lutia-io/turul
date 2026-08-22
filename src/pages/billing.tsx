import { CreditCardIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const invoices = [
  { id: "INV-004", date: "Aug 1, 2026", amount: "$0.00", status: "Paid" },
  { id: "INV-003", date: "Jul 1, 2026", amount: "$0.00", status: "Paid" },
  { id: "INV-002", date: "Jun 1, 2026", amount: "$0.00", status: "Paid" },
  { id: "INV-001", date: "May 1, 2026", amount: "$0.00", status: "Paid" },
]

export default function Billing() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-x-hidden bg-muted/40 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Manage your plan, payment method, and invoices.
        </p>
      </div>

      <div className="flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current plan</CardTitle>
            <CardDescription>
              You are on the Free plan. Upgrade to unlock more capacity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="mt-1 text-lg font-semibold tracking-tight">
                  Free
                </p>
              </div>
              <div className="rounded-xl bg-muted/70 px-4 py-3">
                <p className="text-xs text-muted-foreground">Renews</p>
                <p className="mt-1 text-lg font-semibold tracking-tight">
                  Not billed
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button>Upgrade to Pro</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
            <CardDescription>
              Cards on file are used for plan charges and overages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-xl border bg-background px-3.5 py-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CreditCardIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">No card on file</p>
                <p className="text-xs text-muted-foreground">
                  Add a payment method to upgrade your plan.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button variant="outline">Add payment method</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoices</CardTitle>
            <CardDescription>
              Past invoices for this account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.amount}</TableCell>
                    <TableCell>{invoice.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
