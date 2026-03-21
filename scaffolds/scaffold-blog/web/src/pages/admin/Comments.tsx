import { useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { formatRelativeTime } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function Comments() {
  const { data: comments, refetch } = useApi<any[]>('/admin/comments');
  const { mutate } = useApiMutation();
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const deleteComment = useMemo(
    () => (comments || []).find((c) => c.id === deleteId) || null,
    [comments, deleteId]
  )

  const handleApprove = async (id: number) => {
    await mutate(`/admin/comments/${id}/approve`, undefined, 'PATCH');
    refetch();
  };

  const handleReject = async (id: number) => {
    await mutate(`/admin/comments/${id}/reject`, undefined, 'PATCH');
    refetch();
  };

  const handleDelete = async (id: number) => {
    await mutate(`/admin/comments/${id}`, undefined, 'DELETE');
    refetch();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete comment?"
        description={deleteComment ? `This will permanently delete the comment by ${deleteComment.author}.` : 'This will permanently delete the comment.'}
        confirmText="Delete"
        onConfirm={async () => {
          if (deleteId === null) return
          await handleDelete(deleteId)
          setDeleteId(null)
        }}
        confirmVariant="destructive"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Comments</h1>
          <p className="text-muted-foreground">
            Moderate and manage user comments
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Comments</CardTitle>
          </CardHeader>
          <CardContent>
            {!comments || comments.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No comments yet.
              </p>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">
                            {comment.author}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {comment.email}
                          </span>
                          {getStatusBadge(comment.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          On: {comment.post?.title} •{' '}
                          {formatRelativeTime(comment.createdAt)}
                        </p>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {comment.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleApprove(comment.id)}
                            size="sm"
                            variant="default"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => handleReject(comment.id)}
                            size="sm"
                            variant="outline"
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => setDeleteId(comment.id)}
                        size="sm"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
