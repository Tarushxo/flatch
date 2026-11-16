/**
 * Thrown by a service when a request cannot be carried out: a policy said no,
 * or the thing asked about does not exist (or must not be admitted to exist).
 * The routes turn it into an ordinary answer with this status and code.
 */
export class Refused extends Error {
  constructor(
    readonly status: 400 | 403 | 404 | 409 | 429,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "Refused";
  }
}
