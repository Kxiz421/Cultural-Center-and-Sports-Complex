"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ImageOff, Info } from "lucide-react";
import { formatPhp } from "@/lib/utils";

/**
 * Only real stored images render: Vercel Blob URLs, the local `/uploads/...`
 * fallback, or any absolute path. Legacy rows that hold a bare filename are
 * ignored so they do not show up as broken images.
 */
export function isDisplayableImage(value) {
  const v = String(value || "").trim();
  return v.startsWith("/") || /^https?:\/\//i.test(v);
}

/**
 * Shared facility row content: first image thumbnail (when present), a
 * clickable name and an info button. `e.preventDefault()/stopPropagation()`
 * keep the click from toggling the surrounding selection label.
 */
export function FacilityNameButton({ facility, onOpen }) {
  const open = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpen(facility);
  };

  const thumbnail = (facility?.images || []).find(isDisplayableImage);

  return (
    <>
      {thumbnail && (
        <img
          src={thumbnail}
          alt={facility.name}
          className="size-8 shrink-0 rounded object-cover"
        />
      )}
      <button
        type="button"
        className="min-w-0 flex-1 truncate text-left font-medium hover:underline"
        onClick={open}
        title="View facility details"
      >
        {facility.name}
      </button>
      <button
        type="button"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={open}
        title="View facility details"
      >
        <Info className="size-4" />
      </button>
    </>
  );
}

function statusClasses(status) {
  if (status === "Available") return "text-green-600 border-green-300";
  if (status === "Under Maintenance")
    return "text-yellow-600 border-yellow-300 bg-yellow-50";
  if (status === "Unavailable") return "text-red-600 border-red-300";
  return "text-muted-foreground border-border";
}

/**
 * Read-only facility details with its full image set. Shared by the reservation
 * flows so any user can open a facility and see its photos and rates.
 */
export function FacilityDetailsDialog({ facility, open, onOpenChange }) {
  const images = (facility?.images || []).filter(isDisplayableImage);
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    setIndex(0);
  }, [facility?.facilityId, open]);

  const count = images.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = count > 0 ? images[safeIndex] : null;
  const isSportsComplex = Number(facility?.venueId) === 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{facility?.name || "Facility"}</DialogTitle>
          <DialogDescription>{facility?.site || ""}</DialogDescription>
        </DialogHeader>

        {count > 0 ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg border bg-muted/20">
              <img
                src={current}
                alt={facility?.name || "Facility"}
                className="mx-auto max-h-[45vh] w-full object-contain"
              />
              {count > 1 && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={() =>
                      setIndex((i) => (i - 1 + count) % count)
                    }
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setIndex((i) => (i + 1) % count)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                    {safeIndex + 1}/{count}
                  </span>
                </>
              )}
            </div>

            {count > 1 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`size-16 overflow-hidden rounded-md border transition-all ${
                      i === safeIndex ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${facility?.name || "Facility"} ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
            <p className="text-sm">No images for this facility yet.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/30 p-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Venue</p>
            <p className="font-medium">{facility?.site || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Availability</p>
            <Badge variant="outline" className={statusClasses(facility?.availability)}>
              {facility?.availability || "Unknown"}
            </Badge>
          </div>
          {!isSportsComplex && (
            <div>
              <p className="text-xs text-muted-foreground">Day rate</p>
              <p className="font-medium tabular-nums">
                {formatPhp(facility?.rateDay || 0)}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">
              {isSportsComplex ? "Whole day rate" : "Night rate"}
            </p>
            <p className="font-medium tabular-nums">
              {formatPhp(
                (isSportsComplex ? facility?.rateDay : facility?.rateNight) || 0
              )}
            </p>
          </div>
          {!isSportsComplex && Number(facility?.capacity) > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="font-medium">{facility.capacity} pax</p>
            </div>
          )}
        </div>

        {facility?.description && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              About
            </p>
            <p className="text-sm whitespace-pre-wrap">{facility.description}</p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FacilityDetailsDialog;
