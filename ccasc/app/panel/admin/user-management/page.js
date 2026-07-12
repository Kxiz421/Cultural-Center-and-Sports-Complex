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
import { Plus, Search, ChevronLeft, ChevronRight, Eye, EyeOff, Archive, RotateCcw, FileText, ShieldCheck, ShieldX, User, Mail, Phone, Building2, Shield, CheckCircle2, XCircle, Camera, History } from "lucide-react";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

const ROLE_LABELS = {
  "coord-cc": "Program Coordinator – Cultural Center",
  "coord-sc": "Program Coordinator – Sports Complex",
  acct: "Accounting Clerk – Cultural Center",
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
  });
  const [saving, setSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false);
  const [confirmUser, setConfirmUser] = React.useState(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = React.useState(false);
  const [verifyConfirmOpen, setVerifyConfirmOpen] = React.useState(false);
  const [verifyConfirmUser, setVerifyConfirmUser] = React.useState(null);
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
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load users:", err);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
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
  });

  const resetForm = () => {
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
    });
  };

  const handleSaveUser = async () => {
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    const email = form.email.trim();

    if (!fn || !ln) {
      toast.error("First name and last name are required.");
      return;
    }
    if (!form.role) {
      toast.error("Please select a role.");
      return;
    }

    // Validate contact number if provided
    if (form.contact && form.contact.length !== 11) {
      toast.error("Contact number must be exactly 11 digits.");
      return;
    }

    if (!form.password || form.password !== form.confirmPassword) {
      toast.error("Passwords must match and cannot be empty.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    if (!/[A-Z]/.test(form.password)) {
      toast.error("Password must contain at least one uppercase letter.");
      return;
    }
    if (!/[a-z]/.test(form.password)) {
      toast.error("Password must contain at least one lowercase letter.");
      return;
    }
    if (!/[0-9]/.test(form.password)) {
      toast.error("Password must contain at least one number.");
      return;
    }
    if (!/[^A-Za-z0-9]/.test(form.password)) {
      toast.error("Password must contain at least one special character (e.g., @, #, $, etc.).");
      return;
    }

    // Check for existing email
    const emailExists = users.some(
      (u) => u.email?.toLowerCase() === form.email.trim().toLowerCase()
    );
    if (emailExists) {
      toast.error("A user with this email already exists.");
      return;
    }

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
          roleType: form.role.includes('coord') || form.role === 'acct' ? 'staff' : 'client',
          roleId: form.role === 'coord-cc' ? 2 :
                 form.role === 'coord-sc' ? 2 :
                 form.role === 'acct' ? 3 :
                 form.role === 'provincial-agency' ? 'PROV' : 'PUB',
          orgId: form.role === 'coord-cc' ? 2 :
                 form.role === 'coord-sc' ? 1 :
                 form.role === 'acct' ? 3 : 1
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
      contact: user.contact || "",
    });
    setProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedUser) return;

    const fn = editForm.firstName.trim();
    const ln = editForm.lastName.trim();
    const email = editForm.email.trim();

    if (!fn || !ln) {
      toast.error("First and last name are required.");
      return;
    }
    if (!email) {
      toast.error("Email is required.");
      return;
    }

    // Validate contact number if provided
    if (editForm.contact && editForm.contact.length !== 11) {
      toast.error("Contact number must be exactly 11 digits.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          firstName: fn,
          middleName: editForm.middleName,
          lastName: ln,
          email,
          contact: editForm.contact,
          performedBy: currentUserId,
          performedByName: currentUserName,
        }),
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

  const handleConfirmToggleVerification = (user) => {
    setVerifyConfirmUser(user);
    setVerifyConfirmOpen(true);
  };

  const handleToggleVerification = async (user) => {
    const newStatus = user.verificationStatus === "Verified" ? "Pending" : "Verified";
    try {
      const res = await fetch('/api/users/verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, verificationStatus: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update verification status');
      toast.success(`Verification status set to ${newStatus}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, verificationStatus: newStatus } : u))
      );
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => ({ ...prev, verificationStatus: newStatus }));
      }
    } catch (err) {
      toast.error("Failed to update verification status");
    }
  };

  const [declineConfirmOpen, setDeclineConfirmOpen] = React.useState(false);
  const [declineConfirmUser, setDeclineConfirmUser] = React.useState(null);
  const [resubmitConfirmOpen, setResubmitConfirmOpen] = React.useState(false);
  const [resubmitConfirmUser, setResubmitConfirmUser] = React.useState(null);

  const handleDeclineDocument = (user) => {
    setDeclineConfirmUser(user);
    setDeclineConfirmOpen(true);
  };

  const handleRequestResubmission = (user) => {
    setResubmitConfirmUser(user);
    setResubmitConfirmOpen(true);
  };

  const handleConfirmDecline = async () => {
    if (!declineConfirmUser) return;
    await handleToggleVerificationStatus(declineConfirmUser, "Declined");
    setDeclineConfirmOpen(false);
    setDeclineConfirmUser(null);
    setDocOpen(false);
  };

  const handleConfirmResubmission = async () => {
    if (!resubmitConfirmUser) return;
    await handleToggleVerificationStatus(resubmitConfirmUser, "Declined");
    setResubmitConfirmOpen(false);
    setResubmitConfirmUser(null);
    setDocOpen(false);
  };

  const handleToggleVerificationStatus = async (user, newStatus) => {
    try {
      const res = await fetch('/api/users/verification', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, verificationStatus: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update verification status');
      toast.success(`Verification status set to ${newStatus}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, verificationStatus: newStatus } : u))
      );
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => ({ ...prev, verificationStatus: newStatus }));
      }
    } catch (err) {
      toast.error("Failed to update verification status");
    }
  };

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryLogs([]);
    try {
      const res = await fetch(`/api/audit-logs`);
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedUsers = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            User management
          </h2>
        </div>
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
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Register account</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input
                    placeholder="Given name"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Middle name</Label>
                  <Input
                    placeholder="Optional"
                    value={form.middleName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, middleName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input
                    placeholder="Surname"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  autoComplete="off"
                  value={form.username}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, username: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, password: e.target.value }))
                      }
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
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
                </div>
                <div className="space-y-2">
                  <Label>Confirm password</Label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
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
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Contact number</Label>
                <Input
                  placeholder="09123456789"
                  value={form.contact}
                  maxLength={11}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact: e.target.value.replace(/\D/g, "").slice(0, 11) }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm((f) => ({ ...f, role: value }))
                  }
                >
                  <SelectTrigger>
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
                    <SelectItem value="provincial-agency">
                      Provincial Department Agency
                    </SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                if (!fn || !ln) { toast.error("First name and last name are required."); return; }
                if (!form.role) { toast.error("Please select a role."); return; }
                if (!form.password || form.password !== form.confirmPassword) { toast.error("Passwords must match and cannot be empty."); return; }
                if (form.password.length < 8) { toast.error("Password must be at least 8 characters long."); return; }
                if (!/[A-Z]/.test(form.password)) { toast.error("Password must contain at least one uppercase letter."); return; }
                if (!/[a-z]/.test(form.password)) { toast.error("Password must contain at least one lowercase letter."); return; }
                if (!/[0-9]/.test(form.password)) { toast.error("Password must contain at least one number."); return; }
                if (!/[^A-Za-z0-9]/.test(form.password)) { toast.error("Password must contain at least one special character."); return; }
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
                  {/* Action buttons for idProof documents */}
                  {doc.id === 0 && docUser && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleDeclineDocument(docUser)}
                      >
                        Decline
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        onClick={() => handleRequestResubmission(docUser)}
                      >
                        Request Resubmission
                      </Button>
                    </div>
                  )}
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

      {/* Confirm Verification Dialog */}
      <Dialog open={verifyConfirmOpen} onOpenChange={setVerifyConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="size-5" />
              {verifyConfirmUser?.verificationStatus === "Verified" ? "Set as Pending" : "Set as Verified"}
            </DialogTitle>
            <DialogDescription>
              {verifyConfirmUser?.verificationStatus === "Verified"
                ? `Are you sure you want to set ${verifyConfirmUser?.firstName} ${verifyConfirmUser?.lastName}'s verification back to Pending? They will not be able to log in until verified again.`
                : `Are you sure you want to verify ${verifyConfirmUser?.firstName} ${verifyConfirmUser?.lastName}? They will be able to log in once verified.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setVerifyConfirmOpen(false); setVerifyConfirmUser(null); }}>
              Cancel
            </Button>
            <Button
              variant={verifyConfirmUser?.verificationStatus === "Verified" ? "destructive" : "default"}
              onClick={() => {
                if (verifyConfirmUser) handleToggleVerification(verifyConfirmUser);
                setVerifyConfirmOpen(false);
                setVerifyConfirmUser(null);
              }}
            >
              {verifyConfirmUser?.verificationStatus === "Verified" ? "Set as Pending" : "Set as Verified"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Decline Document Dialog */}
      <Dialog open={declineConfirmOpen} onOpenChange={setDeclineConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="size-5 text-red-500" />
              Decline Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to decline {declineConfirmUser?.firstName} {declineConfirmUser?.lastName}'s Certificate of Employment?
              Their account will be marked as declined.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeclineConfirmOpen(false); setDeclineConfirmUser(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDecline}>
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Request Resubmission Dialog */}
      <Dialog open={resubmitConfirmOpen} onOpenChange={setResubmitConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-orange-500" />
              Request Resubmission
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to request {resubmitConfirmUser?.firstName} {resubmitConfirmUser?.lastName} to resubmit their Certificate of Employment?
              They will be prompted to upload a new document when they try to log in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setResubmitConfirmOpen(false); setResubmitConfirmUser(null); }}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleConfirmResubmission}
            >
              Request Resubmission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={(open) => { setProfileOpen(open); if (!open) setSelectedUser(null); }}>
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
                {selectedUser.type === "client" && (
                  <Badge
                    variant={selectedUser.verificationStatus === "Verified" ? "outline" : "secondary"}
                    className={
                      selectedUser.verificationStatus === "Verified"
                        ? "text-green-600 border-green-300"
                        : "text-yellow-600 border-yellow-300 bg-yellow-50"
                    }
                  >
                    <Shield className="size-3 mr-1" />
                    {selectedUser.verificationStatus || "Pending"}
                  </Badge>
                )}
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
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>First name</Label>
                    <Input
                      value={editForm.firstName}
                      onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Middle name</Label>
                    <Input
                      value={editForm.middleName}
                      onChange={(e) => setEditForm((f) => ({ ...f, middleName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last name</Label>
                    <Input
                      value={editForm.lastName}
                      onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="text-muted-foreground absolute top-2.5 left-2 size-4" />
                    <Input
                      className="pl-8"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact number</Label>
                  <div className="relative">
                    <Phone className="text-muted-foreground absolute top-2.5 left-2 size-4" />
                    <Input
                      className="pl-8"
                      value={editForm.contact}
                      maxLength={11}
                      onChange={(e) => setEditForm((f) => ({ ...f, contact: e.target.value.replace(/\D/g, "").slice(0, 11) }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setProfileOpen(false); setSelectedUser(null); }}>
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
              Are you sure you want to update {selectedUser?.firstName} {selectedUser?.lastName}'s account details?
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
            Search by name, role, or account ID. Click a name to view and edit account details.
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
                <TableHead>Verification</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <button
                        className="flex flex-col text-left hover:underline"
                        onClick={() => handleOpenProfile(u)}
                      >
                        <span className="font-medium">
                          {u.firstName} {u.middleName ?? ""} {u.lastName}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {u.email}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.username || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.organization || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm">
                      {u.role}
                    </TableCell>
                    <TableCell>
                      {u.type === "client" ? (
                        <Badge
                          variant={u.verificationStatus === "Verified" ? "outline" : "secondary"}
                          className={
                            u.verificationStatus === "Verified"
                              ? "text-green-600 border-green-300"
                              : "text-yellow-600 border-yellow-300 bg-yellow-50"
                          }
                        >
                          {u.verificationStatus || "Pending"}
                        </Badge>
                      ) : u.role === "Provincial Government" ? (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Verified
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
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
                        {u.type === "client" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocuments(u)}
                              title="View submitted documents"
                            >
                              <FileText className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirmToggleVerification(u)}
                              title={u.verificationStatus === "Verified" ? "Set as Pending" : "Set as Verified"}
                            >
                              {u.verificationStatus === "Verified" ? (
                                <ShieldCheck className="size-4 text-green-600" />
                              ) : (
                                <ShieldX className="size-4 text-yellow-600" />
                              )}
                            </Button>
                          </>
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

      {/* History Button - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleOpenHistory}
          className="shadow-lg"
          size="lg"
        >
          <History className="mr-2 size-5" />
          History
        </Button>
      </div>
    </div>
  );
}
