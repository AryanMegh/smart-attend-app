import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime, formatDuration, statusBadgeVariant } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { AttendanceRecord } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  present:    "Present",
  absent:     "Absent",
  lwp:        "LWP",
  late:       "Late",
  half_day:   "Half Day",
  holiday:    "Holiday",
  leave:      "Leave",
  "in-progress": "Working",
};

interface AttendanceTableProps {
  records: AttendanceRecord[];
  emptyMessage?: string;
}

export default function AttendanceTable({ records, emptyMessage = "No records found" }: AttendanceTableProps) {
  if (!records?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg font-medium mb-1">{emptyMessage}</p>
        <p className="text-sm">Attendance data will appear here once recorded</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            {["Date", "Status", "Check In", "Check Out", "Duration", "Location"].map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map((r) => (
            <tr key={r.id ?? r.date} className={cn(
              "hover:bg-muted/30 transition-colors",
              r.status === "lwp" && "bg-orange-50/50 dark:bg-orange-950/20",
              r.status === "holiday" && "bg-sky-50/50 dark:bg-sky-950/20 text-muted-foreground",
            )}>
              <td className="px-4 py-3 font-medium whitespace-nowrap">{formatDate(r.date)}</td>
              <td className="px-4 py-3">
                <Badge variant={statusBadgeVariant(r.status)} className="text-xs">
                  {STATUS_LABEL[r.status] ?? r.status ?? "—"}
                </Badge>
                {r.holidayName && <span className="ml-2 text-xs text-muted-foreground">{r.holidayName}</span>}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{r.checkInTime ? formatTime(r.checkInTime) : "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{r.checkOutTime ? formatTime(r.checkOutTime) : "—"}</td>
              <td className="px-4 py-3">{r.totalMinutes ? formatDuration(r.totalMinutes) : "—"}</td>
              <td className="px-4 py-3">
                {r.insideOnCheckIn === true  && <span className="text-xs text-emerald-600 font-medium">In Zone</span>}
                {r.insideOnCheckOut === false && <span className="text-xs text-red-600 font-medium">Left Zone</span>}
                {r.insideOnCheckIn == null   && <span className="text-xs text-muted-foreground">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
