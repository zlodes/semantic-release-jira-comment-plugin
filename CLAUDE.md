# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a semantic-release plugin that automatically adds comments to JIRA issues mentioned in commit messages when a release is published. The plugin is written in TypeScript and uses the JIRA REST API v3.

## Commands

- `pnpm run build` - Compile TypeScript to JavaScript in the `lib/` directory
- `pnpm test` - Run the Jest test suite
- `pnpm run lint` - Run ESLint on the source code
- `pnpm install` - Install dependencies (uses pnpm for faster, more efficient installs)
- `pnpm run prepare` - Build the project (runs automatically on install)

## Architecture

### Core Components

- `src/index.ts` - Main plugin entry point that implements the semantic-release `success` hook
- `src/config.ts` - Resolves JIRA configuration (basic auth or OAuth2) from environment variables
- `src/jira-client.ts` - JIRA API client for authentication and issue operations
- `src/oauth2.ts` - OAuth2 client credentials token provider with in-memory caching
- `src/issue-extractor.ts` - Utility to extract JIRA issue keys from commit messages using regex patterns
- `src/types.ts` - TypeScript interfaces for plugin configuration and semantic-release context

### Key Features

- Extracts JIRA issue keys from commit messages using configurable regex patterns (default: `/\b[A-Z][A-Z0-9]*-\d+\b/g`)
- Supports custom comment templates with variable substitution ({{issueKey}}, {{packageName}}, {{version}}, {{gitTag}}, {{gitHead}})
- Uses environment variables for JIRA authentication (secure, no credentials in config)
- Uses JIRA API v3 with either basic authentication (email + API token) or OAuth2 client credentials
- Graceful error handling - continues processing other issues if one fails
- Comprehensive test coverage with Jest and mocked dependencies

### Configuration

JIRA authentication is configured via environment variables (for security).

Basic authentication:

```bash
JIRA_BASE_URL=https://domain.atlassian.net
JIRA_EMAIL=user@example.com
JIRA_TOKEN=api-token
SEMANTIC_RELEASE_PACKAGE=project-name  # set by semantic-release
```

OAuth2 (client credentials) — takes precedence when any of these is set:

```bash
JIRA_API_URL=https://api.atlassian.com/ex/jira/8a1f5c72-6d34-4b90-b1e7-9f0c2d54ab31
JIRA_CLIENT_ID=client-id
JIRA_CLIENT_SECRET=client-secret
JIRA_OAUTH_TOKEN_URL=https://auth.atlassian.com/oauth/token  # optional
JIRA_OAUTH_AUDIENCE=api.atlassian.com                        # optional
```

Optional plugin configuration:

```json
{
  "commentTemplate": "The issue ({{issueKey}}) was included in version {{version}} of {{packageName}} 🎉",
  "issuePattern": "\\b[A-Z]+-\\d+\\b"
}
```

## Development Notes

- **Plugin Lifecycle**: The plugin implements both `verifyConditions` and `success` hooks
  - `verifyConditions`: Early validation of JIRA credentials (fails fast if invalid)
  - `success`: Main execution phase that posts comments to issues
- Uses axios for HTTP requests to JIRA REST API v3
- JIRA credentials are read from environment variables only (never from config files)
- `resolveJiraConfig()` in `src/config.ts` is the single source of truth for auth mode selection: any OAuth2 variable switches the plugin to OAuth2 and disables the basic auth fallback
- OAuth2 tokens are attached by an axios request interceptor; `OAuth2TokenProvider` caches the token and renews it 60s before expiry
- Default comment template: "The issue ({{issueKey}}) was included in version {{version}} of {{packageName}} 🎉"
- Early validation prevents releases with invalid JIRA configuration
- Runtime API errors are caught and logged but don't fail the release process
- Issue verification happens before commenting to avoid API errors on non-existent issues  
- Each issue gets a personalized comment with its specific issue key

## CI/CD

### GitHub Actions Workflows

- `.github/workflows/ci.yml` - Main CI workflow that runs on push/PR
  - Tests against Node.js 18, 20, 22
  - Runs linting, testing, and building
  - Includes coverage reporting to Codecov
