import { isAuthError } from '@supabase/supabase-js';

/** Supabase error codes worth a specific message; anything else gets the caller's fallback. */
const messages: Record<string, string> = {
  same_password: 'A nova senha precisa ser diferente da atual.',
  weak_password: 'Essa senha é muito fraca. Escolha uma mais forte.',
  reauthentication_needed: 'Por segurança, saia e entre novamente antes de fazer essa alteração.',
  email_exists: 'Esse e-mail já está em uso por outra conta.',
  email_address_invalid: 'Informe um e-mail válido.',
  email_address_not_authorized: 'Não é possível enviar e-mails para esse endereço.',
  over_email_send_rate_limit: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.',
};

/** Portuguese message for a Supabase auth error, instead of its English `message`. */
export function authErrorMessage(error: unknown, fallback: string): string {
  const code = isAuthError(error) ? error.code : undefined;
  return (code && messages[code]) ?? fallback;
}
