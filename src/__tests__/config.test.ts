import { describeAuthType, getConfiguredUrl, resolveJiraConfig } from '../config';

const API_URL = 'https://api.atlassian.com/ex/jira/11111111-2222-3333-4444-555555555555';

describe('resolveJiraConfig', () => {
  it('should resolve basic auth configuration', () => {
    const { config, errors } = resolveJiraConfig({
      JIRA_BASE_URL: 'https://test.atlassian.net',
      JIRA_EMAIL: 'test@example.com',
      JIRA_TOKEN: 'test-token'
    });

    expect(errors).toEqual([]);
    expect(config).toEqual({
      authType: 'basic',
      baseUrl: 'https://test.atlassian.net',
      email: 'test@example.com',
      token: 'test-token'
    });
  });

  it('should report missing basic auth variables', () => {
    const { config, errors } = resolveJiraConfig({});

    expect(config).toBeNull();
    expect(errors).toEqual([
      'JIRA_BASE_URL environment variable is required',
      'JIRA_EMAIL environment variable is required',
      'JIRA_TOKEN environment variable is required'
    ]);
  });

  it('should resolve OAuth2 configuration', () => {
    const { config, errors } = resolveJiraConfig({
      JIRA_API_URL: API_URL,
      JIRA_CLIENT_ID: 'client-id',
      JIRA_CLIENT_SECRET: 'client-secret'
    });

    expect(errors).toEqual([]);
    expect(config).toEqual({
      authType: 'oauth2',
      apiUrl: API_URL,
      clientId: 'client-id',
      clientSecret: 'client-secret'
    });
  });

  it('should pick OAuth2 over basic auth when both are configured', () => {
    const { config } = resolveJiraConfig({
      JIRA_BASE_URL: 'https://test.atlassian.net',
      JIRA_EMAIL: 'test@example.com',
      JIRA_TOKEN: 'test-token',
      JIRA_API_URL: API_URL,
      JIRA_CLIENT_ID: 'client-id',
      JIRA_CLIENT_SECRET: 'client-secret'
    });

    expect(config).toEqual({
      authType: 'oauth2',
      apiUrl: API_URL,
      clientId: 'client-id',
      clientSecret: 'client-secret'
    });
  });

  it('should support optional token URL and audience overrides', () => {
    const { config } = resolveJiraConfig({
      JIRA_API_URL: API_URL,
      JIRA_CLIENT_ID: 'client-id',
      JIRA_CLIENT_SECRET: 'client-secret',
      JIRA_OAUTH_TOKEN_URL: 'https://auth.example.com/oauth/token',
      JIRA_OAUTH_AUDIENCE: 'jira.example.com'
    });

    expect(config).toEqual({
      authType: 'oauth2',
      apiUrl: API_URL,
      clientId: 'client-id',
      clientSecret: 'client-secret',
      tokenUrl: 'https://auth.example.com/oauth/token',
      audience: 'jira.example.com'
    });
  });

  it('should report missing OAuth2 variables instead of falling back to basic auth', () => {
    const { config, errors } = resolveJiraConfig({
      JIRA_BASE_URL: 'https://test.atlassian.net',
      JIRA_EMAIL: 'test@example.com',
      JIRA_TOKEN: 'test-token',
      JIRA_CLIENT_ID: 'client-id'
    });

    expect(config).toBeNull();
    expect(errors).toEqual([
      'JIRA_API_URL environment variable is required for OAuth2 authentication',
      'JIRA_CLIENT_SECRET environment variable is required for OAuth2 authentication'
    ]);
  });

  it('should read process.env by default', () => {
    const previous = { ...process.env };

    delete process.env.JIRA_API_URL;
    delete process.env.JIRA_CLIENT_ID;
    delete process.env.JIRA_CLIENT_SECRET;
    process.env.JIRA_BASE_URL = 'https://env.atlassian.net';
    process.env.JIRA_EMAIL = 'env@example.com';
    process.env.JIRA_TOKEN = 'env-token';

    const { config } = resolveJiraConfig();

    expect(config).toEqual({
      authType: 'basic',
      baseUrl: 'https://env.atlassian.net',
      email: 'env@example.com',
      token: 'env-token'
    });

    process.env = previous;
  });
});

describe('describeAuthType', () => {
  it('should describe both auth types', () => {
    expect(describeAuthType({ authType: 'basic', baseUrl: 'u', email: 'e', token: 't' }))
      .toBe('basic (email + API token)');
    expect(describeAuthType({ baseUrl: 'u', email: 'e', token: 't' }))
      .toBe('basic (email + API token)');
    expect(describeAuthType({ authType: 'oauth2', apiUrl: API_URL, clientId: 'c', clientSecret: 's' }))
      .toBe('OAuth2 (client credentials)');
  });
});

describe('getConfiguredUrl', () => {
  it('should return the URL of the configured auth type', () => {
    expect(getConfiguredUrl({ baseUrl: 'https://test.atlassian.net', email: 'e', token: 't' }))
      .toBe('https://test.atlassian.net');
    expect(getConfiguredUrl({ authType: 'oauth2', apiUrl: API_URL, clientId: 'c', clientSecret: 's' }))
      .toBe(API_URL);
  });
});
