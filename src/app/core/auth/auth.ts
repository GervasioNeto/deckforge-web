import { Service, computed, signal } from '@angular/core';
import { Session, SupabaseClient, createClient } from '@supabase/supabase-js';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Service()
export class Auth {
  private readonly supabase: SupabaseClient = createClient(
    environment.supabaseUrl,
    environment.supabaseAnonKey,
  );

  private readonly sessionSignal = signal<Session | null>(null);

  readonly session = this.sessionSignal.asReadonly();
  readonly accessToken = computed(() => this.sessionSignal()?.access_token ?? null);
  readonly isAuthenticated = computed(() => this.accessToken() !== null);
  readonly currentUser = computed(() => this.sessionSignal()?.user ?? null);
  /** Stored in Supabase user_metadata, since the API has no profile route yet. */
  readonly displayName = computed(() => {
    const name = this.currentUser()?.user_metadata?.['display_name'];
    return typeof name === 'string' && name.trim() ? name.trim() : null;
  });
  /** First letter of the name (or e-mail), used as the avatar. */
  readonly initial = computed(
    () => (this.displayName() ?? this.currentUser()?.email)?.charAt(0).toUpperCase() ?? '?',
  );
  /** New address waiting for the user to click the confirmation link. */
  readonly pendingEmail = computed(() => this.currentUser()?.new_email ?? null);

  private readonly signedOutExternallySubject = new Subject<void>();
  /**
   * Emits when the session ends without this tab calling signOut(): a sign-out in
   * another tab (synced by Supabase) or a refresh token revoked from another device.
   */
  readonly signedOutExternally = this.signedOutExternallySubject.asObservable();
  private signingOut = false;

  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.sessionSignal.set(session);
      if (event === 'SIGNED_OUT' && !this.signingOut) {
        this.signedOutExternallySubject.next();
      }
    });
  }

  /** Restores the current session on app boot. Call once from an app initializer. */
  init(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = this.supabase.auth.getSession().then(({ data }) => {
        this.sessionSignal.set(data.session);
      });
    }
    return this.readyPromise;
  }

  async signUp(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /**
   * Saves the display name and, when `email` is given, starts an e-mail change.
   * Supabase only switches the address after the user clicks the link it sends.
   */
  async updateProfile(changes: { displayName: string; email?: string }): Promise<void> {
    const { error } = await this.supabase.auth.updateUser(
      {
        data: { display_name: changes.displayName },
        ...(changes.email ? { email: changes.email } : {}),
      },
      { emailRedirectTo: `${window.location.origin}/perfil` },
    );
    if (error) throw error;
  }

  async updatePassword(password: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password });
    if (error) throw error;
  }

  /**
   * 'local' ends only this browser's session; 'global' revokes every device.
   * Supabase defaults to 'global', so the scope is always passed explicitly.
   * The local session is removed even when this throws.
   */
  async signOut(scope: 'local' | 'global' = 'local'): Promise<void> {
    this.signingOut = true;
    try {
      const { error } = await this.supabase.auth.signOut({ scope });
      if (error) throw error;
    } finally {
      this.signingOut = false;
    }
  }
}
