import axios from 'axios';
import { JiraOAuth2Config } from './types';

export const DEFAULT_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
export const DEFAULT_AUDIENCE = 'api.atlassian.com';

/** Renew the token a bit before it actually expires to avoid mid-request expiry. */
const EXPIRY_SKEW_MS = 60_000;
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
}

/**
 * Obtains and caches an Atlassian OAuth2 access token using the
 * client credentials grant.
 */
export class OAuth2TokenProvider {
  private accessToken: string | null = null;
  private expiresAt = 0;
  private pendingRequest: Promise<string> | null = null;

  constructor(private config: JiraOAuth2Config) {}

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.expiresAt) {
      return this.accessToken;
    }

    // Share a single in-flight request between concurrent callers
    if (!this.pendingRequest) {
      this.pendingRequest = this.requestToken().finally(() => {
        this.pendingRequest = null;
      });
    }

    return this.pendingRequest;
  }

  private async requestToken(): Promise<string> {
    const tokenUrl = this.config.tokenUrl || DEFAULT_TOKEN_URL;

    let response;
    try {
      response = await axios.post<TokenResponse>(tokenUrl, {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        audience: this.config.audience || DEFAULT_AUDIENCE
      }, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 'No response';
        const statusText = error.response?.statusText || error.message || 'Unknown error';
        throw new Error(`Failed to obtain JIRA OAuth2 access token from ${tokenUrl}: ${status} ${statusText}`);
      }
      throw error;
    }

    const accessToken = response.data?.access_token;
    if (!accessToken) {
      throw new Error(`Failed to obtain JIRA OAuth2 access token from ${tokenUrl}: response contained no access_token`);
    }

    const expiresIn = typeof response.data.expires_in === 'number'
      ? response.data.expires_in
      : DEFAULT_EXPIRES_IN_SECONDS;

    this.accessToken = accessToken;
    this.expiresAt = Date.now() + Math.max(expiresIn * 1000 - EXPIRY_SKEW_MS, 0);

    return accessToken;
  }
}
