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
  Mail,
  Phone,
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
import { FieldError } from "@/components/ui/field-error";
import { WizardSteps, WizardNav } from "@/components/reservation-wizard";
import { cn } from "@/lib/utils";
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

const OTP_LENGTH = 6;

const STEP_PERSONAL = 0;
const STEP_ADDRESS = 1;
const STEP_CONTACT = 2;
const STEP_ACCOUNT = 3;
const WIZARD_STEPS = ["Personal Information", "Address", "Contact", "Account & Review"];
const STEP_HINTS = [
  "Tell us who you are. Fields marked with * are required.",
  "Where can we reach you? Complete your province, city/municipality, and barangay.",
  "Choose ONE way to verify your registration (SMS or email) and enter the code we send.",
  "Set up your sign-in details, then review everything before confirming.",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Send + verify a one-time code for ONE registration contact (email or SMS).
 * Renders a "Send code" button, and once a code is on its way, six code boxes
 * and a "Verify" button. Reports success upward through `onVerified`.
 */
function ContactVerifier({ channel, target, verified, onVerified }) {
  const [cells, setCells] = useState(() =>
    Array.from({ length: OTP_LENGTH }, () => ""),
  );
  const cellRefs = useRef([]);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const code = cells.join("");

  const focusCell = (index) => {
    const el = cellRefs.current[index];
    if (el) el.focus();
  };

  const resetCells = () =>
    setCells(Array.from({ length: OTP_LENGTH }, () => ""));

  const handleCellChange = (index, event) => {
    const digit = event.target.value.replace(/\D/g, "").slice(-1);
    if (error) setError("");
    setCells((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < OTP_LENGTH - 1) focusCell(index + 1);
  };

  const handleCellKeyDown = (index, event) => {
    if (event.key !== "Backspace") return;
    if (cells[index]) {
      setCells((prev) => {
        const next = [...prev];
        next[index] = "";
        return next;
      });
      return;
    }
    if (index > 0) {
      event.preventDefault();
      focusCell(index - 1);
    }
  };

  const handleCellPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;

    const chars = pasted.split("");
    setCells((prev) => {
      const next = [...prev];
      chars.forEach((c, i) => {
        if (i < OTP_LENGTH) next[i] = c;
      });
      return next;
    });
    focusCell(Math.min(chars.length, OTP_LENGTH) - 1);
  };

  const sendCode = async () => {
    if (!target) {
      setError(
        channel === "email"
          ? "Enter your email address first."
          : "Enter your mobile number first.",
      );
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/auth/register/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", channel, target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send the code.");
        return;
      }
      setSent(true);
      resetCells();
      toast.success(`A verification code was sent to ${data.target || target}.`);
    } catch {
      toast.error("Failed to send the code.");
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    if (code.length < OTP_LENGTH) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/register/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          channel,
          target,
          otp: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid or expired code.");
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
    <div className="space-y-3">
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
        )}
      </div>

      {sent && (
        <div
          className="flex gap-2"
          onPaste={handleCellPaste}
          role="group"
          aria-label={`${OTP_LENGTH}-digit verification code`}
        >
          {cells.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => {
                cellRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
              value={digit}
              onChange={(e) => handleCellChange(index, e)}
              onKeyDown={(e) => handleCellKeyDown(index, e)}
              className="border-input focus-visible:ring-ring h-12 w-10 rounded-md border-2 text-center text-lg font-semibold tracking-widest text-foreground tabular-nums shadow-sm sm:h-14 sm:w-11 sm:text-xl"
            />
          ))}
        </div>
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export default function RegisterPage() {
  const { start: startRouteTransition } = useRouteTransition();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(STEP_PERSONAL);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [selectedIsOther, setSelectedIsOther] = useState(false);
  const [errors, setErrors] = useState({});

  const clearError = (...names) =>
    setErrors((prev) => {
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

  // Contact verification — the registrant verifies ONE chosen channel.
  const [verifyChannel, setVerifyChannel] = useState("email");
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

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
      clearError("contactNumber", "verification");
      return;
    }
    if (name === "email") {
      setFormData((prev) => ({ ...prev, email: value }));
      setEmailVerified(false);
      clearError("email", "verification");
      return;
    }
    clearError(name);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProvinceChange = async (code) => {
    const province = provinces.find((p) => p.code === code);
    clearError("province", "city", "barangay");
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
    clearError("city", "barangay");
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
    clearError("barangay");
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

  const validatePersonal = () => {
    const next = {};
    if (!formData.firstName.trim()) next.firstName = "First name is required.";
    if (!formData.lastName.trim()) next.lastName = "Last name is required.";
    if (!formData.gender) next.gender = "Please select your gender.";
    if (!formData.birthday) next.birthday = "Please enter your birthday.";
    return next;
  };

  const validateAddress = () => {
    const next = {};
    if (!formData.addressLine.trim()) {
      next.addressLine = "Please enter your house no. / street / purok.";
    }
    if (!formData.provinceCode) next.province = "Please select your province.";
    if (!formData.cityCode) next.city = "Please select your city / municipality.";
    if (!formData.barangayName) next.barangay = "Please select your barangay.";
    return next;
  };

  const validateContact = () => {
    const next = {};
    const email = formData.email.trim();
    if (!email) next.email = "Email is required.";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";

    const digits = formData.contactNumber.replace(/\D/g, "");
    if (!digits) next.contactNumber = "Contact number is required.";
    else if (digits.length !== 11) {
      next.contactNumber = "Contact number must be exactly 11 digits.";
    }

    const verified = verifyChannel === "email" ? emailVerified : phoneVerified;
    if (!verified) {
      next.verification =
        verifyChannel === "email"
          ? "Please verify your email address."
          : "Please verify your mobile number.";
    }
    return next;
  };

  const validateAccount = () => {
    const next = {};
    if (!formData.organizationId && !formData.otherOrganization) {
      next.organization = "Please select or enter your organization.";
    }
    if (!formData.password) {
      next.password = "Password is required.";
    } else {
      const problem = validatePassword(formData.password);
      if (problem) next.password = problem;
    }
    if (!formData.confirmPassword) {
      next.confirmPassword = "Confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    return next;
  };

  const validators = [validatePersonal, validateAddress, validateContact, validateAccount];

  const goNext = () => {
    const stepErrors = validators[step]();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const handleConfirm = async (e) => {
    e.preventDefault();

    const perStep = validators.map((validate) => validate());
    const merged = Object.assign({}, ...perStep);
    const firstBad = perStep.findIndex((errs) => Object.keys(errs).length > 0);
    if (firstBad >= 0) {
      setErrors(merged);
      setStep(firstBad);
      return;
    }
    setErrors({});
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
          verifiedChannel: verifyChannel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && /email/i.test(data.error || "")) {
          setErrors({ email: data.error });
          setStep(STEP_CONTACT);
          return;
        }
        if (res.status === 409 && /username/i.test(data.error || "")) {
          setErrors({ username: data.error });
          setStep(STEP_ACCOUNT);
          return;
        }
        if (res.status === 400 && /verify/i.test(data.error || "")) {
          setErrors({ verification: data.error });
          setStep(STEP_CONTACT);
          return;
        }
        toast.error(data.error || "Registration failed");
        return;
      }

      toast.success("Registration successful! You can now sign in with your account.");
      // Covered transition into the sign-in page (see
      // `components/route-transition.jsx`); the success toast still shows
      // because sonner renders above the curtain.
      startRouteTransition("/login");
    } catch (error) {
      toast.error("An error occurred during registration.");
    } finally {
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

  const organizationLabel =
    formData.organizationId && formData.organizationId !== "other"
      ? organizations.find(
          (org) => String(org.clientOrgId) === String(formData.organizationId)
        )?.organizationName || "—"
      : formData.otherOrganization || "";

  const fullAddress = [
    formData.addressLine,
    formData.barangayName,
    formData.cityName,
    formData.provinceName,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

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
              Create an account to book facilities. Choose one contact channel to
              verify, then review your details before confirming.
            </p>
          </CardHeader>
          <form onSubmit={handleConfirm} noValidate>
            <CardContent className="space-y-8">
              <WizardSteps steps={WIZARD_STEPS} current={step} onSelect={setStep} />
              <p className="text-muted-foreground -mt-4 text-sm">
                {STEP_HINTS[step]}
              </p>

              {/* Step 1 — Personal Information */}
              {step === STEP_PERSONAL && (
                <section className="space-y-4">
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
                        aria-invalid={Boolean(errors.firstName)}
                      />
                      <FieldError>{errors.firstName}</FieldError>
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
                        aria-invalid={Boolean(errors.lastName)}
                      />
                      <FieldError>{errors.lastName}</FieldError>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="gender" className={LABEL_CLASS}>
                        Gender <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => {
                          clearError("gender");
                          setFormData((prev) => ({ ...prev, gender: value }));
                        }}
                      >
                        <SelectTrigger
                          id="gender"
                          className={SELECT_CLASS}
                          aria-invalid={Boolean(errors.gender)}
                        >
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError>{errors.gender}</FieldError>
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
                        aria-invalid={Boolean(errors.birthday)}
                      />
                      <FieldError>{errors.birthday}</FieldError>
                    </div>
                  </div>
                </section>
              )}

              {/* Step 2 — Address */}
              {step === STEP_ADDRESS && (
                <section className="space-y-4">
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
                      aria-invalid={Boolean(errors.addressLine)}
                    />
                    <FieldError>{errors.addressLine}</FieldError>
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
                        <SelectContent position="popper" className="max-h-60">
                          {provinces.map((province) => (
                            <SelectItem key={province.code} value={province.code}>
                              {province.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError>{errors.province}</FieldError>
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
                        <SelectContent position="popper" className="max-h-60">
                          {cities.map((city) => (
                            <SelectItem key={city.code} value={city.code}>
                              {city.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError>{errors.city}</FieldError>
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
                        <SelectContent position="popper" className="max-h-60">
                          {barangays.map((barangay) => (
                            <SelectItem key={barangay.code} value={barangay.name}>
                              {barangay.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError>{errors.barangay}</FieldError>
                    </div>
                  </div>
                </section>
              )}

              {/* Step 3 — Contact & Verification */}
              {step === STEP_CONTACT && (
                <section className="space-y-4">
                  <div className="space-y-2">
                    <Label className={LABEL_CLASS}>
                      Choose how to verify your registration{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {[
                        { value: "sms", label: "Text message (SMS)", icon: Phone },
                        { value: "email", label: "Email", icon: Mail },
                      ].map((option) => {
                        const Icon = option.icon;
                        const active = verifyChannel === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setVerifyChannel(option.value);
                              clearError("verification");
                            }}
                            aria-pressed={active}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                              active ? "border-primary bg-primary/5" : "hover:bg-muted"
                            )}
                          >
                            <Icon className="text-muted-foreground size-4 shrink-0" />
                            <span className="text-sm font-medium">
                              {option.label}
                            </span>
                            {active && (
                              <CheckCircle2 className="ml-auto size-4 text-emerald-600" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

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
                      aria-invalid={emailInvalid || Boolean(errors.email)}
                    />
                    <FieldError>{errors.email}</FieldError>
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
                    {verifyChannel === "email" && (
                      <ContactVerifier
                        key={`email-${trimmedEmail}`}
                        channel="email"
                        target={trimmedEmail}
                        verified={emailVerified}
                        onVerified={(value) => {
                          setEmailVerified(value);
                          if (value) clearError("verification");
                        }}
                      />
                    )}
                  </div>

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
                      inputMode="numeric"
                      aria-invalid={Boolean(errors.contactNumber)}
                    />
                    <FieldError>{errors.contactNumber}</FieldError>
                    {verifyChannel === "sms" && (
                      <ContactVerifier
                        key={`sms-${formData.contactNumber}`}
                        channel="sms"
                        target={formData.contactNumber}
                        verified={phoneVerified}
                        onVerified={(value) => {
                          setPhoneVerified(value);
                          if (value) clearError("verification");
                        }}
                      />
                    )}
                  </div>

                  <FieldError>{errors.verification}</FieldError>
                </section>
              )}

              {/* Step 4 — Account & Review */}
              {step === STEP_ACCOUNT && (
                <section className="space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold">Account Details</h2>
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
                          aria-invalid={Boolean(errors.username)}
                        />
                        <FieldError>{errors.username}</FieldError>
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
                              clearError("organization");
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
                            <SelectTrigger
                              id="organization"
                              className={SELECT_CLASS}
                              aria-invalid={Boolean(errors.organization)}
                            >
                              <SelectValue placeholder="Select your organization" />
                            </SelectTrigger>
                            <SelectContent position="popper" className="max-h-60">
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
                        <FieldError>{errors.organization}</FieldError>
                      </div>
                    </div>
                    {selectedIsOther && (
                      <Input
                        name="otherOrganization"
                        value={formData.otherOrganization}
                        onChange={(e) => {
                          clearError("organization");
                          handleChange(e);
                        }}
                        placeholder="Enter your organization name"
                        className={FIELD_CLASS}
                        aria-invalid={Boolean(errors.organization)}
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
                            aria-invalid={Boolean(errors.password)}
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
                        <FieldError>{errors.password}</FieldError>
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
                            aria-invalid={Boolean(errors.confirmPassword)}
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
                        <FieldError>{errors.confirmPassword}</FieldError>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">Review Your Details</h2>
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <SummaryRow
                        label="Name"
                        value={[
                          formData.firstName,
                          formData.middleName,
                          formData.lastName,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                      <SummaryRow label="Gender" value={formData.gender} />
                      <SummaryRow
                        label="Birthday"
                        value={
                          formData.birthday
                            ? new Date(`${formData.birthday}T00:00:00`).toLocaleDateString(
                                "en-US",
                                { month: "long", day: "numeric", year: "numeric" }
                              )
                            : ""
                        }
                      />
                      <SummaryRow label="Address" value={fullAddress} />
                      <SummaryRow label="Email" value={formData.email} />
                      <SummaryRow
                        label="Contact number"
                        value={formData.contactNumber}
                      />
                      <SummaryRow
                        label="Verified via"
                        value={
                          verifyChannel === "email"
                            ? "Email"
                            : "Text message (SMS)"
                        }
                      />
                      <SummaryRow label="Organization" value={organizationLabel} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please check that everything is correct. This will create your
                      account.
                    </p>
                  </div>
                </section>
              )}
            </CardContent>

            <div className="px-6 pb-6">
              {step < WIZARD_STEPS.length - 1 ? (
                <WizardNav
                  onBack={step > 0 ? () => setStep(step - 1) : undefined}
                  onNext={goNext}
                  nextLabel="Next"
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(STEP_PERSONAL)}
                  >
                    Edit
                  </Button>
                  <Button type="submit" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Confirm & Create Account"
                    )}
                  </Button>
                </div>
              )}
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
