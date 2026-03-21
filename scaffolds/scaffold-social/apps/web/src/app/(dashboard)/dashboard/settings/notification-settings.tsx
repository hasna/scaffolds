"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface NotificationPreferences {
  emailDigest: boolean;
  teamUpdates: boolean;
  billingAlerts: boolean;
  securityAlerts: boolean;
  productUpdates: boolean;
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailDigest: true,
    teamUpdates: true,
    billingAlerts: true,
    securityAlerts: true,
    productUpdates: false,
  });

  async function handleToggle(key: keyof NotificationPreferences) {
    const newValue = !preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: newValue }));

    try {
      const response = await fetch("/api/v1/users/me/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (!response.ok) {
        // Revert on error
        setPreferences((prev) => ({ ...prev, [key]: !newValue }));
        throw new Error("Failed to update preference");
      }
    } catch {
      toast.error("Failed to update notification preference");
    }
  }

  const notifications = [
    {
      id: "emailDigest" as const,
      title: "Weekly Digest",
      description: "Receive a weekly summary of your team's activity",
    },
    {
      id: "teamUpdates" as const,
      title: "Team Updates",
      description: "Get notified when team members are added or removed",
    },
    {
      id: "billingAlerts" as const,
      title: "Billing Alerts",
      description: "Receive alerts about billing and subscription changes",
    },
    {
      id: "securityAlerts" as const,
      title: "Security Alerts",
      description: "Get notified about security-related events",
    },
    {
      id: "productUpdates" as const,
      title: "Product Updates",
      description: "Stay informed about new features and improvements",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Choose what notifications you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {notifications.map((notification) => (
          <div key={notification.id} className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor={notification.id}>{notification.title}</Label>
              <p className="text-sm text-muted-foreground">{notification.description}</p>
            </div>
            <Switch
              id={notification.id}
              checked={preferences[notification.id]}
              onCheckedChange={() => handleToggle(notification.id)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
