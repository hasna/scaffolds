import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SidebarProps {
  categories: Array<{
    id: number;
    name: string;
    slug: string;
    postCount?: number;
  }>;
  tags: Array<{
    id: number;
    name: string;
    slug: string;
    postCount?: number;
  }>;
}

export function Sidebar({ categories, tags }: SidebarProps) {
  return (
    <aside className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  to={`/category/${category.slug}`}
                  className="flex justify-between items-center text-sm hover:text-primary transition-colors"
                >
                  <span>{category.name}</span>
                  {category.postCount !== undefined && (
                    <Badge variant="secondary">{category.postCount}</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Link key={tag.id} to={`/tag/${tag.slug}`}>
                <Badge variant="outline">{tag.name}</Badge>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
