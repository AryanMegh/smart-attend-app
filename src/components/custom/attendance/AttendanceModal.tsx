import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FaceScanner from "./FaceScanner";
import { useAttendance } from "@/context/AttendanceContext";
import { useAuth } from "@/context/AuthContext";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import type { AttendanceRecord } from "@/types";

type ModalMode = "checkin" | "checkout";
type Step = "scan" | "confirm" | "done";

interface AttendanceModalProps {
  mode: ModalMode;
  open: boolean;
  onClose: () => void;
}

export default function AttendanceModal({ mode, open, onClose }: AttendanceModalProps) {
  const { profile } = useAuth();
  const { checkIn, checkOut, locationStatus } = useAttendance();
  const [step, setStep] = useState<Step>("scan");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AttendanceRecord | null>(null);

  const handleFaceVerified = (_descriptor: number[]) => {
    setStep("confirm");
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = mode === "checkin" ? await checkIn(null) : await checkOut();
      setResult(res);
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep("scan");
    setResult(null);
    onClose();
  };

  const isLWP = result?.status === "lwp";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "checkin" ? "Check In" : "Check Out"} — Face Verification
          </DialogTitle>
          <DialogDescription>
            {step === "scan" && "Look directly at the camera to verify your identity"}
            {step === "confirm" && "Review your location and confirm"}
            {step === "done" && (isLWP ? "⚠️ Attendance marked as LWP" : "✅ Attendance recorded successfully")}
          </DialogDescription>
        </DialogHeader>

        {step === "scan" && (
          <FaceScanner
            storedDescriptor={profile?.faceDescriptor}
            profile={profile}
            onVerified={handleFaceVerified}
          />
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 border ${locationStatus?.inside ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <div className="flex items-start gap-2">
                <MapPin className={`h-5 w-5 mt-0.5 ${locationStatus?.inside ? "text-emerald-600" : "text-red-600"}`} />
                <div>
                  <p className="font-semibold text-sm">
                    {locationStatus?.inside ? "Inside work zone ✓" : locationStatus?.inside == null ? "Location not verified" : "⚠️ Outside work zone"}
                  </p>
                  {locationStatus?.inside == null && mode === "checkout" && (
                    <p className="text-xs text-amber-700 mt-1">We couldn't read your location. You can still check out; it will be flagged as unverified.</p>
                  )}
                  {locationStatus?.inside === false && mode === "checkout" && (
                    <p className="text-xs text-red-700 mt-1">
                      Checking out here will mark your attendance as <strong>LWP (Leave Without Pay)</strong>.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleConfirm} className="flex-1" disabled={loading}
                variant={locationStatus?.inside === false && mode === "checkout" ? "destructive" : "default"}>
                {loading ? <Loader2 className="animate-spin h-4 w-4" /> : `Confirm ${mode === "checkin" ? "Check In" : "Check Out"}`}
              </Button>
              <Button onClick={() => setStep("scan")} variant="outline">Rescan</Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="text-center space-y-4 py-4">
            <CheckCircle2 className={`h-16 w-16 mx-auto ${isLWP ? "text-orange-500" : "text-emerald-500"}`} />
            <div>
              <p className="text-lg font-bold">
                {mode === "checkin" ? "Checked In!" : "Checked Out!"}
              </p>
              {!!result?.totalMinutes && (
                <p className="text-muted-foreground text-sm">Total time: {Math.floor(result.totalMinutes / 60)}h {Math.round(result.totalMinutes % 60)}m</p>
              )}
              {isLWP && <p className="text-orange-600 text-sm mt-1">Status: Leave Without Pay</p>}
            </div>
            <Button onClick={handleClose} className="w-full">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
