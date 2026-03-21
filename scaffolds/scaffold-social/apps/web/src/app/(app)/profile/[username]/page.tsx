"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, Repeat2 } from "lucide-react";
import Link from "next/link";

interface ProfileData {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  website: string | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
}

interface Post {
  id: string;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  createdAt: string;
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (params.username) {
      fetchProfile();
    }
  }, [params.username]);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/profiles/${params.username}`);
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setPosts(data.posts ?? []);
        setFollowing(data.profile.isFollowing ?? false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleFollow() {
    if (!profile) return;
    setFollowLoading(true);
    try {
      const res = await fetch("/api/v1/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: profile.userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowing(data.following);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followersCount: prev.followersCount + (data.following ? 1 : -1),
              }
            : prev,
        );
      }
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium">User not found</p>
        <p className="text-sm">@{params.username} doesn&apos;t exist.</p>
      </div>
    );
  }

  const isOwnProfile = session?.user?.id === profile.userId;
  const initials = (profile.displayName ?? profile.username)
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={profile.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{profile.displayName ?? profile.username}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
            {!isOwnProfile && (
              <Button
                variant={following ? "outline" : "default"}
                onClick={toggleFollow}
                disabled={followLoading}
              >
                {following ? "Unfollow" : "Follow"}
              </Button>
            )}
          </div>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-sm text-primary hover:underline"
            >
              {profile.website}
            </a>
          )}
          <div className="mt-3 flex gap-6 text-sm">
            <span>
              <strong>{profile.postsCount}</strong>{" "}
              <span className="text-muted-foreground">Posts</span>
            </span>
            <span>
              <strong>{profile.followersCount}</strong>{" "}
              <span className="text-muted-foreground">Followers</span>
            </span>
            <span>
              <strong>{profile.followingCount}</strong>{" "}
              <span className="text-muted-foreground">Following</span>
            </span>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div>
        <h2 className="mb-4 font-semibold text-muted-foreground uppercase tracking-wide text-xs">
          Posts
        </h2>
        {posts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <p>No posts yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <p className="whitespace-pre-wrap break-words">{post.content}</p>
                  {post.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.imageUrl}
                      alt="Post image"
                      className="mt-3 max-h-80 w-full rounded-lg object-cover"
                    />
                  )}
                  <div className="mt-3 flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Heart className="h-4 w-4" />
                      {post.likesCount}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4" />
                      {post.commentsCount}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Repeat2 className="h-4 w-4" />
                      {post.repostsCount}
                    </span>
                    <span className="ml-auto text-xs">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
