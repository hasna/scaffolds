import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApiMutation } from '@/hooks/useApi';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface GenerationResult {
  postId: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
}

interface CategorySeedResult {
  applied: boolean
  created: number
  updated: number
  categories: Array<{ id?: string; name: string; slug: string; description?: string | null }>
}

interface LogoResult {
  logoUrl: string
  faviconUrl: string
}

export function AI() {
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState<'professional' | 'casual' | 'technical'>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [result, setResult] = useState<GenerationResult | null>(null);

  const { mutate, isLoading, error } = useApiMutation<GenerationResult>();
  const { mutate: mutateCategories, isLoading: isSeeding, error: seedError } = useApiMutation<CategorySeedResult>();
  const { mutate: mutateLogo, isLoading: isGeneratingLogo, error: logoError } = useApiMutation<LogoResult>()

  const [catPrompt, setCatPrompt] = useState('')
  const [catTone, setCatTone] = useState<'professional' | 'casual' | 'technical'>('professional')
  const [catCount, setCatCount] = useState('10')
  const [catResult, setCatResult] = useState<CategorySeedResult | null>(null)

  const [logoPrompt, setLogoPrompt] = useState('')
  const [logoStyle, setLogoStyle] = useState('')
  const [logoResult, setLogoResult] = useState<LogoResult | null>(null)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedKeywords = keywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const generated = await mutate('/ai/generate', {
      topic,
      keywords: parsedKeywords.length > 0 ? parsedKeywords : undefined,
      tone,
      length,
      autoPublish: false,
    });

    if (generated) {
      setResult(generated);
    }
  };

  async function runCategoryGeneration(apply: boolean) {
    const count = parseInt(catCount) || 10
    const result = await mutateCategories('/ai/categories', {
      prompt: catPrompt,
      tone: catTone,
      count,
      apply,
    })
    if (result) setCatResult(result)
  }

  async function runLogoGeneration() {
    const result = await mutateLogo('/ai/logo', {
      prompt: logoPrompt,
      style: logoStyle.trim().length > 0 ? logoStyle.trim() : undefined,
    })
    if (result) setLogoResult(result)
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">AI Content Generation</h1>
          <p className="text-muted-foreground">
            Generate a new draft post using AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Content</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Future of AI"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Keywords</Label>
                  <Textarea
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="comma-separated keywords (optional)"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={(v) => setTone(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Length</Label>
                  <Select value={length} onValueChange={(v) => setLength(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short">Short</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="long">Long</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error.message}
                  </div>
                )}

                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Generate Content'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Result</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Created post</div>
                  <div className="text-base font-semibold">{result.title}</div>
                  <div className="text-sm text-muted-foreground">
                    Status: <span className="text-foreground">{result.status}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button asChild variant="outline" size="sm">
                      <a href={`/admin/posts/${result.postId}/edit`}>Edit</a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={`/post/${result.slug}`} target="_blank" rel="noreferrer">
                        View
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Generate a post to see results here
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate logo with AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="logoPrompt">Prompt</Label>
                <Textarea
                  id="logoPrompt"
                  value={logoPrompt}
                  onChange={(e) => setLogoPrompt(e.target.value)}
                  placeholder="Describe the vibe and symbol you want (e.g. modern tech blog, minimal, abstract circuit + leaf)…"
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoStyle">Style notes (optional)</Label>
                <Input
                  id="logoStyle"
                  value={logoStyle}
                  onChange={(e) => setLogoStyle(e.target.value)}
                  placeholder="e.g. monochrome, rounded, geometric, soft gradients…"
                />
              </div>

              {logoError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {logoError.message}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  onClick={runLogoGeneration}
                  disabled={isGeneratingLogo || logoPrompt.trim().length < 5}
                >
                  {isGeneratingLogo ? 'Generating…' : 'Generate & Apply'}
                </Button>
                <Button asChild variant="outline" disabled={!logoResult}>
                  <Link to="/admin/settings">View in Settings</Link>
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                Regenerating will override the current logo and favicon.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo result</CardTitle>
            </CardHeader>
            <CardContent>
              {logoResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
                      <img src={logoResult.logoUrl} alt="Generated logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Logo</div>
                      <a className="text-sm underline" href={logoResult.logoUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>
                      <div className="text-sm text-muted-foreground">Favicon</div>
                      <a className="text-sm underline" href={logoResult.faviconUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Refresh the public site to see the new header logo.
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Generate a logo to see it here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Seed categories with AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="catPrompt">Prompt</Label>
                <Textarea
                  id="catPrompt"
                  value={catPrompt}
                  onChange={(e) => setCatPrompt(e.target.value)}
                  placeholder="Describe your blog, target audience, and what you want the categories to cover..."
                  rows={5}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={catTone} onValueChange={(v) => setCatTone(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Count</Label>
                  <Select value={catCount} onValueChange={setCatCount}>
                    <SelectTrigger>
                      <SelectValue placeholder="How many?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="30">30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {seedError && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {seedError.message}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => runCategoryGeneration(false)}
                  disabled={isSeeding || catPrompt.trim().length < 5}
                >
                  {isSeeding ? 'Working…' : 'Preview'}
                </Button>
                <Button
                  type="button"
                  onClick={() => runCategoryGeneration(true)}
                  disabled={isSeeding || catPrompt.trim().length < 5}
                >
                  {isSeeding ? 'Seeding…' : 'Generate & Seed'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Category result</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/categories">Manage</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {catResult ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={catResult.applied ? 'default' : 'secondary'}>
                      {catResult.applied ? 'Applied' : 'Preview'}
                    </Badge>
                    {catResult.applied && (
                      <>
                        <Badge variant="outline">Created {catResult.created}</Badge>
                        <Badge variant="outline">Updated {catResult.updated}</Badge>
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    {(catResult.categories || []).map((c) => (
                      <div key={c.slug} className="rounded-md border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">/{c.slug}</div>
                        </div>
                        {c.description ? (
                          <div className="mt-1 text-sm text-muted-foreground">{c.description}</div>
                        ) : null}
                      </div>
                    ))}
                    {(catResult.categories || []).length === 0 && (
                      <div className="text-sm text-muted-foreground">No categories returned.</div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Preview or seed categories to see results here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
