import { useState, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';

export function Media() {
  const { data: files, refetch } = useApi<any[]>('/media');
  const { mutate, isLoading } = useApiMutation();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteFile = (files || []).find((f) => f.id === deleteId) || null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Note: For file uploads, you'd need to modify the API client
    // to handle multipart/form-data
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        refetch();
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    await mutate(`/media/${id}`, undefined, 'DELETE');
    refetch();
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL copied to clipboard')
    } catch {
      toast.error('Failed to copy URL')
    }
  };

  return (
    <AdminLayout>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete file?"
        description={deleteFile ? `This will permanently delete “${deleteFile.filename}”.` : 'This will permanently delete the file.'}
        confirmText="Delete"
        onConfirm={async () => {
          if (!deleteId) return
          await handleDelete(deleteId)
          setDeleteId(null)
        }}
        confirmVariant="destructive"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-muted-foreground">
            Upload and manage your media files
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload New File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*"
              />
              {selectedFile && (
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground flex-1">
                    Selected: {selectedFile.name}
                  </p>
                  <Button onClick={handleUpload} disabled={isLoading}>
                    {isLoading ? 'Uploading...' : 'Upload'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Files</CardTitle>
          </CardHeader>
          <CardContent>
            {!files || files.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No files uploaded yet.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="group relative aspect-square border rounded-lg overflow-hidden"
                  >
                    <img
                      src={file.path}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <Button
                        onClick={() => copyUrl(file.path)}
                        size="sm"
                        variant="secondary"
                      >
                        Copy URL
                      </Button>
                      <Button
                        onClick={() => setDeleteId(file.id)}
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
