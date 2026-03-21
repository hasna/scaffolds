"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconGripVertical,
  IconChevronDown,
  IconChevronUp,
  IconTrash,
  IconEye,
  IconEyeOff,
  IconEdit,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { ResumeSection } from "@scaffold-review/database/schema/resumes";
import { ExperienceEditor, EducationEditor, SkillsEditor } from "./editors";

interface SortableSectionBlockProps {
  section: ResumeSection;
  onUpdate: (sectionId: string, updates: Partial<ResumeSection>) => void;
  onDelete: (sectionId: string) => void;
}

export function SortableSectionBlock({ section, onUpdate, onDelete }: SortableSectionBlockProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleVisibilityToggle = () => {
    onUpdate(section.id, { visible: !section.visible });
  };

  const handleContentUpdate = (items: any[]) => {
    onUpdate(section.id, { content: items });
  };

  const renderEditor = () => {
    const items = section.content as any[];

    switch (section.type) {
      case "experience":
        return <ExperienceEditor items={items} onChange={handleContentUpdate} />;
      case "education":
        return <EducationEditor items={items} onChange={handleContentUpdate} />;
      case "skills":
        return <SkillsEditor items={items} onChange={handleContentUpdate} />;
      // Add more editors for other section types
      default:
        return (
          <div className="text-muted-foreground text-sm">
            Editor not available for this section type
          </div>
        );
    }
  };

  const getItemCount = () => {
    const items = section.content as any[];
    return items?.length || 0;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card rounded-lg border transition-shadow",
        isDragging && "ring-primary/20 shadow-lg ring-2",
        !section.visible && "opacity-60"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 p-3">
          {/* Drag Handle */}
          <button className="cursor-grab touch-none" {...attributes} {...listeners}>
            <IconGripVertical className="text-muted-foreground h-5 w-5" />
          </button>

          {/* Title */}
          <CollapsibleTrigger asChild>
            <button className="flex flex-1 items-center gap-2 text-left">
              <span className="font-medium">{section.title}</span>
              <span className="text-muted-foreground text-xs">
                ({getItemCount()} item{getItemCount() !== 1 ? "s" : ""})
              </span>
              {isOpen ? (
                <IconChevronUp className="ml-auto h-4 w-4" />
              ) : (
                <IconChevronDown className="ml-auto h-4 w-4" />
              )}
            </button>
          </CollapsibleTrigger>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleVisibilityToggle}
              title={section.visible ? "Hide section" : "Show section"}
            >
              {section.visible ? (
                <IconEye className="h-4 w-4" />
              ) : (
                <IconEyeOff className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(!isEditing)}
              title="Edit section"
            >
              <IconEdit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive h-8 w-8"
              onClick={() => onDelete(section.id)}
              title="Delete section"
            >
              <IconTrash className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="border-t p-4 pt-0">
            {isEditing ? (
              <div className="pt-4">{renderEditor()}</div>
            ) : (
              <SectionPreview section={section} />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function SectionPreview({ section }: { section: ResumeSection }) {
  const items = section.content as any[];

  if (!items || items.length === 0) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">
        No items in this section. Click edit to add content.
      </div>
    );
  }

  switch (section.type) {
    case "experience":
      return (
        <div className="space-y-3 pt-2">
          {items.map((item, index) => (
            <div key={index} className="border-muted border-l-2 pl-3">
              <div className="font-medium">{item.position}</div>
              <div className="text-muted-foreground text-sm">{item.company}</div>
              {item.startDate && (
                <div className="text-muted-foreground text-xs">
                  {item.startDate} - {item.isCurrent ? "Present" : item.endDate}
                </div>
              )}
            </div>
          ))}
        </div>
      );

    case "education":
      return (
        <div className="space-y-3 pt-2">
          {items.map((item, index) => (
            <div key={index} className="border-muted border-l-2 pl-3">
              <div className="font-medium">
                {item.degree} {item.field && `in ${item.field}`}
              </div>
              <div className="text-muted-foreground text-sm">{item.institution}</div>
            </div>
          ))}
        </div>
      );

    case "skills":
      return (
        <div className="space-y-2 pt-2">
          {items.map((item, index) => (
            <div key={index}>
              {item.category && <span className="text-sm font-medium">{item.category}: </span>}
              <span className="text-muted-foreground text-sm">{item.skills?.join(", ")}</span>
            </div>
          ))}
        </div>
      );

    default:
      return (
        <div className="text-muted-foreground py-4 text-center text-sm">
          {items.length} item{items.length !== 1 ? "s" : ""} in this section
        </div>
      );
  }
}
