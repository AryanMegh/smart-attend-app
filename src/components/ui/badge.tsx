import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        success:
          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
        warning:
          "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        // ── Attendance status variants ──────────────────────────────
        // SummaryPills (ReportsPage), HistoryPage's quick stats, and
        // AttendanceTable all pass raw status strings ("present",
        // "half_day", etc.) as the Badge variant. Without a matching key
        // here, cva silently drops the color classes and every status
        // renders as a flat, unstyled pill. These match STATUS_COLORS in
        // AttendanceChart.tsx — keep both in sync if that palette changes.
        present:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 [a]:hover:bg-emerald-500/20",
        absent:
          "bg-red-500/10 text-red-700 dark:text-red-400 [a]:hover:bg-red-500/20",
        lwp:
          "bg-orange-500/10 text-orange-700 dark:text-orange-400 [a]:hover:bg-orange-500/20",
        late:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 [a]:hover:bg-amber-500/20",
        half_day:
          "bg-blue-500/10 text-blue-700 dark:text-blue-400 [a]:hover:bg-blue-500/20",
        holiday:
          "bg-violet-500/10 text-violet-700 dark:text-violet-400 [a]:hover:bg-violet-500/20",
        leave:
          "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 [a]:hover:bg-cyan-500/20",
        "in-progress":
          "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 [a]:hover:bg-indigo-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props} />
  );
}

export { Badge, badgeVariants }
