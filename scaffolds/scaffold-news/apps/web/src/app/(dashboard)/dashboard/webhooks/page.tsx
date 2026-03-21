import { requireAuth } from "@/lib/auth-utils";
import { db } from "@scaffold-news/database/client";
import * as schema from "@scaffold-news/database/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { WebhooksList } from "./webhooks-list";
import { CreateWebhookDialog } from "./create-webhook-dialog";
import { getWebhookEvents } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Webhooks",
};

export default async function WebhooksPage() {
  const session = await requireAuth();
  const tenantId = session.user.tenantId;

  if (!tenantId) {
    redirect("/onboarding");
  }

  const canManage = session.user.tenantRole === "owner" || session.user.tenantRole === "manager";

  if (!canManage) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to manage webhooks.
          </p>
        </div>
      </div>
    );
  }

  const [webhooks, events] = await Promise.all([
    db.query.webhooks.findMany({
      where: eq(schema.webhooks.tenantId, tenantId),
      orderBy: (w, { desc }) => [desc(w.createdAt)],
    }),
    getWebhookEvents(),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">Send real-time notifications to external services</p>
        </div>
        <CreateWebhookDialog events={events} />
      </div>

      <WebhooksList webhooks={webhooks} events={events} />
    </div>
  );
}
