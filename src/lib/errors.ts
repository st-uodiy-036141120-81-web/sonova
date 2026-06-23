type PostgrestLikeError = {
  message?: string;
  code?: string;
  details?: string;
};

export function getErrorMessage(err: unknown): string {
  if (!err) return 'Error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;

  if (typeof err === 'object' && err !== null && 'message' in err) {
    const pg = err as PostgrestLikeError;
    if (typeof pg.message === 'string') return pg.message;
  }

  return 'Error';
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as PostgrestLikeError).code === '23505';
}
