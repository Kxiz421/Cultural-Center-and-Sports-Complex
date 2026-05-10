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
import { MOCK_USERS } from "@/lib/data/admin-mock";
import { Plus, Search } from "lucide-react";

export default function UserManagementPage() {
  const [query, setQuery] = React.useState("");
  const filtered = MOCK_USERS.filter((u) => {
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
            Staff, provincial agencies (PUB), and private organizations (PRI) —
            example records only.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add user
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Register account</DialogTitle>
              <DialogDescription>
                Demo form — connects to your API for staff / agency / client
                onboarding.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input placeholder="Given name" />
                </div>
                <div className="space-y-2">
                  <Label>Middle name</Label>
                  <Input placeholder="Optional" />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input placeholder="Surname" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input autoComplete="off" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm password</Label>
                  <Input type="password" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" />
              </div>
              <div className="space-y-2">
                <Label>Contact number</Label>
                <Input placeholder="+63 …" />
              </div>
              <div className="space-y-2">
                <Label>Role / account type</Label>
                <Select>
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
                    <SelectItem value="agency">
                      Provincial department agency (PUB ID)
                    </SelectItem>
                    <SelectItem value="private">
                      Private organization (PRI ID)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline">
                Cancel
              </Button>
              <Button type="button">Save &amp; invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="gap-3 space-y-0">
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            Search by name, role, or account ID (PUB / PRI / STF prefix).
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

      <p className="text-muted-foreground text-xs">
        Row actions (view profile, edit staff contact &amp; role, approve ID /
        COE, deactivate) wire to your backend — buttons omitted here for brevity.
      </p>
    </div>
  );
}
