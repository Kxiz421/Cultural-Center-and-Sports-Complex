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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  Loader2,
  Megaphone,
  Search,
  Users,
} from "lucide-react";

const AUDIENCE_MODES = [
  { id: "all", label: "All users" },
  { id: "roles", label: "By role" },
  { id: "individual", label: "Search an individual" },
];

function userKey(user) {
  return `${user.type}-${user.dbId}`;
}

export default function AnnouncementsPage() {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState("");
  const [roles, setRoles] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [posting, setPosting] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [mode, setMode] = React.useState("roles");
  const [selectedRoles, setSelectedRoles] = React.useState([]);
  const [selectedUsers, setSelectedUsers] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [directory, setDirectory] = React.useState([]);
  const [directoryLoading, setDirectoryLoading] = React.useState(false);
  const [archivingId, setArchivingId] = React.useState(null);

  const loadAnnouncements = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/announcements");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load history");
      setItems(Array.isArray(data) ? data : []);
      setLoadError("");
    } catch (err) {
      console.error(err);
      setLoadError(err.message || "Failed to load announcement history.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  // Audience picker needs the live recipient groups with their head-counts.
  React.useEffect(() => {
    if (!open || roles.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/announcements/recipients");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load recipients");
        if (!cancelled) setRoles(Array.isArray(data.roles) ? data.roles : []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load recipient groups.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, roles.length]);

  // Individual search uses the admin-only account directory.
  React.useEffect(() => {
    if (!open || mode !== "individual" || directory.length > 0) return;
    let cancelled = false;
    setDirectoryLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load accounts");
        if (!cancelled) setDirectory(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load accounts for search.");
      } finally {
        if (!cancelled) setDirectoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, mode, directory.length]);

  const allRoleIds = roles.map((role) => role.id);
const activeAudienceCount = React.useMemo(() => {
    if (mode === "all") {
      return roles.reduce((sum, role) => sum + role.count, 0);
    }
    if (mode === "roles") {
      return roles
        .filter((role) => selectedRoles.includes(role.id))
        .reduce((sum, role) => sum + role.count, 0);
    }
    return selectedUsers.length;
  }, [mode, roles, selectedRoles, selectedUsers]);

  const directoryResults = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    const candidates = directory.filter(
      (user) => user.status === "Active" && user.type !== "admin"
    );
    if (!term) return candidates.slice(0, 20);
    return candidates
      .filter(
        (user) =>
          user.email?.toLowerCase().includes(term) ||
          `${user.firstName ?? ""} ${user.lastName ?? ""}`
            .toLowerCase()
            .includes(term) ||
          user.username?.toLowerCase().includes(term)
      )
      .slice(0, 20);
  }, [directory, query]);

  const toggleRole = (roleId) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const toggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.some((entry) => userKey(entry) === userKey(user))
        ? prev.filter((entry) => userKey(entry) !== userKey(user))
        : [...prev, user]
    );
  };

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setMode("roles");
    setSelectedRoles([]);
    setSelectedUsers([]);
    setQuery("");
  };

  const canPost =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    (mode === "all" ||
      (mode === "roles" && selectedRoles.length > 0) ||
      (mode === "individual" && selectedUsers.length > 0));

  const postAnnouncement = async () => {
    if (!canPost || posting) return;
    setPosting(true);

    const payload = { title: title.trim(), message: message.trim() };
    if (mode === "all") {
      payload.roles = allRoleIds;
    } else if (mode === "roles") {
      payload.roles = selectedRoles;
    } else {
      payload.clientIds = selectedUsers
        .filter((user) => user.type === "client")
        .map((user) => user.dbId);
      payload.staffIds = selectedUsers
        .filter((user) => user.type === "staff")
        .map((user) => user.dbId);
    }

    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post announcement");

      toast.success(
        `Announcement delivered to ${data.notified} recipient${
          data.notified === 1 ? "" : "s"
        } (${data.recipientType}).`
      );
      resetForm();
      setOpen(false);
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to post announcement");
    } finally {
      setPosting(false);
    }
  };

  const setArchived = async (announcement, archive) => {
    setArchivingId(announcement.id);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcementId: announcement.id,
          action: archive ? "archive" : "restore",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success(
        archive
          ? "Announcement archived."
          : "Announcement restored to the active feed."
      );
      await loadAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to update announcement");
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Announcements
          </h2>
          <p className="text-muted-foreground text-sm">
            Broadcast notices to clients and internal roles — every recipient is
            notified in their panel inbox and marked as an announcement.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Megaphone className="mr-2 size-4" />
              New announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create announcement</DialogTitle>
              <DialogDescription>
                Delivered as a notification to every selected recipient and kept
                in the history below for auditing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Short headline"
                  value={title}
                  maxLength={255}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={4}
                  placeholder="Full notice body…"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose an audience" />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_MODES.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === "all" && (
                <div className="bg-muted/40 rounded-md border p-3 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <Users className="size-4" />
                    Everyone with an account
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Clients, provincial agencies, program coordinators, accounting
                    clerks and treasury officers will all be notified.
                  </p>
                </div>
              )}

              {mode === "roles" && (
                <div className="grid gap-2">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <span className="flex-1">{role.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {role.count} recipient{role.count === 1 ? "" : "s"}
                      </span>
                    </label>
                  ))}
                  {roles.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      Loading recipient groups…
                    </p>
                  )}
                </div>
              )}

              {mode === "individual" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                      <Input
                        className="pl-8"
                        placeholder="Search a client or staff account…"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                      />
                    </div>
                    {directoryLoading && (
                      <Loader2 className="text-muted-foreground size-4 animate-spin" />
                    )}
                  </div>

                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUsers.map((user) => (
                        <Badge key={userKey(user)} variant="secondary">
                          {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                            user.username}
                          {user.role ? ` · ${user.role}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
                    {directoryResults.length === 0 ? (
                      <p className="text-muted-foreground py-3 text-center text-sm">
                        {directoryLoading
                          ? "Loading accounts…"
                          : "No active accounts matched."}
                      </p>
                    ) : (
                      directoryResults.map((user) => {
                        const checked = selectedUsers.some(
                          (entry) => userKey(entry) === userKey(user)
                        );
                        return (
                          <label
                            key={userKey(user)}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleUser(user)}
                            />
                            <span className="flex-1">
                              {`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()}
                              <span className="text-muted-foreground block text-xs">
                                {user.email}
                              </span>
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {user.role}
                            </Badge>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <p className="text-muted-foreground text-xs">
                {activeAudienceCount > 0
                  ? `${activeAudienceCount} recipient${
                      activeAudienceCount === 1 ? "" : "s"
                    } will be notified.`
                  : "Select at least one recipient."}
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={postAnnouncement}
                disabled={posting || !canPost}
              >
                {posting && <Loader2 className="mr-2 size-4 animate-spin" />}
                <CheckCircle2 className="mr-2 size-4" />
                Post announcement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>
            Every announcement sent, with how many accounts were notified. Archive
            rows to retire them from the record while keeping them recoverable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              Loading announcement history…
            </div>
          ) : loadError ? (
            <div className="text-destructive py-8 text-center text-sm">
              {loadError}
            </div>
          ) : items.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No announcements posted yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Posted</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Notified</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(announcement.postedAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div
                        className="max-w-md truncate font-medium"
                        title={announcement.title}
                      >
                        {announcement.title}
                      </div>
                      <div className="text-muted-foreground line-clamp-2 max-w-md text-xs">
                        {announcement.content}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {announcement.recipientType}
                    </TableCell>
                    <TableCell className="text-sm">
                      {announcement.notified}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={announcement.archived ? "secondary" : "outline"}
                      >
                        {announcement.archived ? "Archived" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={archivingId === announcement.id}
                        onClick={() =>
                          setArchived(announcement, !announcement.archived)
                        }
                      >
                        {archivingId === announcement.id ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : announcement.archived ? (
                          <ArchiveRestore className="mr-2 size-4" />
                        ) : (
                          <Archive className="mr-2 size-4" />
                        )}
                        {announcement.archived ? "Restore" : "Archive"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
