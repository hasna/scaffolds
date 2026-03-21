"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Star, Loader2 } from "lucide-react";
import Link from "next/link";

interface ReviewRow {
  id: string;
  productName: string;
  productSlug: string;
  authorName: string | null;
  authorEmail: string;
  rating: number;
  title: string | null;
  content: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  useEffect(() => {
    fetchReviews();
  }, [filter]);

  async function fetchReviews() {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/admin/reviews" : `/api/admin/reviews?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.data ?? []);
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleModerate(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch(`/api/v1/reviews/${id}/${action}`, { method: "POST" });
      if (res.ok) fetchReviews();
    } catch (err) {
      console.error("Moderation action failed:", err);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Review Moderation</h1>
        <p className="text-muted-foreground">Approve or reject submitted reviews.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <Link
                      href={`/products/${review.productSlug}`}
                      target="_blank"
                      className="hover:underline"
                    >
                      {review.productName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium">{review.authorName ?? "—"}</div>
                      <div className="text-muted-foreground text-xs">{review.authorEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{review.rating}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {review.title && (
                      <div className="text-sm font-medium">{review.title}</div>
                    )}
                    <div className="text-muted-foreground line-clamp-2 text-xs">
                      {review.content}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariants[review.status]}>{review.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {review.status !== "approved" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Approve"
                          onClick={() => handleModerate(review.id, "approve")}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {review.status !== "rejected" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title="Reject"
                          onClick={() => handleModerate(review.id, "reject")}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {reviews.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground py-12 text-center">
                    No {filter === "all" ? "" : filter} reviews found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
