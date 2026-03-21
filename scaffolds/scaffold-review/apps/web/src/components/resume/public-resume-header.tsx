"use client";

import { Button } from "@/components/ui/button";
import { IconPrinter, IconDownload } from "@tabler/icons-react";

interface PublicResumeHeaderProps {
  title: string;
  name: string;
  resumeId: string;
}

export function PublicResumeHeader({ title, name, resumeId }: PublicResumeHeaderProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="no-print sticky top-0 z-10 border-b bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <div>
          <h1 className="font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm">{name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex">
            <IconPrinter className="mr-2 h-4 w-4" />
            Print
          </Button>
          <a
            href={`/api/v1/resumes/${resumeId}/export/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm">
              <IconDownload className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </a>
        </div>
      </div>
    </header>
  );
}
