import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BlogLayout } from '@/components/layout/BlogLayout'
import { PostList } from '@/components/blog/PostList'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { useSettings } from '@/hooks/useSettings'
import { SEO } from '@/components/seo/SEO'
import { useApi } from '@/hooks/useApi'
import type { PostSummary } from '@/types/post'
import { Search as SearchIcon } from 'lucide-react'

interface PaginatedPosts {
  data: PostSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface Tag {
  id: string
  name: string
  slug: string
  postCount?: number
}

interface Category {
  id: string
  name: string
  slug: string
  postCount?: number
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-[64/5] w-full">
            <Skeleton className="h-full w-full" />
          </div>
          <CardHeader className="space-y-3">
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

export function Search() {
  const { settings } = useSettings()
  const siteUrl = settings.siteUrl || window.location.origin
  const { data: tags } = useApi<Tag[]>('/tags')
  const { data: categories } = useApi<Category[]>('/categories')

  const [searchParams, setSearchParams] = useSearchParams()
  const initialQuery = (searchParams.get('q') || '').trim()

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<PostSummary[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(initialQuery.length > 0)

  const normalizedQuery = useMemo(() => query.trim(), [query])
  const hasQuery = normalizedQuery.length > 0
  const exampleCategory = (categories || []).find((c) => c.name && c.name.trim())?.name || null
  const tipExample = exampleCategory ? `“${exampleCategory}”` : '“tutorial”'

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!hasQuery) {
      return
    }

    setSearchParams({ q: normalizedQuery })
    setIsLoading(true)
    setHasSearched(true)

    try {
      const params = new URLSearchParams({
        search: normalizedQuery,
        page: '1',
        pageSize: '50',
      })
      const response = await api.get<{ success: boolean; data: PaginatedPosts }>(`/posts?${params.toString()}`)
      setResults(response.data?.data || [])
      setTotal(typeof response.data?.total === 'number' ? response.data.total : response.data?.data?.length ?? 0)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!initialQuery) return
    const fakeEvent = { preventDefault: () => undefined } as unknown as React.FormEvent
    handleSearch(fakeEvent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function clearSearch() {
    setQuery('')
    setResults([])
    setTotal(null)
    setHasSearched(false)
    setSearchParams({})
  }

  function useSuggestion(text: string) {
    setQuery(text)
    const params = new URLSearchParams({ q: text })
    setSearchParams(params)
    setHasSearched(true)
    setIsLoading(true)

    api
      .get<{ success: boolean; data: PaginatedPosts }>(`/posts?${new URLSearchParams({ search: text, page: '1', pageSize: '50' }).toString()}`)
      .then((response) => {
        setResults(response.data?.data || [])
        setTotal(typeof response.data?.total === 'number' ? response.data.total : response.data?.data?.length ?? 0)
      })
      .catch((error) => {
        console.error('Search error:', error)
        setResults([])
        setTotal(0)
      })
      .finally(() => setIsLoading(false))
  }

  return (
    <BlogLayout>
      <SEO
        title="Search"
        description="Search posts on our blog"
        url={`${siteUrl}/search`}
        noindex={true}
      />
      <div className="space-y-8">
        <div className="rounded-2xl border bg-gradient-to-b from-muted/40 to-background p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border">
              <SearchIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tight">Search</h1>
              <p className="text-muted-foreground">
                Find articles by title, phrase, or tag.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Search posts</CardTitle>
            <CardDescription>
              Tip: try a category name (e.g. {tipExample}) or a phrase.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search for posts..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={isLoading || !hasQuery} className="h-11">
                  {isLoading ? 'Searching…' : 'Search'}
                </Button>
                <Button type="button" variant="outline" onClick={clearSearch} disabled={isLoading || (!hasSearched && !hasQuery)} className="h-11">
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Separator />

        <div className="space-y-4">
          {hasSearched && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {typeof total === 'number' ? (
                  <>
                    Found <span className="text-foreground font-medium">{total}</span> result{total === 1 ? '' : 's'}
                  </>
                ) : (
                  'Searching…'
                )}
              </div>
              {hasQuery && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Query</span>
                  <Badge variant="secondary" className="max-w-[260px] truncate">{normalizedQuery}</Badge>
                </div>
              )}
            </div>
          )}

          {isLoading ? (
            <ResultsSkeleton />
          ) : hasSearched ? (
            results.length > 0 ? (
              <PostList posts={results} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No results</CardTitle>
                  <CardDescription>
                    Try a different keyword, or broaden your search.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button type="button" onClick={clearSearch} className="h-11">
                    Clear search
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Example: <span className="font-medium text-foreground">tutorial</span>, <span className="font-medium text-foreground">ai</span>, <span className="font-medium text-foreground">productivity</span>
                  </div>
                </CardContent>
              </Card>
            )
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Start searching</CardTitle>
                <CardDescription>
                  Enter a query above to find posts, or try a suggestion.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">Suggestions</div>
                <div className="flex flex-wrap gap-2">
                  {(tags || []).slice(0, 10).map((t) => (
                    <Button
                      key={t.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="min-h-0 rounded-full"
                      onClick={() => useSuggestion(t.name)}
                    >
                      {t.name}
                    </Button>
                  ))}
                  {(tags || []).length === 0 && (
                    <>
                      <Badge variant="secondary">AI</Badge>
                      <Badge variant="secondary">Product</Badge>
                      <Badge variant="secondary">Design</Badge>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </BlogLayout>
  )
}
