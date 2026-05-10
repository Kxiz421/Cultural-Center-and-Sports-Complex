"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { MOCK_PARTICULARS } from "@/lib/data/admin-mock";
import { Plus } from "lucide-react";

export default function ParticularsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Particulars management
          </h2>
          <p className="text-muted-foreground text-sm">
            Rentable equipment inventory — quantities & allocation snapshot (demo).
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Add item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New equipment item</DialogTitle>
              <DialogDescription>
                Stored particulars feed packages & booking line-items later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input placeholder='e.g. "Chiavari chair — gold"' />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={2} placeholder="Material, dimensions…" />
              </div>
              <div className="space-y-2">
                <Label>Quantity on hand</Label>
                <Input type="number" min={0} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button">Save item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>
            Archive by marking rows Unavailable when assets are damaged or under
            repair.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Total qty</TableHead>
                <TableHead className="text-right">Allocated</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_PARTICULARS.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-muted-foreground max-w-xs text-xs">
                      {p.description}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.quantityTotal}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.quantityAllocated}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.quantityTotal - p.quantityAllocated}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.status === "Available" ? "outline" : "secondary"
                      }
                    >
                      {p.status}
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
