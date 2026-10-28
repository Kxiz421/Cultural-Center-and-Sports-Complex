"use client";

import * as React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Phone } from "lucide-react";
import { LOGIN_PAGE_BACKGROUND, PAGE_LOGO, PAGE_LOGO_2 } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouteTransition } from "@/components/route-transition";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getSession, signIn } from "next-auth/react";
import { toE164Ph } from "@/lib/phone";
import { USER_TYPE, homeForUserType } from "@/lib/auth-roles";
import { MOCK_ADMIN_USER } from "@/lib/data/admin-mock";
import { SESSION_REPLACED_REASON } from "@/lib/session-reason";

const OTP_LENGTH = 6;
const DEMO_RESET_PW_KEY = "ccasc_demo_reset_password";

/**
 * Auth.js returns a machine-readable `code` (see the CredentialsSignin
 * subclasses in auth.js). Codes never contain account details.
 */
const LOGIN_ERROR_MESSAGES = {
  invalid_credentials: "Invalid email/username or password.",
  account_deactivated:
    "Your account has been deactivated. Contact the administrator.",
  verification_pending:
    "Your registration is still pending verification. Please wait for admin approval.",
  rate_limited:
    "Too many failed sign-in attempts. Please wait a few minutes and try again.",
  CredentialsSignin: "Invalid email/username or password.",
  Configuration:
    "Sign-in is temporarily unavailable. Please contact the administrator.",
};

const EMAIL_IDENTIFIER_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Classify what the visitor typed into the single recovery field. An email is
 * recovered straight through email, a mobile number straight through SMS, and
 * anything else (i.e. a username) opens the channel chooser - so the user is
 * only asked where to send the code when the identifier itself is ambiguous.
 */
function recoveryKind(identifier) {
  const value = String(identifier ?? "").trim();
  if (!value) return "unknown";
  if (EMAIL_IDENTIFIER_RE.test(value)) return "email";
  if (toE164Ph(value)) return "phone";
  return "username";
}

/** Strength rules shared by the forced-change dialog. */
function passwordProblem(password) {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character (e.g., @, #, $).";
  return null;
}

export default function LoginPage() {
  const { start: startRouteTransition } = useRouteTransition();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [showLoginPassword, setShowLoginPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [fpOpen, setFpOpen] = React.useState(false);
  const [fpStep, setFpStep] = React.useState("identify");
  const [recoverIdentifier, setRecoverIdentifier] = React.useState("");
  const [recoverChannels, setRecoverChannels] = React.useState([]);
  const [recoverChannel, setRecoverChannel] = React.useState("email");
  const [recoverTargetLabel, setRecoverTargetLabel] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [otpCells, setOtpCells] = React.useState(() =>
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const otpInputRefs = React.useRef([]);
  const [fpLoading, setFpLoading] = React.useState(false);

  // Forced password change (account created with the default password).
  const [pwChangeOpen, setPwChangeOpen] = React.useState(false);
  const [pwChangeIdentifier, setPwChangeIdentifier] = React.useState("");
  const [pwChangeCurrent, setPwChangeCurrent] = React.useState("");
  const [pwChangeNew, setPwChangeNew] = React.useState("");
  const [pwChangeConfirm, setPwChangeConfirm] = React.useState("");
  const [pwChangeLoading, setPwChangeLoading] = React.useState(false);
  const [showPwChange, setShowPwChange] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const [loginError, setLoginError] = React.useState("");
  const [recoverErrors, setRecoverErrors] = React.useState({});
  const [pwChangeErrors, setPwChangeErrors] = React.useState({});

  const clearError = (setter, ...names) =>
    setter((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const name of names) {
        if (next[name]) {
          delete next[name];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === SESSION_REPLACED_REASON) {
      toast.error(
        "You were signed out because this account signed in on another device.",
      );
      window.history.replaceState(null, "", "/login");
    }
  }, []);

  const recoverTarget =
    recoverChannels.find((c) => c.type === recoverChannel)?.target ?? "";

  const handleForgotDialogOpen = (open) => {
    setFpOpen(open);
    if (!open) {
      setFpStep("identify");
      setRecoverIdentifier("");
      setRecoverChannels([]);
      setRecoverChannel("email");
      setRecoverTargetLabel("");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setOtpCells(Array.from({ length: OTP_LENGTH }, () => ""));
      setRecoverErrors({});
    }
  };

  const focusOtpCell = (index) => {
    const el = otpInputRefs.current[index];
    if (el) el.focus();
  };

  const handleOtpChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    const digit = raw.slice(-1);
    clearError(setRecoverErrors, "code");
    setOtpCells((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) focusOtpCell(index + 1);
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key !== "Backspace") return;
    if (otpCells[index]) {
      setOtpCells((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    if (index > 0) {
      e.preventDefault();
      focusOtpCell(index - 1);
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    const chars = pasted.split("");
    setOtpCells((prev) => {
      const next = [...prev];
      chars.forEach((c, i) => {
        if (i < OTP_LENGTH) next[i] = c;
      });
      return next;
    });
    focusOtpCell(Math.min(chars.length, OTP_LENGTH) - 1);
  };

  /**
   * Runs one sign-in attempt and returns true when a session was issued.
   * A correct password on an account still holding its default password opens
   * the forced-change dialog instead of signing in.
   */
  const attemptLogin = async (identifierValue, passwordValue) => {
    setLoginError("");
    // Single authentication point: Auth.js verifies the credentials,
    // enforces the IP rate limit, and issues the signed httpOnly session
    // cookie. Identity is never derived from localStorage again.
    const result = await signIn("credentials", {
      email: identifierValue,
      password: passwordValue,
      redirect: false,
    });

    // Auth.js's response shape varies by version and can omit `code`, so
    // success is decided from the session itself, not from `result.ok`.
    const session = await getSession();
    const user = session?.user;

    if (!user?.type) {
      if (result?.code === "password_change_required") {
        setPwChangeIdentifier(identifierValue);
        setPwChangeCurrent(passwordValue);
        setPwChangeNew("");
        setPwChangeConfirm("");
        setPwChangeErrors({});
        setPwChangeOpen(true);
        return false;
      }
      // No session means the credentials were rejected (or auth is
      // misconfigured). Report the specific reason when the code is known.
      const message =
        LOGIN_ERROR_MESSAGES[result?.code] ??
        LOGIN_ERROR_MESSAGES[result?.error] ??
        LOGIN_ERROR_MESSAGES.CredentialsSignin;
      setLoginError(message);
      return false;
    }

    // Display-only mirrors (panel headers + audit trail) - no longer a
    // security boundary; proxy.js and lib/api-auth.js enforce access.
    localStorage.setItem("user_id", user.userId ?? "");
    localStorage.setItem(
      "user_name",
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    );
    localStorage.setItem("role", user.type);
    localStorage.setItem("userType", user.type);
    localStorage.setItem("firstname", user.firstName ?? "");
    localStorage.setItem("lastname", user.lastName ?? "");
    localStorage.setItem("email", user.email ?? "");

    // Declined Certificate of Employment -> restricted session (resubmit only)
    if (user.type === USER_TYPE.RESUBMIT_ONLY) {
      const reason = user.remarks ? ` Reason: ${user.remarks}` : "";
      toast.error(
        `Your Certificate of Employment has been declined. Please resubmit a valid document.${reason}`,
      );
      window.location.href = "/resubmit";
      return true;
    }

    toast.success("Logged in successfully.");
    // Hard navigation on purpose: the panel needs a fresh session inside
    // SessionProvider, which a client-side push would not provide. The
    // curtain still covers the hand-off, instead of leaving the sign-in form
    // on screen while the dashboard downloads.
    const home = homeForUserType(user.type);
    // `start` declines when another transition is mid-flight; without the
    // fallback a successful sign-in would leave the form on screen while the
    // visitor is already authenticated.
    if (!startRouteTransition(home, "Signing you in…", { hard: true })) {
      window.location.assign(home);
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const next = {};
    if (!email.trim()) next.email = "Please enter your email or username.";
    if (!password.trim()) next.password = "Please enter your password.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    setLoginError("");

    setLoginLoading(true);
    try {
      await attemptLogin(email.trim(), password);
    } catch (err) {
      setLoginError("An error occurred during login. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  /** Set the new password, then sign in with it. */
  const handleForcedPasswordChange = async () => {
    const next = pwChangeNew.trim();
    const confirm = pwChangeConfirm.trim();
    const nextErrors = {};
    if (!next) nextErrors.newPassword = "Enter and confirm your new password.";
    if (!confirm) nextErrors.confirmPassword = "Enter and confirm your new password.";
    if (Object.keys(nextErrors).length > 0) {
      setPwChangeErrors(nextErrors);
      return;
    }
    if (next !== confirm) {
      setPwChangeErrors({
        confirmPassword: "Passwords do not match. Check and try again.",
      });
      return;
    }
    const problem = passwordProblem(next);
    if (problem) {
      setPwChangeErrors({ newPassword: problem });
      return;
    }
    setPwChangeErrors({});

    setPwChangeLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: pwChangeIdentifier,
          currentPassword: pwChangeCurrent,
          newPassword: next,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update the password.");
        return;
      }

      toast.success("Password updated. Signing you in…");
      setPwChangeOpen(false);
      setPassword(next);
      setEmail(pwChangeIdentifier);
      await attemptLogin(pwChangeIdentifier, next);
    } catch (err) {
      toast.error("Failed to update the password.");
    } finally {
      setPwChangeLoading(false);
    }
  };

  /** Request a recovery code on a specific channel and advance to the code step. */
  const sendRecoveryCode = async (identifier, channel) => {
    setFpLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", identifier, channel }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to send recovery code.");
        return;
      }

      setRecoverTargetLabel(data.target || "");
      setFpStep("code");
      setOtpCells(Array.from({ length: OTP_LENGTH }, () => ""));
      toast.success(
        `A recovery code has been sent to ${data.target || recoverTarget}.`,
      );
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setFpLoading(false);
    }
  };

  /** Username path: look up the account and offer its recovery channels. */
  const lookupRecovery = async (identifier) => {
    setFpLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "lookup", identifier }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "We couldn't find an account with those details.");
        return;
      }

      const channels = data.channels ?? [];
      if (channels.length === 0) {
        toast.error(
          "No recovery method is available for this account. Please contact the administrator.",
        );
        return;
      }

      setRecoverChannels(channels);
      setRecoverChannel(channels[0].type);
      setFpStep("channel");
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setFpLoading(false);
    }
  };

  /**
   * Identify step. An email or mobile number is recovered on that same channel
   * directly; only a username (which maps to both) opens the chooser.
   */
  const handleIdentify = async () => {
    const identifier = recoverIdentifier.trim();
    if (!identifier) {
      setRecoverErrors({
        identifier: "Enter your email, username, or mobile number.",
      });
      return;
    }
    setRecoverErrors({});

    const kind = recoveryKind(identifier);
    if (kind === "email") {
      setRecoverChannel("email");
      await sendRecoveryCode(identifier, "email");
      return;
    }
    if (kind === "phone") {
      setRecoverChannel("sms");
      await sendRecoveryCode(identifier, "sms");
      return;
    }

    await lookupRecovery(identifier);
  };

  /** Channel step / "Resend code": send on the selected channel. */
  const handleSendCode = () =>
    sendRecoveryCode(recoverIdentifier.trim(), recoverChannel);

  const handleVerifyCode = async () => {
    const code = otpCells.join("");
    if (code.length < OTP_LENGTH) {
      setRecoverErrors({
        code: `Enter all ${OTP_LENGTH} digits of the recovery code.`,
      });
      return;
    }
    setRecoverErrors({});
    
    setFpLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: recoverIdentifier.trim(),
          otp: code,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error || "Invalid or expired recovery code.");
        setFpLoading(false);
        return;
      }
      
      setFpStep("password");
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setFpLoading(false);
    }
  };

  const handleCompletePasswordReset = async () => {
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();
    const nextErrors = {};
    if (!next) nextErrors.newPassword = "Enter your new password in both fields.";
    if (!confirm) {
      nextErrors.confirmPassword = "Enter your new password in both fields.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setRecoverErrors(nextErrors);
      return;
    }
    if (next !== confirm) {
      setRecoverErrors({
        confirmPassword: "Passwords do not match. Check and try again.",
      });
      return;
    }
    let problem = null;
    if (next.length < 8) {
      problem = "Password must be at least 8 characters long.";
    } else if (!/[A-Z]/.test(next)) {
      problem = "Password must contain at least one uppercase letter.";
    } else if (!/[a-z]/.test(next)) {
      problem = "Password must contain at least one lowercase letter.";
    } else if (!/[0-9]/.test(next)) {
      problem = "Password must contain at least one number.";
    } else if (!/[^A-Za-z0-9]/.test(next)) {
      problem = "Password must contain at least one special character (e.g., @, #, $, etc.).";
    }
    if (problem) {
      setRecoverErrors({ newPassword: problem });
      return;
    }
    setRecoverErrors({});
    
    setFpLoading(true);
    try {
      const res = await fetch("/api/auth/password-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: recoverIdentifier.trim(),
          otp: otpCells.join(""),
          newPassword: next,
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(
          data.error || "Failed to reset password. The code may have expired.",
        );
        setFpLoading(false);
        return;
      }
      
      toast.success("Your password has been updated. Sign in with your new password.");
      setFpOpen(false);
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <Image
        src={LOGIN_PAGE_BACKGROUND}
        alt=""
        fill
        priority
        unoptimized
        className="object-cover"
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-[#292B6F]/70"
        aria-hidden
      />
      <div className="absolute right-4 top-4 z-20 rounded-full border bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur">
        <ThemeToggle />
      </div>
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex max-w-2xl flex-col items-center px-2 text-center">
          <div className="mb-4 flex items-center justify-center gap-4">
            <Image
              src={PAGE_LOGO}
              alt="South Cotabato Official Seal"
              width={120}
              height={120}
              priority
              className="size-24 drop-shadow-lg md:size-28"
            />
            <Image
              src={PAGE_LOGO_2}
              alt=""
              width={120}
              height={120}
              priority
              className="size-24 drop-shadow-lg md:size-28"
            />
          </div>
          <p className="text-2xl font-extrabold uppercase tracking-wider text-white drop-shadow-sm md:text-3xl">
            Provincial Government of South Cotabato
          </p>
          <h1 className="mt-2 text-lg font-bold tracking-tight text-white/90 md:text-xl">
            Gymnasium & Cultural Center / Sports Complex
          </h1>
        </div>

        <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email / Username</Label>
              <Input
                id="email"
                autoComplete="email"
                type="text"
                value={email}
                onChange={(e) => {
                  clearError(setErrors, "email");
                  setLoginError("");
                  setEmail(e.target.value);
                }}
                placeholder="Enter your email or username"
                className="text-foreground placeholder:text-muted-foreground"
                aria-invalid={Boolean(errors.email)}
              />
              <FieldError>{errors.email}</FieldError>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    clearError(setErrors, "password");
                    setLoginError("");
                    setPassword(e.target.value);
                  }}
                  placeholder="Enter your password"
                  className="pr-10 text-foreground placeholder:text-muted-foreground"
                  aria-invalid={Boolean(errors.password)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  aria-label={
                    showLoginPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showLoginPassword}
                >
                  {showLoginPassword ? (
                    <Eye className="size-4" />
                  ) : (
                    <EyeOff className="size-4" />
                  )}
                </Button>
              </div>
              <FieldError>{errors.password}</FieldError>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {loginError && (
              <div
                role="alert"
                aria-live="polite"
                className="w-full rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
              >
                {loginError}
              </div>
            )}
            <Button type="submit" className="w-full">
              Login
            </Button>
            <Dialog open={fpOpen} onOpenChange={handleForgotDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="link" className="text-sm">
                  Forgot password?
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {fpStep === "identify"
                      ? "Reset access"
                      : fpStep === "channel"
                        ? "Choose recovery method"
                        : fpStep === "code"
                          ? "Enter recovery code"
                          : "Create new password"}
                  </DialogTitle>
                  <DialogDescription>
                    {fpStep === "identify" && (
                      <>
                        Enter your email or mobile number and we&apos;ll send
                        the recovery code straight to it. If you sign in with a
                        username, you&apos;ll choose where to receive the code.
                      </>
                    )}
                    {fpStep === "channel" && (
                      <>
                        Choose where to send your recovery code. Only part of the
                        address is shown, to keep your account private.
                      </>
                    )}
                    {fpStep === "code" && (
                      <>
                        A recovery code has been sent to{" "}
                        <span className="text-foreground font-medium">
                          {recoverTargetLabel || recoverTarget}
                        </span>
                        . Enter the {OTP_LENGTH}-digit code below.
                      </>
                    )}
                    {fpStep === "password" && (
                      <>
                        Choose a new password and confirm it. Both entries must
                        match before you can finish.
                      </>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {fpStep === "identify" && (
                    <div className="space-y-2">
                      <Label htmlFor="recover-identifier">
                        Email, username, or mobile number
                      </Label>
                      <Input
                        id="recover-identifier"
                        className="text-foreground placeholder:text-muted-foreground"
                        type="text"
                        value={recoverIdentifier}
                        onChange={(e) => {
                          clearError(setRecoverErrors, "identifier");
                          setRecoverIdentifier(e.target.value);
                        }}
                        placeholder="name@example.com, username, or 09171234567"
                        autoComplete="username"
                        aria-invalid={Boolean(recoverErrors.identifier)}
                      />
                      <FieldError>{recoverErrors.identifier}</FieldError>
                    </div>
                  )}
                  {fpStep === "channel" && (
                    <div className="space-y-2">
                      {recoverChannels.map((option) => (
                        <button
                          key={option.type}
                          type="button"
                          onClick={() => setRecoverChannel(option.type)}
                          aria-pressed={recoverChannel === option.type}
                          className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                            recoverChannel === option.type
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                          }`}
                        >
                          {option.type === "email" ? (
                            <Mail className="text-muted-foreground size-4 shrink-0" />
                          ) : (
                            <Phone className="text-muted-foreground size-4 shrink-0" />
                          )}
                          <span className="flex-1">
                            <span className="block text-sm font-medium">
                              {option.type === "email"
                                ? "Email"
                                : "Text message (SMS)"}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                              {option.target}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {fpStep === "code" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label
                          className="sr-only"
                          htmlFor="otp-digit-0"
                        >
                          Recovery code
                        </Label>
                        <div
                          className="flex justify-center gap-2 sm:gap-3"
                          onPaste={handleOtpPaste}
                          role="group"
                          aria-label={`${OTP_LENGTH}-digit recovery code`}
                        >
                          {otpCells.map((digit, i) => (
                            <Input
                              key={i}
                              id={i === 0 ? "otp-digit-0" : undefined}
                              ref={(el) => {
                                otpInputRefs.current[i] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              pattern="\d*"
                              maxLength={1}
                              autoComplete={i === 0 ? "one-time-code" : "off"}
                              aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                              value={digit}
                              onChange={(e) => handleOtpChange(i, e)}
                              onKeyDown={(e) => handleOtpKeyDown(i, e)}
                              aria-invalid={Boolean(recoverErrors.code)}
                              className="border-input focus-visible:ring-ring h-12 w-10 rounded-md border-2 text-center text-lg font-semibold tracking-widest text-foreground tabular-nums shadow-sm sm:h-14 sm:w-11 sm:text-xl"
                            />
                          ))}
                        </div>
                        <FieldError>{recoverErrors.code}</FieldError>
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleVerifyCode}
                      >
                        Verify code and continue
                      </Button>
                    </div>
                  )}
                  {fpStep === "password" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="fp-new-password">New password</Label>
                        <div className="relative">
                          <Input
                            id="fp-new-password"
                            type={showNewPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => {
                              clearError(setRecoverErrors, "newPassword");
                              setNewPassword(e.target.value);
                            }}
                            placeholder="Enter a new password"
                            className="pr-10 text-foreground placeholder:text-muted-foreground"
                            aria-invalid={Boolean(recoverErrors.newPassword)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                            onClick={() => setShowNewPassword((v) => !v)}
                            aria-label={
                              showNewPassword
                                ? "Hide new password"
                                : "Show new password"
                            }
                            aria-pressed={showNewPassword}
                          >
                            {showNewPassword ? (
                              <Eye className="size-4" />
                            ) : (
                              <EyeOff className="size-4" />
                            )}
                          </Button>
                        </div>
                        <FieldError>{recoverErrors.newPassword}</FieldError>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fp-confirm-password">
                          Confirm password
                        </Label>
                        <div className="relative">
                          <Input
                            id="fp-confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => {
                              clearError(
                                setRecoverErrors,
                                "confirmPassword",
                                "newPassword"
                              );
                              setConfirmPassword(e.target.value);
                            }}
                            placeholder="Confirm your new password"
                            className="pr-10 text-foreground placeholder:text-muted-foreground"
                            aria-invalid={Boolean(recoverErrors.confirmPassword)}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                            onClick={() =>
                              setShowConfirmPassword((v) => !v)
                            }
                            aria-label={
                              showConfirmPassword
                                ? "Hide confirm password"
                                : "Show confirm password"
                            }
                            aria-pressed={showConfirmPassword}
                          >
                            {showConfirmPassword ? (
                              <Eye className="size-4" />
                            ) : (
                              <EyeOff className="size-4" />
                            )}
                          </Button>
                        </div>
                        <FieldError>{recoverErrors.confirmPassword}</FieldError>
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        onClick={handleCompletePasswordReset}
                      >
                        Save new password
                      </Button>
                    </div>
                  )}
                </div>
                <DialogFooter className="gap-2 sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFpOpen(false)}
                  >
                    Close
                  </Button>
                  {fpStep === "identify" ? (
                    <Button
                      type="button"
                      onClick={handleIdentify}
                      disabled={fpLoading}
                    >
                      Continue
                    </Button>
                  ) : fpStep === "channel" ? (
                    <Button
                      type="button"
                      onClick={handleSendCode}
                      disabled={fpLoading}
                    >
                      Send recovery code
                    </Button>
                  ) : fpStep === "code" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSendCode}
                      disabled={fpLoading}
                    >
                      Resend code
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setFpStep("code");
                        setNewPassword("");
                        setConfirmPassword("");
                        setShowNewPassword(false);
                        setShowConfirmPassword(false);
                        setOtpCells(Array.from({ length: OTP_LENGTH }, () => ""));
                      }}
                    >
                      Back
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </form>
        </Card>

        {/* Forced password change for a default-password account */}
        <Dialog open={pwChangeOpen} onOpenChange={setPwChangeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set a new password</DialogTitle>
              <DialogDescription>
                This account is still using its default password. Choose a new
                password to continue signing in.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="pc-new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="pc-new-password"
                    type={showPwChange ? "text" : "password"}
                    autoComplete="new-password"
                    value={pwChangeNew}
                    onChange={(e) => {
                      clearError(setPwChangeErrors, "newPassword");
                      setPwChangeNew(e.target.value);
                    }}
                    placeholder="At least 8 characters"
                    className="pr-10 text-foreground placeholder:text-muted-foreground"
                    aria-invalid={Boolean(pwChangeErrors.newPassword)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                    onClick={() => setShowPwChange((v) => !v)}
                    aria-label={showPwChange ? "Hide password" : "Show password"}
                  >
                    {showPwChange ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </Button>
                </div>
                <FieldError>{pwChangeErrors.newPassword}</FieldError>
                <p className="text-muted-foreground text-xs">
                  At least 8 characters with 1 uppercase, 1 lowercase, 1 number,
                  and 1 special character.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-confirm-password">Confirm password</Label>
                <Input
                  id="pc-confirm-password"
                  type={showPwChange ? "text" : "password"}
                  autoComplete="new-password"
                  value={pwChangeConfirm}
                  onChange={(e) => {
                    clearError(setPwChangeErrors, "confirmPassword");
                    setPwChangeConfirm(e.target.value);
                  }}
                  placeholder="Re-enter your new password"
                  className="text-foreground placeholder:text-muted-foreground"
                  aria-invalid={Boolean(pwChangeErrors.confirmPassword)}
                />
                <FieldError>{pwChangeErrors.confirmPassword}</FieldError>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPwChangeOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleForcedPasswordChange}
                disabled={pwChangeLoading}
              >
                {pwChangeLoading ? "Saving…" : "Save and sign in"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mt-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
            onClick={() => startRouteTransition("/")}
          >
            ← Back to Home
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
            onClick={() => startRouteTransition("/register")}
          >
            Register →
          </Button>
        </div>

        <p className="mt-8 max-w-lg text-center text-xs text-white/75 drop-shadow">
          Problems signing in? Contact your facility or provincial IT support.
        </p>
      </div>
    </div>
  );
}
