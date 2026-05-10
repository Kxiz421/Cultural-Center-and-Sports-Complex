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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MOCK_ANNOUNCEMENTS } from "@/lib/data/admin-mock";
import { Megaphone } from "lucide-react";

export default function AnnouncementsPage() {
  const [items, setItems] = React.useState(MOCK_ANNOUNCEMENTS);

  const archive = (id) => {
    setItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, archived: true } : a))
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Announcements
          </h2>
          <p className="text-muted-foreground text-sm">
            Broadcast notices to clients & internal roles — demo history below.
          </p>
        </div>
        <Dialog>
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
                Stored to announcement history for auditing (demo form).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="Short headline" />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea rows={4} placeholder="Full notice body…" />
              </div>
              <div className="space-y-2">
                <Label>Recipients</Label>
                <div className="grid gap-2">
                  {["Clients", "Program Coordinators", "Accounting Clerk"].map(
                    (r) => (
                      <label
                        key={r}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <Checkbox />
                        {r}
                      </label>
                    )
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button">Post announcement</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>
            Archive rows to hide them from active feeds while retaining recovery
            (demo toggle).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posted</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(a.postedAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-muted-foreground max-w-md text-xs">
                      {a.body}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.recipients.join(", ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.archived ? "secondary" : "outline"}>
                      {a.archived ? "Archived" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!a.archived ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => archive(a.id)}
                      >
                        Archive
                      </Button>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
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
