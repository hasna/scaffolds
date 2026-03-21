"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { ConfirmationDialog } from "./confirmation-dialog";

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void | Promise<void>;
  variant?: "default" | "destructive";
  requireConfirmation?: boolean;
  confirmTitle?: string;
  confirmDescription?: string;
}

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  actions: BulkAction[];
  isLoading?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  actions,
  isLoading = false,
}: BulkActionsBarProps) {
  const [confirmingAction, setConfirmingAction] = React.useState<BulkAction | null>(null);
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  const handleActionClick = async (action: BulkAction) => {
    if (action.requireConfirmation) {
      setConfirmingAction(action);
      return;
    }

    setLoadingAction(action.label);
    try {
      await action.onClick();
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirm = async () => {
    if (!confirmingAction) return;

    setLoadingAction(confirmingAction.label);
    try {
      await confirmingAction.onClick();
    } finally {
      setLoadingAction(null);
      setConfirmingAction(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8"
            disabled={isLoading || loadingAction !== null}
          >
            <X className="mr-1 h-4 w-4" />
            Clear selection
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {actions.map((action) => {
            const isActionLoading = loadingAction === action.label;
            return (
              <Button
                key={action.label}
                variant={action.variant === "destructive" ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleActionClick(action)}
                className="h-8"
                disabled={isLoading || loadingAction !== null}
              >
                {isActionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  action.icon && <span className="mr-2">{action.icon}</span>
                )}
                {action.label}
              </Button>
            );
          })}
        </div>
      </div>

      {confirmingAction && (
        <ConfirmationDialog
          open={!!confirmingAction}
          onOpenChange={(open) => !open && setConfirmingAction(null)}
          title={confirmingAction.confirmTitle ?? `Confirm ${confirmingAction.label}`}
          description={
            confirmingAction.confirmDescription ??
            `Are you sure you want to ${confirmingAction.label.toLowerCase()} ${selectedCount} item${selectedCount !== 1 ? "s" : ""}? This action cannot be undone.`
          }
          confirmLabel={confirmingAction.label}
          variant={confirmingAction.variant}
          onConfirm={handleConfirm}
          isLoading={loadingAction === confirmingAction.label}
        />
      )}
    </>
  );
}
