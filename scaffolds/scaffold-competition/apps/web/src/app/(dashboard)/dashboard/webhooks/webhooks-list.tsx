"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, RefreshCw, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: Date;
}

interface WebhooksListProps {
  webhooks: Webhook[];
  events: { name: string; description: string | null }[];
}

export function WebhooksList({ webhooks, events: _events }: WebhooksListProps) {
  const [deletingWebhook, setDeletingWebhook] = useState<Webhook | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleToggle(webhookId: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/v1/webhooks/${webhookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update webhook");
      }

      toast.success(isActive ? "Webhook enabled" : "Webhook disabled");
      window.location.reload();
    } catch {
      toast.error("Failed to update webhook");
    }
  }

  async function handleDelete() {
    if (!deletingWebhook) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/v1/webhooks/${deletingWebhook.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete webhook");
      }

      toast.success("Webhook deleted");
      setDeletingWebhook(null);
      window.location.reload();
    } catch {
      toast.error("Failed to delete webhook");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRegenerateSecret(webhookId: string) {
    try {
      const response = await fetch(`/api/v1/webhooks/${webhookId}/regenerate-secret`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate secret");
      }

      toast.success("Secret regenerated");
      window.location.reload();
    } catch {
      toast.error("Failed to regenerate secret");
    }
  }

  if (webhooks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No webhooks configured yet</p>
          <p className="text-sm text-muted-foreground">
            Create a webhook to receive real-time notifications about events.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <Card key={webhook.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">{webhook.name}</CardTitle>
                <CardDescription className="mt-1 font-mono text-xs">
                  {webhook.url}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={webhook.isActive}
                  onCheckedChange={(checked) => handleToggle(webhook.id, checked)}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleRegenerateSecret(webhook.id)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Secret
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeletingWebhook(webhook)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {webhook.events.map((event) => (
                    <Badge key={event} variant="secondary">
                      {event}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Secret:</span>
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
                    {showSecrets[webhook.id]
                      ? webhook.secret
                      : `${webhook.secret.slice(0, 10)}${"•".repeat(20)}`}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() =>
                      setShowSecrets((prev) => ({
                        ...prev,
                        [webhook.id]: !prev[webhook.id],
                      }))
                    }
                  >
                    {showSecrets[webhook.id] ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!deletingWebhook} onOpenChange={() => setDeletingWebhook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the webhook &quot;{deletingWebhook?.name}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingWebhook(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
