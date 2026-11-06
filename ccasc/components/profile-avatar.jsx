"use client";

import * as React from "react";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_AVATAR } from "@/lib/constants";
import { formatPhp } from "@/lib/utils";
import { uploadProfilePhoto } from "@/lib/upload-profile-photo";
import { NotificationSoundPicker } from "@/components/notification-sound-picker";

/** "Claimable now" once the event has passed, else "Claim after <date>". */
function claimWhen(value) {
  if (!value) return "Claimable now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Claimable now";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date <= today) return "Claimable now";
  return `Claim after ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

/**
 * A clickable profile avatar for panels without a dedicated profile page.
 *
 * Shows the signed-in user's photo, or a default avatar when they have none
 * (or the stored photo fails to load), and opens a small profile dialog where
 * they can view their details and add / change / remove their photo.
 *
 * `endpoint` is the "me" API that owns the profile — `/api/staff/me` for staff
 * panels, `/api/clients/me` for client-role accounts such as the provincial
 * agency. Both return the same field names, so the same dialog serves each.
 */
export function ProfileAvatar({ endpoint = "/api/staff/me" }) {
  const [profile, setProfile] = React.useState(null);
  const [open, setOpen] = React.useState(false);
  const [photoBroken, setPhotoBroken] = React.useState(false);
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const [photoError, setPhotoError] = React.useState("");
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data) setProfile(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [endpoint]);

  const photoUrl =
    !photoBroken && profile?.profilePhoto ? profile.profilePhoto : DEFAULT_AVATAR;

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
      const res = await fetch(endpoint, {
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
      const res = await fetch(endpoint, {
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

  return (
    <>
      <button
        type="button"
        title="View my profile"
        aria-label="View my profile"
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-full transition-transform hover:scale-105"
      >
        <img
          src={photoUrl}
          alt="My profile"
          onError={() => setPhotoBroken(true)}
          className="size-8 rounded-full bg-white/15 object-cover ring-2 ring-white/25"
        />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>My Profile</DialogTitle>
            <DialogDescription>
              Your account details and profile photo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-4 py-2">
            <img
              src={photoUrl}
              alt={profile?.fullName || "Profile"}
              onError={() => setPhotoBroken(true)}
              className="size-28 shrink-0 rounded-full bg-primary/10 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">
                {profile?.fullName || "—"}
              </p>
              <p className="text-muted-foreground text-sm">
                {[profile?.roleLabel || profile?.roleName, profile?.organization]
                  .filter(Boolean)
                  .join(" · ") || "Account"}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadPhoto}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={photoUploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {photoUploading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Camera className="mr-2 size-4" />
                  )}
                  {profile?.profilePhoto ? "Change photo" : "Upload photo"}
                </Button>
                {profile?.profilePhoto && (
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

          <div className="space-y-1 border-t pt-3 text-sm">
            <DetailRow label="Email" value={profile?.email} />
            <DetailRow label="Contact number" value={profile?.contactNumber} />
            <DetailRow label="Username" value={profile?.username} />
            <DetailRow label="Organization" value={profile?.organization} />
            <DetailRow label="Role" value={profile?.roleLabel || profile?.roleName} />
          </div>

          {typeof profile?.remainingBalance === "number" && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Remaining balance</span>
                <span
                  className={`tabular-nums font-semibold ${
                    profile.remainingBalance > 0
                      ? "text-destructive"
                      : "text-emerald-600"
                  }`}
                >
                  {formatPhp(profile.remainingBalance)}
                </span>
              </div>

              {profile.depositClaimTotal > 0 && (
                <>
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Deposit to claim</span>
                    <span className="tabular-nums font-medium text-emerald-700">
                      {formatPhp(profile.depositClaimTotal)}
                    </span>
                  </div>
                  {(profile.depositClaims || []).map((row) => (
                    <div
                      key={`claim-${row.reservationId}`}
                      className="mt-0.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="min-w-0 truncate text-muted-foreground">
                        RES-{row.reservationId} · {claimWhen(row.claimableFrom)}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatPhp(row.amount)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <div className="border-t pt-3">
            <NotificationSoundPicker compact />
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value || "—"}</span>
    </div>
  );
}
