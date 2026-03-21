import { apiRequest, formatJSON, formatTable, log, error, success } from '../lib/api'
import type { NewsletterSubscriber } from '../../shared/types'

export async function subscribe(options: { email: string; phone?: string }): Promise<void> {
  const result = await apiRequest<{ subscribed: boolean; alreadySubscribed: boolean }>(
    '/api/newsletter/subscribe',
    {
      method: 'POST',
      body: {
        email: options.email,
        phone: options.phone,
      },
      requireAuth: false,
    }
  )

  if (!result.success) {
    error(result.error || 'Failed to subscribe')
    return
  }

  if (result.data?.alreadySubscribed) {
    success('Already subscribed')
    return
  }

  success('Subscribed')
}

export async function listSubscribers(options: {
  page?: number
  pageSize?: number
  search?: string
  json?: boolean
}): Promise<void> {
  const params = new URLSearchParams()
  if (options.page) params.set('page', String(options.page))
  if (options.pageSize) params.set('pageSize', String(options.pageSize))
  if (options.search) params.set('search', options.search)

  const result = await apiRequest<{
    data: NewsletterSubscriber[]
    total: number
    page: number
    pageSize: number
    totalPages: number
  }>(`/api/newsletter/subscribers?${params.toString()}`)

  if (!result.success) {
    error(result.error || 'Failed to list subscribers')
    return
  }

  const payload = result.data || { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
  const subscribers = payload.data || []

  if (options.json) {
    log(formatJSON(payload))
    return
  }

  log(
    formatTable(
      subscribers.map((s) => ({
        id: s.id.slice(0, 8),
        email: s.email,
        phone: s.phone || '',
        source: s.source,
        created: s.createdAt.slice(0, 10),
      })),
      [
        { key: 'id', label: 'ID', width: 8 },
        { key: 'email', label: 'Email', width: 28 },
        { key: 'phone', label: 'Phone', width: 16 },
        { key: 'source', label: 'Source', width: 10 },
        { key: 'created', label: 'Created', width: 10 },
      ]
    )
  )

  log(`\nTotal: ${payload.total} (page ${payload.page}/${payload.totalPages || 1})`)
}

export async function deleteSubscriber(id: string): Promise<void> {
  const result = await apiRequest(`/api/newsletter/subscribers/${id}`, { method: 'DELETE' })

  if (!result.success) {
    error(result.error || 'Failed to delete subscriber')
    return
  }

  success('Subscriber deleted')
}

