import { AlertTriangle } from "lucide-react";

/**
 * Surfaces a failed attendance fetch (permission error, missing Firestore
 * index, network issue, etc.) instead of letting it look identical to a
 * legitimate "no records yet" empty state. useAttendanceReport() already
 * captures the error message — every page using it should render this
 * when `error` is set, rather than silently falling through to whatever
 * the zero/empty-state UI happens to be.
 */
export default function ReportErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-destructive">Couldn't load attendance data</p>
        <p className="text-muted-foreground mt-0.5">{error}</p>
      </div>
    </div>
  );
}
