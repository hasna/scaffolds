import { describe, expect, test } from 'bun:test'
import { deleteNewsletterSubscriber, listNewsletterSubscribers, upsertNewsletterSubscriber } from './newsletter'
import { ensureSchema } from '../test/ensureSchema'

const shouldRun = process.env.ENGINE_BLOG_RUN_INTEGRATION_TESTS === '1'

describe('newsletter integration', () => {
  const maybeTest = shouldRun ? test : test.skip

  maybeTest('subscribe -> alreadySubscribed -> list -> delete', async () => {
    await ensureSchema()
    const stamp = Date.now()
    const email = `engine-blog-test+${stamp}@example.com`
    const phone1 = '+1 555 000 0001'
    const phone2 = '+1 555 000 0002'

    const first = await upsertNewsletterSubscriber({ email, phone: phone1, source: 'integration-test' })
    expect(first.alreadySubscribed).toBe(false)
    expect(first.subscriber.email).toBe(email)
    expect(first.subscriber.phone).toBe(phone1)

    const second = await upsertNewsletterSubscriber({ email, phone: phone2, source: 'integration-test' })
    expect(second.alreadySubscribed).toBe(true)
    expect(second.subscriber.email).toBe(email)
    expect(second.subscriber.phone).toBe(phone2)

    const listed = await listNewsletterSubscribers({ page: 1, pageSize: 50, search: email })
    expect(listed.data.some((s) => s.email.toLowerCase() === email.toLowerCase())).toBe(true)

    const deleted = await deleteNewsletterSubscriber(second.subscriber.id)
    expect(deleted).toBe(true)

    const listedAfter = await listNewsletterSubscribers({ page: 1, pageSize: 50, search: email })
    expect(listedAfter.data.some((s) => s.email.toLowerCase() === email.toLowerCase())).toBe(false)
  })
})
