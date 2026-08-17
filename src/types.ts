export interface JiraBasicAuthConfig {
  /** Defaults to basic authentication when omitted (backwards compatibility). */
  authType?: 'basic';
  baseUrl: string;
  email: string;
  token: string;
  projectKey?: string;
}

export interface JiraOAuth2Config {
  authType: 'oauth2';
  /** Atlassian API URL including the cloud id, e.g. https://api.atlassian.com/ex/jira/<cloud-id> */
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  /** Defaults to https://auth.atlassian.com/oauth/token */
  tokenUrl?: string;
  /** Defaults to api.atlassian.com */
  audience?: string;
  projectKey?: string;
}

export type JiraConfig = JiraBasicAuthConfig | JiraOAuth2Config;

export interface PluginConfig {
  commentTemplate?: string;
  issuePattern?: string;
}

export interface Context {
  nextRelease: {
    version: string;
    gitTag: string;
    gitHead: string;
  };
  commits: Array<{
    hash: string;
    message: string;
    subject: string;
  }>;
  logger: {
    log: (message: string) => void;
    error: (message: string) => void;
  };
}
