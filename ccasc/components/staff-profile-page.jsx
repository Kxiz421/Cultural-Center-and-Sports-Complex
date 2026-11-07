"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  UserRound,
  Lock,
  Loader2,
  Camera,
  Eye,
  EyeOff,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
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

export default function StaffProfilePage() {
  const [profile, setProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");

  const [accountForm, setAccountForm] = React.useState({
    firstName: "",
    middleName: "",
    lastName: "",
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
  const [showCurrentPw, setShowCurrentPw] = React.useState(false);
  const [showNewPw, setShowNewPw] = React.useState(false);
  const [showConfirmPw, setShowConfirmPw] = React.useState(false);

  const [photoError, setPhotoError] = React.useState("");
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [photoBroken, setPhotoBroken] = React.useState(false);
  const photoInputRef = React.useRef(null);

  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    fetch("/api/staff/me", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load your profile");
        }
        return data;
      })
      .then((data) => {
        if (!active) return;
        setPhotoBroken(false);
        setProfile(data);
        setAccountForm({
          firstName: data.firstName || "",
          middleName: data.middleName || "",
          lastName: data.lastName || "",
          username: data.username || "",
          contactNumber: data.contactNumber || "",
        });
      })
      .catch((err) => {
        if (active) setLoadError(err.message || "Failed to load your profile");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setLoading(true);
    setLoadError("");
    setReloadKey((key) => key + 1);
  };

  const saveAccount = async (e) => {
    e.preventDefault();
    const next = {};
    const username = accountForm.username.trim();
    const firstName = accountForm.firstName.trim();
    const middleName = accountForm.middleName.trim();
    const lastName = accountForm.lastName.trim();
    const digits = accountForm.contactNumber.replace(/\D/g, "");
    if (!firstName) next.firstName = "First name is required.";
    if (!lastName) next.lastName = "Last name is required.";
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
      const res = await fetch("/api/staff/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          firstName,
          middleName,
          lastName,
          contactNumber: digits,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || /username/i.test(data.error || "")) {
          setAccountErrors({ username: data.error });
          return;
        }
        if (/first name/i.test(data.error || "")) {
          setAccountErrors({ firstName: data.error });
          return;
        }
        if (/last name/i.test(data.error || "")) {
          setAccountErrors({ lastName: data.error });
          return;
        }
        throw new Error(data.error || "Failed to save your changes");
      }
      setProfile(data.profile);
      setAccountForm({
        firstName: data.profile.firstName || "",
        middleName: data.profile.middleName || "",
        lastName: data.profile.lastName || "",
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
      const res = await fetch("/api/staff/me", {
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
      const res = await fetch("/api/staff/me", {
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
      const res = await fetch("/api/staff/me", {
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
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          My Profile
        </h2>
        <p className="text-foreground/80 text-sm leading-relaxed">
          View your account details and update your name, username, contact
          number, or password.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your registered details. Email and role cannot be changed here.
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
                {profile.roleLabel || profile.roleName || "Staff"}
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
              value={profile.birthday ? formatDateOnly(profile.birthday) : "—"}
            />
            <DetailRow label="Address" value={profile.address} />
            <DetailRow
              label="Member since"
              value={formatDateOnly(profile.createdAt)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-5" />
              Account Details
            </CardTitle>
            <CardDescription>
              Update your name, username and contact number.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveAccount} className="space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="staff-profile-first-name">First name</Label>
                  <Input
                    id="staff-profile-first-name"
                    value={accountForm.firstName}
                    onChange={(e) => {
                      setAccountForm((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }));
                      setAccountErrors((prev) => ({ ...prev, firstName: "" }));
                    }}
                    aria-invalid={Boolean(accountErrors.firstName)}
                  />
                  <FieldError>{accountErrors.firstName}</FieldError>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-profile-last-name">Last name</Label>
                  <Input
                    id="staff-profile-last-name"
                    value={accountForm.lastName}
                    onChange={(e) => {
                      setAccountForm((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }));
                      setAccountErrors((prev) => ({ ...prev, lastName: "" }));
                    }}
                    aria-invalid={Boolean(accountErrors.lastName)}
                  />
                  <FieldError>{accountErrors.lastName}</FieldError>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-profile-middle-name">
                  Middle name{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="staff-profile-middle-name"
                  value={accountForm.middleName}
                  onChange={(e) => {
                    setAccountForm((prev) => ({
                      ...prev,
                      middleName: e.target.value,
                    }));
                    setAccountErrors((prev) => ({ ...prev, middleName: "" }));
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-profile-username">Username</Label>
                <Input
                  id="staff-profile-username"
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
                <Label htmlFor="staff-profile-contact">
                  Contact Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="staff-profile-contact"
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
                <Label htmlFor="staff-profile-current-pw">Current password</Label>
                <div className="relative">
                  <Input
                    id="staff-profile-current-pw"
                    type={showCurrentPw ? "text" : "password"}
                    autoComplete="current-password"
                    value={pwForm.currentPassword}
                    onChange={(e) => {
                      setPwForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }));
                      setPwErrors((prev) => ({ ...prev, currentPassword: "" }));
                    }}
                    className="pr-10"
                    aria-invalid={Boolean(pwErrors.currentPassword)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                    onClick={() => setShowCurrentPw((v) => !v)}
                    aria-label={
                      showCurrentPw ? "Hide current password" : "Show current password"
                    }
                    aria-pressed={showCurrentPw}
                  >
                    {showCurrentPw ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </Button>
                </div>
                <FieldError>{pwErrors.currentPassword}</FieldError>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-profile-new-pw">New password</Label>
                <div className="relative">
                  <Input
                    id="staff-profile-new-pw"
                    type={showNewPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={pwForm.newPassword}
                    onChange={(e) => {
                      setPwForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }));
                      setPwErrors((prev) => ({ ...prev, newPassword: "" }));
                    }}
                    className="pr-10"
                    aria-invalid={Boolean(pwErrors.newPassword)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                    onClick={() => setShowNewPw((v) => !v)}
                    aria-label={showNewPw ? "Hide new password" : "Show new password"}
                    aria-pressed={showNewPw}
                  >
                    {showNewPw ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </Button>
                </div>
                <FieldError>{pwErrors.newPassword}</FieldError>
                <p className="text-xs text-muted-foreground">
                  At least 8 characters with 1 uppercase, 1 lowercase, 1 number,
                  and 1 special character.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-profile-confirm-pw">
                  Confirm new password
                </Label>
                <div className="relative">
                  <Input
                    id="staff-profile-confirm-pw"
                    type={showConfirmPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => {
                      setPwForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }));
                      setPwErrors((prev) => ({ ...prev, confirmPassword: "" }));
                    }}
                    className="pr-10"
                    aria-invalid={Boolean(pwErrors.confirmPassword)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                    onClick={() => setShowConfirmPw((v) => !v)}
                    aria-label={
                      showConfirmPw
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    aria-pressed={showConfirmPw}
                  >
                    {showConfirmPw ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </Button>
                </div>
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
