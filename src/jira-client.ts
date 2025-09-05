import axios, { AxiosInstance } from 'axios';
import { JiraConfig } from './types';

export class JiraClient {
  private client: AxiosInstance;

  constructor(private config: JiraConfig) {
    this.client = axios.create({
      baseURL: `https://${config.host}/rest/api/3`,
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
        throw new Error(`Failed to add comment to ${issueKey}: ${error.response?.status} ${error.response?.statusText}`);
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
        throw new Error(`Failed to get issue ${issueKey}: ${error.response?.status} ${error.response?.statusText}`);
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
        throw new Error(`Failed to get server info: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }
}