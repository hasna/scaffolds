"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

export default function ApiReferencePage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:5900";

  return (
    <div className="min-h-screen">
      <ApiReferenceReact
        configuration={{
          url: `${baseUrl}/api/docs`,
        }}
      />
    </div>
  );
}
