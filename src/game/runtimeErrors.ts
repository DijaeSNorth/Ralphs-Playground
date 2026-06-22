const MAX_RUNTIME_ERRORS = 5;
const recentRuntimeErrors: string[] = [];

export function formatRuntimeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || error.name;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown runtime issue';
  }
}

export function recordRuntimeError(error: unknown): void {
  recentRuntimeErrors.push(formatRuntimeError(error).slice(0, 220));

  while (recentRuntimeErrors.length > MAX_RUNTIME_ERRORS) {
    recentRuntimeErrors.shift();
  }
}

export function getRecentRuntimeErrors(): string[] {
  return [...recentRuntimeErrors];
}
