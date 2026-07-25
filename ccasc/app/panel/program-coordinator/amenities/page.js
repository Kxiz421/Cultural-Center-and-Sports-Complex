"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Package, RefreshCw } from "lucide-react";

export default function CoordinatorAmenitiesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/particulars");
        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load amenities:", err);
          toast.error("Failed to load amenities");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  async function refreshAmenities() {
    try {
      const res = await fetch("/api/particulars");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to refresh amenities:", err);
      toast.error("Failed to refresh amenities");
    }
  }

  async function handleUpdateQuantity() {
    if (!editItem) return;
    const qty = parseInt(editQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/particulars", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          particularId: editItem.particularId || editItem.id,
          quantityAvailable: qty,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update");
      }
      toast.success("Quantity updated successfully");
      refreshAmenities();
      setEditOpen(false);
      setEditItem(null);
      setEditQuantity("");
    } catch (err) {
      toast.error(err.message || "Failed to update quantity");
    } finally {
      setSaving(false);
    }
  }

  const filtered = items.filter((item) => {
    const hay = [item.particularName, item.category, item.inventoryName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Amenities Management</h2>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Amenities Management</h2>
        <p className="text-muted-foreground text-sm">
          View and update amenity/particular quantities. All data is saved directly to the database.
        </p>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="space-y-2 flex-1">
          <Label>Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <Button variant="outline" onClick={refreshAmenities}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      </div>

      {/* Amenities List */}
      <Card>
        <CardHeader>
          <CardTitle>Cultural Center Amenities / Particulars</CardTitle>
          <CardDescription>
            {filtered.length} item(s) found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No amenities found.
              </p>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id || item.particularId}
                  className="flex flex-col gap-2 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="size-4 text-muted-foreground" />
                      <span className="font-medium">{item.particularName}</span>
                      {item.category && (
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {item.description || "No description"}
                      {item.inventoryName && ` · Linked to: ${item.inventoryName}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={item.totalQuantity > 0 ? "outline" : "secondary"}
                      className={
                        item.totalQuantity > 0
                          ? "text-green-600 border-green-300"
                          : "text-red-600"
                      }
                    >
                      {item.totalQuantity} available
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditItem(item);
                        setEditQuantity(String(item.totalQuantity));
                        setEditOpen(true);
                      }}
                    >
                      Update
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editOpen && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold">Update Quantity</h3>
              <div className="space-y-2">
                <Label>Item</Label>
                <p className="font-medium">{editItem.particularName}</p>
              </div>
              <div className="space-y-2">
                <Label>Current Quantity</Label>
                <p className="font-medium">{editItem.totalQuantity}</p>
              </div>
              <div className="space-y-2">
                <Label>New Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditOpen(false);
                    setEditItem(null);
                    setEditQuantity("");
                  }}
                >
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleUpdateQuantity} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}