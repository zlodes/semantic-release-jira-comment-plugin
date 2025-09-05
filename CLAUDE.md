# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a semantic-release plugin that automatically adds comments to JIRA issues mentioned in commit messages when a release is published. The plugin is written in TypeScript and uses the JIRA REST API v3.

## Commands

- `npm run build` - Compile TypeScript to JavaScript in the `lib/` directory
- `npm test` - Run the Jest test suite
- `npm run lint` - Run ESLint on the source code
- `npm run prepare` - Build the project (runs automatically on install)

## Architecture

### Core Components

- `src/index.ts` - Main plugin entry point that implements the semantic-release `success` hook
- `src/jira-client.ts` - JIRA API client for authentication and issue operations
- `src/issue-extractor.ts` - Utility to extract JIRA issue keys from commit messages using regex patterns
- `src/types.ts` - TypeScript interfaces for plugin configuration and semantic-release context

### Key Features

- Extracts JIRA issue keys from commit messages using configurable regex patterns (default: `/\b[A-Z][A-Z0-9]*-\d+\b/g`)
- Supports custom comment templates with variable substitution ({{issueKey}}, {{packageName}}, {{version}}, {{gitTag}}, {{gitHead}})
- Uses environment variables for JIRA authentication (secure, no credentials in config)
- Uses JIRA API v3 with basic authentication (email + API token)
- Graceful error handling - continues processing other issues if one fails
- Comprehensive test coverage with Jest and mocked dependencies

### Configuration

JIRA authentication is configured via environment variables (for security):

```bash
JIRA_HOST=domain.atlassian.net
JIRA_EMAIL=user@example.com
JIRA_TOKEN=api-token
SEMANTIC_RELEASE_PACKAGE=project-name  # set by semantic-release
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
- Default comment template: "The issue ({{issueKey}}) was included in version {{version}} of {{packageName}} 🎉"
- Early validation prevents releases with invalid JIRA configuration
- Runtime API errors are caught and logged but don't fail the release process
- Issue verification happens before commenting to avoid API errors on non-existent issues  
- Each issue gets a personalized comment with its specific issue key
