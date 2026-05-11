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
import { MOCK_USERS } from "@/lib/data/admin-mock";
import { Plus, Search } from "lucide-react";

const ROLE_LABELS = {
  "coord-cc": "Program Coordinator – Cultural Center",
  "coord-sc": "Program Coordinator – Sports Complex",
  acct: "Accounting Clerk – Cultural Center",
  "provincial-agency": "Provincial Department Agency",
  client: "Client",
};

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
  const [users, setUsers] = React.useState(() => [...MOCK_USERS]);
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

  const handleSaveUser = () => {
    const fn = form.firstName.trim();
    const ln = form.lastName.trim();
    const un = form.username.trim();
    if (!fn || !ln) {
      toast.error("Enter first and last name.");
      return;
    }
    if (!un) {
      toast.error("Enter a username.");
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
    const roleLabel = ROLE_LABELS[form.role];
    const isClient =
      form.role === "provincial-agency" || form.role === "client";
    const newUser = {
      id: nextAccountId(users, form.role),
      accountType: isClient ? "client" : "staff",
      firstName: fn,
      middleName: form.middleName.trim() || undefined,
      lastName: ln,
      username: un.replace(/^@/, ""),
      email: form.email.trim() || undefined,
      phone: form.contact.trim() || undefined,
      role: roleLabel,
      status: "Active",
      verification: isClient ? "Pending" : null,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setUsers((prev) => [...prev, newUser]);
    resetForm();
    setAddOpen(false);
    toast.success("User added to the directory.");
  };

  const filtered = users.filter((u) => {
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            User management
          </h2>
          <p className="text-muted-foreground text-sm">
            Staff account records.
          </p>
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

      <Card>
        <CardHeader className="gap-3 space-y-0">
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            Search by name, role, or account ID.
          </CardDescription>
          <div className="relative max-w-md pt-2">
            <Search className="text-muted-foreground absolute top-2.5 left-2 size-4" />
            <Input
              className="pl-8"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account ID</TableHead>
                <TableHead>Name / Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs">{u.id}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {u.orgName ??
                          `${u.firstName} ${u.middleName ?? ""} ${u.lastName}`}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        @{u.username}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] text-sm">{u.role}</TableCell>
                  <TableCell>
                    {u.verification ? (
                      <Badge
                        variant={
                          u.verification === "Approved"
                            ? "default"
                            : u.verification === "Decline"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {u.verification}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === "Active" ? "outline" : "secondary"}>
                      {u.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
