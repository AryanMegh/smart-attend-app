import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { loadModels, detectFace, compareFaces } from "@/lib/faceRecognition";
import FaceEnroll from "@/components/custom/auth/FaceEnroll";
import { useAuth } from "@/context/AuthContext";
import { updateEmployeeFaceDescriptor } from "@/lib/firestoreApi";
import { Camera, Loader2, CheckCircle2, XCircle, RefreshCw, User, MapPin, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { EmployeeProfile } from "@/types";

/**
 * FaceScanner
 * Runs face-api.js detection + (optionally) matches against a stored
 * descriptor. When a `profile` is supplied and the match succeeds, an
 * identity card (employee Code ID, name, company, address) is shown so the
 * scan visibly confirms *who* was verified, not just that a face was found.
 */
const CAMERA_START_TIMEOUT_MS = 12000;

const CAMERA_ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: "Camera access was denied. Enable camera permission for this site in your browser settings.",
  PermissionDeniedError: "Camera access was denied. Enable camera permission for this site in your browser settings.",
  NotFoundError: "No camera was found on this device.",
  NotReadableError: "The camera is already in use by another app or browser tab. Close it and try again.",
  OverconstrainedError: "This device's camera doesn't support the requested settings.",
  AbortError: "Camera start was interrupted. Please try again.",
};

type ScanState = "idle" | "loading" | "scanning" | "verified" | "failed";

interface FaceScannerProps {
  storedDescriptor?: number[] | null;
  profile?: EmployeeProfile | null;
  onVerified: (descriptor: number[]) => void;
  /** @deprecated verification can no longer be skipped; prop is ignored. */
  onSkip?: () => void;
}

export default function FaceScanner(props: FaceScannerProps) {
  // Someone who never completed face enrollment has nothing to verify
  // against. The old behaviour was a "Skip verification" button that let
  // ANYONE check in without a face match; instead, enrol them right here.
  if (!props.storedDescriptor) return <EnrollThenContinue onVerified={props.onVerified} />;
  return <VerifyScanner {...props} />;
}

function EnrollThenContinue({ onVerified }: { onVerified: (d: number[]) => void }) {
  const { user, refreshProfile } = useAuth();
  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted-foreground">
        Your face isn't registered yet. Look at the camera once to register it - this also counts as your verification.
      </p>
      <FaceEnroll
        onCaptured={async (descriptor) => {
          if (!user) throw new Error("Your session expired. Please sign in again.");
          await updateEmployeeFaceDescriptor(user.uid, descriptor);
          await refreshProfile();
          setTimeout(() => onVerified(descriptor), 600);
        }}
      />
    </div>
  );
}

function VerifyScanner({ storedDescriptor, profile, onVerified }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number | null>(null);
  // Guards against the classic race: startCamera() is async (loadModels +
  // getUserMedia can each take a while), and if the component unmounts —
  // dialog closed, step changed, etc. — while either is still in flight,
  // the unmount cleanup() below runs before streamRef even holds a stream.
  // The camera track that resolves afterwards is then never stopped, which
  // leaves the physical camera locked. On iOS Safari that shows up as a
  // frozen/black feed the *next* time the scanner opens, since the device
  // is still held by the orphaned track. mountedRef lets startCamera bail
  // out — and immediately stop any stream it just received — if that
  // happened.
  const mountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<ScanState>("idle");
  const [message, setMessage] = useState("");
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    // Auto-start on mount instead of waiting for a manual "Start Camera"
    // click — this reuses the exact same startCamera() path (model
    // loading, getUserMedia, the iOS play() workaround, the timeout
    // watchdog) that the button used to trigger, so none of that safety
    // logic needs duplicating.
    startCamera();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const startCamera = async () => {
    setState("loading");
    setMessage("Starting camera…");

    // Watchdog: if we haven't reached "scanning" within this window,
    // something is stuck (permission prompt ignored, slow model download,
    // a hung getUserMedia call) — surface an error instead of leaving a
    // silent black box with no way out except the dialog's close button.
    timeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setState("idle");
      setMessage("");
      cleanup();
      toast.error("Camera took too long to start. Please try again.");
    }, CAMERA_START_TIMEOUT_MS);

    try {
      await loadModels();
      if (!mountedRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } },
      });

      if (!mountedRef.current) {
        // Component went away while the permission prompt / stream
        // negotiation was in flight — release the camera immediately
        // instead of leaving it locked for next time.
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // iOS Safari doesn't reliably honor the `autoPlay` attribute when
        // srcObject is assigned programmatically — explicitly calling
        // play() is required there, even with muted+playsInline set.
        try {
          await video.play();
        } catch (playErr) {
          console.warn("Video play() was blocked:", playErr);
        }

        // Wait for an actual frame before declaring "scanning" — play()
        // resolving doesn't guarantee the first frame has painted, and
        // starting the detection loop against a still-black element just
        // burns scan attempts for nothing.
        if (video.readyState < 2) {
          await new Promise<void>((resolve) => {
            const done = () => {
              video.removeEventListener("loadeddata", done);
              resolve();
            };
            video.addEventListener("loadeddata", done);
            setTimeout(done, 3000); // don't wait forever
          });
        }
      }

      if (!mountedRef.current) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState("scanning");
      setMessage("Position your face inside the frame");
      startContinuousScan();
    } catch (err) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (!mountedRef.current) return;
      setState("idle");
      const name = err instanceof DOMException ? err.name : undefined;
      const friendly = name ? CAMERA_ERROR_MESSAGES[name] : undefined;
      toast.error(friendly || "Camera error: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const startContinuousScan = () => {
    let attempts = 0;
    const scan = async () => {
      if (!videoRef.current || !streamRef.current) return;
      attempts++;
      setScanCount(attempts);

      try {
        const detection = await detectFace(videoRef.current);
        if (detection) {
          if (!storedDescriptor) {
            // No stored descriptor, just confirm face detected
            setState("verified");
            setMessage("Face detected! Continuing without verification.");
            cleanup();
            setTimeout(() => onVerified(Array.from(detection.descriptor)), 800);
            return;
          }

          const { match, distance } = compareFaces(storedDescriptor, Array.from(detection.descriptor));
          if (match) {
            setState("verified");
            setMessage(`Identity confirmed! (${((1 - distance) * 100).toFixed(0)}% match)`);
            cleanup();
            setTimeout(() => onVerified(Array.from(detection.descriptor)), 800);
            return;
          }
        }

        if (attempts < 30) {
          animRef.current = requestAnimationFrame(() => setTimeout(scan, 400));
        } else {
          setState("failed");
          setMessage("Could not verify identity. Please ensure good lighting.");
          cleanup();
        }
      } catch {
        /* continue */
      }
    };
    scan();
  };

  const reset = () => {
    cleanup();
    setState("idle");
    setMessage("");
    setScanCount(0);
  };

  return (
    <div className="space-y-4">
      {/* Camera viewport */}
      <div className={cn(
        "relative rounded-2xl overflow-hidden bg-black aspect-video max-w-sm mx-auto border-2 transition-colors",
        state === "verified" ? "border-emerald-500" : state === "failed" ? "border-red-500" : "border-border"
      )}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          // @ts-ignore non-standard vendor attribute required by iOS Safari
          webkit-playsinline="true"
          className={cn("w-full h-full object-cover", state === "idle" && "hidden")}
        />

        {state === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}

        {state === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-10 w-10 text-white/70 mx-auto mb-2 animate-spin" />
              <p className="text-white/70 text-xs font-medium">Starting camera…</p>
            </div>
          </div>
        )}

        {state === "scanning" && (
          <>
            <div className="scan-overlay absolute inset-0 pointer-events-none" />
            {/* Face frame oval */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-52 rounded-full border-2 border-cyan-400/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
            {/* Pulse rings */}
            {[0, 1, 2].map((i) => (
              <div key={i} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-40 h-52 rounded-full border border-cyan-400/30 animate-pulse-ring"
                  style={{ animationDelay: `${i * 0.4}s` }}
                />
              </div>
            ))}
          </>
        )}

        {state === "verified" && (
          <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-2" />
              <p className="text-white font-semibold text-sm">Verified!</p>
            </div>
          </div>
        )}

        {state === "failed" && (
          <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
        )}
      </div>

      {/* Identity card — shown once verified, confirms who was matched */}
      {state === "verified" && profile && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 p-4 space-y-2 max-w-sm mx-auto">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <BadgeCheck className="h-4 w-4 shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">Identity Confirmed</span>
          </div>
          <div className="flex items-start gap-2 text-sm">
            <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-semibold">{profile.name}</p>
              <p className="text-xs text-muted-foreground">Code ID: {profile.employeeCode}</p>
            </div>
          </div>
          {profile.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{profile.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Status message */}
      {message && (
        <p className={cn("text-sm text-center font-medium",
          state === "verified" ? "text-emerald-600" : state === "failed" ? "text-red-600" : "text-muted-foreground"
        )}>
          {message}
        </p>
      )}

      {state === "scanning" && (
        <p className="text-xs text-center text-muted-foreground">Scanning… attempt {scanCount}/30</p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {state === "failed" && (
          <Button onClick={startCamera} className="flex-1" size="lg">
            <Camera className="h-4 w-4" /> Retry
          </Button>
        )}
        {state !== "idle" && state !== "scanning" && state !== "loading" && (
          <Button onClick={reset} variant="outline" size="lg" className="flex-1">
            <RefreshCw className="h-4 w-4" /> Reset
          </Button>
        )}
      </div>
    </div>
  );
}
