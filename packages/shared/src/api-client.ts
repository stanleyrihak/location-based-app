/**
 * Any failed request. `code` is the server's machine-readable reason ("sold_out",
 * "out_of_range"), `details` its extra fields. Status 0 means the server couldn't be reached.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  details: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type ApiClientOptions = {
  /** "http://192.168.1.20:4000", without a trailing slash. */
  baseUrl: string;
  /** The signed-in token, or null. Read on every request, so signing in takes effect at once. */
  getToken: () => string | null;
  /** Called when the server answers 401: the app signs out and shows sign-in. */
  onUnauthorized: () => void;
  timeoutMs?: number;
};

/**
 * Talks to the Shoot server: JSON in and out, the token on every request, and every failure
 * turned into one kind of error (ApiError), so callers and React Query handle only that.
 * Both apps build theirs from this, each with its own token and sign-out.
 */
export function createApiClient({
  baseUrl,
  getToken,
  onUnauthorized,
  timeoutMs = 15_000,
}: ApiClientOptions) {
  function authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function request<T>(
    path: string,
    options: { method?: string; json?: unknown } = {},
  ): Promise<T> {
    // Without a timeout, a request to a server that's off can hang for a minute or more.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.json !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...authHeaders(),
        },
        body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(0, 'network', 'We can’t reach the server. Check your connection.');
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    const body: unknown = await response.json().catch(() => ({}));
    if (response.ok) {
      return body as T;
    }

    const { error, message, ...details } = body as Record<string, unknown>;
    if (response.status === 401) {
      // The token is missing, expired, or the account was deleted: back to sign-in.
      onUnauthorized();
    }
    throw new ApiError(
      response.status,
      typeof error === 'string' ? error : 'unknown',
      typeof message === 'string' ? message : 'Something went wrong.',
      details,
    );
  }

  return { request, authHeaders };
}
