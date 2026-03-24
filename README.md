# @hasna/scaffolds

App scaffolds for AI agents — saas, agent, blog, news, social, competition, review, landing pages

[![npm](https://img.shields.io/npm/v/@hasna/scaffolds)](https://www.npmjs.com/package/@hasna/scaffolds)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

## Install

```bash
npm install -g @hasna/scaffolds
```

## CLI Usage

```bash
scaffolds --help
```

- `scaffolds list`
- `scaffolds search <query>`
- `scaffolds info <name>`
- `scaffolds install <name>`
- `scaffolds categories`

## MCP Server

```bash
scaffolds-mcp
```

## Cloud Sync

This package supports cloud sync via `@hasna/cloud`:

```bash
cloud setup
cloud sync push --service scaffolds
cloud sync pull --service scaffolds
```

## Data Directory

Data is stored in `~/.hasna/scaffolds/`.

## License

Apache-2.0 -- see [LICENSE](LICENSE)
