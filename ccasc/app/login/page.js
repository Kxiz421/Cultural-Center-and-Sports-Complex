"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Eye, EyeOff, Mail } from "lucide-react";
import { LOGIN_PAGE_BACKGROUND } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MOCK_ADMIN_USER } from "@/lib/data/admin-mock";

const OTP_LENGTH = 6;
const DEMO_RESET_PW_KEY = "ccasc_demo_reset_password";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showLoginPassword, setShowLoginPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [fpOpen, setFpOpen] = React.useState(false);
  const [recoverEmail, setRecoverEmail] = React.useState("");
  const [fpStep, setFpStep] = React.useState("email");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [otpCells, setOtpCells] = React.useState(() =>
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const otpInputRefs = React.useRef([]);

  const emailLooksValid = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleForgotDialogOpen = (open) => {
    setFpOpen(open);
    if (!open) {
      setFpStep("email");
      setRecoverEmail("");
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setOtpCells(Array.from({ length: OTP_LENGTH }, () => ""));
    }
  };

  const focusOtpCell = (index) => {
    const el = otpInputRefs.current[index];
    if (el) el.focus();
  };

  const handleOtpChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    const digit = raw.slice(-1);
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

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter your username and password.");
      return;
    }

    const okUser =
      username.trim().toLowerCase() === MOCK_ADMIN_USER.username.toLowerCase();
    let storedResetPass = null;
    try {
      storedResetPass = sessionStorage.getItem(DEMO_RESET_PW_KEY);
    } catch (_) {
      /* ignore */
    }
    const okPass =
      password === "1234" ||
      (!!storedResetPass && password === storedResetPass);

    if (!okUser || !okPass) {
      toast.error("Invalid username or password. Please try again.");
      return;
    }

    localStorage.setItem("user_id", MOCK_ADMIN_USER.id);
    localStorage.setItem("role", "admin");
    localStorage.setItem("firstname", MOCK_ADMIN_USER.firstName);
    localStorage.setItem("lastname", MOCK_ADMIN_USER.lastName);
    localStorage.setItem("token", "demo-token-ccasc");
    toast.success("Logged in successfully.");
    router.push("/panel/admin/dashboard");
  };

  const handleSendCode = () => {
    const email = recoverEmail.trim();
    if (!email) {
      toast.error("Please enter the email address registered to your account.");
      return;
    }
    if (!emailLooksValid(email)) {
      toast.error("Please enter a valid email address (for example, name@example.com).");
      return;
    }
    setFpStep("code");
    setOtpCells(Array.from({ length: OTP_LENGTH }, () => ""));
    toast.success(`A recovery code has been sent to ${email}.`);
  };

  const handleVerifyCode = () => {
    const code = otpCells.join("");
    if (code.length < OTP_LENGTH) {
      toast.error(`Enter all ${OTP_LENGTH} digits of the recovery code.`);
      return;
    }
    setFpStep("password");
  };

  const handleCompletePasswordReset = () => {
    const next = newPassword.trim();
    const confirm = confirmPassword.trim();
    if (!next || !confirm) {
      toast.error("Enter your new password in both fields.");
      return;
    }
    if (next !== confirm) {
      toast.error("Passwords do not match. Check and try again.");
      return;
    }
    try {
      sessionStorage.setItem(DEMO_RESET_PW_KEY, next);
    } catch (_) {
      /* ignore */
    }
    toast.success(
      "Your password has been updated. Sign in with your new password.",
    );
    setFpOpen(false);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6">
      <Image
        src={LOGIN_PAGE_BACKGROUND}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div
        className="absolute inset-0 bg-black/55"
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex max-w-2xl flex-col items-center px-2 text-center">
          <div className="bg-primary text-primary-foreground mb-4 flex size-14 items-center justify-center rounded-xl shadow-lg">
            <Building2 className="size-8" />
          </div>
          <p className="text-lg font-bold uppercase tracking-wider text-white/90 md:text-xl">
            Provincial Government of South Cotabato
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white drop-shadow-sm md:text-3xl">
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
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="text-black placeholder:text-neutral-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showLoginPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pr-10 text-black placeholder:text-neutral-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
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
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
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
                    {fpStep === "email"
                      ? "Reset access"
                      : fpStep === "code"
                        ? "Enter recovery code"
                        : "Create new password"}
                  </DialogTitle>
                  <DialogDescription>
                    {fpStep === "email" && (
                      <>
                        Enter your registered email. We&apos;ll send a recovery
                        code you can use to set a new password.
                      </>
                    )}
                    {fpStep === "code" && (
                      <>
                        A recovery code has been sent to{" "}
                        <span className="text-foreground font-medium">
                          {recoverEmail.trim()}
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
                  {fpStep === "email" && (
                    <div className="space-y-2">
                      <Label htmlFor="recover-email">Registered email</Label>
                      <div className="relative">
                        <Mail className="text-muted-foreground absolute top-2.5 left-2 size-4" />
                        <Input
                          id="recover-email"
                          className="pl-8 text-black placeholder:text-neutral-500"
                          type="email"
                          value={recoverEmail}
                          onChange={(e) => setRecoverEmail(e.target.value)}
                          placeholder="name@example.com"
                          autoComplete="email"
                        />
                      </div>
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
                              className="border-input focus-visible:ring-ring h-12 w-10 rounded-md border-2 text-center text-lg font-semibold tracking-widest text-black tabular-nums shadow-sm sm:h-14 sm:w-11 sm:text-xl"
                            />
                          ))}
                        </div>
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
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter a new password"
                            className="pr-10 text-black placeholder:text-neutral-500"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
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
                            onChange={(e) =>
                              setConfirmPassword(e.target.value)
                            }
                            placeholder="Confirm your new password"
                            className="pr-10 text-black placeholder:text-neutral-500"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
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
                  {fpStep === "email" ? (
                    <Button type="button" onClick={handleSendCode}>
                      Send verification code
                    </Button>
                  ) : fpStep === "code" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSendCode}
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

        <p className="mt-8 max-w-lg text-center text-xs text-white/75 drop-shadow">
          Problems signing in? Contact your facility or provincial IT support.
        </p>
      </div>
    </div>
  );
}
