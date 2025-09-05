import axios from 'axios';
import { JiraClient } from '../jira-client';
import { JiraConfig } from '../types';

jest.mock('axios');
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
      host: 'test.atlassian.net',
      email: 'test@example.com',
      token: 'test-token'
    };

    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn()
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
        .rejects.toThrow('Failed to get server info: 401 Unauthorized');
    });
  });
});