import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { updateEmployeeProfile } from "@/lib/firestoreApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, Eye, EyeOff, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REQUIREMENTS = [
  { id: "length", label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lower", label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { id: "number", label: "One number", test: (pw) => /\d/.test(pw) },
  { id: "special", label: "One special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function isStrongPassword(pw) {
  return REQUIREMENTS.every((r) => r.test(pw));
}

/**
 * Forced, one-time password step shown on the employee dashboard right
 * after a person's very first login (see DashboardPage.jsx, which gates
 * this on `profile.passwordConfirmed !== true` and only for non-admins).
 * Not dismissible on purpose — no close button, and outside-click /
 * Escape are both suppressed — since the whole point is that the person
 * can't be reminded "later" and skip it; they set a strong password now.
 *
 * Uses Firebase Auth's own `updatePassword`, which requires a recent
 * sign-in — safe to assume here since this only ever shows immediately
 * after the person has just signed in.
 */
export default function SetStrongPasswordModal({ onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const strong = isStrongPassword(newPassword);
  const matches = confirmPassword.length > 0 && newPassword === confirmPassword;
  const canSubmit = strong && matches && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!strong) {
      setError("Please meet all password requirements below.");
      return;
    }
    if (!matches) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Your session expired. Please log in again.");
      await updatePassword(user, newPassword);
      await updateEmployeeProfile(user.uid, { passwordConfirmed: true });
      onSuccess?.();
    } catch (err) {
      if (err.code === "auth/requires-recent-login") {
        setError("For security, please log out and log back in, then try again.");
      } else {
        setError(err.message || "Couldn't update your password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open modal onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        // Deliberately not dismissible — see component note above.
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center mb-1">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
          </div>
          <DialogTitle>Set a strong password</DialogTitle>
          <DialogDescription>
            For your account's security, please create a strong password before continuing.
            You'll only need to do this once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter a new password"
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter the new password"
              autoComplete="new-password"
            />
            {confirmPassword.length > 0 && !matches && (
              <p className="text-xs text-red-600">Passwords don't match.</p>
            )}
          </div>

          <ul className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
            {REQUIREMENTS.map((r) => {
              const met = r.test(newPassword);
              return (
                <li key={r.id} className={cn("flex items-center gap-2 text-xs", met ? "text-emerald-600" : "text-muted-foreground")}>
                  {met ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}
                  {r.label}
                </li>
              );
            })}
          </ul>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submitting ? "Saving…" : "Set password & continue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
