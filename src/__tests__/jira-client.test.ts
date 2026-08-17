import axios from 'axios';
import { JiraClient } from '../jira-client';
import { JiraConfig, JiraOAuth2Config } from '../types';
import { OAuth2TokenProvider } from '../oauth2';

jest.mock('axios');
jest.mock('../oauth2');

const MockedTokenProvider = OAuth2TokenProvider as jest.MockedClass<typeof OAuth2TokenProvider>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock axios.isAxiosError
const mockIsAxiosError = jest.fn();
(axios as any).isAxiosError = mockIsAxiosError;

describe('JiraClient', () => {
  let client: JiraClient;
  let config: JiraConfig;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    config = {
      baseUrl: 'https://test.atlassian.net',
      email: 'test@example.com',
      token: 'test-token'
    };

    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    client = new JiraClient(config);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test.atlassian.net/rest/api/3',
        headers: {
          'Authorization': `Basic ${Buffer.from('test@example.com:test-token').toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('addComment', () => {
    it('should post comment successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.addComment('ABC-123', 'Test comment');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/issue/ABC-123/comment', {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Test comment'
                }
              ]
            }
          ]
        }
      });
    });

    it('should throw error on API failure', async () => {
      const error = {
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      };
      mockAxiosInstance.post.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(true);

      await expect(client.addComment('ABC-123', 'Test comment'))
        .rejects.toThrow('Failed to add comment to ABC-123: 404 Not Found');
    });
  });

  describe('getIssue', () => {
    it('should get issue successfully', async () => {
      const mockIssue = { key: 'ABC-123', fields: {} };
      mockAxiosInstance.get.mockResolvedValue({ data: mockIssue });

      const result = await client.getIssue('ABC-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/issue/ABC-123');
      expect(result).toEqual(mockIssue);
    });

    it('should throw error on API failure', async () => {
      const error = {
        response: {
          status: 403,
          statusText: 'Forbidden'
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(true);

      await expect(client.getIssue('ABC-123'))
        .rejects.toThrow('Failed to get issue ABC-123: 403 Forbidden');
    });
  });

  describe('getServerInfo', () => {
    it('should get server info successfully', async () => {
      const mockServerInfo = { version: '8.0.0', versionNumbers: [8, 0, 0] };
      mockAxiosInstance.get.mockResolvedValue({ data: mockServerInfo });

      const result = await client.getServerInfo();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/serverInfo');
      expect(result).toEqual(mockServerInfo);
    });

    it('should throw error on API failure', async () => {
      const error = {
        response: {
          status: 401,
          statusText: 'Unauthorized'
        }
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(true);

      await expect(client.getServerInfo())
        .rejects.toThrow('Failed to get server info from https://test.atlassian.net: 401 Unauthorized');
    });
  });

  describe('URL normalization', () => {
    it('should handle baseUrl without https prefix', () => {
      const config: JiraConfig = {
        baseUrl: 'example.atlassian.net',
        email: 'test@example.com',
        token: 'test-token'
      };

      new JiraClient(config);
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://example.atlassian.net/rest/api/3',
        headers: {
          'Authorization': `Basic ${Buffer.from('test@example.com:test-token').toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    });

    it('should handle baseUrl with trailing slash', () => {
      const config: JiraConfig = {
        baseUrl: 'https://example.atlassian.net/',
        email: 'test@example.com',
        token: 'test-token'
      };

      new JiraClient(config);
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://example.atlassian.net/rest/api/3',
        headers: {
          'Authorization': `Basic ${Buffer.from('test@example.com:test-token').toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    });

    it('should handle baseUrl with existing /rest/api/3 path', () => {
      const config: JiraConfig = {
        baseUrl: 'https://example.atlassian.net/rest/api/3',
        email: 'test@example.com',
        token: 'test-token'
      };

      new JiraClient(config);
      
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://example.atlassian.net/rest/api/3',
        headers: {
          'Authorization': `Basic ${Buffer.from('test@example.com:test-token').toString('base64')}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('non-Axios errors', () => {
    it('should throw original error for non-Axios errors in addComment', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.post.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(false);

      await expect(client.addComment('TEST-123', 'test comment'))
        .rejects.toThrow('Network error');
    });

    it('should throw original error for non-Axios errors in getIssue', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(false);

      await expect(client.getIssue('TEST-123'))
        .rejects.toThrow('Network error');
    });

    it('should throw original error for non-Axios errors in getServerInfo', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(false);

      await expect(client.getServerInfo())
        .rejects.toThrow('Network error');
    });
  });

  describe('error handling with missing response data', () => {
    it('should handle addComment error without response', async () => {
      const error = {
        response: undefined,
        message: 'Connection timeout'
      };
      mockAxiosInstance.post.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(true);

      await expect(client.addComment('TEST-123', 'test comment'))
        .rejects.toThrow('Failed to add comment to TEST-123: No response Connection timeout');
    });

    it('should handle getIssue error without response', async () => {
      const error = {
        response: undefined,
        message: 'Connection timeout'
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(true);

      await expect(client.getIssue('TEST-123'))
        .rejects.toThrow('Failed to get issue TEST-123: No response Connection timeout');
    });

    it('should handle getServerInfo error without response', async () => {
      const error = {
        response: undefined,
        message: 'Connection timeout'
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(true);

      await expect(client.getServerInfo())
        .rejects.toThrow('Failed to get server info from https://test.atlassian.net: No response Connection timeout');
    });

    it('should handle error without message', async () => {
      const error = {
        response: undefined,
        message: undefined
      };
      mockAxiosInstance.get.mockRejectedValue(error);
      mockIsAxiosError.mockReturnValue(true);

      await expect(client.getServerInfo())
        .rejects.toThrow('Failed to get server info from https://test.atlassian.net: No response Unknown error');
    });
  });

  describe('OAuth2 authentication', () => {
    const oauth2Config: JiraOAuth2Config = {
      authType: 'oauth2',
      apiUrl: 'https://api.atlassian.com/ex/jira/11111111-2222-3333-4444-555555555555',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    };

    beforeEach(() => {
      MockedTokenProvider.mockImplementation(() => ({
        getAccessToken: jest.fn().mockResolvedValue('access-token')
      }) as any);
    });

    it('should create axios instance without a Basic Authorization header', () => {
      new JiraClient(oauth2Config);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.atlassian.com/ex/jira/11111111-2222-3333-4444-555555555555/rest/api/3',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    });

    it('should pass the OAuth2 config to the token provider', () => {
      new JiraClient(oauth2Config);

      expect(MockedTokenProvider).toHaveBeenCalledWith(oauth2Config);
    });

    it('should attach a Bearer token to every request', async () => {
      new JiraClient(oauth2Config);

      const interceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const requestHeaders = { set: jest.fn() };

      const result = await interceptor({ headers: requestHeaders });

      expect(requestHeaders.set).toHaveBeenCalledWith('Authorization', 'Bearer access-token');
      expect(result).toEqual({ headers: requestHeaders });
    });

    it('should not register a request interceptor for basic auth', () => {
      new JiraClient(config);

      expect(mockAxiosInstance.interceptors.request.use).not.toHaveBeenCalled();
    });

    it('should report the API URL in error messages', async () => {
      const oauth2Client = new JiraClient(oauth2Config);
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 401, statusText: 'Unauthorized' }
      });
      mockIsAxiosError.mockReturnValue(true);

      await expect(oauth2Client.getServerInfo())
        .rejects.toThrow('Failed to get server info from https://api.atlassian.com/ex/jira/11111111-2222-3333-4444-555555555555: 401 Unauthorized');
    });
  });
});
