"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

const webhookSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  url: z.string().url("Please enter a valid URL"),
  events: z.array(z.string()).min(1, "Select at least one event"),
});

type WebhookValues = z.infer<typeof webhookSchema>;

interface CreateWebhookDialogProps {
  events: { name: string; description: string | null }[];
}

export function CreateWebhookDialog({ events }: CreateWebhookDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<WebhookValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: "",
      url: "",
      events: [],
    },
  });

  async function onSubmit(values: WebhookValues) {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        throw new Error("Failed to create webhook");
      }

      toast.success("Webhook created successfully");
      setOpen(false);
      form.reset();
      window.location.reload();
    } catch {
      toast.error("Failed to create webhook");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            Set up a new webhook endpoint to receive event notifications.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Webhook" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endpoint URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com/webhooks"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    We&apos;ll send POST requests to this URL.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="events"
              render={() => (
                <FormItem>
                  <FormLabel>Events</FormLabel>
                  <FormDescription>
                    Select which events should trigger this webhook.
                  </FormDescription>
                  <ScrollArea className="h-48 rounded-md border p-4">
                    <div className="space-y-2">
                      {events.map((event) => (
                        <FormField
                          key={event.name}
                          control={form.control}
                          name="events"
                          render={({ field }) => (
                            <FormItem className="flex items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(event.name)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, event.name])
                                      : field.onChange(
                                          field.value?.filter((v) => v !== event.name)
                                        );
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-mono text-xs">
                                  {event.name}
                                </FormLabel>
                                {event.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Webhook
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
