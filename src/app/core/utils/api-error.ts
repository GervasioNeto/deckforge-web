import { HttpErrorResponse } from '@angular/common/http';

/** Backend error codes shared by every endpoint. */
const commonMessages: Record<string, string> = {
  DECK_NOT_FOUND: 'Deck não encontrado.',
  CARD_NOT_FOUND: 'Nenhuma carta encontrada com esse nome.',
  UPSTREAM_ERROR: 'O serviço de cartas está indisponível. Tente novamente.',
};

/**
 * Portuguese message for an API error. The backend answers
 * `{ error: CODE, message }`; `messages` overrides the common ones per call site.
 */
export function apiErrorMessage(
  error: unknown,
  fallback: string,
  messages: Record<string, string> = {},
): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'Sem conexão com o servidor.';
  }

  const code: unknown = error.error?.error;
  if (typeof code !== 'string') {
    return fallback;
  }

  return messages[code] ?? commonMessages[code] ?? fallback;
}
