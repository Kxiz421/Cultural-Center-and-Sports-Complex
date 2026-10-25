"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { fetchBarangays, fetchCities, fetchProvinces } from "@/lib/ph-address";
import { Plus, Search, ChevronLeft, ChevronRight, Eye, EyeOff, Pencil, Archive, RotateCcw, FileText, ShieldCheck, User, Mail, Phone, Building2, Shield, CheckCircle2, XCircle, Camera, History } from "lucide-react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { FieldError } from "@/components/ui/field-error";

const ROLE_LABELS = {
  "coord-cc": "Program Coordinator – Cultural Center",
  "coord-sc": "Program Coordinator – Sports Complex",
  acct: "Accounting Clerk – Cultural Center",
  ltoo: "Local Treasury Operations Officer",
  "provincial-agency": "Provincial Department Agency",
  client: "Client",
};

const PAGE_SIZE = 5;

function nextAccountId(existing, roleValue) {
  const prefix =
    roleValue === "provincial-agency"
      ? "PUB"
      : roleValue === "client"
        ? "PRI"
        : "STF";
  let max = 0;
  for (const u of existing) {
    if (!u.id.startsWith(`${prefix}-`)) continue;
    const n = parseInt(u.id.slice(prefix.length + 1), 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return `${prefix}-${max + 1}`;
}

const GENDERS = ["Male", "Female", "Other"];

/**
 * Cascading Province -> City/Municipality -> Barangay dropdowns backed by the
 * public PSGC API. Reports the chosen NAMES upward through `onChange` so the
 * parent form only has to store plain strings.
 */
function AddressCascade({ value, onChange }) {
  const [provinces, setProvinces] = React.useState([]);
  const [cities, setCities] = React.useState([]);
  const [barangays, setBarangays] = React.useState([]);
  const [provinceCode, setProvinceCode] = React.useState("");
  const [cityCode, setCityCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetchProvinces().then((list) => {
      if (active) setProvinces(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const pickProvince = async (code) => {
    const province = provinces.find((p) => p.code === code);
    setProvinceCode(code);
    setCityCode("");
    setCities([]);
    setBarangays([]);
    onChange({ province: province?.name ?? "", city: "", barangay: "" });
    if (!code) return;
    setBusy(true);
    try {
      setCities(await fetchCities(code));
    } finally {
      setBusy(false);
    }
  };

  const pickCity = async (code) => {
    const city = cities.find((c) => c.code === code);
    setCityCode(code);
    setBarangays([]);
    onChange({ province: value.province, city: city?.name ?? "", barangay: "" });
    if (!code) return;
    setBusy(true);
    try {
      setBarangays(await fetchBarangays(code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="space-y-2">
        <Label>Province</Label>
        <Select value={provinceCode} onValueChange={pickProvince} disabled={busy}>
          <SelectTrigger>
            <SelectValue placeholder="Select province" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-60">
            {provinces.map((province) => (
              <SelectItem key={province.code} value={province.code}>
                {province.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>City / Municipality</Label>
        <Select
          value={cityCode}
          onValueChange={pickCity}
          disabled={!provinceCode || busy}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={provinceCode ? "Select city/municipality" : "Select province first"}
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
      </div>
      <div className="space-y-2">
        <Label>Barangay</Label>
        <Select
          value={value.barangay || ""}
          onValueChange={(name) =>
            onChange({ province: value.province, city: value.city, barangay: name })
          }
          disabled={!cityCode || busy}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={cityCode ? "Select barangay" : "Select city first"}
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
      </div>
    </div>
  );
}

export default function UserManagementPage() {
  const [query, setQuery] = React.useState("");
  const [users, setUsers] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [documents, setDocuments] = React.useState([]);
  const [docUser, setDocUser] = React.useState(null);
  const [docLoading, setDocLoading] = React.useState(false);
  const [docOpen, setDocOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [editForm, setEditForm] = React.useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
    gender: "",
    birthday: "",
    addressLine: "",
    province: "",
    city: "",
    barangay: "",
  });
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false);
  const [confirmUser, setConfirmUser] = React.useState(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = React.useState(false);
  const [currentUserId] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user_id") || "";
    } 
    return "";
  })    
  const [currentUserName] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user_name") || "";
    }
    return "";
  })
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [historyLogs, setHistoryLogs] = React.useState([]);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    async function fetchUsersWithRetry() {
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          const res = await fetch("/api/users");
          if (res.ok) {
            const data = await res.json();
            setUsers(Array.isArray(data) ? data : []);
            return;
          }
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
        }
        toast.error("Failed to load users");
      } catch (err) {
        console.error("Failed to load users:", err);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    }
    fetchUsersWithRetry();
  }, []);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: "",
    middleName: "",
    lastName: "",
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    contact: "",
    role: null,
    gender: "",
    birthday: "",
    addressLine: "",
    province: "",
    city: "",
    barangay: "",
  });
  const [errors, setErrors] = React.useState({});
  const [profileErrors, setProfileErrors] = React.useState({});

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

  const clearProfileError = (...names) =>
    setProfileErrors((prev) => {
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

  const resetForm = () => {
    setErrors({});
    setForm({
      firstName: "",
      middleName: "",
      lastName: "",
      username: "",
      password: "",
      confirmPassword: "",
      email: "",
      contact: "",
      role: null,
      gender: "",
      birthday: "",
      addressLine: "",
      province: "",
      city: "",
      barangay: "",
    });
  };

  const handleSaveUser = async () => {
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    const email = form.email.trim();

    const next = {};
    if (!fn) next.firstName = "First name is required.";
    if (!ln) next.lastName = "Last name is required.";
    if (!form.role) next.role = "Please select a role.";

    // Validate contact number if provided
    if (form.contact && form.contact.length !== 11) {
      next.contact = "Contact number must be exactly 11 digits.";
    }

    // Password is optional - a blank one issues the default "12345".
    if (form.password || form.confirmPassword) {
      if (form.password !== form.confirmPassword) {
        next.confirmPassword = "Passwords must match.";
      } else if (form.password.length < 8) {
        next.password = "Password must be at least 8 characters long.";
      } else if (!/[A-Z]/.test(form.password)) {
        next.password = "Password must contain at least one uppercase letter.";
      } else if (!/[a-z]/.test(form.password)) {
        next.password = "Password must contain at least one lowercase letter.";
      } else if (!/[0-9]/.test(form.password)) {
        next.password = "Password must contain at least one number.";
      } else if (!/[^A-Za-z0-9]/.test(form.password)) {
        next.password = "Password must contain at least one special character (e.g., @, #, $, etc.).";
      }
    }

    // Check for existing email
    const emailExists = users.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (!email) {
      next.email = "Email is required.";
    } else if (emailExists) {
      next.email = "A user with this email already exists.";
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: form.username.trim(),
          firstName: fn,
          middleName: form.middleName.trim(),
          lastName: ln,
          email: email,
          contact: form.contact.trim() || "N/A",
          password: form.password,
          performedBy: currentUserId,
          performedByName: currentUserName,
          gender: form.gender || null,
          birthday: form.birthday || null,
          addressLine: form.addressLine.trim() || null,
          province: form.province || null,
          city: form.city || null,
          barangay: form.barangay || null,
          roleType: form.role.includes('coord') || form.role === 'acct' || form.role === 'ltoo' ? 'staff' : 'client',
          roleId: form.role === 'coord-cc' ? 2 :
                 form.role === 'coord-sc' ? 2 :
                  form.role === 'acct' ? 3 :
                  form.role === 'ltoo' ? 4 :
                  form.role === 'provincial-agency' ? 'PROV' : 'PUB',
          orgId: form.role === 'coord-cc' ? 2 :
                 form.role === 'coord-sc' ? 1 :
                  form.role === 'acct' ? 3 :
                  form.role === 'ltoo' ? 3 : 1
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      toast.success("User created successfully");
      resetForm();
      setAddOpen(false);
      const refreshRes = await fetch('/api/users');
      const refreshedUsers = await refreshRes.json();
      setUsers(refreshedUsers);
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    }
  };

  const handleOpenProfile = (user) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName || "",
      middleName: user.middleName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      // Legacy rows may hold "N/A" or other free text - keep digits only.
      contact: String(user.contact || "").replace(/\D/g, "").slice(0, 11),
      password: "",
      confirmPassword: "",
      gender: user.gender || "",
      birthday: user.birthday ? String(user.birthday).slice(0, 10) : "",
      addressLine: user.addressLine || "",
      province: user.province || "",
      city: user.city || "",
      barangay: user.barangay || "",
    });
    setProfileErrors({});
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;

    const email = editForm.email.trim();
    // Legacy rows may hold "N/A" or other free text - keep digits only.
    const contact = String(editForm.contact || "").replace(/\D/g, "").slice(0, 11);

    const next = {};
    if (!email) {
      next.email = "Email is required.";
    }

    // Contact number is optional, but must be 11 digits when provided.
    if (contact && contact.length !== 11) {
      next.contact = "Contact number must be exactly 11 digits.";
    }

    // Email must stay unique across the other accounts.
    const emailTaken = users.some(
      (u) => u.id !== selectedUser.id && u.email?.toLowerCase() === email.toLowerCase()
    );
    if (email && emailTaken) {
      next.email = "A user with this email already exists.";
    }

    // Validate password if provided
    const password = editForm.password;
    const confirmPassword = editForm.confirmPassword;
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        next.confirmPassword = "Passwords must match.";
      } else if (password.length < 8) {
        next.password = "Password must be at least 8 characters long.";
      } else if (!/[A-Z]/.test(password)) {
        next.password = "Password must contain at least one uppercase letter.";
      } else if (!/[a-z]/.test(password)) {
        next.password = "Password must contain at least one lowercase letter.";
      } else if (!/[0-9]/.test(password)) {
        next.password = "Password must contain at least one number.";
      } else if (!/[^A-Za-z0-9]/.test(password)) {
        next.password = "Password must contain at least one special character (e.g., @, #, $, etc.).";
      }
    }

    if (Object.keys(next).length > 0) {
      setProfileErrors(next);
      return;
    }
    setProfileErrors({});

    setSaving(true);
    try {
      const body = {
        userId: selectedUser.id,
        email,
        contact,
        performedBy: currentUserId,
        performedByName: currentUserName,
        gender: editForm.gender || null,
        birthday: editForm.birthday || null,
        addressLine: editForm.addressLine.trim(),
        province: editForm.province.trim(),
        city: editForm.city.trim(),
        barangay: editForm.barangay.trim(),
      };
      if (password) {
        body.password = password;
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update user');
      }

      toast.success("Account details updated successfully");
      setSaveConfirmOpen(false);
      setProfileOpen(false);
      setSelectedUser(null);

      // Refresh the user list
      const refreshRes = await fetch('/api/users');
      const refreshedUsers = await refreshRes.json();
      setUsers(refreshedUsers);
    } catch (err) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "Active" ? "Deactivated" : "Active";
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: newStatus, performedBy: currentUserId, performedByName: currentUserName }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Account ${newStatus.toLowerCase()}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error("Failed to update account status");
    }
  };

  const handleConfirmToggleStatus = (user) => {
    setConfirmUser(user);
    setConfirmOpen(true);
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryLogs([]);
    try {
      const res = await fetch(`/api/audit-logs?scope=user`);
      if (!res.ok) throw new Error('Failed to fetch history');
      const data = await res.json();
      setHistoryLogs(data);
    } catch (err) {
      toast.error("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleViewDocuments = async (user) => {
    setDocUser(user);
    setDocOpen(true);
    setDocLoading(true);
    setDocuments([]);
    try {
      const res = await fetch(`/api/users/${user.id}/documents`);
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setDocLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;

    const hay = [
      u.id,
      u.firstName,
      u.middleName,
      u.lastName,
      u.role,
      u.organization,
      u.username,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  const handleSearchChange = (value) => {
    setQuery(value);
    setPage(1);
  };

  const handleRoleFilterChange = (value) => {
    setRoleFilter(value);
    setPage(1);
  };

  const ordered = [...filtered].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  const totalPages = Math.ceil(ordered.length / PAGE_SIZE);
  const paginatedUsers = ordered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const columnCount = 6;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            User management
          </h2>
        </div>
        <Button
          variant="outline"
          className="md:ml-auto"
          onClick={handleOpenHistory}
        >
          <History className="mr-2 size-4" />
          History
        </Button>
        <Dialog
          open={addOpen}
          onOpenChange={(open) => {
            setAddOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add user
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>Register account</DialogTitle>
              <DialogDescription>
                Details are saved to the database right away. Leave the password
                blank to issue the default password <strong>12345</strong>; the
                account must change it on first sign-in.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Account */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Account</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={form.role}
                      onValueChange={(value) => {
                        clearError("role");
                        setForm((f) => ({ ...f, role: value }));
                      }}
                    >
                      <SelectTrigger aria-invalid={Boolean(errors.role)}>
                        <SelectValue placeholder="Choose role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coord-cc">
                          Program Coordinator – Cultural Center
                        </SelectItem>
                        <SelectItem value="coord-sc">
                          Program Coordinator – Sports Complex
                        </SelectItem>
                        <SelectItem value="acct">
                          Accounting Clerk – Cultural Center
                        </SelectItem>
                        <SelectItem value="ltoo">
                          Local Treasury Operations Officer
                        </SelectItem>
                        <SelectItem value="provincial-agency">
                          Provincial Department Agency
                        </SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError>{errors.role}</FieldError>
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input
                      autoComplete="off"
                      placeholder="Optional"
                      value={form.username}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, username: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Personal information */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Personal information</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>First name</Label>
                    <Input
                      placeholder="Given name"
                      value={form.firstName}
                      onChange={(e) => {
                        clearError("firstName");
                        setForm((f) => ({
                          ...f,
                          firstName: e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                        }));
                      }}
                      aria-invalid={Boolean(errors.firstName)}
                    />
                    <FieldError>{errors.firstName}</FieldError>
                  </div>
                  <div className="space-y-2">
                    <Label>Middle name</Label>
                    <Input
                      placeholder="Optional"
                      value={form.middleName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, middleName: e.target.value.replace(/[^a-zA-Z\s]/g, "") }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last name</Label>
                    <Input
                      placeholder="Surname"
                      value={form.lastName}
                      onChange={(e) => {
                        clearError("lastName");
                        setForm((f) => ({
                          ...f,
                          lastName: e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                        }));
                      }}
                      aria-invalid={Boolean(errors.lastName)}
                    />
                    <FieldError>{errors.lastName}</FieldError>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={form.gender}
                      onValueChange={(value) =>
                        setForm((f) => ({ ...f, gender: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Birthday</Label>
                    <Input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={form.birthday}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, birthday: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Contact</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={(e) => {
                        clearError("email");
                        setForm((f) => ({ ...f, email: e.target.value }));
                      }}
                      aria-invalid={Boolean(errors.email)}
                    />
                    <FieldError>{errors.email}</FieldError>
                  </div>
                  <div className="space-y-2">
                    <Label>Contact number</Label>
                    <Input
                      placeholder="09123456789"
                      value={form.contact}
                      maxLength={11}
                      onChange={(e) => {
                        clearError("contact");
                        setForm((f) => ({
                          ...f,
                          contact: e.target.value.replace(/\D/g, "").slice(0, 11),
                        }));
                      }}
                      aria-invalid={Boolean(errors.contact)}
                    />
                    <FieldError>{errors.contact}</FieldError>
                  </div>
                </div>
              </section>

              {/* Address */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Address</h3>
                <div className="space-y-2">
                  <Label>Street address</Label>
                  <Input
                    placeholder="House No. / Street / Purok"
                    value={form.addressLine}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, addressLine: e.target.value }))
                    }
                  />
                </div>
                <AddressCascade
                  value={form}
                  onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                />
              </section>

              {/* Password */}
              <section className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Leave blank for the default 12345"
                        value={form.password}
                        onChange={(e) => {
                          clearError("password");
                          setForm((f) => ({ ...f, password: e.target.value }));
                        }}
                        className="pr-10"
                        aria-invalid={Boolean(errors.password)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? (
                          <Eye className="size-4" />
                        ) : (
                          <EyeOff className="size-4" />
                        )}
                      </Button>
                    </div>
                    <FieldError>{errors.password}</FieldError>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter the password"
                        value={form.confirmPassword}
                        onChange={(e) => {
                          clearError("confirmPassword");
                          setForm((f) => ({
                            ...f,
                            confirmPassword: e.target.value,
                          }));
                        }}
                        className="pr-10"
                        aria-invalid={Boolean(errors.confirmPassword)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        aria-pressed={showConfirmPassword}
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
                <p className="text-muted-foreground text-xs">
                  Leave blank to use the default password <strong>12345</strong> —
                  the account must set a new password on first sign-in.
                </p>
              </section>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setAddOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => {
                const fn = form.firstName.trim();
                const ln = form.lastName.trim();
                const next = {};
                if (!fn) next.firstName = "First name is required.";
                if (!ln) next.lastName = "Last name is required.";
                if (!form.email.trim()) next.email = "Email is required.";
                if (!form.role) next.role = "Please select a role.";
                // Password is optional: blank means the default 12345.
                if (form.password || form.confirmPassword) {
                  if (form.password !== form.confirmPassword) { next.confirmPassword = "Passwords must match."; }
                  else if (form.password.length < 8) { next.password = "Password must be at least 8 characters long."; }
                  else if (!/[A-Z]/.test(form.password)) { next.password = "Password must contain at least one uppercase letter."; }
                  else if (!/[a-z]/.test(form.password)) { next.password = "Password must contain at least one lowercase letter."; }
                  else if (!/[0-9]/.test(form.password)) { next.password = "Password must contain at least one number."; }
                  else if (!/[^A-Za-z0-9]/.test(form.password)) { next.password = "Password must contain at least one special character."; }
                }
                if (Object.keys(next).length > 0) { setErrors(next); return; }
                setErrors({});
                setConfirmSaveOpen(true);
              }}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Save Dialog */}
        <Dialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="size-5" />
                Confirm Save
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to create this account?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium text-right">{form.firstName} {form.middleName} {form.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium text-right">{form.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Username:</span>
                <span className="font-medium text-right">{form.username || "(auto-generated)"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role:</span>
                <span className="font-medium text-right">{ROLE_LABELS[form.role] || form.role}</span>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmSaveOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => { setConfirmSaveOpen(false); handleSaveUser(); }}>
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents Dialog */}
      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submitted Documents</DialogTitle>
            <DialogDescription>
              {docUser ? `${docUser.firstName} ${docUser.lastName} (${docUser.role})` : ""}
            </DialogDescription>
          </DialogHeader>
          {docLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No documents found for this user</div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex flex-col rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{doc.type}</span>
                      {doc.eventDate && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.eventDate).toLocaleDateString("en-US")}
                        </span>
                      )}
                      <Badge
                        variant={doc.status === "Verified" ? "outline" : "secondary"}
                        className={doc.status === "Verified" ? "text-green-600 border-green-300" : "text-yellow-600 border-yellow-300 bg-yellow-50"}
                      >
                        {doc.status}
                      </Badge>
                    </div>
                    {doc.remarks && (
                      <span className="text-xs text-muted-foreground">{doc.remarks}</span>
                    )}
                  </div>
                  {/* Display the image directly */}
                  <div className="relative w-full h-64 overflow-hidden rounded-md border bg-muted/20">
                    <img
                      src={doc.filePath}
                      alt={doc.type}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Status Change Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {confirmUser?.status === "Active" ? <Archive className="size-5 text-red-500" /> : <RotateCcw className="size-5 text-green-500" />}
              {confirmUser?.status === "Active" ? "Deactivate Account" : "Activate Account"}
            </DialogTitle>
            <DialogDescription>
              {confirmUser?.status === "Active"
                ? `Are you sure you want to deactivate ${confirmUser?.firstName} ${confirmUser?.lastName}? They will not be able to log in until reactivated.`
                : `Are you sure you want to reactivate ${confirmUser?.firstName} ${confirmUser?.lastName}? They will regain access to their account.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setConfirmUser(null); }}>
              Cancel
            </Button>
            <Button
              variant={confirmUser?.status === "Active" ? "destructive" : "default"}
              onClick={() => {
                if (confirmUser) handleToggleStatus(confirmUser);
                setConfirmOpen(false);
                setConfirmUser(null);
              }}
            >
              {confirmUser?.status === "Active" ? "Deactivate" : "Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={(open) => { setProfileOpen(open); if (!open) { setSelectedUser(null); setProfileErrors({}); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="size-5" />
              Account Details
            </DialogTitle>
            <DialogDescription>
              {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} — ${selectedUser.role}` : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-5 py-2">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="size-20">
                  {selectedUser.profilePhoto ? (
                    <AvatarImage src={selectedUser.profilePhoto} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                  ) : null}
                  <AvatarFallback className="text-2xl font-bold">
                    {(selectedUser.firstName?.[0] || "").toUpperCase()}{(selectedUser.lastName?.[0] || "").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p className="text-base font-semibold">{selectedUser.firstName} {selectedUser.middleName ?? ""} {selectedUser.lastName}</p>
                  <p className="text-muted-foreground text-xs">{selectedUser.email}</p>
                </div>
              </div>

              {/* Status badges row */}
              <div className="flex flex-wrap justify-center gap-2">
                <Badge
                  variant={selectedUser.status === "Active" ? "outline" : "secondary"}
                  className={selectedUser.status === "Active" ? "text-green-600 border-green-300" : "text-red-600"}
                >
                  {selectedUser.status === "Active" ? <CheckCircle2 className="size-3 mr-1" /> : <XCircle className="size-3 mr-1" />}
                  {selectedUser.status}
                </Badge>
              </div>

              {/* Account ID and Type */}
              <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Account ID</span>
                  <p className="font-medium">{selectedUser.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Account Type</span>
                  <p className="font-medium capitalize">{selectedUser.type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Role</span>
                  <p className="font-medium">{selectedUser.role}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Organization</span>
                  <p className="font-medium">{selectedUser.organization || "—"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">Account Created</span>
                  <p className="font-medium">{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
                </div>
              </div>

              {/* Editable fields */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Personal Information</h4>
                <p className="text-muted-foreground text-xs">
                  Name cannot be changed. Only the email, contact number, and password can be updated.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>First name</Label>
                    <Input className="bg-muted" readOnly value={editForm.firstName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Middle name</Label>
                    <Input className="bg-muted" readOnly value={editForm.middleName} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last name</Label>
                    <Input className="bg-muted" readOnly value={editForm.lastName} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-2.5 left-2 size-4" />
                    <Input
                      className="pl-8"
                      value={editForm.email}
                      onChange={(e) => {
                        clearProfileError("email");
                        setEditForm((f) => ({ ...f, email: e.target.value }));
                      }}
                      aria-invalid={Boolean(profileErrors.email)}
                    />
                  </div>
                  <FieldError>{profileErrors.email}</FieldError>
                </div>
                <div className="space-y-2">
                  <Label>Contact number</Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute top-2.5 left-2 size-4" />
                    <Input
                      className="pl-8"
                      value={editForm.contact}
                      maxLength={11}
                      onChange={(e) => {
                        clearProfileError("contact");
                        setEditForm((f) => ({
                          ...f,
                          contact: e.target.value.replace(/\D/g, "").slice(0, 11),
                        }));
                      }}
                      aria-invalid={Boolean(profileErrors.contact)}
                    />
                  </div>
                  <FieldError>{profileErrors.contact}</FieldError>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select
                      value={editForm.gender}
                      onValueChange={(value) =>
                        setEditForm((f) => ({ ...f, gender: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Birthday</Label>
                    <Input
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={editForm.birthday}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, birthday: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Street address</Label>
                  <Input
                    placeholder="House No. / Street / Purok"
                    value={editForm.addressLine}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, addressLine: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Province</Label>
                    <Input
                      value={editForm.province}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, province: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City / Municipality</Label>
                    <Input
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, city: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Barangay</Label>
                    <Input
                      value={editForm.barangay}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, barangay: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Password change section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Change Password (optional)</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>New password</Label>
                    <div className="relative">
                      <Input
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Leave blank to keep current"
                        value={editForm.password}
                        onChange={(e) => {
                          clearProfileError("password");
                          setEditForm((f) => ({ ...f, password: e.target.value }));
                        }}
                        className="pr-10"
                        aria-invalid={Boolean(profileErrors.password)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                        onClick={() => setShowNewPassword((v) => !v)}
                      >
                        {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                    <FieldError>{profileErrors.password}</FieldError>
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm new password</Label>
                    <div className="relative">
                      <Input
                        type={showConfirmNewPassword ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={editForm.confirmPassword}
                        onChange={(e) => {
                          clearProfileError("confirmPassword");
                          setEditForm((f) => ({ ...f, confirmPassword: e.target.value }));
                        }}
                        className="pr-10"
                        aria-invalid={Boolean(profileErrors.confirmPassword)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-1 z-10 my-auto size-8"
                        onClick={() => setShowConfirmNewPassword((v) => !v)}
                      >
                        {showConfirmNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                    </div>
                    <FieldError>{profileErrors.confirmPassword}</FieldError>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setProfileOpen(false); setSelectedUser(null); setProfileErrors({}); }}>
              Cancel
            </Button>
            <Button onClick={() => setSaveConfirmOpen(true)} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Save Profile Dialog */}
      <Dialog open={saveConfirmOpen} onOpenChange={setSaveConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="size-5" />
              Confirm Save
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to update {selectedUser?.firstName} {selectedUser?.lastName}&apos;s account details?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium text-right">{editForm.firstName} {editForm.middleName} {editForm.lastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium text-right">{editForm.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contact:</span>
              <span className="font-medium text-right">{editForm.contact}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSaveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-5" />
              Account History
            </DialogTitle>
            <DialogDescription>
              View all account status changes performed by admins
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading history...</div>
          ) : historyLogs.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No history records found for this user</div>
          ) : (
            <div className="space-y-3">
              {historyLogs.map((log) => (
                <div key={log.auditLogId} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="mt-0.5">
                    {log.action === "CREATED" && <User className="size-4 text-blue-500" />}
                    {log.action === "UPDATED" && <User className="size-4 text-blue-500" />}
                    {log.action === "DEACTIVATED" && <Archive className="size-4 text-red-500" />}
                    {log.action === "ACTIVATED" && <RotateCcw className="size-4 text-green-500" />}
                    {log.action === "VERIFIED" && <ShieldCheck className="size-4 text-green-600" />}
                    {log.action === "DECLINED" && <XCircle className="size-4 text-red-500" />}
                    {log.action === "VERIFICATION_UPDATED" && <Shield className="size-4 text-yellow-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={
                          log.action === "CREATED" ? "text-blue-600 border-blue-300" :
                          log.action === "UPDATED" ? "text-blue-600 border-blue-300" :
                          log.action === "DEACTIVATED" ? "text-red-600 border-red-300" :
                          log.action === "ACTIVATED" ? "text-green-600 border-green-300" :
                          log.action === "VERIFIED" ? "text-green-600 border-green-300" :
                          log.action === "DECLINED" ? "text-red-600 border-red-300" :
                          "text-yellow-600 border-yellow-300"
                        }
                      >
                        {log.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm mt-1">
                      <span className="text-muted-foreground">Target: </span>
                      <span className="font-medium">{log.targetName}</span>
                      <span className="text-muted-foreground"> ({log.targetUserId})</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span>By: </span>
                      <span className="font-medium">{log.performedByName}</span>
                      <span className="text-muted-foreground"> ({log.performedById})</span>
                    </p>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="gap-3 space-y-0">
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            Search by name, role, or account ID. Deactivate an account to
            archive it, and activate it to restore access.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                className="pl-8"
                placeholder="Search…"
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="w-[220px]">
              <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Program Coordinator">Program Coordinator</SelectItem>
                  <SelectItem value="Accounting Clerk">Accounting Clerk</SelectItem>
                  <SelectItem value="Local Treasury Operations Officer">Local Treasury Operations Officer</SelectItem>
                  <SelectItem value="Client">Client</SelectItem>
                  <SelectItem value="Provincial Government">Provincial Government</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} className="text-center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <button
                        className="flex items-center gap-3 text-left hover:underline"
                        onClick={() => handleOpenProfile(u)}
                      >
                        <Avatar className="size-9 shrink-0">
                          {u.profilePhoto ? (
                            <AvatarImage
                              src={u.profilePhoto}
                              alt={`${u.firstName} ${u.lastName}`}
                            />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {(u.firstName?.[0] ?? "").toUpperCase()}
                            {(u.lastName?.[0] ?? "").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {u.firstName} {u.middleName ?? ""} {u.lastName}
                          </span>
                          <span className="block text-muted-foreground text-xs">
                            {u.email}
                          </span>
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.username || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.organization || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm whitespace-normal">
                      {u.role}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.status === "Active" ? "outline" : "secondary"}
                        className={u.status === "Active" ? "" : "text-red-600"}
                      >
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenProfile(u)}
                          title="Update user details"
                        >
                          <Pencil className="size-4" />
                          Update
                        </Button>
                        {u.type === "client" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocuments(u)}
                            title="View submitted documents"
                          >
                            <FileText className="size-4" />
                          </Button>
                        )}
                        {u.id !== currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleConfirmToggleStatus(u)}
                            title={u.status === "Active" ? "Deactivate account" : "Activate account"}
                          >
                            {u.status === "Active" ? (
                              <Archive className="size-4" />
                            ) : (
                              <RotateCcw className="size-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-muted-foreground text-sm">
                Showing {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="min-w-9"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
