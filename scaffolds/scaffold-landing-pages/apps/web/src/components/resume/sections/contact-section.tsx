"use client";

import {
  IconMail,
  IconPhone,
  IconMapPin,
  IconBrandLinkedin,
  IconBrandGithub,
  IconWorld,
} from "@tabler/icons-react";
import type { ContactInfo } from "@scaffold-landing-pages/types";

// Extended interface to handle both field naming conventions
interface ExtendedContactInfo extends Partial<ContactInfo> {
  linkedin?: string;
  github?: string;
  website?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  portfolioUrl?: string;
}

interface ContactSectionProps {
  contact: ExtendedContactInfo;
  template?: string;
  readonly?: boolean;
}

export function ContactSection({ contact }: ContactSectionProps) {
  // Handle both field naming conventions
  const linkedinUrl = contact.linkedin || contact.linkedinUrl;
  const githubUrl = contact.github || contact.githubUrl;
  const websiteUrl = contact.website || contact.websiteUrl || contact.portfolioUrl;

  return (
    <div className="border-b pb-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">{contact.fullName}</h1>

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        {contact.email && (
          <a
            href={`mailto:${contact.email}`}
            className="hover:text-primary flex items-center gap-1 transition-colors"
          >
            <IconMail className="h-4 w-4" />
            <span>{contact.email}</span>
          </a>
        )}
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="hover:text-primary flex items-center gap-1 transition-colors"
          >
            <IconPhone className="h-4 w-4" />
            <span>{contact.phone}</span>
          </a>
        )}
        {contact.location && (
          <span className="flex items-center gap-1">
            <IconMapPin className="h-4 w-4" />
            <span>{contact.location}</span>
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-center gap-4">
        {linkedinUrl && (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary flex items-center gap-1 text-sm transition-colors"
          >
            <IconBrandLinkedin className="h-4 w-4" />
            <span>LinkedIn</span>
          </a>
        )}
        {githubUrl && (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary flex items-center gap-1 text-sm transition-colors"
          >
            <IconBrandGithub className="h-4 w-4" />
            <span>GitHub</span>
          </a>
        )}
        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary flex items-center gap-1 text-sm transition-colors"
          >
            <IconWorld className="h-4 w-4" />
            <span>Website</span>
          </a>
        )}
      </div>
    </div>
  );
}
