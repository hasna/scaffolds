import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { SectionCards } from '@/components/section-cards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const { data: stats } = useApi<any>('/admin/stats');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your blog admin panel</p>
        </div>

        <SectionCards stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentActivity?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead className="text-right">When</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentActivity.map((activity: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="text-sm">{activity.message}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {activity.timestamp}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button asChild variant="outline" className="h-12 justify-start">
                  <a href="/admin/posts/new">New post</a>
                </Button>
                <Button asChild variant="outline" className="h-12 justify-start">
                  <a href="/admin/media">Upload media</a>
                </Button>
                <Button asChild variant="outline" className="h-12 justify-start">
                  <a href="/admin/comments">Moderate comments</a>
                </Button>
                <Button asChild variant="outline" className="h-12 justify-start">
                  <a href="/admin/ai">Generate with AI</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
