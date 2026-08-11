"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, XCircle, Clock, Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = React.useState([]);
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState("");
  const [docType, setDocType] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error("Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.");
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size too large. Maximum is 5MB.");
      return;
    }

    setFile(selectedFile);

    // Create preview
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

    setUploading(true);
    try {
      // Upload file directly via FormData
      const formData = new FormData();
      formData.append("documentTypeId", docType);
      formData.append("file", file);

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
      // Refresh the list
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
          Upload and track required documents for your reservations.
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
                    <SelectItem value="1">Billing Statement</SelectItem>
                    <SelectItem value="2">Receipt</SelectItem>
                    <SelectItem value="3">Contract of Lease</SelectItem>
                    <SelectItem value="4">Certification</SelectItem>
                  </SelectContent>
                </Select>
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

            {preview && (
              <div className="relative w-full max-w-md h-48 overflow-hidden rounded-md border bg-muted/20">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            <Button type="submit" disabled={uploading || !file || !docType}>
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