"use client";

import { useState } from "react";
import { IconDownload, IconFileTypePdf, IconFileText, IconBraces } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ExportFormat = "pdf" | "docx" | "json";
type JsonFormat = "internal" | "json_resume";
type PageSize = "letter" | "a4";

interface ExportDialogProps {
  resumeId: string;
  currentTemplate: string;
  trigger?: React.ReactNode;
}

const exportFormats: Array<{
  id: ExportFormat;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "pdf",
    name: "PDF Document",
    description: "Best for sharing and printing",
    icon: IconFileTypePdf,
  },
  {
    id: "docx",
    name: "Word Document",
    description: "Editable in Microsoft Word",
    icon: IconFileText,
  },
  {
    id: "json",
    name: "JSON Data",
    description: "For backup or data portability",
    icon: IconBraces,
  },
];

export function ExportDialog({ resumeId, currentTemplate, trigger }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [template, setTemplate] = useState(currentTemplate);
  const [pageSize, setPageSize] = useState<PageSize>("letter");
  const [jsonFormat, setJsonFormat] = useState<JsonFormat>("internal");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let url = `/api/v1/resumes/${resumeId}/export/${format}`;
      const params = new URLSearchParams();

      if (format === "pdf") {
        params.set("template", template);
        params.set("pageSize", pageSize);
      } else if (format === "json") {
        params.set("format", jsonFormat);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Open download in new tab
      window.open(url, "_blank");
      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <IconDownload className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Resume</DialogTitle>
          <DialogDescription>Choose a format and customize your export options</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value: string) => setFormat(value as ExportFormat)}
              className="grid grid-cols-3 gap-3"
            >
              {exportFormats.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.id}>
                    <RadioGroupItem value={f.id} id={`format-${f.id}`} className="peer sr-only" />
                    <Label
                      htmlFor={`format-${f.id}`}
                      className={cn(
                        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border p-4 transition-all",
                        "peer-focus-visible:ring-primary peer-focus-visible:ring-2",
                        format === f.id
                          ? "border-primary bg-primary/5"
                          : "hover:border-muted-foreground/50"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{f.name}</span>
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* PDF Options */}
          {format === "pdf" && (
            <div className="space-y-4 border-t pt-2">
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger id="template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pageSize">Page Size</Label>
                <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
                  <SelectTrigger id="pageSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="letter">US Letter (8.5" x 11")</SelectItem>
                    <SelectItem value="a4">A4 (210mm x 297mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* JSON Options */}
          {format === "json" && (
            <div className="space-y-4 border-t pt-2">
              <div className="space-y-2">
                <Label htmlFor="jsonFormat">JSON Format</Label>
                <Select value={jsonFormat} onValueChange={(v) => setJsonFormat(v as JsonFormat)}>
                  <SelectTrigger id="jsonFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal Format</SelectItem>
                    <SelectItem value="json_resume">JSON Resume Standard</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  {jsonFormat === "internal"
                    ? "Our internal format for backup and restoration"
                    : "Standard format compatible with other resume tools"}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              "Exporting..."
            ) : (
              <>
                <IconDownload className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
