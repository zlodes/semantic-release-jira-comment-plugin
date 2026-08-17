import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { JiraConfig } from './types';
import { getConfiguredUrl } from './config';
import { OAuth2TokenProvider } from './oauth2';

export class JiraClient {
  private client: AxiosInstance;

  constructor(private config: JiraConfig) {
    const baseUrl = normalizeApiUrl(getConfiguredUrl(config));

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (config.authType !== 'oauth2') {
      headers['Authorization'] = `Basic ${Buffer.from(`${config.email}:${config.token}`).toString('base64')}`;
    }

    this.client = axios.create({ baseURL: baseUrl, headers });

    if (config.authType === 'oauth2') {
      const tokenProvider = new OAuth2TokenProvider(config);

      this.client.interceptors.request.use(async (request: InternalAxiosRequestConfig) => {
        const accessToken = await tokenProvider.getAccessToken();
        request.headers.set('Authorization', `Bearer ${accessToken}`);
        return request;
      });
    }
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    try {
      await this.client.post(`/issue/${issueKey}/comment`, {
        body: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: comment
                }
              ]
            }
          ]
        }
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'No response';
        const statusText = error.response?.statusText || error.message || 'Unknown error';
        throw new Error(`Failed to add comment to ${issueKey}: ${status} ${statusText}`, { cause: error });
      }
      throw error;
    }
  }

  async getIssue(issueKey: string): Promise<any> {
    try {
      const response = await this.client.get(`/issue/${issueKey}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'No response';
        const statusText = error.response?.statusText || error.message || 'Unknown error';
        throw new Error(`Failed to get issue ${issueKey}: ${status} ${statusText}`, { cause: error });
      }
      throw error;
    }
  }

  async getServerInfo(): Promise<any> {
    try {
      const response = await this.client.get('/serverInfo');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'No response';
        const statusText = error.response?.statusText || error.message || 'Unknown error';
        const baseUrl = getConfiguredUrl(this.config);
        throw new Error(`Failed to get server info from ${baseUrl}: ${status} ${statusText}`, { cause: error });
      }
      throw error;
    }
  }
}

/** Ensure the URL has a scheme, no trailing slash and the /rest/api/3 suffix. */
function normalizeApiUrl(url: string): string {
  let normalized = url.replace(/\/$/, '');

  if (!normalized.startsWith('http')) {
    normalized = `https://${normalized}`;
  }

  if (!normalized.includes('/rest/api/3')) {
    normalized = normalized + '/rest/api/3';
  }

  return normalized;
}
