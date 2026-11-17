/**
 * Thrown anywhere in the server to answer with an error. `code` is for the apps' code
 * ("sold_out"), `message` is for people, `details` adds fields like `itemIds`.
 * app.ts turns it into `{ error: code, message, ...details }` with this status.
 */
export class HttpError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
