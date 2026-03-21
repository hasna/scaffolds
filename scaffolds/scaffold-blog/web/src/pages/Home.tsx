import { useEffect, useMemo, useState } from 'react'
import { BlogLayout } from '@/components/layout/BlogLayout'
import { PostList } from '@/components/blog/PostList'
import { RightSidebar } from '@/components/blog/RightSidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { useApi } from '@/hooks/useApi'
import { useSettings } from '@/hooks/useSettings'
import { SEO, OrganizationSchema, WebSiteSchema } from '@/components/seo/SEO'
import type { PostSummary } from '@/types/post'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface PaginatedPosts {
  data: PostSummary[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface Category {
  id: string
  name: string
  slug: string
  postCount?: number
}

interface Tag {
  id: string
  name: string
  slug: string
  postCount?: number
}

function PostCardSkeleton() {
  return (
    <div className="space-y-4">
      {/* Featured image */}
      <Skeleton className="aspect-[64/5] w-full rounded-lg" />
      {/* Title */}
      <Skeleton className="h-7 w-4/5" />
      {/* Excerpt */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      {/* Date */}
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

function PostListSkeleton() {
  return (
    <div className="space-y-12">
      {[...Array(3)].map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </div>
  )
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

export function Home() {
  const { settings } = useSettings()

  const [searchInput, setSearchInput] = useState('')
  const [categoryId, setCategoryId] = useState<string>('all')
  const [tagId, setTagId] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [posts, setPosts] = useState<PostSummary[]>([])
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 250)

  const postsEndpoint = useMemo(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (categoryId !== 'all') params.set('categoryId', categoryId)
    if (tagId !== 'all') params.set('tagId', tagId)
    params.set('page', String(page))
    params.set('pageSize', '10')
    return `/posts?${params.toString()}`
  }, [debouncedSearch, categoryId, tagId, page])

  const { data: postsData, isLoading: postsLoading } = useApi<PaginatedPosts>(postsEndpoint)
  const { data: categories } = useApi<Category[]>('/categories')
  const { data: tags } = useApi<Tag[]>('/tags')

  const siteName = settings.siteName || 'Engine Blog'
  const siteDescription = settings.siteDescription || 'A modern blog powered by AI'
  const siteUrl = settings.siteUrl || window.location.origin
  const logoUrl = settings.logoUrl

  const hasActiveFilters = debouncedSearch.length > 0 || categoryId !== 'all' || tagId !== 'all'

  useEffect(() => {
    setPage(1)
    setPosts([])
  }, [debouncedSearch, categoryId, tagId])

  useEffect(() => {
    if (!postsData) return
    setPosts((prev) => {
      if (page === 1) return postsData.data || []
      const existing = new Set(prev.map((p) => p.id))
      const next = (postsData.data || []).filter((p) => !existing.has(p.id))
      return [...prev, ...next]
    })
  }, [postsData, page])

  function clearFilters() {
    setSearchInput('')
    setCategoryId('all')
    setTagId('all')
  }

  const canLoadMore = Boolean(postsData && page < postsData.totalPages)
  const isLoadingMore = postsLoading && page > 1

  return (
    <BlogLayout
      sidebar={(
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Filter Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Input
                  type="search"
                  placeholder="Search by title or content..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-11"
                />

                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {(categories || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{typeof c.postCount === 'number' ? ` (${c.postCount})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={tagId} onValueChange={setTagId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tags</SelectItem>
                    {(tags || []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}{typeof t.postCount === 'number' ? ` (${t.postCount})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <RightSidebar />
        </div>
      )}
    >
      <SEO
        title={undefined}
        description={siteDescription}
        url={siteUrl}
        type="website"
      >
        <OrganizationSchema
          name={siteName}
          url={siteUrl}
          logo={logoUrl}
          description={siteDescription}
        />
        <WebSiteSchema
          name={siteName}
          url={siteUrl}
          description={siteDescription}
          searchUrl={`${siteUrl}/search`}
        />
      </SEO>

      {postsLoading ? (
        page === 1 ? <PostListSkeleton /> : <PostList posts={posts} excerptMaxChars={1200} excerptParagraphs={3} />
      ) : (
        <PostList posts={posts} excerptMaxChars={1200} excerptParagraphs={3} />
      )}

      <div className="mt-10 flex justify-center">
        {canLoadMore && (
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setPage((p) => p + 1)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </div>
    </BlogLayout>
  )
}
