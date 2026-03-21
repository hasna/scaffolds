"use client";

import { useSession } from "next-auth/react";
import { AssistantSidebar } from "@/components/assistant";

export function AssistantShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const showAssistant = status === "authenticated";

  return (
    <div className="flex min-h-screen w-full">
      <div className="min-w-0 flex-1">{children}</div>
      {showAssistant ? (
        <aside className="bg-background hidden h-svh w-[360px] border-l lg:flex">
          <AssistantSidebar />
        </aside>
      ) : null}
    </div>
  );
}
