"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = React.useState([]);
  const [filePath, setFilePath] = React.useState("");
  const [docType, setDocType] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!filePath || !docType) {
      toast.error("Please enter a file path and select a document type");
      return;
    }

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentTypeId: parseInt(docType, 10),
          filePath,
        }),
      });

      if (!res.ok) throw new Error("Failed to upload document");
      toast.success("Document uploaded successfully!");
      setFilePath("");
      setDocType("");
      // Refresh the list
      const refreshRes = await fetch('/api/documents');
      const refreshData = await refreshRes.json();
      setDocuments(refreshData || []);
    } catch (err) {
      toast.error(err.message);
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
            Upload billing statements, receipts, Contracts of Lease, or certifications.
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
                <Label htmlFor="file-path">File Path / URL</Label>
                <Input
                  id="file-path"
                  placeholder="e.g. /uploads/document.pdf or https://..."
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit">
              <FileText className="mr-2 size-4" />
              Upload Document
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