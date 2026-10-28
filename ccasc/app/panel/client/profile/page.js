"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  UserRound,
  Wallet,
  Lock,
  PhilippinePeso,
  BadgeCheck,
  ShieldCheck,
  Loader2,
  Camera,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { cn, formatPhp, roundMoney } from "@/lib/utils";
import { DEFAULT_AVATAR } from "@/lib/constants";
import { uploadProfilePhoto } from "@/lib/upload-profile-photo";

function passwordProblem(password) {
  if (password.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character (e.g., #, $).";
  return null;
}

function formatDateOnly(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function ClientProfilePage() {
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");

  const [accountForm, setAccountForm] = React.useState({
    username: "",
    contactNumber: "",
  });
  const [accountErrors, setAccountErrors] = React.useState({});
  const [savingAccount, setSavingAccount] = React.useState(false);

  const [pwForm, setPwForm] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwErrors, setPwErrors] = React.useState({});
  const [savingPw, setSavingPw] = React.useState(false);

  const [photoError, setPhotoError] = React.useState("");
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [photoBroken, setPhotoBroken] = React.useState(false);
  const photoInputRef = React.useRef(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/clients/me", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load your profile");
      setPhotoBroken(false);
      setProfile(data);
      setAccountForm({
        username: data.username || "",
        contactNumber: data.contactNumber || "",
      });
    } catch (err) {
      setLoadError(err.message || "Failed to load your profile");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const saveAccount = async (e) => {
    e.preventDefault();
    const next = {};
    const username = accountForm.username.trim();
    const digits = accountForm.contactNumber.replace(/\D/g, "");
    if (!digits) next.contactNumber = "Contact number is required.";
    else if (digits.length !== 11) {
      next.contactNumber = "Contact number must be exactly 11 digits.";
    }
    if (Object.keys(next).length > 0) {
      setAccountErrors(next);
      return;
    }
    setAccountErrors({});
    setSavingAccount(true);
    try {
      const res = await fetch("/api/clients/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, contactNumber: digits }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setAccountErrors({ username: data.error });
          return;
        }
        throw new Error(data.error || "Failed to save your changes");
      }
      setProfile(data.profile);
      setAccountForm({
        username: data.profile.username || "",
        contactNumber: data.profile.contactNumber || "",
      });
      toast.success("Account details updated");
    } catch (err) {
      toast.error(err.message || "Failed to save your changes");
    } finally {
      setSavingAccount(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    const next = {};
    if (!pwForm.currentPassword) {
      next.currentPassword = "Enter your current password.";
    }
    if (!pwForm.newPassword) {
      next.newPassword = "Enter a new password.";
    } else {
      const problem = passwordProblem(pwForm.newPassword);
      if (problem) next.newPassword = problem;
    }
    if (!pwForm.confirmPassword) {
      next.confirmPassword = "Confirm your new password.";
    } else if (pwForm.newPassword !== pwForm.confirmPassword) {
      next.confirmPassword = "The new passwords do not match.";
    }
    if (Object.keys(next).length > 0) {
      setPwErrors(next);
      return;
    }
    setPwErrors({});
    setSavingPw(true);
    try {
      const res = await fetch("/api/clients/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
          confirmPassword: pwForm.confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (/current password/i.test(data.error || "")) {
          setPwErrors({ currentPassword: data.error });
          return;
        }
        throw new Error(data.error || "Failed to update your password");
      }
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Password updated");
    } catch (err) {
      toast.error(err.message || "Failed to update your password");
    } finally {
      setSavingPw(false);
    }
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Choose an image file (JPEG, PNG, GIF, or WebP).");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setPhotoError("Image must be 50MB or smaller.");
      return;
    }
    setPhotoError("");
    setPhotoUploading(true);
    try {
      const url = await uploadProfilePhoto(file);
      const res = await fetch("/api/clients/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhoto: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save your photo");
      setPhotoBroken(false);
      setProfile(data.profile);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err.message || "Failed to upload your photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  const removePhoto = async () => {
    setPhotoError("");
    setPhotoUploading(true);
    try {
      const res = await fetch("/api/clients/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePhoto: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove your photo");
      setPhotoBroken(false);
      setProfile(data.profile);
      toast.success("Profile photo removed");
    } catch (err) {
      toast.error(err.message || "Failed to remove your photo");
    } finally {
      setPhotoUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading your profile…
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-destructive">
          {loadError || "Failed to load your profile."}
        </p>
        <Button variant="outline" onClick={load}>
          Try again
        </Button>
      </div>
    );
  }

  const hasBalance = roundMoney(profile.remainingBalance) > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          My Profile
        </h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          View your account details and remaining balance, and update your
          username, contact number, or password.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your registered details. Name and email cannot be changed here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <img
                src={
                  !photoBroken && profile.profilePhoto
                    ? profile.profilePhoto
                    : DEFAULT_AVATAR
                }
                alt={profile.fullName || "Profile"}
                onError={() => setPhotoBroken(true)}
                className="size-28 shrink-0 rounded-full bg-muted object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">
                  {profile.fullName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile.roleName || "Client"}
                  {profile.organization ? ` · ${profile.organization}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={uploadPhoto}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={photoUploading}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {photoUploading ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 size-4" />
                    )}
                    {profile.profilePhoto ? "Change photo" : "Upload photo"}
                  </Button>
                  {profile.profilePhoto && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={photoUploading}
                      onClick={removePhoto}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <FieldError>{photoError}</FieldError>
              </div>
            </div>

            <div>
              <DetailRow label="Username" value={profile.username} />
              <DetailRow label="Email" value={profile.email} />
              <DetailRow label="Contact number" value={profile.contactNumber} />
              <DetailRow label="Gender" value={profile.gender} />
              <DetailRow
                label="Birthday"
                value={
                  profile.birthday ? formatDateOnly(profile.birthday) : "—"
                }
              />
              <DetailRow label="Address" value={profile.address} />
              <DetailRow
                label="Member since"
                value={formatDateOnly(profile.createdAt)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="size-3" />
                {profile.accountStatus}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <BadgeCheck className="size-3" />
                {profile.verificationStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-5" />
              Remaining Balance
            </CardTitle>
            <CardDescription>
              Unpaid balances on your reservations plus any outstanding deposit
              balance (damages/overtime).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Total remaining
              </p>
              <p
                className={cn(
                  "tabular-nums text-3xl font-bold",
                  hasBalance ? "text-destructive" : "text-emerald-600"
                )}
              >
                {formatPhp(profile.remainingBalance || 0)}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reservation balances</span>
                <span className="tabular-nums font-medium">
                  {formatPhp(profile.reservationBalanceTotal || 0)}
                </span>
              </div>
              {(profile.reservationBalances || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No unpaid reservation balance.
                </p>
              ) : (
                profile.reservationBalances.map((row) => (
                  <div
                    key={`res-${row.reservationId}`}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="min-w-0 truncate text-muted-foreground">
                      RES-{row.reservationId} · {row.eventType}
                      {row.eventDate ? ` · ${formatDateOnly(row.eventDate)}` : ""}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatPhp(row.balance)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {roundMoney(profile.depositDebtTotal) > 0 && (
              <div className="space-y-1 border-t border-border/60 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-destructive">
                    <PhilippinePeso className="size-3.5" />
                    Outstanding deposit balance
                  </span>
                  <span className="tabular-nums font-medium text-destructive">
                    {formatPhp(profile.depositDebtTotal)}
                  </span>
                </div>
                {(profile.depositDebts || []).map((row) => (
                  <div
                    key={`dep-${row.reservationId}`}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="min-w-0 truncate text-muted-foreground">
                      RES-{row.reservationId} · {row.eventType}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {formatPhp(row.amount)}
                    </span>
                  </div>
                ))}
                <p className="pt-1 text-xs text-destructive">
                  Settle this with the Local Treasury Operations Officer before
                  making a new reservation.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5" />
              Account Details
            </CardTitle>
            <CardDescription>
              Update the username and contact number you use to sign in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveAccount} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="profile-username">Username</Label>
                <Input
                  id="profile-username"
                  value={accountForm.username}
                  onChange={(e) => {
                    setAccountForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }));
                    setAccountErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  placeholder="Choose a username"
                  aria-invalid={Boolean(accountErrors.username)}
                />
                <FieldError>{accountErrors.username}</FieldError>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-contact">
                  Contact Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="profile-contact"
                  inputMode="numeric"
                  value={accountForm.contactNumber}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                    setAccountForm((prev) => ({
                      ...prev,
                      contactNumber: digits,
                    }));
                    setAccountErrors((prev) => ({ ...prev, contactNumber: "" }));
                  }}
                  placeholder="09171234567"
                  aria-invalid={Boolean(accountErrors.contactNumber)}
                />
                <FieldError>{accountErrors.contactNumber}</FieldError>
              </div>

              <Button type="submit" disabled={savingAccount}>
                {savingAccount ? "Saving…" : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Enter your current password, then choose a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={savePassword} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="profile-current-pw">Current password</Label>
                <Input
                  id="profile-current-pw"
                  type="password"
                  autoComplete="current-password"
                  value={pwForm.currentPassword}
                  onChange={(e) => {
                    setPwForm((prev) => ({
                      ...prev,
                      currentPassword: e.target.value,
                    }));
                    setPwErrors((prev) => ({ ...prev, currentPassword: "" }));
                  }}
                  aria-invalid={Boolean(pwErrors.currentPassword)}
                />
                <FieldError>{pwErrors.currentPassword}</FieldError>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-new-pw">New password</Label>
                <Input
                  id="profile-new-pw"
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.newPassword}
                  onChange={(e) => {
                    setPwForm((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }));
                    setPwErrors((prev) => ({ ...prev, newPassword: "" }));
                  }}
                  aria-invalid={Boolean(pwErrors.newPassword)}
                />
                <FieldError>{pwErrors.newPassword}</FieldError>
                <p className="text-xs text-muted-foreground">
                  At least 8 characters with 1 uppercase, 1 lowercase, 1 number,
                  and 1 special character.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-confirm-pw">Confirm new password</Label>
                <Input
                  id="profile-confirm-pw"
                  type="password"
                  autoComplete="new-password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => {
                    setPwForm((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }));
                    setPwErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }}
                  aria-invalid={Boolean(pwErrors.confirmPassword)}
                />
                <FieldError>{pwErrors.confirmPassword}</FieldError>
              </div>

              <Button type="submit" disabled={savingPw}>
                {savingPw ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
