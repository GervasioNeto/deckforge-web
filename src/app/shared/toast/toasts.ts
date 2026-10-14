import { Service, signal } from '@angular/core';
import { ToastVariant } from './toast';

export interface ToastMessage {
  message: string;
  variant: ToastVariant;
}

const DEFAULT_DURATION_MS = 3000;

/**
 * App-wide toast. The shell renders `current()`, so any page can call
 * `show()`/`success()`/`error()` without hosting its own `<app-toast>`.
 * A new toast replaces the one on screen.
 */
@Service()
export class Toasts {
  private readonly currentToast = signal<ToastMessage | null>(null);
  readonly current = this.currentToast.asReadonly();

  private timer: ReturnType<typeof setTimeout> | undefined;

  show(message: string, variant: ToastVariant = 'info', durationMs = DEFAULT_DURATION_MS): void {
    clearTimeout(this.timer);
    this.currentToast.set({ message, variant });
    this.timer = setTimeout(() => this.currentToast.set(null), durationMs);
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  warning(message: string): void {
    // Warnings usually ask the user to do something, so they stay longer.
    this.show(message, 'warning', 6000);
  }

  error(message: string): void {
    this.show(message, 'error', 5000);
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.currentToast.set(null);
  }
}
