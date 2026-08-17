import { JiraClient } from './jira-client';
import { IssueExtractor } from './issue-extractor';
import { PluginConfig, Context } from './types';
import { describeAuthType, MISSING_CONFIG_MESSAGE, resolveJiraConfig } from './config';

const DEFAULT_COMMENT_TEMPLATE = 'The issue ({{issueKey}}) was included in version {{version}} of {{packageName}} 🎉';

export async function verifyConditions(pluginConfig: PluginConfig, context: Context): Promise<void> {
  const { logger } = context;

  logger.log('Verifying JIRA plugin conditions...');

  const { config: jiraConfig, errors } = resolveJiraConfig();

  if (!jiraConfig) {
    const errorMessage = `JIRA plugin configuration is invalid:\n${errors.map(error => `  - ${error}`).join('\n')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  logger.log(`Using JIRA ${describeAuthType(jiraConfig)} authentication`);

  // Test JIRA connection by trying to authenticate
  try {
    const jiraClient = new JiraClient(jiraConfig);
    // Try to make a simple API call to verify credentials
    await jiraClient.getServerInfo();
    logger.log('JIRA credentials verified successfully');
  } catch (error) {
    const errorMessage = `Failed to authenticate with JIRA: ${error instanceof Error ? error.message : 'Unknown error'}`;
    logger.error(errorMessage);
    throw new Error(errorMessage, { cause: error });
  }
}

export async function success(pluginConfig: PluginConfig, context: Context): Promise<void> {
  const { commentTemplate = DEFAULT_COMMENT_TEMPLATE, issuePattern } = pluginConfig;
  const { nextRelease, commits, logger } = context;

  // Get JIRA configuration from environment variables
  const { config: jiraConfig } = resolveJiraConfig();

  if (!jiraConfig) {
    logger.error(MISSING_CONFIG_MESSAGE);
    return;
  }

  try {
    const jiraClient = new JiraClient(jiraConfig);
    const issueExtractor = new IssueExtractor(issuePattern);

    const issueKeys = issueExtractor.extractIssueKeys(commits);

    if (issueKeys.length === 0) {
      logger.log('No JIRA issues found in commits.');
      return;
    }

    logger.log(`Found ${issueKeys.length} JIRA issue(s): ${issueKeys.join(', ')}`);

    const packageName = process.env.SEMANTIC_RELEASE_PACKAGE || 'Package';

    const commentPromises = issueKeys.map(async (issueKey) => {
      try {
        // First verify the issue exists
        await jiraClient.getIssue(issueKey);

        // Generate comment with issue-specific content
        const comment = commentTemplate
          .replace(/{{issueKey}}/g, issueKey)
          .replace(/{{packageName}}/g, packageName)
          .replace(/{{version}}/g, nextRelease.version)
          .replace(/{{gitTag}}/g, nextRelease.gitTag)
          .replace(/{{gitHead}}/g, nextRelease.gitHead);

        await jiraClient.addComment(issueKey, comment);
        logger.log(`Successfully added comment to ${issueKey}`);
      } catch (error) {
        logger.error(`Failed to add comment to ${issueKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    await Promise.allSettled(commentPromises);
    logger.log('Finished processing JIRA comments.');

  } catch (error) {
    logger.error(`Plugin error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

// Export the plugin configuration
export default { verifyConditions, success };
