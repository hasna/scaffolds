import { PostCard } from './PostCard';
import type { PostSummary } from '@/types/post';

interface PostListProps {
  posts: PostSummary[];
  excerptMaxChars?: number;
  excerptLines?: 2 | 3 | 6;
  excerptParagraphs?: number;
}

export function PostList({ posts, excerptMaxChars, excerptLines, excerptParagraphs }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No posts found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          excerptMaxChars={excerptMaxChars}
          excerptLines={excerptLines}
          excerptParagraphs={excerptParagraphs}
        />
      ))}
    </div>
  );
}
