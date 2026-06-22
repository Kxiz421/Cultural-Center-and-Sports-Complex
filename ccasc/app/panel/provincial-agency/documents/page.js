"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Eye } from "lucide-react";
import { toast } from "sonner";

export default function DocumentsPage() {
  const [documents, setDocuments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchDocuments = React.useCallback(async () => {
    try {
      const userId = localStorage.getItem("user_id");
      if (!userId) return;
      const res = await fetch(`/api/users/${userId}/documents`);
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground text-sm">
          Submit and track required documents for your reservations
        </p>
      </div>

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
                  </div>
                  {doc.remarks && (
                    <p className="text-xs text-muted-foreground">Remarks: {doc.remarks}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Submitted: {doc.submittedAt ? new Date(doc.submittedAt).toLocaleDateString() : "—"}
                  </p>
                </div>
                {doc.filePath && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={doc.filePath} target="_blank" rel="noopener noreferrer">
                      <Eye className="mr-1 size-3" /> View
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}