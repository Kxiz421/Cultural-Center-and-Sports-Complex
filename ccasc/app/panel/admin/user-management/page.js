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
import { Plus, Search, ChevronLeft, ChevronRight, Eye, Archive, RotateCcw, FileText } from "lucide-react";

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
  const router = useRouter();

  React.useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
        toast.error("Failed to load users");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);
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
    role: "",
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
      role: "",
    });
  };

  const handleSaveUser = async () => {
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    const email = form.email.trim();

    if (!fn || !ln) {
      toast.error("Enter first and last name.");
      return;
    }
    if (!email) {
      toast.error("Enter a valid email.");
      return;
    }
    if (!form.role) {
      toast.error("Choose a role.");
      return;
    }
    if (!form.password || form.password !== form.confirmPassword) {
      toast.error("Passwords must match and cannot be empty.");
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: fn,
          middleName: form.middleName.trim(),
          lastName: ln,
          email: email,
          contact: form.contact.trim(),
          password: form.password,
          roleType: form.role.includes('coord') || form.role === 'acct' ? 'staff' : 'client',
          roleId: form.role === 'coord-cc' ? 3 :
                 form.role === 'coord-sc' ? 3 :
                 form.role === 'acct' ? 2 :
                 form.role === 'provincial-agency' ? 'PROV' : 'PUB',
          orgId: form.role === 'coord-cc' ? 1 :
                form.role === 'coord-sc' ? 3 :
                form.role === 'acct' ? 2 : 1
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create user');
      }

      toast.success("User created successfully");
      resetForm();
      setAddOpen(false);
      // Re-fetch users to include the newly created one in the list
      const refreshRes = await fetch('/api/users');
      const refreshedUsers = await refreshRes.json();
      setUsers(refreshedUsers);
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user");
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === "Active" ? "Deactivated" : "Active";
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(`Account ${newStatus.toLowerCase()}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      toast.error("Failed to update account status");
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
    // Role filter
    if (roleFilter !== "all" && u.role !== roleFilter) return false;

    // Search query
    const hay = [
      u.id,
      u.firstName,
      u.middleName,
      u.lastName,
      u.role,
      u.orgName,
      u.username,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  // Reset to page 1 when search or role filter changes
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
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, password: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        confirmPassword: e.target.value,
                      }))
                    }
                  />
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
                  placeholder="+63 …"
                  value={form.contact}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contact: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={form.role || undefined}
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
              <Button type="button" onClick={handleSaveUser}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documentsth Dialog */}
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
                <div key={doc.id} className="flex items-start justify-between rounded-lg border p-3">
                  <div className="space-y-1">
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
                    <p className="text-xs text-muted-foreground">
                      Event: {doc.eventType}
                    </p>
                    {doc.remarks && (
                      <p className="text-xs text-muted-foreground">{doc.remarks}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    <div>{doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString() : ""}</div>
                    <Button variant="outline" size="sm" className="mt-1" asChild>
                      <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
                        <Eye className="mr-1 size-3" /> View
                      </a>
                    </Button>
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
            Search by name, role, or account ID.
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
                  <TableCell colSpan={6} className="text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {u.firstName} {u.middleName ?? ""} {u.lastName}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {u.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.organization || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm">
                      {u.role}
                    </TableCell>
                    <TableCell>
                      {u.type === "client" || u.role === "Provincial Government" ? (
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocuments(u)}
                            title="View submitted documents"
                          >
                            <FileText className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(u)}
                          title={u.status === "Active" ? "Deactivate account" : "Activate account"}
                        >
                          {u.status === "Active" ? (
                            <Archive className="size-4" />
                          ) : (
                            <RotateCcw className="size-4" />
                          )}
                        </Button>
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
