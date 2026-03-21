"use client";

import { cn } from "@/lib/utils";
import { IconLoader2, IconCircleCheck, IconCircleX, IconTool } from "@tabler/icons-react";

interface ToolExecutionData {
  id: string;
  name: string;
  status: "running" | "completed" | "error";
  input: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

interface ToolExecutionProps {
  execution: ToolExecutionData;
  showDetails?: boolean;
}

const toolDisplayNames: Record<string, string> = {
  scrape_url: "Extracting profile data",
  get_resume: "Loading resume",
  create_resume: "Creating resume",
  update_resume: "Updating resume",
  list_resumes: "Listing resumes",
  add_section: "Adding section",
  update_section: "Updating section",
  remove_section: "Removing section",
  reorder_sections: "Reordering sections",
  generate_summary: "Generating summary",
  generate_bullets: "Writing bullet points",
  improve_content: "Improving content",
  tailor_for_job: "Tailoring for job",
  analyze_job_posting: "Analyzing job posting",
  create_variant: "Creating resume variant",
  compare_to_job: "Comparing to job requirements",
  export_pdf: "Generating PDF",
  export_docx: "Generating Word document",
  export_json: "Exporting data",
};

function getToolDisplayName(name: string): string {
  return toolDisplayNames[name] || name.replace(/_/g, " ");
}

export function ToolExecution({ execution, showDetails = false }: ToolExecutionProps) {
  const { name, status, error } = execution;
  const displayName = getToolDisplayName(name);

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded border px-3 py-2 text-sm",
        status === "running" && "bg-muted/50 border-muted",
        status === "completed" &&
          "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20",
        status === "error" && "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
      )}
    >
      <IconTool className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn("font-medium", status === "error" && "text-red-700 dark:text-red-400")}
          >
            {displayName}
          </span>

          {status === "running" && (
            <IconLoader2 className="text-muted-foreground h-3 w-3 animate-spin" />
          )}
          {status === "completed" && (
            <IconCircleCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
          )}
          {status === "error" && <IconCircleX className="h-4 w-4 text-red-600 dark:text-red-400" />}
        </div>

        {status === "error" && error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        {showDetails && status === "completed" && execution.result != null && (
          <pre className="text-muted-foreground bg-muted/50 mt-2 max-h-40 overflow-x-auto rounded p-2 text-xs">
            {JSON.stringify(execution.result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

interface ToolExecutionListProps {
  executions: ToolExecutionData[];
  showDetails?: boolean;
}

export function ToolExecutionList({ executions, showDetails = false }: ToolExecutionListProps) {
  if (executions.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {executions.map((execution) => (
        <ToolExecution key={execution.id} execution={execution} showDetails={showDetails} />
      ))}
    </div>
  );
}
