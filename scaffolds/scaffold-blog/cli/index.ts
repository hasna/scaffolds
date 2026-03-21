#!/usr/bin/env bun

import { log, error, setRuntimeProfile } from './lib/api'
import * as post from './commands/post'
import * as page from './commands/page'
import * as category from './commands/category'
import * as tag from './commands/tag'
import * as comment from './commands/comment'
import * as ai from './commands/ai'
import * as settings from './commands/settings'
import * as newsletter from './commands/newsletter'
import * as seed from './commands/seed'

const rawArgs = process.argv.slice(2)

function parseGlobalProfile(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--profile' && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1]
    if (arg.startsWith('--profile=')) return arg.split('=')[1]
    if (arg === '-p' && args[i + 1] && !args[i + 1].startsWith('-')) return args[i + 1]
  }
  return undefined
}

function findCommandTokens(args: string[]): { command?: string; subcommand?: string; restArgs: string[] } {
  let commandIndex: number | undefined
  let subcommandIndex: number | undefined

  for (let i = 0; i < args.length; i++) {
    const token = args[i]
    if (token === '--') {
      // Everything after -- is positional
      if (commandIndex === undefined) commandIndex = i + 1
      else if (subcommandIndex === undefined) subcommandIndex = i + 1
      break
    }

    if (token.startsWith('--')) {
      const hasEq = token.includes('=')
      if (!hasEq && args[i + 1] && !args[i + 1].startsWith('-')) {
        i++
      }
      continue
    }

    if (token.startsWith('-') && token !== '-') {
      if ((token === '-p' || token === '-P') && args[i + 1] && !args[i + 1].startsWith('-')) {
        i++
      }
      continue
    }

    if (commandIndex === undefined) {
      commandIndex = i
      continue
    }

    if (subcommandIndex === undefined) {
      subcommandIndex = i
      break
    }
  }

  const command = commandIndex !== undefined ? args[commandIndex] : undefined
  const subcommand = subcommandIndex !== undefined ? args[subcommandIndex] : undefined
  const restArgs = subcommandIndex !== undefined
    ? args.slice(subcommandIndex + 1)
    : commandIndex !== undefined
      ? args.slice(commandIndex + 1)
      : []

  return { command, subcommand, restArgs }
}

function isHelpToken(token?: string): boolean {
  return token === 'help' || token === '--help' || token === '-h'
}

function parseOptions(args: string[]): Record<string, string | boolean> {
  const options: Record<string, string | boolean> = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      if (value !== undefined) {
        options[key] = value
      } else if (args[i + 1] && !args[i + 1].startsWith('--')) {
        options[key] = args[i + 1]
        i++
      } else {
        options[key] = true
      }
    }
  }

  return options
}

function getPositionalArg(args: string[], index: number): string | undefined {
  let positionalIndex = 0
  for (const arg of args) {
    if (!arg.startsWith('--')) {
      if (positionalIndex === index) {
        return arg
      }
      positionalIndex++
    }
  }
  return undefined
}

function showHelp(): void {
  log(`
Engine Blog CLI

Usage: engine-blog [--profile <name>] <command> <subcommand> [options]

Commands:
  post list [--status=draft|published] [--json]
  post get <slug> [--json] [--preview]
  post create --title="Title" [--content=file.md] [--status=draft]
  post update <id> [--title] [--content] [--status]
  post delete <id>
  post publish <id>

  page list [--json]
  page get <slug> [--json]
  page create --title="Title" [--slug="about"] [--content=file.md] [--status=draft] [--showInNav=true] [--navOrder=0]
  page update <id> [--title] [--slug] [--content] [--status] [--showInNav=true|false] [--navOrder=0]
  page delete <id>
  page publish <id>

  category list [--json]
  category create --name="Name" [--description]
  category delete <id>
  category header get [--json]
  category header set <all|none|slug1,slug2,...>

  tag list [--json]
  tag create --name="Name"
  tag delete <id>

  comment list [--status=pending|approved] [--postId] [--json]
  comment approve <id>
  comment spam <id>
  comment delete <id>

  newsletter subscribe --email="name@domain.com" [--phone="+1 555 555 5555"]
  newsletter list [--search="gmail"] [--page=1] [--pageSize=50] [--json]
  newsletter delete <id>

  ai generate [--topic] [--keywords] [--tone] [--length] [--publish]
  ai site-description --prompt="..." [--tone] [--maxChars=200] [--json]
  ai categories --prompt="..." [--count=10] [--tone] [--preview] [--json]
  ai logo --prompt="..." [--style="..."] [--json]
  ai author-avatar <userId> [--prompt="..."] [--json]
  ai history [--limit=20] [--json]
  ai schedule list [--json]
  ai schedule create --name --cron [--topic] [--keywords] [--tone] [--length] [--publish]
  ai schedule delete <id>
  ai schedule toggle <id>
  ai schedule run <id>

  seed demo [--posts=8] [--commentsPerPost=2] [--categoryCount=6] [--categoryPrompt="..."] [--json]

  settings get [key] [--json]
  settings set <key> <value>

  config init
  config show
  config set-url <url>
  config set-key <api-key>
  config login <email> <password>
  config profile list
  config profile add <name> --url <url> [--key <api-key>]
  config profile use <name>
  config profile delete <name>

Examples:
  engine-blog post list --status=draft
  engine-blog post create --title="My New Post" --content=./article.md
  engine-blog page create --title="About" --showInNav=true --navOrder=10
  engine-blog category header set technology,business
  engine-blog newsletter subscribe --email="me@domain.com" --phone="+1 555 555 5555"
  engine-blog ai generate --topic="Future of AI" --publish
  engine-blog ai site-description --prompt="Modern AI-powered engineering blog"
  engine-blog ai categories --prompt="Engineering, AI and product blog taxonomy" --count=12
  engine-blog ai logo --prompt="Minimal modern logo mark for an AI engineering blog" --style="monochrome, geometric"
  engine-blog ai author-avatar <userId> --prompt="Hyperrealistic headshot, dark hair, warm smile, studio lighting"
  ENGINE_BLOG_DISABLE_IMAGE_GENERATION=1 engine-blog seed demo --posts=8 --commentsPerPost=2
  engine-blog ai schedule create --name="Daily Tech" --cron="0 9 * * *" --topic="Technology"
  engine-blog config profile add acme --url https://acme.com
  engine-blog --profile acme config login admin@acme.com password
`)
}

async function main(): Promise<void> {
  const globalProfile = parseGlobalProfile(rawArgs)
  if (globalProfile) setRuntimeProfile(globalProfile)

  const { command, subcommand, restArgs } = findCommandTokens(rawArgs)

  if (!command || isHelpToken(command)) {
    showHelp()
    return
  }

  const options = parseOptions(restArgs)
  if (typeof options.profile === 'string' && options.profile.trim()) {
    setRuntimeProfile(options.profile.trim())
  }

  try {
    switch (command) {
      case 'post':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'list':
            await post.listPosts({
              status: options.status as string,
              json: options.json as boolean,
            })
            break
          case 'get':
            const slug = getPositionalArg(restArgs, 0)
            if (!slug) {
              error('Usage: engine-blog post get <slug>')
              return
            }
            await post.getPost(slug, { json: options.json as boolean, preview: options.preview as boolean })
            break
          case 'create':
            if (!options.title) {
              error('Usage: engine-blog post create --title="Title" [--content=file.md]')
              return
            }
            await post.createPost({
              title: options.title as string,
              content: options.content as string,
              status: options.status as string,
            })
            break
          case 'update':
            const updateId = getPositionalArg(restArgs, 0)
            if (!updateId) {
              error('Usage: engine-blog post update <id> [--title] [--content] [--status]')
              return
            }
            await post.updatePost(updateId, {
              title: options.title as string,
              content: options.content as string,
              status: options.status as string,
            })
            break
          case 'delete':
            const deleteId = getPositionalArg(restArgs, 0)
            if (!deleteId) {
              error('Usage: engine-blog post delete <id>')
              return
            }
            await post.deletePost(deleteId)
            break
          case 'publish':
            const publishId = getPositionalArg(restArgs, 0)
            if (!publishId) {
              error('Usage: engine-blog post publish <id>')
              return
            }
            await post.publishPost(publishId)
            break
          default:
            error(`Unknown post command: ${subcommand}`)
            log('Run: engine-blog post --help')
        }
        break

      case 'category':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'list':
            await category.listCategories({ json: options.json as boolean })
            break
          case 'create':
            if (!options.name) {
              error('Usage: engine-blog category create --name="Name"')
              return
            }
            await category.createCategory({
              name: options.name as string,
              description: options.description as string,
              parentId: options.parentId as string,
            })
            break
          case 'delete':
            const catId = getPositionalArg(restArgs, 0)
            if (!catId) {
              error('Usage: engine-blog category delete <id>')
              return
            }
            await category.deleteCategory(catId)
            break
          case 'header':
            const headerCmd = getPositionalArg(restArgs, 0)
            switch (headerCmd) {
              case 'get':
                await category.getHeaderCategories({ json: options.json as boolean })
                break
              case 'set':
                const value = getPositionalArg(restArgs, 1) || (options.slugs as string)
                if (!value) {
                  error('Usage: engine-blog category header set <all|none|slug1,slug2,...>')
                  return
                }
                await category.setHeaderCategories(value)
                break
              default:
                error(`Unknown category header command: ${headerCmd}`)
            }
            break
          default:
            error(`Unknown category command: ${subcommand}`)
        }
        break

      case 'page':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'list':
            await page.listPages({ json: options.json as boolean })
            break
          case 'get':
            const pageSlug = getPositionalArg(restArgs, 0)
            if (!pageSlug) {
              error('Usage: engine-blog page get <slug>')
              return
            }
            await page.getPage(pageSlug, { json: options.json as boolean })
            break
          case 'create':
            if (!options.title) {
              error('Usage: engine-blog page create --title="Title" [--slug="about"] [--content=file.md]')
              return
            }
            await page.createPage({
              title: options.title as string,
              slug: options.slug as string,
              content: options.content as string,
              status: options.status as string,
              showInNav: options.showInNav === true || options.showInNav === 'true',
              navOrder: options.navOrder ? parseInt(options.navOrder as string) : undefined,
            })
            break
          case 'update':
            const updatePageId = getPositionalArg(restArgs, 0)
            if (!updatePageId) {
              error('Usage: engine-blog page update <id> [--title] [--slug] [--content] [--status]')
              return
            }
            await page.updatePage(updatePageId, {
              title: options.title as string,
              slug: options.slug as string,
              content: options.content as string,
              status: options.status as string,
              showInNav: options.showInNav === undefined ? undefined : options.showInNav === true || options.showInNav === 'true',
              navOrder: options.navOrder ? parseInt(options.navOrder as string) : undefined,
            })
            break
          case 'delete':
            const deletePageId = getPositionalArg(restArgs, 0)
            if (!deletePageId) {
              error('Usage: engine-blog page delete <id>')
              return
            }
            await page.deletePage(deletePageId)
            break
          case 'publish':
            const publishPageId = getPositionalArg(restArgs, 0)
            if (!publishPageId) {
              error('Usage: engine-blog page publish <id>')
              return
            }
            await page.publishPage(publishPageId)
            break
          default:
            error(`Unknown page command: ${subcommand}`)
        }
        break

      case 'tag':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'list':
            await tag.listTags({ json: options.json as boolean })
            break
          case 'create':
            if (!options.name) {
              error('Usage: engine-blog tag create --name="Name"')
              return
            }
            await tag.createTag({ name: options.name as string })
            break
          case 'delete':
            const tagId = getPositionalArg(restArgs, 0)
            if (!tagId) {
              error('Usage: engine-blog tag delete <id>')
              return
            }
            await tag.deleteTag(tagId)
            break
          default:
            error(`Unknown tag command: ${subcommand}`)
        }
        break

      case 'comment':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'list':
            await comment.listComments({
              status: options.status as string,
              postId: options.postId as string,
              json: options.json as boolean,
            })
            break
          case 'approve':
            const approveId = getPositionalArg(restArgs, 0)
            if (!approveId) {
              error('Usage: engine-blog comment approve <id>')
              return
            }
            await comment.approveComment(approveId)
            break
          case 'spam':
            const spamId = getPositionalArg(restArgs, 0)
            if (!spamId) {
              error('Usage: engine-blog comment spam <id>')
              return
            }
            await comment.spamComment(spamId)
            break
          case 'delete':
            const commentId = getPositionalArg(restArgs, 0)
            if (!commentId) {
              error('Usage: engine-blog comment delete <id>')
              return
            }
            await comment.deleteComment(commentId)
            break
          default:
            error(`Unknown comment command: ${subcommand}`)
        }
        break

      case 'newsletter':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'subscribe':
            if (!options.email) {
              error('Usage: engine-blog newsletter subscribe --email="name@domain.com" [--phone="+1 555 555 5555"]')
              return
            }
            await newsletter.subscribe({
              email: options.email as string,
              phone: options.phone as string,
            })
            break
          case 'list':
            await newsletter.listSubscribers({
              search: options.search as string,
              page: options.page ? parseInt(options.page as string) : undefined,
              pageSize: options.pageSize ? parseInt(options.pageSize as string) : undefined,
              json: options.json as boolean,
            })
            break
          case 'delete':
            const subId = getPositionalArg(restArgs, 0)
            if (!subId) {
              error('Usage: engine-blog newsletter delete <id>')
              return
            }
            await newsletter.deleteSubscriber(subId)
            break
          default:
            error(`Unknown newsletter command: ${subcommand}`)
        }
        break

      case 'ai':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'generate':
            await ai.generate({
              topic: options.topic as string,
              keywords: options.keywords as string,
              tone: options.tone as string,
              length: options.length as string,
              publish: options.publish as boolean,
            })
            break
          case 'site-description':
            if (!options.prompt || typeof options.prompt !== 'string') {
              error('Usage: engine-blog ai site-description --prompt="..." [--tone] [--maxChars=200] [--json]')
              return
            }
            await ai.siteDescription({
              prompt: options.prompt as string,
              tone: options.tone as string,
              maxChars: options.maxChars ? parseInt(options.maxChars as string) : undefined,
              json: options.json as boolean,
            })
            break
          case 'categories':
            if (!options.prompt || typeof options.prompt !== 'string') {
              error('Usage: engine-blog ai categories --prompt="..." [--count=10] [--tone] [--preview] [--json]')
              return
            }
            await ai.categories({
              prompt: options.prompt as string,
              tone: options.tone as string,
              count: options.count ? parseInt(options.count as string) : undefined,
              apply: options.preview ? false : (options.apply === undefined ? true : options.apply === true || options.apply === 'true'),
              json: options.json as boolean,
            })
            break
          case 'logo':
            if (!options.prompt || typeof options.prompt !== 'string') {
              error('Usage: engine-blog ai logo --prompt="..." [--style="..."] [--json]')
              return
            }
            await ai.logo({
              prompt: options.prompt as string,
              style: options.style as string,
              json: options.json as boolean,
            })
            break
          case 'author-avatar':
            const userId = getPositionalArg(restArgs, 0)
            if (!userId) {
              error('Usage: engine-blog ai author-avatar <userId> [--prompt="..."] [--json]')
              return
            }
            await ai.authorAvatar({
              userId,
              prompt: options.prompt as string,
              json: options.json as boolean,
            })
            break
          case 'history':
            await ai.history({
              limit: options.limit ? parseInt(options.limit as string) : undefined,
              json: options.json as boolean,
            })
            break
          case 'schedule':
            const scheduleCmd = getPositionalArg(restArgs, 0)
            if (!scheduleCmd || isHelpToken(scheduleCmd)) {
              showHelp()
              return
            }
            switch (scheduleCmd) {
              case 'list':
                await ai.listSchedules({ json: options.json as boolean })
                break
              case 'create':
                if (!options.name || !options.cron) {
                  error('Usage: engine-blog ai schedule create --name="Name" --cron="0 9 * * *"')
                  return
                }
                await ai.createSchedule({
                  name: options.name as string,
                  cron: options.cron as string,
                  topic: options.topic as string,
                  keywords: options.keywords as string,
                  tone: options.tone as string,
                  length: options.length as string,
                  publish: options.publish as boolean,
                })
                break
              case 'delete':
                const deleteSchedId = getPositionalArg(restArgs, 1)
                if (!deleteSchedId) {
                  error('Usage: engine-blog ai schedule delete <id>')
                  return
                }
                await ai.deleteSchedule(deleteSchedId)
                break
              case 'toggle':
                const toggleId = getPositionalArg(restArgs, 1)
                if (!toggleId) {
                  error('Usage: engine-blog ai schedule toggle <id>')
                  return
                }
                await ai.toggleSchedule(toggleId)
                break
              case 'run':
                const runId = getPositionalArg(restArgs, 1)
                if (!runId) {
                  error('Usage: engine-blog ai schedule run <id>')
                  return
                }
                await ai.runSchedule(runId)
                break
              default:
                error(`Unknown ai schedule command: ${scheduleCmd}`)
            }
            break
          default:
            error(`Unknown ai command: ${subcommand}`)
        }
        break

      case 'seed':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'demo':
            await seed.seedDemoAi({
              posts: options.posts ? parseInt(options.posts as string) : undefined,
              commentsPerPost: options.commentsPerPost ? parseInt(options.commentsPerPost as string) : undefined,
              categoryCount: options.categoryCount ? parseInt(options.categoryCount as string) : undefined,
              categoryPrompt: options.categoryPrompt as string,
              json: options.json as boolean,
            })
            break
          default:
            error(`Unknown seed command: ${subcommand}`)
        }
        break

      case 'settings':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'get':
            const key = getPositionalArg(restArgs, 0)
            await settings.getSettings(key, { json: options.json as boolean })
            break
          case 'set':
            const setKey = getPositionalArg(restArgs, 0)
            const setValue = getPositionalArg(restArgs, 1)
            if (!setKey || !setValue) {
              error('Usage: engine-blog settings set <key> <value>')
              return
            }
            await settings.setSetting(setKey, setValue)
            break
          default:
            error(`Unknown settings command: ${subcommand}`)
        }
        break

      case 'config':
        if (!subcommand || isHelpToken(subcommand)) {
          showHelp()
          return
        }
        switch (subcommand) {
          case 'init':
            settings.configInit()
            break
          case 'show':
            settings.configShow()
            break
          case 'set-url':
            const url = getPositionalArg(restArgs, 0)
            if (!url) {
              error('Usage: engine-blog config set-url <url> [--profile <name>]')
              return
            }
            settings.configSetUrl(url, options.profile as string)
            break
          case 'set-key':
            const apiKey = getPositionalArg(restArgs, 0)
            if (!apiKey) {
              error('Usage: engine-blog config set-key <api-key> [--profile <name>]')
              return
            }
            settings.configSetKey(apiKey, options.profile as string)
            break
          case 'login':
            const email = getPositionalArg(restArgs, 0) || options.email as string
            const password = getPositionalArg(restArgs, 1) || options.password as string
            if (!email || !password) {
              error('Usage: engine-blog config login <email> <password> [--profile <name>]')
              return
            }
            await settings.login(email, password)
            break
          case 'profile':
            const profileCmd = getPositionalArg(restArgs, 0)
            if (!profileCmd || isHelpToken(profileCmd)) {
              showHelp()
              return
            }
            switch (profileCmd) {
              case 'list':
                settings.profileList()
                break
              case 'add':
                const name = getPositionalArg(restArgs, 1)
                const url = (options.url as string) || getPositionalArg(restArgs, 2)
                const key = options.key as string
                if (!name || !url) {
                  error('Usage: engine-blog config profile add <name> --url <url> [--key <api-key>]')
                  return
                }
                settings.profileAdd(name, url, key)
                break
              case 'use':
                const useName = getPositionalArg(restArgs, 1)
                if (!useName) {
                  error('Usage: engine-blog config profile use <name>')
                  return
                }
                settings.profileUse(useName)
                break
              case 'delete':
                const delName = getPositionalArg(restArgs, 1)
                if (!delName) {
                  error('Usage: engine-blog config profile delete <name>')
                  return
                }
                settings.profileDelete(delName)
                break
              default:
                error(`Unknown config profile command: ${profileCmd}`)
            }
            break
          default:
            error(`Unknown config command: ${subcommand}`)
        }
        break

      default:
        error(`Unknown command: ${command}`)
        log('Run: engine-blog help')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : 'An error occurred')
    process.exit(1)
  }
}

main()
