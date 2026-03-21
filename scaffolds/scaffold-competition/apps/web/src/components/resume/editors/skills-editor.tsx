"use client";

import { IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { SkillItem } from "@scaffold-competition/database/schema/resumes";

interface SkillsEditorProps {
  items: SkillItem[];
  onChange: (items: SkillItem[]) => void;
}

export function SkillsEditor({ items, onChange }: SkillsEditorProps) {
  const addItem = () => {
    const newItem: SkillItem = {
      type: "skills",
      category: "",
      skills: [],
      level: undefined,
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<SkillItem>) => {
    const current = items[index];
    if (!current) return;
    const newItems = [...items];
    newItems[index] = { ...current, ...updates, type: "skills" };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addSkill = (index: number, skill: string) => {
    const item = items[index];
    if (!item) return;
    if (skill.trim() && !item.skills.includes(skill.trim())) {
      updateItem(index, {
        skills: [...item.skills, skill.trim()],
      });
    }
  };

  const removeSkill = (itemIndex: number, skillIndex: number) => {
    const item = items[itemIndex];
    if (!item) return;
    updateItem(itemIndex, {
      skills: item.skills.filter((_, i) => i !== skillIndex),
    });
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <Card key={index}>
          <CardContent className="pt-4">
            <div className="mb-4 flex items-start gap-2">
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`category-${index}`}>Category</Label>
                    <Input
                      id={`category-${index}`}
                      value={item.category || ""}
                      onChange={(e) => updateItem(index, { category: e.target.value })}
                      placeholder="Programming Languages"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`level-${index}`}>Proficiency Level</Label>
                    <Select
                      value={item.level || ""}
                      onValueChange={(value) =>
                        updateItem(index, {
                          level: value as SkillItem["level"],
                        })
                      }
                    >
                      <SelectTrigger id={`level-${index}`}>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Skills</Label>
                  <div className="mb-2 flex flex-wrap gap-2">
                    {item.skills.map((skill, sIndex) => (
                      <Badge key={sIndex} variant="secondary" className="gap-1">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(index, sIndex)}
                          className="hover:text-destructive ml-1"
                        >
                          <IconX className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Type a skill and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill(index, e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
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
        Add Skill Category
      </Button>
    </div>
  );
}
