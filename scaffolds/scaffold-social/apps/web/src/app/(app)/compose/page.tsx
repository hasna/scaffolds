"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image, X } from "lucide-react";

const MAX_CHARS = 500;

export default function ComposePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const charsLeft = MAX_CHARS - content.length;
  const isOverLimit = charsLeft < 0;
  const isEmpty = content.trim().length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEmpty || isOverLimit) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          imageUrl: imageUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to post. Please try again.");
        return;
      }

      router.push("/feed");
    } finally {
      setSubmitting(false);
    }
  }

  const name = session?.user?.name ?? "You";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New Post</h1>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="What's on your mind?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[120px] resize-none border-0 p-0 text-base shadow-none focus-visible:ring-0"
                  autoFocus
                />

                {showImageInput && (
                  <div className="space-y-1">
                    <Label htmlFor="imageUrl" className="text-xs text-muted-foreground">
                      Image URL
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="imageUrl"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setShowImageInput(false);
                          setImageUrl("");
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="mt-2 max-h-48 w-full rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-between border-t pt-3">
              <div className="flex items-center gap-2">
                {!showImageInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowImageInput(true)}
                    title="Add image URL"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm tabular-nums ${
                    isOverLimit
                      ? "text-destructive font-semibold"
                      : charsLeft <= 50
                        ? "text-orange-500"
                        : "text-muted-foreground"
                  }`}
                >
                  {charsLeft}
                </span>
                <Button type="submit" disabled={isEmpty || isOverLimit || submitting}>
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
