import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, Loader2, RefreshCw, ScanFace } from "lucide-react";
import { captureAveragedDescriptor, loadModels } from "@/lib/faceRecognition";

/**
 * FaceEnroll
 * Opens the camera and captures the person's face automatically - no
 * "click and hope" button. It keeps scanning until it has collected a few
 * good frames, averages them into one descriptor, and hands it to
 * `onCaptured`. Used for first-login enrollment and for re-registering a face
 * from the Profile page.
 */

const SAMPLES = 3;
const CAPTURE_TIMEOUT_MS = 25000;

const CAMERA_ERRORS: Record<string, string> = {
  NotAllowedError: "Camera access was blocked. Allow camera permission for this site in your browser settings, then tap Try again.",
  PermissionDeniedError: "Camera access was blocked. Allow camera permission for this site in your browser settings, then tap Try again.",
  NotFoundError: "No camera was found on this device.",
  NotReadableError: "The camera is being used by another app or tab. Close it and tap Try again.",
  OverconstrainedError: "This camera doesn't support the requested settings. Tap Try again.",
};

type Phase = "starting" | "scanning" | "saving" | "done" | "error";

interface FaceEnrollProps {
  onCaptured: (descriptor: number[]) => Promise<void> | void;
  /** Shown as a secondary button when provided. */
  onCancel?: () => void;
  className?: string;
}

export default function FaceEnroll({ onCaptured, onCancel }: FaceEnrollProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const signalRef = useRef({ cancelled: false });
  const runIdRef = useRef(0);

  const [phase, setPhase] = useState<Phase>("starting");
  const [progress, setProgress] = useState({ collected: 0, faceFound: false });
  const [error, setError] = useState("");

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const run = async () => {
    const runId = ++runIdRef.current;
    const signal = { cancelled: false };
    signalRef.current.cancelled = true; // cancel any previous attempt
    signalRef.current = signal;

    setError("");
    setProgress({ collected: 0, faceFound: false });
    setPhase("starting");
    stopCamera();

    try {
      // Start the camera and the (lazy) model download in parallel.
      const [stream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        }),
        loadModels(),
      ]);

      if (signal.cancelled || runId !== runIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Camera view isn't ready - please try again.");
      video.srcObject = stream;
      // iOS Safari ignores autoPlay for programmatic srcObject; play() is required.
      try {
        await video.play();
      } catch (e) {
        console.warn("video.play() was blocked:", e);
      }

      setPhase("scanning");
      const descriptor = await captureAveragedDescriptor(video, {
        samples: SAMPLES,
        timeoutMs: CAPTURE_TIMEOUT_MS,
        signal,
        onProgress: (p) => !signal.cancelled && setProgress({ collected: p.collected, faceFound: p.faceFound }),
      });

      if (signal.cancelled) return;
      if (!descriptor) {
        stopCamera();
        setError("We couldn't see your face clearly. Face the camera in good light, remove anything covering your face, and try again.");
        setPhase("error");
        return;
      }

      setPhase("saving");
      await onCaptured(descriptor);
      if (signal.cancelled) return;
      stopCamera();
      setPhase("done");
    } catch (err: unknown) {
      if (signal.cancelled) return;
      stopCamera();
      const name = err instanceof DOMException ? err.name : undefined;
      setError(
        (name && CAMERA_ERRORS[name]) ||
          (err instanceof Error ? err.message : "Something went wrong while starting the camera.")
      );
      setPhase("error");
    }
  };

  useEffect(() => {
    run();
    return () => {
      signalRef.current.cancelled = true;
      runIdRef.current++;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showVideo = phase === "scanning" || phase === "saving" || phase === "starting";
  const statusText =
    phase === "starting"
      ? "Starting camera…"
      : phase === "scanning"
        ? progress.faceFound
          ? `Hold still… ${progress.collected}/${SAMPLES}`
          : "Looking for your face — centre it in the oval"
        : phase === "saving"
          ? "Saving your face…"
          : phase === "done"
            ? "Face registered"
            : "";

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          // @ts-expect-error non-standard attribute needed by older iOS Safari
          webkit-playsinline="true"
          className={`h-full w-full -scale-x-100 object-cover ${showVideo ? "" : "hidden"}`}
        />

        {(phase === "scanning" || phase === "saving") && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`h-52 w-40 rounded-full border-2 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] transition-colors ${
                progress.faceFound ? "border-emerald-400" : "border-cyan-400/70"
              }`}
            />
          </div>
        )}
        {phase === "scanning" && <div className="scan-overlay pointer-events-none absolute inset-0" />}

        {phase === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-white/70" />
          </div>
        )}
        {phase === "done" && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
            <CheckCircle2 className="h-16 w-16 text-emerald-500" />
          </div>
        )}
        {phase === "error" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-14 w-14 text-white/30" />
          </div>
        )}
      </div>

      {statusText && (
        <p
          className={`flex items-center justify-center gap-2 text-center text-sm font-medium ${
            phase === "done" ? "text-emerald-600" : "text-muted-foreground"
          }`}
          role="status"
          aria-live="polite"
        >
          {phase === "scanning" && <ScanFace className="h-4 w-4" />}
          {phase === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
          {statusText}
        </p>
      )}

      {phase === "error" && (
        <div className="space-y-3">
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">{error}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={run}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5B4FE0] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#4B3FD1]"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
