"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Loader2, Bot, Save } from "lucide-react";
import { toast } from "sonner";

interface AssistantConfig {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  dailyMessageLimit: number | null;
  dailyTokenLimit: number | null;
  injectUserContext: { name: boolean; email: boolean; plan: boolean };
  injectTenantContext: { name: boolean; settings: boolean };
}

const DEFAULT_CONFIG: AssistantConfig = {
  systemPrompt: "",
  model: "gpt-4o-mini",
  temperature: 70,
  maxTokens: 2048,
  dailyMessageLimit: null,
  dailyTokenLimit: null,
  injectUserContext: { name: true, email: false, plan: true },
  injectTenantContext: { name: true, settings: false },
};

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Fast)" },
  { value: "gpt-4o", label: "GPT-4o (Powerful)" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku (Fast)" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet (Balanced)" },
];

export function AssistantSettings() {
  const [config, setConfig] = useState<AssistantConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    try {
      const response = await fetch("/api/v1/assistant/config");
      if (response.ok) {
        const data = await response.json();
        if (data.data) {
          setConfig({ ...DEFAULT_CONFIG, ...data.data });
        }
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/assistant/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast.success("Assistant settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant Settings
          </CardTitle>
          <CardDescription>
            Customize how the AI assistant behaves for your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">Custom System Prompt</Label>
            <Textarea
              id="systemPrompt"
              placeholder="You are a helpful assistant for..."
              value={config.systemPrompt}
              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
              rows={4}
            />
            <p className="text-sm text-muted-foreground">
              Define how the assistant should behave. Leave empty for default behavior.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select
              value={config.model}
              onValueChange={(value) => setConfig({ ...config, model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">
                {(config.temperature / 100).toFixed(2)}
              </span>
            </div>
            <Slider
              value={[config.temperature]}
              onValueChange={([value]) => setConfig({ ...config, temperature: value ?? config.temperature })}
              min={0}
              max={100}
              step={5}
            />
            <p className="text-sm text-muted-foreground">
              Lower = more focused, Higher = more creative
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens">Max Response Tokens</Label>
            <Input
              id="maxTokens"
              type="number"
              value={config.maxTokens}
              onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) || 2048 })}
              min={100}
              max={8192}
            />
          </div>

          {/* Context Injection */}
          <div className="space-y-4">
            <Label>Context Injection</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Include user name</p>
                  <p className="text-xs text-muted-foreground">
                    The assistant will know the user's name
                  </p>
                </div>
                <Switch
                  checked={config.injectUserContext.name}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      injectUserContext: { ...config.injectUserContext, name: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Include subscription plan</p>
                  <p className="text-xs text-muted-foreground">
                    The assistant will know the user's plan
                  </p>
                </div>
                <Switch
                  checked={config.injectUserContext.plan}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      injectUserContext: { ...config.injectUserContext, plan: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Include organization name</p>
                  <p className="text-xs text-muted-foreground">
                    The assistant will know the organization
                  </p>
                </div>
                <Switch
                  checked={config.injectTenantContext.name}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      injectTenantContext: { ...config.injectTenantContext, name: checked },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
