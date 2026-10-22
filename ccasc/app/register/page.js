"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { LOGIN_PAGE_BACKGROUND, PAGE_LOGO, PAGE_LOGO_2 } from "@/lib/constants";
import { fetchBarangays, fetchCities, fetchProvinces } from "@/lib/ph-address";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  TransitionLink,
  useRouteTransition,
} from "@/components/route-transition";
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

// Larger controls (per the full-page registration redesign) with more
// transparent placeholder text so it does not read as a filled-in value.
const FIELD_CLASS =
  "h-12 text-base text-foreground placeholder:text-foreground/30";
const SELECT_CLASS =
  "h-12 w-full text-base text-foreground data-placeholder:text-foreground/30";
const LABEL_CLASS = "text-base";

/**
 * Send + verify a one-time code for ONE registration contact (email or SMS).
 * Renders a "Send code" button, and once a code is on its way, the code input
 * and a "Verify" button. Reports success upward through `onVerified`.
 */
function ContactVerifier({ channel, target, verified, onVerified }) {
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const sendCode = async () => {
    if (!target) {
      toast.error(
        channel === "email"
          ? "Enter your email address first."
          : "Enter your mobile number first.",
      );
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/register/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", channel, target }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send the code.");
        return;
      }
      setSent(true);
      toast.success(`A verification code was sent to ${data.target || target}.`);
    } catch {
      toast.error("Failed to send the code.");
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (code.trim().length < 6) {
      toast.error("Enter the 6-digit verification code.");
      return;
    }
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/register/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          channel,
          target,
          otp: code.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Invalid or expired code.");
        return;
      }
      onVerified(true);
      toast.success(
        channel === "email"
          ? "Email address verified."
          : "Mobile number verified.",
      );
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-4" />
        Verified
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={sendCode}
        disabled={sending}
      >
        {sending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Sending…
          </>
        ) : sent ? (
          "Resend code"
        ) : (
          "Send code"
        )}
      </Button>
      {sent && (
        <>
          <Input
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            className={`${FIELD_CLASS} w-40 text-center tracking-widest`}
          />
          <Button type="button" onClick={verify} disabled={verifying}>
            {verifying ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const { start: startRouteTransition } = useRouteTransition();
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
    gender: "",
    birthday: "",
    password: "",
    confirmPassword: "",
    organizationId: "",
    otherOrganization: "",
    addressLine: "",
    provinceCode: "",
    provinceName: "",
    cityCode: "",
    cityName: "",
    barangayName: "",
  });
  const [emailCheck, setEmailCheck] = useState(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const emailRequestRef = useRef(0);

  // Contact verification
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const contactsVerified = emailVerified && phoneVerified;

  // Cascading address data
  const [provinces, setProvinces] = useState([]);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [cities, setCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [barangays, setBarangays] = useState([]);
  const [barangaysLoading, setBarangaysLoading] = useState(false);

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

  // Fetch the province list once.
  useEffect(() => {
    let active = true;
    (async () => {
      const list = await fetchProvinces();
      if (active) {
        setProvinces(list);
        setProvincesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Check the email as the user types (debounced). Supports any provider.
  const runEmailCheck = useCallback(async (value) => {
    const email = value.trim();
    if (!email) return;

    const requestId = ++emailRequestRef.current;
    setEmailChecking(true);
    try {
      const res = await fetch("/api/auth/validate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (emailRequestRef.current === requestId) {
        setEmailCheck({ ...data, email });
      }
    } catch {
      if (emailRequestRef.current === requestId) setEmailCheck(null);
    } finally {
      if (emailRequestRef.current === requestId) setEmailChecking(false);
    }
  }, []);

  useEffect(() => {
    const email = formData.email.trim();
    if (!email) return;
    const timer = setTimeout(() => runEmailCheck(email), 600);
    return () => clearTimeout(timer);
  }, [formData.email, runEmailCheck]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "contactNumber") {
      const digitsOnly = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, contactNumber: digitsOnly.slice(0, 11) }));
      setPhoneVerified(false);
      return;
    }
    if (name === "email") {
      setFormData((prev) => ({ ...prev, email: value }));
      setEmailVerified(false);
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProvinceChange = async (code) => {
    const province = provinces.find((p) => p.code === code);
    setFormData((prev) => ({
      ...prev,
      provinceCode: code,
      provinceName: province?.name ?? "",
      cityCode: "",
      cityName: "",
      barangayName: "",
    }));
    setCities([]);
    setBarangays([]);
    if (!code) return;
    setCitiesLoading(true);
    try {
      setCities(await fetchCities(code));
    } finally {
      setCitiesLoading(false);
    }
  };

  const handleCityChange = async (code) => {
    const city = cities.find((c) => c.code === code);
    setFormData((prev) => ({
      ...prev,
      cityCode: code,
      cityName: city?.name ?? "",
      barangayName: "",
    }));
    setBarangays([]);
    if (!code) return;
    setBarangaysLoading(true);
    try {
      setBarangays(await fetchBarangays(code));
    } finally {
      setBarangaysLoading(false);
    }
  };

  const handleBarangayChange = (name) => {
    setFormData((prev) => ({ ...prev, barangayName: name }));
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
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!emailVerified) {
      toast.error("Please verify your email address first.");
      return;
    }

    // Validate contact number
    if (!formData.contactNumber || formData.contactNumber.length !== 11) {
      toast.error("Contact number must be exactly 11 digits.");
      return;
    }

    if (!phoneVerified) {
      toast.error("Please verify your mobile number first.");
      return;
    }

    if (!formData.gender) {
      toast.error("Please select your gender.");
      return;
    }

    if (!formData.birthday) {
      toast.error("Please enter your birthday.");
      return;
    }

    if (!formData.addressLine.trim()) {
      toast.error("Please enter your street address.");
      return;
    }

    if (!formData.provinceCode || !formData.cityCode || !formData.barangayName) {
      toast.error("Please complete your province, city/municipality, and barangay.");
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
          gender: formData.gender,
          birthday: formData.birthday,
          addressLine: formData.addressLine,
          province: formData.provinceName,
          city: formData.cityName,
          barangay: formData.barangayName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        setLoading(false);
        return;
      }

      toast.success("Registration successful! You can now sign in with your account.");
      // Covered transition into the sign-in page (see
      // `components/route-transition.jsx`); the success toast still shows
      // because sonner renders above the curtain.
      startRouteTransition("/login");
    } catch (error) {
      toast.error("An error occurred during registration.");
      setLoading(false);
    }
  };

  // Only surface a result that belongs to the email currently typed. The
  // "unknown" status means the domain couldn't be verified (e.g. no network),
  // which is not actionable - so it is never shown.
  const trimmedEmail = formData.email.trim();
  const activeEmailCheck =
    emailCheck && emailCheck.email === trimmedEmail ? emailCheck : null;
  const emailWarning =
    activeEmailCheck && activeEmailCheck.status !== "unknown"
      ? activeEmailCheck.message
      : "";
  const emailInvalid =
    activeEmailCheck?.status === "invalid" ||
    activeEmailCheck?.status === "undeliverable";

  return (
    <div className="relative min-h-screen overflow-hidden">
      <Image
        src={LOGIN_PAGE_BACKGROUND}
        alt=""
        fill
        priority
        unoptimized
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#292B6F]/70" aria-hidden />

      <div className="absolute right-4 top-4 z-20 rounded-full border bg-background/80 px-3 py-1.5 shadow-sm backdrop-blur">
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <TransitionLink
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back to home
        </TransitionLink>

        <div className="mb-6 flex flex-col items-center px-2 text-center">
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
          <p className="text-xl font-extrabold uppercase tracking-wider text-white drop-shadow-sm md:text-2xl">
            Provincial Government of South Cotabato
          </p>
          <h1 className="mt-2 text-base font-bold tracking-tight text-white/90 md:text-lg">
            Gymnasium &amp; Cultural Center / Sports Complex
          </h1>
        </div>

        <Card className="w-full shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Client Registration</CardTitle>
            <p className="text-muted-foreground text-base">
              Create an account to book facilities. Your email and mobile number
              must both be verified before you can register.
            </p>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-8">
              {/* Personal information */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">Personal Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className={LABEL_CLASS}>
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Juan"
                      className={FIELD_CLASS}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="middleName" className={LABEL_CLASS}>
                      Middle Name
                    </Label>
                    <Input
                      id="middleName"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      placeholder="Dela Cruz"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className={LABEL_CLASS}>
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Santos"
                      className={FIELD_CLASS}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gender" className={LABEL_CLASS}>
                      Gender <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, gender: value }))
                      }
                    >
                      <SelectTrigger id="gender" className={SELECT_CLASS}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthday" className={LABEL_CLASS}>
                      Birthday <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="birthday"
                      name="birthday"
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={formData.birthday}
                      onChange={handleChange}
                      className={FIELD_CLASS}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Address */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">Address</h2>
                <div className="space-y-2">
                  <Label htmlFor="addressLine" className={LABEL_CLASS}>
                    House No. / Street / Purok{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="addressLine"
                    name="addressLine"
                    value={formData.addressLine}
                    onChange={handleChange}
                    placeholder="e.g., 123 Rizal Street, Purok 4"
                    className={FIELD_CLASS}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="province" className={LABEL_CLASS}>
                      Province <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.provinceCode}
                      onValueChange={handleProvinceChange}
                      disabled={provincesLoading}
                    >
                      <SelectTrigger id="province" className={SELECT_CLASS}>
                        <SelectValue
                          placeholder={
                            provincesLoading ? "Loading…" : "Select province"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {provinces.map((province) => (
                          <SelectItem key={province.code} value={province.code}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city" className={LABEL_CLASS}>
                      City / Municipality{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.cityCode}
                      onValueChange={handleCityChange}
                      disabled={!formData.provinceCode || citiesLoading}
                    >
                      <SelectTrigger id="city" className={SELECT_CLASS}>
                        <SelectValue
                          placeholder={
                            !formData.provinceCode
                              ? "Select province first"
                              : citiesLoading
                                ? "Loading…"
                                : "Select city/municipality"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {cities.map((city) => (
                          <SelectItem key={city.code} value={city.code}>
                            {city.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barangay" className={LABEL_CLASS}>
                      Barangay <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.barangayName}
                      onValueChange={handleBarangayChange}
                      disabled={!formData.cityCode || barangaysLoading}
                    >
                      <SelectTrigger id="barangay" className={SELECT_CLASS}>
                        <SelectValue
                          placeholder={
                            !formData.cityCode
                              ? "Select city first"
                              : barangaysLoading
                                ? "Loading…"
                                : "Select barangay"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {barangays.map((barangay) => (
                          <SelectItem key={barangay.code} value={barangay.name}>
                            {barangay.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Account & contact */}
              <section className="space-y-4">
                <h2 className="text-lg font-semibold">Contact &amp; Account</h2>

                {/* Email + verification */}
                <div className="space-y-2">
                  <Label htmlFor="email" className={LABEL_CLASS}>
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="juan.santos@email.com"
                    className={FIELD_CLASS}
                    aria-invalid={emailInvalid}
                    required
                  />
                  {trimmedEmail && emailChecking ? (
                    <p className="text-sm text-muted-foreground">Checking email…</p>
                  ) : emailWarning ? (
                    <p
                      className={
                        emailInvalid
                          ? "text-sm text-destructive"
                          : "text-sm text-amber-600"
                      }
                    >
                      {emailWarning}
                    </p>
                  ) : null}
                  <ContactVerifier
                    key={trimmedEmail}
                    channel="email"
                    target={trimmedEmail}
                    verified={emailVerified}
                    onVerified={setEmailVerified}
                  />
                </div>

                {/* Phone + verification */}
                <div className="space-y-2">
                  <Label htmlFor="contactNumber" className={LABEL_CLASS}>
                    Contact Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="contactNumber"
                    name="contactNumber"
                    value={formData.contactNumber}
                    onChange={handleChange}
                    placeholder="09123456789"
                    className={FIELD_CLASS}
                    required
                  />
                  <ContactVerifier
                    key={formData.contactNumber}
                    channel="sms"
                    target={formData.contactNumber}
                    verified={phoneVerified}
                    onVerified={setPhoneVerified}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="username" className={LABEL_CLASS}>
                      Username (optional)
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Choose a username"
                      className={FIELD_CLASS}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="organization" className={LABEL_CLASS}>
                      Organization <span className="text-destructive">*</span>
                    </Label>
                    {orgsLoading ? (
                      <div className="flex h-12 items-center gap-2 text-base text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading organizations...
                      </div>
                    ) : (
                      <Select
                        value={formData.organizationId}
                        onValueChange={(value) => {
                          if (value === "other") {
                            setSelectedIsOther(true);
                            setFormData((prev) => ({
                              ...prev,
                              organizationId: "other",
                              otherOrganization: "",
                            }));
                          } else {
                            setSelectedIsOther(false);
                            setFormData((prev) => ({
                              ...prev,
                              organizationId: value,
                              otherOrganization: "",
                            }));
                          }
                        }}
                      >
                        <SelectTrigger id="organization" className={SELECT_CLASS}>
                          <SelectValue placeholder="Select your organization" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {organizations.map((org) => (
                            <SelectItem
                              key={org.clientOrgId}
                              value={String(org.clientOrgId)}
                            >
                              {org.organizationName}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">
                            Other (please specify)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                {selectedIsOther && (
                  <Input
                    name="otherOrganization"
                    value={formData.otherOrganization}
                    onChange={handleChange}
                    placeholder="Enter your organization name"
                    className={FIELD_CLASS}
                  />
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="password" className={LABEL_CLASS}>
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
                        className={`${FIELD_CLASS} pr-10`}
                        required
                        minLength={8}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
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
                    <p className="text-sm text-muted-foreground">
                      Must be at least 8 characters with 1 uppercase, 1 lowercase,
                      1 number, and 1 special character.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className={LABEL_CLASS}>
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
                        className={`${FIELD_CLASS} pr-10`}
                        required
                        minLength={8}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={
                          showConfirmPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <Eye className="size-4" />
                        ) : (
                          <EyeOff className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </CardContent>
            <div className="px-6 pb-6">
              <Button
                type="submit"
                size="lg"
                className="w-full text-base"
                disabled={loading || !contactsVerified}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Registering...
                  </>
                ) : contactsVerified ? (
                  "Create Account"
                ) : (
                  "Verify email and mobile to continue"
                )}
              </Button>
              <p className="mt-3 text-center text-base text-muted-foreground">
                Already have an account?{" "}
                <TransitionLink
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </TransitionLink>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
