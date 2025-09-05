# @zlodes/semantic-release-jira-comment-plugin

A semantic-release plugin that automatically adds comments with release information to JIRA issues mentioned in commits.

## Installation

```bash
npm install @zlodes/semantic-release-jira-comment-plugin --save-dev
```

## Usage

First, set up the required environment variables:

```bash
export JIRA_HOST=your-domain.atlassian.net
export JIRA_EMAIL=your-email@example.com
export JIRA_TOKEN=your-api-token
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

### Required Environment Variables

- `JIRA_HOST`: Your JIRA instance hostname (e.g., "your-domain.atlassian.net")
- `JIRA_EMAIL`: Your JIRA account email
- `JIRA_TOKEN`: Your JIRA API token ([How to create an API token](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/))

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
export JIRA_HOST=mycompany.atlassian.net
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
# Required JIRA configuration
JIRA_HOST=your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_TOKEN=your-api-token

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
5. Run the test suite: `npm test`
6. Submit a pull request

## License

MIT
