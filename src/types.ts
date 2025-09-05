export interface JiraConfig {
  host: string;
  email: string;
  token: string;
  projectKey?: string;
}

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