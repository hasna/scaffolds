"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Settings, Loader2 } from "lucide-react";
import type { FeatureFlag, PlanFeatureMapping, PricingPlan } from "@scaffold-news/database/schema";

interface FeatureFlagActionsProps {
  flag: FeatureFlag;
  plans: PricingPlan[];
  planFeatures: PlanFeatureMapping[];
}

export function FeatureFlagActions({ flag, plans, planFeatures }: FeatureFlagActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => {
    // Initialize form data with current values
    const data: Record<string, { enabled: boolean; limits: Record<string, number> }> = {};
    for (const plan of plans) {
      const planFeature = planFeatures.find((pf) => pf.planId === plan.id);
      data[plan.id] = {
        enabled: planFeature?.enabled ?? flag.defaultEnabled,
        limits: (planFeature?.limits as Record<string, number>) ?? {},
      };
    }
    return data;
  });

  async function handleSave() {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/feature-flags/${flag.id}/plan-features`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planFeatures: formData }),
      });

      if (!response.ok) throw new Error("Failed to update");

      router.refresh();
      setOpen(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Configure Plans
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure {flag.name}</DialogTitle>
          <DialogDescription>Set feature availability and limits for each plan</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {plans.map((plan) => (
            <div key={plan.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{plan.name}</h4>
                  <p className="text-muted-foreground text-sm">{plan.description}</p>
                </div>
                <Switch
                  checked={formData[plan.id]?.enabled ?? false}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      [plan.id]: {
                        enabled: checked,
                        limits: prev[plan.id]?.limits ?? {},
                      },
                    }))
                  }
                />
              </div>

              {formData[plan.id]?.enabled && (
                <div className="space-y-2 border-t pt-2">
                  <Label className="text-muted-foreground text-sm">Limits (optional)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Max Requests</Label>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        value={formData[plan.id]?.limits?.max_requests ?? ""}
                        onChange={(e) =>
                          setFormData((prev) => {
                            const currentLimits = prev[plan.id]?.limits ?? {};
                            const newLimits = { ...currentLimits };
                            if (e.target.value) {
                              newLimits.max_requests = parseInt(e.target.value);
                            } else {
                              delete newLimits.max_requests;
                            }
                            return {
                              ...prev,
                              [plan.id]: {
                                enabled: prev[plan.id]?.enabled ?? false,
                                limits: newLimits,
                              },
                            };
                          })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Items</Label>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        value={formData[plan.id]?.limits?.max_items ?? ""}
                        onChange={(e) =>
                          setFormData((prev) => {
                            const currentLimits = prev[plan.id]?.limits ?? {};
                            const newLimits = { ...currentLimits };
                            if (e.target.value) {
                              newLimits.max_items = parseInt(e.target.value);
                            } else {
                              delete newLimits.max_items;
                            }
                            return {
                              ...prev,
                              [plan.id]: {
                                enabled: prev[plan.id]?.enabled ?? false,
                                limits: newLimits,
                              },
                            };
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
