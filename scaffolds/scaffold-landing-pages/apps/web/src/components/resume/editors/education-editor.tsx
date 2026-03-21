"use client";

import { IconPlus, IconTrash, IconGripVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { EducationItem } from "@scaffold-landing-pages/database/schema/resumes";

interface EducationEditorProps {
  items: EducationItem[];
  onChange: (items: EducationItem[]) => void;
}

export function EducationEditor({ items, onChange }: EducationEditorProps) {
  const addItem = () => {
    const newItem: EducationItem = {
      type: "education",
      institution: "",
      degree: "",
      field: "",
      location: "",
      startDate: "",
      endDate: "",
      gpa: "",
      description: "",
      highlights: [],
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<EducationItem>) => {
    const current = items[index];
    if (!current) return;
    const newItems = [...items];
    newItems[index] = { ...current, ...updates, type: "education" };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <Card key={index}>
          <CardContent className="pt-4">
            <div className="mb-4 flex items-start gap-2">
              <IconGripVertical className="text-muted-foreground mt-2 h-5 w-5 cursor-grab" />
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`institution-${index}`}>Institution</Label>
                    <Input
                      id={`institution-${index}`}
                      value={item.institution}
                      onChange={(e) => updateItem(index, { institution: e.target.value })}
                      placeholder="Stanford University"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`degree-${index}`}>Degree</Label>
                    <Input
                      id={`degree-${index}`}
                      value={item.degree}
                      onChange={(e) => updateItem(index, { degree: e.target.value })}
                      placeholder="Bachelor of Science"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`field-${index}`}>Field of Study</Label>
                    <Input
                      id={`field-${index}`}
                      value={item.field || ""}
                      onChange={(e) => updateItem(index, { field: e.target.value })}
                      placeholder="Computer Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`location-${index}`}>Location</Label>
                    <Input
                      id={`location-${index}`}
                      value={item.location || ""}
                      onChange={(e) => updateItem(index, { location: e.target.value })}
                      placeholder="Stanford, CA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`gpa-${index}`}>GPA</Label>
                    <Input
                      id={`gpa-${index}`}
                      value={item.gpa || ""}
                      onChange={(e) => updateItem(index, { gpa: e.target.value })}
                      placeholder="3.9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`startDate-${index}`}>Start Date</Label>
                    <Input
                      id={`startDate-${index}`}
                      type="month"
                      value={item.startDate || ""}
                      onChange={(e) => updateItem(index, { startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`endDate-${index}`}>End Date</Label>
                    <Input
                      id={`endDate-${index}`}
                      type="month"
                      value={item.endDate || ""}
                      onChange={(e) => updateItem(index, { endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>Description / Activities</Label>
                  <Textarea
                    id={`description-${index}`}
                    value={item.description || ""}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    placeholder="Relevant coursework, activities, honors..."
                    rows={2}
                  />
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                <IconTrash className="text-destructive h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button type="button" variant="outline" onClick={addItem} className="w-full">
        <IconPlus className="mr-2 h-4 w-4" />
        Add Education
      </Button>
    </div>
  );
}
