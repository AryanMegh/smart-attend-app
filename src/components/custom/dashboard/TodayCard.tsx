import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAttendance } from "@/context/AttendanceContext";
import { formatTime, statusBadgeVariant, type DateLike } from "@/lib/utils";
import { LogIn, LogOut, Clock, MapPin, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAttendanceState } from "@/lib/attendanceState";
import { holidayInfo } from "@/lib/holidays";
import { todayStr } from "@/lib/firestoreApi";

function LiveClock({ startTime }: { startTime: DateLike }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) return;
    const start =
      typeof startTime === "object" && "toDate" in startTime
        ? startTime.toDate()
        : new Date(startTime);
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  const h = Math.floor(elapsed / 3600).toString().padStart(2, "0");
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0");
  const s = (elapsed % 60).toString().padStart(2, "0");

  return <span className="font-mono text-3xl font-bold tabular-nums">{h}:{m}:{s}</span>;
}

interface TodayCardProps {
  onCheckIn: () => void;
  onCheckOut: () => void;
}

export default function TodayCard({ onCheckIn, onCheckOut }: TodayCardProps) {
  const { todayRecord, activeSession, locationStatus, locationLoading, leftWorkArea, refreshLocation } = useAttendance();

  const { hasCheckedIn, hasCheckedOut } = getAttendanceState(todayRecord);
  const isCheckedIn = !!activeSession;
  const isOutside   = locationStatus?.inside === false;
  const holiday     = holidayInfo(todayStr());

  return (
    <Card className={cn(
      "border-2 transition-colors",
      isCheckedIn ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10 dark:border-emerald-900" : "border-border"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Today's Attendance</CardTitle>
          <div className="flex items-center gap-2">
            {isCheckedIn && (
              <div className="live-indicator">
                <span />
                <span />
              </div>
            )}
            <Badge variant={statusBadgeVariant(todayRecord?.status)}>
              {todayRecord?.status === "in-progress" ? "Working" : todayRecord?.status ?? "Not Started"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Live timer */}
        {isCheckedIn && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-1">Time Worked Today</p>
            <LiveClock startTime={activeSession?.startedAt} />
          </div>
        )}

        {/* Check-in / out times */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Check In</p>
            <p className="font-semibold text-sm">{todayRecord?.checkInTime ? formatTime(todayRecord.checkInTime) : "—"}</p>
            {todayRecord?.isLate && <p className="text-xs text-amber-600">Late</p>}
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">Check Out</p>
            <p className="font-semibold text-sm">{todayRecord?.checkOutTime ? formatTime(todayRecord.checkOutTime) : "—"}</p>
          </div>
        </div>

        {/* Location status */}
        <div className={cn(
          "flex items-center gap-2 rounded-xl p-3 text-sm",
          isOutside ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" : "bg-muted text-muted-foreground"
        )}>
          {locationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isOutside ? <AlertTriangle className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          <span className="text-xs font-medium">
            {locationStatus === null
              ? "Location not yet checked"
              : locationStatus?.error
              ? `Location error: ${locationStatus.error}`
              : isOutside
              ? "⚠️ You are outside the work area! Checkout will mark LWP."
              : `✓ You are inside the work area${locationStatus?.locationName ? ` (${locationStatus.locationName})` : ""}`}
          </span>
          <button onClick={refreshLocation} className="ml-auto text-xs underline shrink-0">
            Refresh
          </button>
        </div>

        {leftWorkArea && isCheckedIn && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 dark:bg-red-950 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-300 font-medium">
              🚩 Left work area — this session will be recorded as LWP.
            </p>
          </div>
        )}
        {!leftWorkArea && isOutside && isCheckedIn && (
          <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 dark:bg-orange-950 dark:border-orange-800">
            <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
              ⚠️ LWP Warning: Checking out while outside the work area will record your attendance as Leave Without Pay.
            </p>
          </div>
        )}

        {holiday.isHoliday && !hasCheckedIn && (
          <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 dark:bg-sky-950 dark:border-sky-800">
            <p className="text-xs text-sky-800 dark:text-sky-200 font-medium">
              🎉 Today is a holiday ({holiday.name}). You don't need to check in — do so only if you are working.
            </p>
          </div>
        )}

        {/* Check-in is final for the day; check-out can be redone (latest wins) */}
        {!hasCheckedIn ? (
          <Button className="w-full" size="lg" variant="success" onClick={onCheckIn}>
            <LogIn className="h-4 w-4" /> Check In
          </Button>
        ) : (
          <div className="space-y-1.5">
            <Button className="w-full" size="lg" variant="warning" onClick={onCheckOut}>
              <LogOut className="h-4 w-4" /> {hasCheckedOut ? "Update Check Out" : "Check Out"}
            </Button>
            {hasCheckedOut && (
              <p className="text-center text-xs text-muted-foreground">
                Checked out by mistake? Check out again — the latest time is saved.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
