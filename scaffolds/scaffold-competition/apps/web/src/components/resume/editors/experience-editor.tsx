"use client";

import { IconPlus, IconTrash, IconGripVertical } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import type { ExperienceItem } from "@scaffold-competition/database/schema/resumes";

interface ExperienceEditorProps {
  items: ExperienceItem[];
  onChange: (items: ExperienceItem[]) => void;
}

export function ExperienceEditor({ items, onChange }: ExperienceEditorProps) {
  const addItem = () => {
    const newItem: ExperienceItem = {
      type: "experience",
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
      description: "",
      highlights: [],
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<ExperienceItem>) => {
    const current = items[index];
    if (!current) return;
    const newItems = [...items];
    newItems[index] = { ...current, ...updates, type: "experience" };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addHighlight = (index: number) => {
    const item = items[index];
    if (!item) return;
    updateItem(index, {
      highlights: [...(item.highlights || []), ""],
    });
  };

  const updateHighlight = (itemIndex: number, highlightIndex: number, value: string) => {
    const item = items[itemIndex];
    if (!item) return;
    const newHighlights = [...(item.highlights || [])];
    newHighlights[highlightIndex] = value;
    updateItem(itemIndex, { highlights: newHighlights });
  };

  const removeHighlight = (itemIndex: number, highlightIndex: number) => {
    const item = items[itemIndex];
    if (!item) return;
    updateItem(itemIndex, {
      highlights: (item.highlights || []).filter((_, i) => i !== highlightIndex),
    });
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
                    <Label htmlFor={`position-${index}`}>Position</Label>
                    <Input
                      id={`position-${index}`}
                      value={item.position}
                      onChange={(e) => updateItem(index, { position: e.target.value })}
                      placeholder="Software Engineer"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`company-${index}`}>Company</Label>
                    <Input
                      id={`company-${index}`}
                      value={item.company}
                      onChange={(e) => updateItem(index, { company: e.target.value })}
                      placeholder="Acme Inc."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`location-${index}`}>Location</Label>
                    <Input
                      id={`location-${index}`}
                      value={item.location || ""}
                      onChange={(e) => updateItem(index, { location: e.target.value })}
                      placeholder="San Francisco, CA"
                    />
                  </div>
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
                      disabled={item.isCurrent}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id={`current-${index}`}
                    checked={item.isCurrent || false}
                    onCheckedChange={(checked) => updateItem(index, { isCurrent: checked })}
                  />
                  <Label htmlFor={`current-${index}`}>Currently working here</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`description-${index}`}>Description</Label>
                  <Textarea
                    id={`description-${index}`}
                    value={item.description || ""}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    placeholder="Brief description of your role..."
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Highlights / Achievements</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => addHighlight(index)}
                    >
                      <IconPlus className="mr-1 h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  {(item.highlights || []).map((highlight, hIndex) => (
                    <div key={hIndex} className="flex items-center gap-2">
                      <Input
                        value={highlight}
                        onChange={(e) => updateHighlight(index, hIndex, e.target.value)}
                        placeholder="Led a team of 5 engineers..."
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHighlight(index, hIndex)}
                      >
                        <IconTrash className="text-destructive h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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
        Add Experience
      </Button>
    </div>
  );
}
