"use client";

import type { ProjectItem } from "@scaffold-news/types";
import { Badge } from "@/components/ui/badge";
import { IconExternalLink } from "@tabler/icons-react";

interface ProjectsSectionProps {
  title: string;
  content: ProjectItem[];
  readonly?: boolean;
}

export function ProjectsSection({ title, content }: ProjectsSectionProps) {
  if (!content || content.length === 0) {
    return (
      <section className="py-4">
        <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">No projects yet</p>
      </section>
    );
  }

  return (
    <section className="py-4">
      <h2 className="mb-3 border-b pb-1 text-lg font-semibold">{title}</h2>
      <div className="space-y-4">
        {content.map((project, index) => (
          <div key={`${project.name}-${index}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{project.name}</h3>
                {project.url && (
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <IconExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1 text-sm">{project.description}</p>
            )}
            {project.technologies && project.technologies.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {project.technologies.map((tech, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
            {project.highlights && project.highlights.length > 0 && (
              <ul className="mt-2 ml-4 list-outside list-disc space-y-1">
                {project.highlights.map((highlight, i) => (
                  <li key={i} className="text-muted-foreground text-sm">
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
