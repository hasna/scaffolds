# /commit - Create Logical Git Commits

Create logical, atomic git commits from all uncommitted changes and push to GitHub.

## Usage

```
/commit
```

## What This Command Does

This command spawns the `git-commits` sub-agent which will:

1. **Analyze Changes** - Review all staged, unstaged, and untracked files
2. **Group Logically** - Group related changes into atomic commits
3. **Create Commits** - Write conventional commit messages (feat, fix, chore, etc.)
4. **Push to GitHub** - Push all commits to the remote repository
5. **Create Repo if Needed** - Create a private repo in `hasnaxyz` org if none exists

## Instructions for AI

When this command is invoked, you MUST use the Task tool to spawn the `git-commits` sub-agent:

```
Use the Task tool with:
- subagent_type: "general-purpose"
- prompt: "You are the git-commits agent. Analyze all uncommitted changes in this repository and create logical, atomic commits following conventional commit format. Then push to GitHub. If no remote exists, create a PRIVATE repository in the hasnaxyz organization.

Follow these steps:
1. Run `git status` to see all changes
2. Run `git diff --stat` to see change summary
3. Group related files into logical commits
4. For each group, stage files and create a commit with conventional format
5. After all commits, push to origin
6. If no origin exists, run `gh repo create hasnaxyz/<repo-name> --private --source=. --remote=origin`

Conventional commit types: feat, fix, docs, style, refactor, perf, test, chore, ci, build

IMPORTANT:
- NEVER force push
- ALWAYS create PRIVATE repos
- NEVER commit .env or secrets
- Use descriptive commit messages explaining WHY not just WHAT

Report summary of commits created when done."
```

## Example Output

```
Created 3 logical commits:

1. feat(billing): implement Stripe Elements checkout
   - apps/web/src/components/billing/checkout-form.tsx
   - apps/web/src/app/api/v1/billing/checkout/route.ts
   - apps/web/src/lib/stripe.ts

2. test(billing): add checkout flow tests
   - apps/web/src/__tests__/billing/checkout.test.ts

3. chore(config): update environment variables
   - .env.example
   - apps/web/.env.example

Pushed to: https://github.com/hasnaxyz/scaffold-social
```

## When to Use

- Before stopping a session (check-git hook will remind you)
- After completing a feature or fix
- When you have multiple unrelated changes to organize
- When you need to push work to GitHub

## Related

- **Agent:** `.claude/agents/git-commits.md`
- **Hook:** `.claude/hooks/check-git.ts` (blocks stop if uncommitted changes)
