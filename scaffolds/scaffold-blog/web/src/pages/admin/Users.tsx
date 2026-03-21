import { useState } from 'react'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApi, useApiMutation } from '@/hooks/useApi'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type ApiUser = {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'author'
  avatar: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export function Users() {
  const { data: users, refetch } = useApi<ApiUser[]>('/users')
  const { mutate, isLoading, error } = useApiMutation<ApiUser, { email: string; password: string; name: string; role: ApiUser['role'] }>()

  const { mutate: deleteUser, isLoading: isDeleting } = useApiMutation<{ deleted: true }>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const deleteTarget = (users || []).find((u) => u.id === deleteId) || null

  const { mutate: generateAvatar, isLoading: isGeneratingAvatar, error: avatarError } = useApiMutation<{ avatarUrl: string }>()
  const [avatarUserId, setAvatarUserId] = useState<string | null>(null)
  const avatarTarget = (users || []).find((u) => u.id === avatarUserId) || null
  const [avatarPrompt, setAvatarPrompt] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<ApiUser['role']>('author')

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const result = await mutate('/users', { email, password, name, role }, 'POST')
    if (result) {
      setEmail('')
      setPassword('')
      setName('')
      setRole('author')
      refetch()
    }
  }

  async function onDelete() {
    if (!deleteId) return
    const result = await deleteUser(`/users/${deleteId}`, undefined, 'DELETE')
    setDeleteId(null)
    if (result) refetch()
  }

  async function onGenerateAvatar() {
    if (!avatarUserId) return
    const prompt = avatarPrompt.trim()
    const result = await generateAvatar(`/ai/users/${avatarUserId}/avatar`, { prompt: prompt.length > 0 ? prompt : undefined }, 'POST')
    if (result) {
      setAvatarPrompt('')
      refetch()
    }
  }

  return (
    <AdminLayout>
      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
        title="Delete user?"
        description={
          deleteTarget
            ? `This will permanently delete ${deleteTarget.email}. This cannot be undone.`
            : 'This will permanently delete the user.'
        }
        confirmText="Delete"
        onConfirm={onDelete}
        confirmVariant="destructive"
        confirmDisabled={isDeleting}
      />
      <Sheet
        open={Boolean(avatarUserId)}
        onOpenChange={(open) => {
          if (!open) {
            setAvatarUserId(null)
            setAvatarPrompt('')
          }
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Generate author avatar</SheetTitle>
            <SheetDescription>
              Creates a hyperrealistic, fictional headshot PNG and updates the author profile picture.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {avatarTarget && (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-10 w-10">
                  {avatarTarget.avatar ? <AvatarImage src={avatarTarget.avatar} alt={avatarTarget.name} /> : null}
                  <AvatarFallback>{avatarTarget.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="font-medium truncate">{avatarTarget.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{avatarTarget.email}</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="avatarPrompt">Description (optional)</Label>
              <Textarea
                id="avatarPrompt"
                value={avatarPrompt}
                onChange={(e) => setAvatarPrompt(e.target.value)}
                placeholder="Leave blank for random. Example: friendly 30yo, dark hair, warm smile, studio lighting, realistic skin texture…"
                rows={6}
              />
            </div>

            {avatarError && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {avatarError.message}
              </div>
            )}
          </div>

          <SheetFooter className="mt-6">
            <Button
              type="button"
              onClick={onGenerateAvatar}
              disabled={!avatarUserId || isGeneratingAvatar}
              className="h-11 w-full"
            >
              {isGeneratingAvatar ? 'Generating…' : 'Generate & Apply'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage authors, editors, and admins.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create user</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@domain.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as ApiUser['role'])}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="author">Author</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 flex items-center justify-between gap-4">
                <div className="text-sm text-destructive">{error?.message}</div>
                <Button type="submit" disabled={isLoading} className="h-11">
                  {isLoading ? 'Creating…' : 'Create user'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users || []).map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7">
                            {u.avatar ? <AvatarImage src={u.avatar} alt={u.name} /> : null}
                            <AvatarFallback className="text-[10px]">{u.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="truncate">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell className="capitalize">{u.role}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAvatarUserId(u.id)}
                            disabled={isGeneratingAvatar}
                          >
                            Generate avatar
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isDeleting}
                            onClick={() => setDeleteId(u.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(users || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
