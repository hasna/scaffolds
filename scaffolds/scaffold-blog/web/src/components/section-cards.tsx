import {
  FileText,
  MessageSquare,
  PenLine,
  CheckCircle2,
} from "lucide-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards({
  stats,
}: {
  stats?: {
    totalPosts?: number
    publishedPosts?: number
    draftPosts?: number
    pendingComments?: number
  } | null
}) {
  const totalPosts = stats?.totalPosts ?? 0
  const publishedPosts = stats?.publishedPosts ?? 0
  const draftPosts = stats?.draftPosts ?? 0
  const pendingComments = stats?.pendingComments ?? 0

  return (
    <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4 grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card">
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Total Posts</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {totalPosts.toLocaleString()}
          </CardTitle>
          <FileText className="absolute right-4 top-4 size-5 text-muted-foreground" />
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Published</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {publishedPosts.toLocaleString()}
          </CardTitle>
          <CheckCircle2 className="absolute right-4 top-4 size-5 text-muted-foreground" />
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Drafts</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {draftPosts.toLocaleString()}
          </CardTitle>
          <PenLine className="absolute right-4 top-4 size-5 text-muted-foreground" />
        </CardHeader>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Pending Comments</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {pendingComments.toLocaleString()}
          </CardTitle>
          <MessageSquare className="absolute right-4 top-4 size-5 text-muted-foreground" />
        </CardHeader>
      </Card>
    </div>
  )
}
