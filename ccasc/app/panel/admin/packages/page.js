"use client";

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
import { MOCK_PACKAGES, MOCK_PARTICULARS, formatPhp } from "@/lib/data/admin-mock";
import { Plus } from "lucide-react";

export default function PackagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Packages management
          </h2>
          <p className="text-muted-foreground text-sm">
            Bundle particulars into priced offerings for clients (demo catalog).
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add package
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>New package</DialogTitle>
              <DialogDescription>
                Choose amenity line-items stored as particulars.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label>Package name</Label>
                <Input />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Price (PHP)</Label>
                <Input type="number" min={0} />
              </div>
              <div className="space-y-2">
                <Label>Inclusions</Label>
                <div className="grid gap-2 rounded-lg border p-3">
                  {MOCK_PARTICULARS.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-start gap-2 text-sm"
                    >
                      <Checkbox className="mt-0.5" />
                      <span>
                        <span className="font-medium">{p.name}</span>
                        <span className="text-muted-foreground block text-xs">
                          {p.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button">Save package</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalog</CardTitle>
          <CardDescription>
            Archive outdated bundles instead of deleting historical invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Package</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Inclusions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_PACKAGES.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-mono text-xs">{pkg.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{pkg.name}</div>
                    <div className="text-muted-foreground max-w-md text-xs">
                      {pkg.description}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPhp(pkg.price)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={pkg.status === "Active" ? "default" : "secondary"}
                    >
                      {pkg.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <ul className="list-inside list-disc">
                      {pkg.inclusions.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
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
