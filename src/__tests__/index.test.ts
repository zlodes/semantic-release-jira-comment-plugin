import { success, verifyConditions } from '../index';
import { JiraClient } from '../jira-client';
import { IssueExtractor } from '../issue-extractor';
import { PluginConfig, Context } from '../types';

jest.mock('../jira-client');
jest.mock('../issue-extractor');

const MockedJiraClient = JiraClient as jest.MockedClass<typeof JiraClient>;
const MockedIssueExtractor = IssueExtractor as jest.MockedClass<typeof IssueExtractor>;

describe('success', () => {
  let pluginConfig: PluginConfig;
  let context: Context;
  let mockLogger: { log: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn()
    };

    pluginConfig = {};

    context = {
      nextRelease: {
        version: '1.0.0',
        gitTag: 'v1.0.0',
        gitHead: 'abc123'
      },
      commits: [
        { hash: 'hash1', message: 'feat: add feature ABC-123', subject: 'feat: add feature ABC-123' }
      ],
      logger: mockLogger
    };

    // Set up JIRA environment variables
    process.env.JIRA_HOST = 'test.atlassian.net';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_TOKEN = 'test-token';

    jest.resetAllMocks();
    delete process.env.SEMANTIC_RELEASE_PACKAGE;
  });

  it('should process JIRA issues successfully', async () => {
    const mockJiraClient = {
      getIssue: jest.fn().mockResolvedValue({}),
      addComment: jest.fn().mockResolvedValue(undefined)
    };
    const mockExtractor = {
      extractIssueKeys: jest.fn().mockReturnValue(['ABC-123'])
    };

    MockedJiraClient.mockImplementation(() => mockJiraClient as any);
    MockedIssueExtractor.mockImplementation(() => mockExtractor as any);

    await success(pluginConfig, context);

    expect(MockedJiraClient).toHaveBeenCalledWith({
      host: 'test.atlassian.net',
      email: 'test@example.com',
      token: 'test-token'
    });
    expect(MockedIssueExtractor).toHaveBeenCalledWith(undefined);
    expect(mockExtractor.extractIssueKeys).toHaveBeenCalledWith(context.commits);
    expect(mockJiraClient.getIssue).toHaveBeenCalledWith('ABC-123');
    expect(mockJiraClient.addComment).toHaveBeenCalledWith('ABC-123', 'The issue (ABC-123) was included in version 1.0.0 of Package 🎉');
    expect(mockLogger.log).toHaveBeenCalledWith('Found 1 JIRA issue(s): ABC-123');
    expect(mockLogger.log).toHaveBeenCalledWith('Successfully added comment to ABC-123');
  });

  it('should use custom comment template', async () => {
    const mockJiraClient = {
      getIssue: jest.fn().mockResolvedValue({}),
      addComment: jest.fn().mockResolvedValue(undefined)
    };
    const mockExtractor = {
      extractIssueKeys: jest.fn().mockReturnValue(['ABC-123'])
    };

    MockedJiraClient.mockImplementation(() => mockJiraClient as any);
    MockedIssueExtractor.mockImplementation(() => mockExtractor as any);

    pluginConfig.commentTemplate = 'Released {{version}} with tag {{gitTag}}';

    await success(pluginConfig, context);

    expect(mockJiraClient.addComment).toHaveBeenCalledWith('ABC-123', 'Released 1.0.0 with tag v1.0.0');
  });

  it('should handle missing JIRA config gracefully', async () => {
    delete process.env.JIRA_HOST;
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_TOKEN;

    await success(pluginConfig, context);

    expect(mockLogger.error).toHaveBeenCalledWith('JIRA configuration is missing. Please set JIRA_HOST, JIRA_EMAIL, and JIRA_TOKEN environment variables.');
  });

  it('should handle no issues found', async () => {
    const mockExtractor = {
      extractIssueKeys: jest.fn().mockReturnValue([])
    };

    MockedIssueExtractor.mockImplementation(() => mockExtractor as any);

    await success(pluginConfig, context);

    expect(mockLogger.log).toHaveBeenCalledWith('No JIRA issues found in commits.');
  });

  it('should use package name from environment variable', async () => {
    process.env.SEMANTIC_RELEASE_PACKAGE = 'my-awesome-package';

    const mockJiraClient = {
      getIssue: jest.fn().mockResolvedValue({}),
      addComment: jest.fn().mockResolvedValue(undefined)
    };
    const mockExtractor = {
      extractIssueKeys: jest.fn().mockReturnValue(['ABC-123'])
    };

    MockedJiraClient.mockImplementation(() => mockJiraClient as any);
    MockedIssueExtractor.mockImplementation(() => mockExtractor as any);

    await success(pluginConfig, context);

    expect(mockJiraClient.addComment).toHaveBeenCalledWith('ABC-123', 'The issue (ABC-123) was included in version 1.0.0 of my-awesome-package 🎉');
  });

  it('should handle packageName in custom template', async () => {
    process.env.SEMANTIC_RELEASE_PACKAGE = 'test-package';

    const mockJiraClient = {
      getIssue: jest.fn().mockResolvedValue({}),
      addComment: jest.fn().mockResolvedValue(undefined)
    };
    const mockExtractor = {
      extractIssueKeys: jest.fn().mockReturnValue(['ABC-123'])
    };

    MockedJiraClient.mockImplementation(() => mockJiraClient as any);
    MockedIssueExtractor.mockImplementation(() => mockExtractor as any);

    pluginConfig.commentTemplate = '{{packageName}} {{version}} deployed with {{gitTag}} for {{issueKey}}';

    await success(pluginConfig, context);

    expect(mockJiraClient.addComment).toHaveBeenCalledWith('ABC-123', 'test-package 1.0.0 deployed with v1.0.0 for ABC-123');
  });

  it('should handle API errors gracefully', async () => {
    const mockJiraClient = {
      getIssue: jest.fn().mockRejectedValue(new Error('API Error')),
      addComment: jest.fn().mockResolvedValue(undefined)
    };
    const mockExtractor = {
      extractIssueKeys: jest.fn().mockReturnValue(['ABC-123'])
    };

    MockedJiraClient.mockImplementation(() => mockJiraClient as any);
    MockedIssueExtractor.mockImplementation(() => mockExtractor as any);

    await success(pluginConfig, context);

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to add comment to ABC-123: API Error');
  });
});

describe('verifyConditions', () => {
  let pluginConfig: PluginConfig;
  let context: Context;
  let mockLogger: { log: jest.Mock; error: jest.Mock };

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn()
    };

    pluginConfig = {};

    context = {
      nextRelease: {
        version: '1.0.0',
        gitTag: 'v1.0.0',
        gitHead: 'abc123'
      },
      commits: [],
      logger: mockLogger
    };

    // Set up JIRA environment variables
    process.env.JIRA_HOST = 'test.atlassian.net';
    process.env.JIRA_EMAIL = 'test@example.com';
    process.env.JIRA_TOKEN = 'test-token';

    jest.resetAllMocks();
  });

  it('should verify conditions successfully with valid credentials', async () => {
    const mockJiraClient = {
      getServerInfo: jest.fn().mockResolvedValue({ version: '8.0.0' })
    };

    MockedJiraClient.mockImplementation(() => mockJiraClient as any);

    await verifyConditions(pluginConfig, context);

    expect(MockedJiraClient).toHaveBeenCalledWith({
      host: 'test.atlassian.net',
      email: 'test@example.com',
      token: 'test-token'
    });
    expect(mockJiraClient.getServerInfo).toHaveBeenCalled();
    expect(mockLogger.log).toHaveBeenCalledWith('Verifying JIRA plugin conditions...');
    expect(mockLogger.log).toHaveBeenCalledWith('JIRA credentials verified successfully');
  });

  it('should throw error when JIRA_HOST is missing', async () => {
    delete process.env.JIRA_HOST;

    await expect(verifyConditions(pluginConfig, context))
      .rejects.toThrow('JIRA plugin configuration is invalid:\n  - JIRA_HOST environment variable is required');
  });

  it('should throw error when JIRA_EMAIL is missing', async () => {
    delete process.env.JIRA_EMAIL;

    await expect(verifyConditions(pluginConfig, context))
      .rejects.toThrow('JIRA plugin configuration is invalid:\n  - JIRA_EMAIL environment variable is required');
  });

  it('should throw error when JIRA_TOKEN is missing', async () => {
    delete process.env.JIRA_TOKEN;

    await expect(verifyConditions(pluginConfig, context))
      .rejects.toThrow('JIRA plugin configuration is invalid:\n  - JIRA_TOKEN environment variable is required');
  });

  it('should throw error when multiple environment variables are missing', async () => {
    delete process.env.JIRA_HOST;
    delete process.env.JIRA_EMAIL;

    await expect(verifyConditions(pluginConfig, context))
      .rejects.toThrow('JIRA plugin configuration is invalid:\n  - JIRA_HOST environment variable is required\n  - JIRA_EMAIL environment variable is required');
  });

  it('should throw error when JIRA authentication fails', async () => {
    const mockJiraClient = {
      getServerInfo: jest.fn().mockRejectedValue(new Error('Authentication failed'))
    };

    MockedJiraClient.mockImplementation(() => mockJiraClient as any);

    await expect(verifyConditions(pluginConfig, context))
      .rejects.toThrow('Failed to authenticate with JIRA: Authentication failed');

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to authenticate with JIRA: Authentication failed');
  });
});