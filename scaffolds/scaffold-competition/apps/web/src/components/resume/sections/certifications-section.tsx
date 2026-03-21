"use client";

import type { CertificationItem } from "@scaffold-competition/types";
import { IconExternalLink } from "@tabler/icons-react";
import { formatDate } from "@/lib/utils";

interface CertificationsSectionProps {
  title: string;
  content: CertificationItem[];
  readonly?: boolean;
}

export function CertificationsSection({ title, content }: CertificationsSectionProps) {
  if (!content || content.length === 0) {
    return (
      <section className="py-4">
        <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">No certifications yet</p>
      </section>
    );
  }

  return (
    <section className="py-4">
      <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
      <div className="space-y-3">
        {content.map((cert, index) => {
          const credentialUrl = cert.credentialUrl ?? (cert as { url?: string }).url;
          const issuedDate = cert.issueDate ?? (cert as { date?: string }).date;
          return (
            <div key={`${cert.name}-${index}`} className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{cert.name}</h3>
                  {credentialUrl && (
                    <a
                      href={credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <IconExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {cert.issuer}
                  {cert.credentialId && ` • ID: ${cert.credentialId}`}
                </p>
              </div>
              {issuedDate && (
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatDate(issuedDate)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
