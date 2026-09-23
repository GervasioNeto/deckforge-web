import { Service, computed, signal } from '@angular/core';
import { Session, SupabaseClient, createClient } from '@supabase/supabase-js';
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

  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.sessionSignal.set(session);
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

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
