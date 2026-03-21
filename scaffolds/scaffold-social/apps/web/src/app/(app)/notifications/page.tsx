"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, MessageCircle, UserPlus, Repeat2 } from "lucide-react";
import Link from "next/link";

interface NotificationItem {
  id: string;
  type: "like" | "comment" | "follow" | "repost";
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    username: string | null;
  };
  post?: {
    id: string;
    content: string;
  } | null;
}

const notificationIcon: Record<NotificationItem["type"], React.ReactNode> = {
  like: <Heart className="h-4 w-4 text-red-500" />,
  comment: <MessageCircle className="h-4 w-4 text-blue-500" />,
  follow: <UserPlus className="h-4 w-4 text-green-500" />,
  repost: <Repeat2 className="h-4 w-4 text-emerald-500" />,
};

const notificationText: Record<NotificationItem["type"], string> = {
  like: "liked your post",
  comment: "commented on your post",
  follow: "started following you",
  repost: "reposted your post",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-64" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>

      {notifications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>No notifications yet.</p>
          </CardContent>
        </Card>
      )}

      {notifications.map((notif) => {
        const username = notif.actor.username ?? notif.actor.name ?? "unknown";
        const initials = (notif.actor.name ?? username)
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        return (
          <Card key={notif.id} className={notif.read ? "" : "border-primary/30 bg-primary/5"}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <Link href={`/profile/${username}`}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notif.actor.avatarUrl ?? undefined} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                    {notificationIcon[notif.type]}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm">
                    <Link href={`/profile/${username}`} className="font-semibold hover:underline">
                      {notif.actor.name ?? username}
                    </Link>{" "}
                    {notificationText[notif.type]}
                  </p>
                  {notif.post && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      {notif.post.content}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
