/**
 * HTTP error preserved after BaseApiEndpoint handling so UI can read status/code.
 */
export class ApiHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export interface ApiHttpErrorMeta {
  status: number;
  code?: string;
  message: string;
}

/** Duck-typed reader — avoids instanceof failures across Angular chunks. */
export function readApiHttpError(err: unknown): ApiHttpErrorMeta | null {
  if (!(err instanceof Error)) {
    return null;
  }
  const status = (err as { status?: unknown }).status;
  if (typeof status !== 'number') {
    return null;
  }
  const code = (err as { code?: unknown }).code;
  return {
    status,
    code: typeof code === 'string' && code.length > 0 ? code : undefined,
    message: err.message
  };
}
