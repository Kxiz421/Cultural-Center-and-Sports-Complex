"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Upload, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { LOGIN_PAGE_BACKGROUND } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ResubmitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [selectedIsOther, setSelectedIsOther] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [formData, setFormData] = useState({
    organizationId: "",
    otherOrganization: "",
  });
  const [idProofFile, setIdProofFile] = useState(null);
  const [idProofPreview, setIdProofPreview] = useState(null);
  const [idProofData, setIdProofData] = useState(null);

  const [clientId, setClientId] = useState(null);
  const [clientEmail, setClientEmail] = useState(null);

  // Fetch organizations and client info on mount
  useEffect(() => {
    async function init() {
      const cid = localStorage.getItem("resubmit_client_id");
      const cemail = localStorage.getItem("resubmit_email");
      setClientId(cid);
      setClientEmail(cemail);

      if (!cid) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch("/api/client-organizations");
        const data = await res.json();
        setOrganizations(data);
      } catch (error) {
        console.error("Failed to load organizations:", error);
      } finally {
        setOrgsLoading(false);
      }
    }
    init();
  }, [router]);

  const handleIdProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size too large. Maximum is 5MB.");
      return;
    }

    setIdProofFile(file);
    setIdProofPreview(URL.createObjectURL(file));

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    try {
      const res = await fetch("/api/upload/id-proof", {
        method: "POST",
        body: uploadFormData,
      });
      const data = await res.json();
      if (res.ok) {
        setIdProofData(data.url);
      } else {
        toast.error(data.error || "Failed to upload image");
      }
    } catch (error) {
      toast.error("Failed to upload image");
    }
  };

  const handleConfirm = () => {
    if (!formData.organizationId && !formData.otherOrganization) {
      toast.error("Please select or enter your organization.");
      return;
    }
    if (!idProofData) {
      toast.error("Please upload your Certificate of Employment.");
      return;
    }
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    setConfirmOpen(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resubmit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          organizationId: formData.organizationId,
          otherOrganization: formData.otherOrganization,
          idProof: idProofData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Resubmission failed");
        setLoading(false);
        return;
      }

      // Clear stored data
      localStorage.removeItem("resubmit_client_id");
      localStorage.removeItem("resubmit_email");

      toast.success("Resubmission successful! Please wait for admin approval.");
      router.push("/login");
    } catch (error) {
      toast.error("An error occurred during resubmission.");
      setLoading(false);
    }
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
      <div className="absolute inset-0 bg-black/55" aria-hidden />

      <div className="relative z-10 w-full max-w-lg">
        <Link
          href="/login"
          className="mb-4 flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-destructive text-destructive-foreground flex size-10 items-center justify-center rounded-lg">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <CardTitle>Resubmit Documents</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Your Certificate of Employment was declined. Please upload a valid document.
                </p>
              </div>
            </div>
          </CardHeader>
          <div className="px-6 pb-6 space-y-4">
            {clientEmail && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">Account:</span>{" "}
                <span className="font-medium">{clientEmail}</span>
              </div>
            )}

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="organization">
                Organization <span className="text-destructive">*</span>
              </Label>
              {orgsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading organizations...
                </div>
              ) : (
                <Select
                  value={formData.organizationId}
                  onValueChange={(value) => {
                    if (value === "other") {
                      setSelectedIsOther(true);
                      setFormData((prev) => ({ ...prev, organizationId: "other", otherOrganization: "" }));
                    } else {
                      setSelectedIsOther(false);
                      setFormData((prev) => ({ ...prev, organizationId: value, otherOrganization: "" }));
                    }
                  }}
                >
                  <SelectTrigger className="text-black">
                    <SelectValue placeholder="Select your organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.clientOrgId} value={String(org.clientOrgId)}>
                        {org.organizationName}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other (please specify)</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {selectedIsOther && (
                <Input
                  placeholder="Enter your organization name"
                  value={formData.otherOrganization}
                  onChange={(e) => setFormData((prev) => ({ ...prev, otherOrganization: e.target.value }))}
                  className="mt-2 text-black placeholder:text-neutral-500"
                />
              )}
            </div>

            {/* ID Proof Upload */}
            <div className="space-y-2">
              <Label htmlFor="idProof">
                Certificate of Employment (ID) <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => document.getElementById("idProof").click()}
                >
                  <Upload className="size-4" />
                  {idProofFile ? "Change file" : "Upload image"}
                </Button>
                <input
                  id="idProof"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleIdProofUpload}
                />
                {idProofFile && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {idProofFile.name}
                  </span>
                )}
              </div>
              {idProofPreview && (
                <div className="relative mt-2 h-32 w-48 overflow-hidden rounded-lg border">
                  <Image
                    src={idProofPreview}
                    alt="ID proof preview"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Accepted formats: JPEG, PNG, GIF, WebP. Max size: 5MB.
              </p>
            </div>

            <Button
              type="button"
              className="w-full"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit for Review"
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-yellow-500" />
              Confirm Resubmission
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to resubmit your Certificate of Employment?
              Your account will be set back to pending review.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Confirm Resubmit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}