"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function DocumentsPage() {
  const [documents, setDocuments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [file, setFile] = React.useState(null);
  const [preview, setPreview] = React.useState("");
  const [docType, setDocType] = React.useState("");
  const [uploading, setUploading] = React.useState(false);

  const loadDocuments = React.useCallback(async () => {
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) {
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/users/${userId}/documents`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

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
      loadDocuments();
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground text-sm">
          Submit and track required documents for your reservations
        </p>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Document</CardTitle>
          <CardDescription>
            Upload billing statements, receipts, or other required documents as images.
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
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                />
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

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Submitted Documents</CardTitle>
          <CardDescription>Track the status of your uploaded documents.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading documents...</div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <FileText className="size-8 text-muted-foreground" />
              <p className="text-muted-foreground">No documents found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-start justify-between p-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{doc.type}</span>
                        <Badge
                          variant={doc.status === "Verified" ? "outline" : doc.status === "Declined" ? "secondary" : "outline"}
                          className={
                            doc.status === "Verified"
                              ? "text-green-600 border-green-300"
                              : doc.status === "Declined"
                                ? "text-red-600"
                                : "text-yellow-600 border-yellow-300 bg-yellow-50"
                          }
                        >
                          {doc.status || "Pending"}
                        </Badge>
                        {getStatusIcon(doc.status)}
                      </div>
                      {doc.remarks && (
                        <p className="text-xs text-red-500">Remarks: {doc.remarks}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Submitted: {doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    {doc.filePath && (
                      <Button variant="outline" size="sm" onClick={() => window.open(doc.filePath, "_blank")}>
                        <Eye className="mr-1 size-3" /> View
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}