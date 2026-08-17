# @zlodes/semantic-release-jira-comment-plugin

[![codecov](https://codecov.io/github/zlodes/semantic-release-jira-comment-plugin/graph/badge.svg?token=R42ZYH922J)](https://codecov.io/github/zlodes/semantic-release-jira-comment-plugin)

A semantic-release plugin that automatically adds comments with release information to JIRA issues mentioned in commits.

## Installation

### Via pnpm

```shell
pnpm add -D @zlodes/semantic-release-jira-comment-plugin
```

### Via npm

```shell
npm install --save-dev @zlodes/semantic-release-jira-comment-plugin
```

## Usage

First, set up the environment variables for one of the two supported authentication schemes.

Basic authentication (email + API token):

```bash
export JIRA_BASE_URL=https://your-domain.atlassian.net
export JIRA_EMAIL=your-email@example.com
export JIRA_TOKEN=your-api-token
```

OAuth 2.0 (client credentials):

```bash
export JIRA_API_URL=https://api.atlassian.com/ex/jira/8a1f5c72-6d34-4b90-b1e7-9f0c2d54ab31
export JIRA_CLIENT_ID=your-client-id
export JIRA_CLIENT_SECRET=your-client-secret
```
 
Then add the plugin to your semantic-release configuration:

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    "@zlodes/semantic-release-jira-comment-plugin"
  ]
}
```

Or with optional configuration:

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/npm",
    [
      "@zlodes/semantic-release-jira-comment-plugin",
      {
        "commentTemplate": "Custom comment for {{issueKey}}: {{packageName}} v{{version}} released!",
        "issuePattern": "\\b(PROJ|TASK)-\\d+\\b"
      }
    ]
  ]
}
```

## Configuration

### Authentication

The plugin supports two authentication schemes. OAuth 2.0 takes precedence: as soon as any of
`JIRA_API_URL`, `JIRA_CLIENT_ID` or `JIRA_CLIENT_SECRET` is set, the plugin expects a complete
OAuth 2.0 configuration and will not fall back to basic authentication.

#### Basic authentication

- `JIRA_BASE_URL`: Your JIRA instance base url (e.g., "https://your-domain.atlassian.net")
- `JIRA_EMAIL`: Your JIRA account email
- `JIRA_TOKEN`: Your JIRA API token ([How to create an API token](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/))

#### OAuth 2.0 (client credentials)

- `JIRA_API_URL`: Atlassian API url including your cloud id (e.g., "https://api.atlassian.com/ex/jira/8a1f5c72-6d34-4b90-b1e7-9f0c2d54ab31")
- `JIRA_CLIENT_ID`: OAuth 2.0 app client id
- `JIRA_CLIENT_SECRET`: OAuth 2.0 app client secret

Optional overrides for non-default Atlassian environments:

- `JIRA_OAUTH_TOKEN_URL`: Token endpoint (default: `https://auth.atlassian.com/oauth/token`)
- `JIRA_OAUTH_AUDIENCE`: Token audience (default: `api.atlassian.com`)

The access token is requested once via the `client_credentials` grant, cached in memory, and
renewed automatically one minute before it expires.

> Your cloud id can be found at `https://your-domain.atlassian.net/_edge/tenant_info`.

### Optional Configuration

- `commentTemplate`: Template for the comment (default: "The issue ({{issueKey}}) was included in version {{version}} of {{packageName}} 🎉")
- `issuePattern`: Regular expression pattern to match JIRA issue keys (default: `/\\b[A-Z][A-Z0-9]*-\\d+\\b/g`)

### Template Variables

The following variables are available in the `commentTemplate`:

- `{{issueKey}}`: The specific JIRA issue key (e.g., "ABC-123")
- `{{packageName}}`: The package name from `SEMANTIC_RELEASE_PACKAGE` environment variable (defaults to "Package")
- `{{version}}`: The released version number
- `{{gitTag}}`: The git tag for the release
- `{{gitHead}}`: The git commit hash

### Full Example

Set environment variables:
```bash
export JIRA_BASE_URL=https://mycompany.atlassian.net
export JIRA_EMAIL=releases@mycompany.com
export JIRA_TOKEN=ATATT3xFfGF0...
export SEMANTIC_RELEASE_PACKAGE=my-awesome-project
```

Configure semantic-release:
```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator", 
    "@semantic-release/npm",
    [
      "@zlodes/semantic-release-jira-comment-plugin",
      {
        "commentTemplate": "🚀 Issue {{issueKey}} resolved in {{packageName}} version {{version}} ({{gitTag}})!\\n\\nCommit: {{gitHead}}",
        "issuePattern": "\\b(PROJ|TASK)-\\d+\\b"
      }
    ]
  ]
}
```

## How It Works

1. **Early Validation**: The plugin validates JIRA credentials during semantic-release's `verifyConditions` phase
2. **Main Execution**: During the `success` phase, the plugin:
   - Scans all commit messages in the release for JIRA issue keys
   - For each found issue key, verifies the issue exists in JIRA
   - Posts a personalized comment to each valid issue with the release information

## Environment Variables

The plugin uses the following environment variables:

```bash
# JIRA basic authentication
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_TOKEN=your-api-token

# ...or JIRA OAuth 2.0 authentication (takes precedence over basic authentication)
JIRA_API_URL=https://api.atlassian.com/ex/jira/8a1f5c72-6d34-4b90-b1e7-9f0c2d54ab31
JIRA_CLIENT_ID=your-client-id
JIRA_CLIENT_SECRET=your-client-secret

# Optional OAuth 2.0 overrides
JIRA_OAUTH_TOKEN_URL=https://auth.atlassian.com/oauth/token
JIRA_OAUTH_AUDIENCE=api.atlassian.com

# Package name used in comment templates (set automatically by semantic-release)
SEMANTIC_RELEASE_PACKAGE=my-package-name
```

## Error Handling

- **Early Validation**: Missing JIRA credentials or authentication failures will stop the release process early during `verifyConditions`
- **Runtime Issues**: If a JIRA issue doesn't exist, the plugin logs an error but continues processing other issues
- **Network Errors**: API failures are logged but don't fail the release process after validation passes

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `pnpm test`
6. Submit a pull request

## License

MIT
