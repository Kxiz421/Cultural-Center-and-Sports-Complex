"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Eye, EyeOff, Upload, ArrowLeft, Loader2 } from "lucide-react";
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

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [selectedIsOther, setSelectedIsOther] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    username: "",
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
    organizationId: "",
    otherOrganization: "",
  });
  const [idProofFile, setIdProofFile] = useState(null);
  const [idProofPreview, setIdProofPreview] = useState(null);
  const [idProofData, setIdProofData] = useState(null);

  // Fetch organizations on mount
  useEffect(() => {
    async function fetchOrgs() {
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
    fetchOrgs();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIdProofUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size too large. Maximum is 5MB.");
      return;
    }

    setIdProofFile(file);
    setIdProofPreview(URL.createObjectURL(file));

    // Upload the file to get base64
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

  const validatePassword = (password) => {
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character (e.g., @, #, $).";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.contactNumber) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!formData.organizationId && !formData.otherOrganization) {
      toast.error("Please select or enter your organization.");
      return;
    }

    // Validate password
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          middleName: formData.middleName,
          lastName: formData.lastName,
          username: formData.username || undefined,
          email: formData.email,
          contactNumber: formData.contactNumber,
          password: formData.password,
          organizationId: formData.organizationId,
          otherOrganization: formData.otherOrganization,
          idProof: idProofData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      toast.success("Registration successful! You can now sign in.");
      router.push("/login");
    } catch (error) {
      toast.error("An error occurred during registration.");
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
          href="/"
          className="mb-4 flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </Link>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
                <Building2 className="size-5" />
              </div>
              <div>
                <CardTitle>Client Registration</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Create an account to book facilities
                </p>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Juan"
                    className="text-black placeholder:text-neutral-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleChange}
                    placeholder="Dela Cruz"
                    className="text-black placeholder:text-neutral-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Santos"
                    className="text-black placeholder:text-neutral-500"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="juan.santos@email.com"
                  className="text-black placeholder:text-neutral-500"
                  required
                />
              </div>

              {/* Username (optional) */}
              <div className="space-y-2">
                <Label htmlFor="username">Username (optional)</Label>
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  className="text-black placeholder:text-neutral-500"
                />
              </div>

              {/* Contact Number */}
              <div className="space-y-2">
                <Label htmlFor="contactNumber">
                  Contact Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="contactNumber"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  placeholder="+63 912 345 6789"
                  className="text-black placeholder:text-neutral-500"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 8 characters"
                    className="pr-10 text-black placeholder:text-neutral-500"
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    className="pr-10 text-black placeholder:text-neutral-500"
                    required
                    minLength={8}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <Eye className="size-4" />
                    ) : (
                      <EyeOff className="size-4" />
                    )}
                  </Button>
                </div>
              </div>

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
                    name="otherOrganization"
                    value={formData.otherOrganization}
                    onChange={handleChange}
                    placeholder="Enter your organization name"
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
            </CardContent>
            <div className="px-6 pb-6">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}