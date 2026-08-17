import { JiraConfig } from './types';

export interface JiraConfigResolution {
  config: JiraConfig | null;
  errors: string[];
}

export const MISSING_CONFIG_MESSAGE = 'JIRA configuration is missing. Please set either JIRA_BASE_URL, JIRA_EMAIL and JIRA_TOKEN (basic auth) or JIRA_API_URL, JIRA_CLIENT_ID and JIRA_CLIENT_SECRET (OAuth2) environment variables.';

/**
 * Builds the JIRA configuration from environment variables.
 *
 * OAuth2 takes precedence: as soon as any of the OAuth2 variables is set,
 * the plugin expects a complete OAuth2 configuration.
 */
export function resolveJiraConfig(env: Record<string, string | undefined> = process.env): JiraConfigResolution {
  const oauth2Requested = Boolean(env.JIRA_CLIENT_ID || env.JIRA_CLIENT_SECRET || env.JIRA_API_URL);

  if (oauth2Requested) {
    const errors: string[] = [];

    if (!env.JIRA_API_URL) {
      errors.push('JIRA_API_URL environment variable is required for OAuth2 authentication');
    }

    if (!env.JIRA_CLIENT_ID) {
      errors.push('JIRA_CLIENT_ID environment variable is required for OAuth2 authentication');
    }

    if (!env.JIRA_CLIENT_SECRET) {
      errors.push('JIRA_CLIENT_SECRET environment variable is required for OAuth2 authentication');
    }

    if (errors.length > 0) {
      return { config: null, errors };
    }

    const config: JiraConfig = {
      authType: 'oauth2',
      apiUrl: env.JIRA_API_URL as string,
      clientId: env.JIRA_CLIENT_ID as string,
      clientSecret: env.JIRA_CLIENT_SECRET as string
    };

    if (env.JIRA_OAUTH_TOKEN_URL) {
      config.tokenUrl = env.JIRA_OAUTH_TOKEN_URL;
    }

    if (env.JIRA_OAUTH_AUDIENCE) {
      config.audience = env.JIRA_OAUTH_AUDIENCE;
    }

    return { config, errors: [] };
  }

  const errors: string[] = [];

  if (!env.JIRA_BASE_URL) {
    errors.push('JIRA_BASE_URL environment variable is required');
  }

  if (!env.JIRA_EMAIL) {
    errors.push('JIRA_EMAIL environment variable is required');
  }

  if (!env.JIRA_TOKEN) {
    errors.push('JIRA_TOKEN environment variable is required');
  }

  if (errors.length > 0) {
    return { config: null, errors };
  }

  return {
    config: {
      authType: 'basic',
      baseUrl: env.JIRA_BASE_URL as string,
      email: env.JIRA_EMAIL as string,
      token: env.JIRA_TOKEN as string
    },
    errors: []
  };
}

export function describeAuthType(config: JiraConfig): string {
  return config.authType === 'oauth2' ? 'OAuth2 (client credentials)' : 'basic (email + API token)';
}

/** Raw, non-normalized URL of the JIRA instance, used in log and error messages. */
export function getConfiguredUrl(config: JiraConfig): string {
  return config.authType === 'oauth2' ? config.apiUrl : config.baseUrl;
}
