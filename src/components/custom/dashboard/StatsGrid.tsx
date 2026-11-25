import { Card, CardContent } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Clock, Calendar, TrendingUp, AlertTriangle, CheckCircle2, XCircle, type LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import type { AttendanceSummary } from "@/hooks/useAttendanceReport";

type StatColor = "green" | "red" | "amber" | "blue" | "purple";

interface StatCardProps {
  icon: ComponentType<LucideProps>;
  label: string;
  value: string | number;
  sublabel?: string;
  color: StatColor;
  className?: string;
}

function StatCard({ icon: Icon, label, value, sublabel, color, className }: StatCardProps) {
  const colors: Record<StatColor, string> = {
    green:  "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
    red:    "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    amber:  "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    blue:   "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  };

  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          </div>
          <div className={cn("p-2.5 rounded-xl", colors[color] ?? colors.blue)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsGridProps {
  stats?: Partial<AttendanceSummary> | null;
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const { presentDays = 0, absentDays = 0, lwpDays = 0, totalHours = 0, attendancePct = 0, monthDays = 0 } = stats ?? {};

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard icon={CheckCircle2} label="Present Days"   value={presentDays}              sublabel={`of ${monthDays} working days`} color="green"  />
      <StatCard icon={XCircle}      label="Absent Days"    value={absentDays}               sublabel="This month"                     color="red"    />
      <StatCard icon={AlertTriangle}label="LWP Days"       value={lwpDays}                  sublabel="Leave Without Pay"              color="amber"  />
      <StatCard icon={Clock}        label="Total Hours"    value={formatDuration(totalHours * 60)} sublabel="This month"             color="blue"   />
      <StatCard icon={TrendingUp}   label="Attendance %"  value={`${attendancePct.toFixed(1)}%`} sublabel="Punctuality rate"        color="purple" />
      <StatCard icon={Calendar}     label="Month Days"    value={monthDays}                sublabel="Working days"                   color="blue"   />
    </div>
  );
}
