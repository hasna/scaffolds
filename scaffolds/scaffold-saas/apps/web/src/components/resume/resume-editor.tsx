"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SortableSectionBlock } from "./sortable-section-block";
import { SectionToolbar, type SectionType } from "./section-toolbar";
import { TemplatePicker, type TemplateStyle } from "./template-picker";
import type {
  ResumeContent,
  ResumeSection,
  PersonalInfo,
} from "@scaffold-saas/database/schema/resumes";
import { nanoid } from "nanoid";

interface ResumeEditorProps {
  resumeId: string;
  content: ResumeContent;
  template: TemplateStyle;
  onUpdate: (updates: { content?: ResumeContent; template?: TemplateStyle }) => void;
}

const defaultSectionTitles: Record<SectionType, string> = {
  summary: "Professional Summary",
  experience: "Work Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
  awards: "Awards & Achievements",
  publications: "Publications",
  volunteer: "Volunteer Experience",
  custom: "Custom Section",
};

export function ResumeEditor({
  resumeId: _resumeId,
  content,
  template,
  onUpdate,
}: ResumeEditorProps) {
  const [localContent, setLocalContent] = useState<ResumeContent>(content);
  const [localTemplate, setLocalTemplate] = useState<TemplateStyle>(template);
  const [_isSaving, _setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const sections = localContent.sections || [];
        const oldIndex = sections.findIndex((s) => s.id === active.id);
        const newIndex = sections.findIndex((s) => s.id === over.id);

        const reorderedSections = arrayMove(sections, oldIndex, newIndex).map((s, idx) => ({
          ...s,
          order: idx,
        }));

        const newContent = {
          ...localContent,
          sections: reorderedSections,
        };

        setLocalContent(newContent);
        onUpdate({ content: newContent });
      }
    },
    [localContent, onUpdate]
  );

  const handlePersonalInfoUpdate = useCallback(
    (updates: Partial<PersonalInfo>) => {
      const newContent = {
        ...localContent,
        personalInfo: {
          ...localContent.personalInfo,
          ...updates,
        },
      };
      setLocalContent(newContent);
      onUpdate({ content: newContent });
    },
    [localContent, onUpdate]
  );

  const handleSummaryUpdate = useCallback(
    (summary: string) => {
      const newContent = {
        ...localContent,
        summary,
      };
      setLocalContent(newContent);
      onUpdate({ content: newContent });
    },
    [localContent, onUpdate]
  );

  const handleSectionUpdate = useCallback(
    (sectionId: string, updates: Partial<ResumeSection>) => {
      const sections = localContent.sections || [];
      const newSections = sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s));

      const newContent = {
        ...localContent,
        sections: newSections,
      };

      setLocalContent(newContent);
      onUpdate({ content: newContent });
    },
    [localContent, onUpdate]
  );

  const handleSectionDelete = useCallback(
    (sectionId: string) => {
      const sections = localContent.sections || [];
      const newSections = sections
        .filter((s) => s.id !== sectionId)
        .map((s, idx) => ({ ...s, order: idx }));

      const newContent = {
        ...localContent,
        sections: newSections,
      };

      setLocalContent(newContent);
      onUpdate({ content: newContent });
    },
    [localContent, onUpdate]
  );

  const handleAddSection = useCallback(
    (type: SectionType) => {
      const sections = localContent.sections || [];

      const newSection: ResumeSection = {
        id: nanoid(),
        type,
        title: defaultSectionTitles[type],
        order: sections.length,
        visible: true,
        content: type === "summary" ? { text: "" } : [],
      };

      const newContent = {
        ...localContent,
        sections: [...sections, newSection],
      };

      setLocalContent(newContent);
      onUpdate({ content: newContent });
    },
    [localContent, onUpdate]
  );

  const handleTemplateChange = useCallback(
    (newTemplate: TemplateStyle) => {
      setLocalTemplate(newTemplate);
      onUpdate({ template: newTemplate });
    },
    [onUpdate]
  );

  const sections = localContent.sections || [];
  const existingSectionTypes = sections.map((s) => s.type) as SectionType[];

  return (
    <div className="space-y-6">
      {/* Template Selector */}
      <div className="flex justify-end">
        <TemplatePicker value={localTemplate} onChange={handleTemplateChange} />
      </div>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={localContent.personalInfo?.fullName || ""}
                onChange={(e) => handlePersonalInfoUpdate({ fullName: e.target.value })}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={localContent.personalInfo?.email || ""}
                onChange={(e) => handlePersonalInfoUpdate({ email: e.target.value })}
                placeholder="john@example.com"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={localContent.personalInfo?.phone || ""}
                onChange={(e) => handlePersonalInfoUpdate({ phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={localContent.personalInfo?.location || ""}
                onChange={(e) => handlePersonalInfoUpdate({ location: e.target.value })}
                placeholder="San Francisco, CA"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn</Label>
              <Input
                id="linkedinUrl"
                type="url"
                value={localContent.personalInfo?.linkedinUrl || ""}
                onChange={(e) => handlePersonalInfoUpdate({ linkedinUrl: e.target.value })}
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="githubUrl">GitHub</Label>
              <Input
                id="githubUrl"
                type="url"
                value={localContent.personalInfo?.githubUrl || ""}
                onChange={(e) => handlePersonalInfoUpdate({ githubUrl: e.target.value })}
                placeholder="https://github.com/johndoe"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Personal Website</Label>
            <Input
              id="websiteUrl"
              type="url"
              value={localContent.personalInfo?.websiteUrl || ""}
              onChange={(e) => handlePersonalInfoUpdate({ websiteUrl: e.target.value })}
              placeholder="https://johndoe.com"
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Professional Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={localContent.summary || ""}
            onChange={(e) => handleSummaryUpdate(e.target.value)}
            placeholder="A brief summary of your professional background and career objectives..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Sections */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {sections.map((section) => (
              <SortableSectionBlock
                key={section.id}
                section={section}
                onUpdate={handleSectionUpdate}
                onDelete={handleSectionDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Section */}
      <SectionToolbar onAddSection={handleAddSection} existingSections={existingSectionTypes} />
    </div>
  );
}
