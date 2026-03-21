"use client";

import Link from "next/link";
import type { Route } from "next";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <FileQuestion className="h-24 w-24 mx-auto mb-8 text-muted-foreground" />
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Sorry, we couldn't find the page you're looking for. It might have been
          moved or deleted.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href={"/" as Route}>
            <Button>
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
