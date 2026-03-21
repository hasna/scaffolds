"use client";

import { useState } from "react";
import { Loader2, CreditCard, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface BillingActionsProps {
  tenantId: string;
  hasSubscription: boolean;
  cancelAtPeriodEnd: boolean;
}

export function BillingActions({
  tenantId: _tenantId,
  hasSubscription,
  cancelAtPeriodEnd,
}: BillingActionsProps) {
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  async function handleManageBilling() {
    setIsPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setIsPortalLoading(false);
    }
  }

  async function handleCancelSubscription() {
    setIsCanceling(true);
    try {
      const response = await fetch("/api/stripe/cancel", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      toast.success("Subscription will be canceled at the end of the billing period");
      setIsCancelDialogOpen(false);
      window.location.reload();
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setIsCanceling(false);
    }
  }

  async function handleReactivateSubscription() {
    setIsCanceling(true);
    try {
      const response = await fetch("/api/stripe/reactivate", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to reactivate subscription");
      }

      toast.success("Subscription reactivated");
      window.location.reload();
    } catch {
      toast.error("Failed to reactivate subscription");
    } finally {
      setIsCanceling(false);
    }
  }

  if (!hasSubscription) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleManageBilling} disabled={isPortalLoading}>
        {isPortalLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CreditCard className="mr-2 h-4 w-4" />
        )}
        Manage Billing
      </Button>

      {cancelAtPeriodEnd ? (
        <Button variant="outline" onClick={handleReactivateSubscription} disabled={isCanceling}>
          {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Reactivate Subscription
        </Button>
      ) : (
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => setIsCancelDialogOpen(true)}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancel Subscription
        </Button>
      )}

      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You&apos;ll continue to have
              access until the end of your current billing period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCanceling}
            >
              {isCanceling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
