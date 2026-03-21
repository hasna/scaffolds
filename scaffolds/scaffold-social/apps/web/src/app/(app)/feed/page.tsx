"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Heart, MessageCircle, Repeat2, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    username: string | null;
  };
  isLiked?: boolean;
}

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchFeed();
  }, []);

  async function fetchFeed() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(postId: string) {
    const isLiked = likedPosts.has(postId);
    // Optimistic update
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likesCount: p.likesCount + (isLiked ? -1 : 1) } : p,
      ),
    );

    await fetch(`/api/v1/posts/${postId}/like`, { method: "POST" });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feed</h1>
        <Button asChild>
          <Link href="/compose">New Post</Link>
        </Button>
      </div>

      {posts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="mb-2 font-medium">Nothing here yet.</p>
            <p className="text-sm">Follow some people or create your first post!</p>
            <Button className="mt-4" asChild>
              <Link href="/compose">Write a post</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          isLiked={likedPosts.has(post.id)}
          currentUserId={session?.user?.id}
          onLike={() => toggleLike(post.id)}
        />
      ))}
    </div>
  );
}

function PostCard({
  post,
  isLiked,
  onLike,
}: {
  post: Post;
  isLiked: boolean;
  currentUserId?: string;
  onLike: () => void;
}) {
  const initials = post.author.name
    ? post.author.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const username = post.author.username ?? post.author.name ?? "unknown";
  const timeAgo = formatTimeAgo(new Date(post.createdAt));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Link href={`/profile/${username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatarUrl ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${username}`}
                className="font-semibold hover:underline truncate"
              >
                {post.author.name ?? username}
              </Link>
              <span className="text-sm text-muted-foreground">@{username}</span>
              <span className="text-sm text-muted-foreground ml-auto shrink-0">{timeAgo}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words">{post.content}</p>
            {post.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.imageUrl}
                alt="Post image"
                className="mt-3 max-h-80 w-full rounded-lg object-cover"
              />
            )}
            <div className="mt-3 flex items-center gap-6 text-muted-foreground">
              <button
                onClick={onLike}
                className={`flex items-center gap-1.5 text-sm transition-colors hover:text-red-500 ${isLiked ? "text-red-500" : ""}`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                <span>{post.likesCount}</span>
              </button>
              <Link
                href={`/feed`}
                className="flex items-center gap-1.5 text-sm hover:text-blue-500"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{post.commentsCount}</span>
              </Link>
              <button className="flex items-center gap-1.5 text-sm hover:text-green-500">
                <Repeat2 className="h-4 w-4" />
                <span>{post.repostsCount}</span>
              </button>
              <button className="ml-auto hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return `${diffSec}s`;
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString();
}
