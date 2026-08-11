"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, XCircle, Clock, Upload, Image as ImageIcon, Calendar } from "lucide-react";
import { toast } from "sonner";

const DOCUMENT_TYPES = [
  { id: "1", name: "Billing Statement", target: "LTOO" },
  { id: "2", name: "Contract of Lease", target: "Program Coordinator" },
  { id: "3", name: "Certification", target: "Program Coordinator" },
  { id: "5", name: "Official Receipt", target: "LTOO" },
];

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = React.useState([]);
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState("");
  const [docType, setDocType] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [bookings, setBookings] = React.useState([]);
  const [selectedBookingId, setSelectedBookingId] = React.useState("");

  // Fetch user's bookings (reservations with LTOO payments recorded)
  React.useEffect(() => {
    async function fetchBookings() {
      try {
        const userId = localStorage.getItem("user_id");
        if (!userId) return;
        // Strip "CLT-" prefix from user_id if present
        const cleanId = (userId || "").replace("CLT-", "");
        const res = await fetch(`/api/ltoo/payments?bookings=true`);
        const data = await res.json();
        // Filter to only show bookings that have been recorded by LTOO (hasBooking: true)
        // and match the current client
        const parsedClientId = parseInt(cleanId, 10);
        const userBookings = Array.isArray(data)
          ? data.filter((b) => b.hasBooking && b.clientId === parsedClientId)
          : [];
        setBookings(userBookings);
      } catch (err) {
        console.error("Failed to load bookings:", err);
      }
    }
    fetchBookings();
  }, []);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size too large. Maximum is 5MB.");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !docType) {
      toast.error("Please select an image and document type");
      return;
    }
    if (!selectedBookingId) {
      toast.error("Please select a booking to link this document");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("documentTypeId", docType);
      formData.append("file", file);
      formData.append("reservationId", selectedBookingId);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit document");
      }

      toast.success("Document uploaded successfully!");
      setFile(null);
      setPreview("");
      setDocType("");
      setSelectedBookingId("");
      const refreshRes = await fetch('/api/documents');
      const refreshData = await refreshRes.json();
      setDocuments(refreshData || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === "Verified") return <CheckCircle className="size-4 text-green-600" />;
    if (status === "Declined") return <XCircle className="size-4 text-red-600" />;
    return <Clock className="size-4 text-yellow-600" />;
  };

  React.useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch('/api/documents');
        const data = await res.json();
        setDocuments(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Documents</h2>
        <p className="text-muted-foreground text-sm">
          Upload and track required documents for your bookings. Documents are routed to the appropriate officer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload billing statements, receipts, Contracts of Lease, or certifications as images.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="doc-type">Document Type</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger id="doc-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((dt) => (
                      <SelectItem key={dt.id} value={dt.id}>
                        {dt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {docType && (
                  <p className="text-xs text-muted-foreground">
                    Will be sent to: {DOCUMENT_TYPES.find(dt => dt.id === docType)?.target}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload Image</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Booking Selector - Required */}
            <div className="space-y-2">
              <Label htmlFor="booking-select">
                Link to Booking <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                <SelectTrigger id="booking-select">
                  <SelectValue placeholder="Select a booking to link this document" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.length === 0 && (
                    <SelectItem value="no-bookings" disabled>
                      No bookings found
                    </SelectItem>
                  )}
                  {bookings.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.venue} - {b.eventDate} ({b.eventType})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBookingId && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" />
                  Document will be linked to this booking
                </p>
              )}
            </div>

            {preview && (
              <div className="relative w-full max-w-md h-48 overflow-hidden rounded-md border bg-muted/20">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <Button type="submit" disabled={uploading || !file || !docType || !selectedBookingId}>
              <Upload className="mr-2 size-4" />
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Submitted Documents</CardTitle>
          <CardDescription>Track the status of your uploaded documents.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No documents uploaded yet.</div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.type}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(doc.submittedAt).toLocaleDateString()}
                      </p>
                      {doc.remarks && (
                        <p className="text-xs text-red-500 mt-1">Remarks: {doc.remarks}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        doc.status === "Verified"
                          ? "text-green-600 border-green-300"
                          : doc.status === "Declined"
                            ? "text-red-600 border-red-300"
                            : "text-yellow-600 border-yellow-300"
                      }
                    >
                      {doc.status}
                    </Badge>
                    {getStatusIcon(doc.status)}
                    {doc.filePath && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(doc.filePath, "_blank")}
                        title="View document"
                      >
                        <ImageIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}