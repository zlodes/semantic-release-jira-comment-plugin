import axios from 'axios';
import { DEFAULT_AUDIENCE, DEFAULT_TOKEN_URL, OAuth2TokenProvider } from '../oauth2';
import { JiraOAuth2Config } from '../types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const mockIsAxiosError = jest.fn();
(axios as any).isAxiosError = mockIsAxiosError;

describe('OAuth2TokenProvider', () => {
  let config: JiraOAuth2Config;
  let nowSpy: jest.SpyInstance;
  let now: number;

  beforeEach(() => {
    config = {
      authType: 'oauth2',
      apiUrl: 'https://api.atlassian.com/ex/jira/11111111-2222-3333-4444-555555555555',
      clientId: 'client-id',
      clientSecret: 'client-secret'
    };

    now = 1_700_000_000_000;
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(() => {
    nowSpy.mockRestore();
    jest.resetAllMocks();
  });

  it('should request a token using the client credentials grant', async () => {
    mockedAxios.post.mockResolvedValue({ data: { access_token: 'token-1', expires_in: 3600 } });

    const provider = new OAuth2TokenProvider(config);

    await expect(provider.getAccessToken()).resolves.toBe('token-1');
    expect(mockedAxios.post).toHaveBeenCalledWith(DEFAULT_TOKEN_URL, {
      grant_type: 'client_credentials',
      client_id: 'client-id',
      client_secret: 'client-secret',
      audience: DEFAULT_AUDIENCE
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  });

  it('should use a custom token URL and audience', async () => {
    mockedAxios.post.mockResolvedValue({ data: { access_token: 'token-1' } });

    const provider = new OAuth2TokenProvider({
      ...config,
      tokenUrl: 'https://auth.example.com/oauth/token',
      audience: 'jira.example.com'
    });

    await provider.getAccessToken();

    expect(mockedAxios.post).toHaveBeenCalledWith('https://auth.example.com/oauth/token', expect.objectContaining({
      audience: 'jira.example.com'
    }), expect.anything());
  });

  it('should cache the token until it expires', async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { access_token: 'token-1', expires_in: 3600 } })
      .mockResolvedValueOnce({ data: { access_token: 'token-2', expires_in: 3600 } });

    const provider = new OAuth2TokenProvider(config);

    await expect(provider.getAccessToken()).resolves.toBe('token-1');

    now += 60_000;
    await expect(provider.getAccessToken()).resolves.toBe('token-1');
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    // Past expiry (3600s minus the 60s renewal skew)
    now += 3_600_000;
    await expect(provider.getAccessToken()).resolves.toBe('token-2');
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('should share a single request between concurrent callers', async () => {
    mockedAxios.post.mockResolvedValue({ data: { access_token: 'token-1', expires_in: 3600 } });

    const provider = new OAuth2TokenProvider(config);

    const [first, second] = await Promise.all([provider.getAccessToken(), provider.getAccessToken()]);

    expect(first).toBe('token-1');
    expect(second).toBe('token-1');
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it('should retry after a failed request', async () => {
    const error = { response: { status: 401, statusText: 'Unauthorized' } };
    mockedAxios.post
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ data: { access_token: 'token-1' } });
    mockIsAxiosError.mockReturnValue(true);

    const provider = new OAuth2TokenProvider(config);

    await expect(provider.getAccessToken())
      .rejects.toThrow(`Failed to obtain JIRA OAuth2 access token from ${DEFAULT_TOKEN_URL}: 401 Unauthorized`);

    await expect(provider.getAccessToken()).resolves.toBe('token-1');
  });

  it('should report requests that failed without a response', async () => {
    mockedAxios.post.mockRejectedValue({ response: undefined, message: 'Connection timeout' });
    mockIsAxiosError.mockReturnValue(true);

    const provider = new OAuth2TokenProvider(config);

    await expect(provider.getAccessToken())
      .rejects.toThrow(`Failed to obtain JIRA OAuth2 access token from ${DEFAULT_TOKEN_URL}: No response Connection timeout`);
  });

  it('should rethrow non-Axios errors', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Boom'));
    mockIsAxiosError.mockReturnValue(false);

    const provider = new OAuth2TokenProvider(config);

    await expect(provider.getAccessToken()).rejects.toThrow('Boom');
  });

  it('should fail when the response contains no access token', async () => {
    mockedAxios.post.mockResolvedValue({ data: {} });

    const provider = new OAuth2TokenProvider(config);

    await expect(provider.getAccessToken())
      .rejects.toThrow(`Failed to obtain JIRA OAuth2 access token from ${DEFAULT_TOKEN_URL}: response contained no access_token`);
  });

  it('should fall back to a one hour lifetime when expires_in is missing', async () => {
    mockedAxios.post.mockResolvedValue({ data: { access_token: 'token-1' } });

    const provider = new OAuth2TokenProvider(config);

    await provider.getAccessToken();

    now += 3_539_000; // just below 3600s - 60s skew
    await provider.getAccessToken();

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });
});
