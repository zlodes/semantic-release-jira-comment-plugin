import axios, { AxiosInstance } from 'axios';
import { JiraConfig } from './types';

export class JiraClient {
  private client: AxiosInstance;

  constructor(private config: JiraConfig) {
    // Ensure baseUrl has proper format and append /rest/api/3 if not already present
    let baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    if (!baseUrl.includes('/rest/api/3')) {
      baseUrl = baseUrl + '/rest/api/3';
    }

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': `Basic ${Buffer.from(`${config.email}:${config.token}`).toString('base64')}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
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
        throw new Error(`Failed to add comment to ${issueKey}: ${status} ${statusText}`);
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
        throw new Error(`Failed to get issue ${issueKey}: ${status} ${statusText}`);
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
        const baseUrl = this.config.baseUrl;
        throw new Error(`Failed to get server info from ${baseUrl}: ${status} ${statusText}`);
      }
      throw error;
    }
  }
}