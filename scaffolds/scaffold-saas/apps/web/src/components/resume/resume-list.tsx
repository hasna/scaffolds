"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconDots,
  IconTrash,
  IconCopy,
  IconShare,
  IconDownload,
  IconFileText,
  IconStarFilled,
  IconExternalLink,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { ResumeContent } from "@scaffold-saas/database/schema/resumes";

interface Resume {
  id: string;
  title: string;
  slug?: string | null;
  isPublic: boolean;
  isMaster: boolean;
  targetJobTitle?: string | null;
  template: string;
  content: ResumeContent;
  createdAt: Date;
  updatedAt: Date;
}

interface ResumeListProps {
  resumes: Resume[];
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function ResumeList({ resumes, onDelete, onDuplicate }: ResumeListProps) {
  if (resumes.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <CreateNewCard />
      {resumes.map((resume) => (
        <ResumeCard key={resume.id} resume={resume} onDelete={onDelete} onDuplicate={onDuplicate} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="bg-muted mb-4 rounded-full p-4">
        <IconFileText className="text-muted-foreground h-8 w-8" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">No resumes yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Create your first resume with our AI assistant to get started
      </p>
      <Link href="/dashboard/resumes/new">
        <Button>
          <IconPlus className="mr-2 h-4 w-4" />
          Create Resume
        </Button>
      </Link>
    </div>
  );
}

function CreateNewCard() {
  return (
    <Link href="/dashboard/resumes/new">
      <Card className="hover:border-primary hover:bg-muted/50 h-full min-h-[200px] cursor-pointer border-dashed transition-colors">
        <CardContent className="flex h-full flex-col items-center justify-center py-8">
          <div className="bg-primary/10 mb-4 rounded-full p-3">
            <IconPlus className="text-primary h-6 w-6" />
          </div>
          <h3 className="mb-1 font-semibold">Create New Resume</h3>
          <p className="text-muted-foreground text-center text-sm">Build with AI assistance</p>
        </CardContent>
      </Card>
    </Link>
  );
}

interface ResumeCardProps {
  resume: Resume;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function ResumeCard({ resume, onDelete, onDuplicate }: ResumeCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const sectionCount = resume.content.sections?.length || 0;
  const hasContact = Boolean(resume.content.personalInfo?.fullName);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/v1/resumes/${resume.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onDelete?.(resume.id);
      }
    } catch (error) {
      console.error("Failed to delete resume:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/v1/resumes/${resume.id}/duplicate`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        onDuplicate?.(data.data.id);
        router.push(`/dashboard/resumes/${data.data.id}`);
      }
    } catch (error) {
      console.error("Failed to duplicate resume:", error);
    }
  };

  const handleExport = (format: string) => {
    window.open(`/api/v1/resumes/${resume.id}/export/${format}`, "_blank");
  };

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {resume.isMaster && <IconStarFilled className="h-4 w-4 text-yellow-500" />}
            <CardTitle className="line-clamp-1 text-lg">{resume.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <IconDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <IconCopy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                <IconDownload className="mr-2 h-4 w-4" />
                Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")}>
                <IconDownload className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
              {resume.isPublic && resume.slug && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a href={`/r/${resume.slug}`} target="_blank" rel="noopener noreferrer">
                      <IconExternalLink className="mr-2 h-4 w-4" />
                      View Public Page
                    </a>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive"
                disabled={isDeleting}
              >
                <IconTrash className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {resume.targetJobTitle && (
          <CardDescription className="line-clamp-1">
            Target: {resume.targetJobTitle}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {resume.template}
          </Badge>
          {resume.isPublic && (
            <Badge variant="outline" className="text-xs">
              <IconShare className="mr-1 h-3 w-3" />
              Public
            </Badge>
          )}
          {resume.isMaster && (
            <Badge variant="outline" className="text-xs">
              Master
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground text-sm">
          {sectionCount} section{sectionCount !== 1 ? "s" : ""}
          {hasContact && ` • ${resume.content.personalInfo?.fullName}`}
        </div>
      </CardContent>

      <CardFooter className="border-t pt-3">
        <div className="flex w-full items-center justify-between">
          <span className="text-muted-foreground text-xs">
            Updated {formatDate(resume.updatedAt.toISOString())}
          </span>
          <Link href={`/dashboard/resumes/${resume.id}`}>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
