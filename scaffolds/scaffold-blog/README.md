# engine-blog

Blog engine.

## Versioning / Releases

- The footer version (`APP_VERSION`) is injected at build time from `git describe --tags --dirty --always` (falls back to `package.json` version).
- To cut a release:
  - Commit your changes
  - Create a tag like `v0.1.1` and push it
  - GitHub Actions will run CI and create a GitHub Release on tag push

## CLI

Run locally:

- `bun run cli -- help`
- `bun run cli -- post list`
- `./engine-blog help`

Install an `engine-blog` binary (requires Bun):

- `bun link`
- `engine-blog help`

Multiple sites (profiles):

- `engine-blog config profile add local --url http://localhost:8030`
- `engine-blog config profile add acme --url https://acme.com`
- `engine-blog config profile use acme`
- `engine-blog --profile local post list`
