import { Component, computed, input, output } from '@angular/core';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

const VARIANT_STYLES: Record<ToastVariant, { container: string; icon: string }> = {
  info: { container: 'border-border bg-surface', icon: 'text-text-muted' },
  success: { container: 'border-cyan/40 bg-cyan/10', icon: 'text-cyan' },
  warning: { container: 'border-warning/40 bg-warning/10', icon: 'text-warning' },
  error: { container: 'border-purple/40 bg-purple/10', icon: 'text-purple' },
};

@Component({
  selector: 'app-toast',
  imports: [],
  templateUrl: './toast.html',
})
export class Toast {
  readonly message = input.required<string>();
  readonly variant = input<ToastVariant>('info');
  readonly dismissible = input(true);
  readonly dismissed = output<void>();

  /** Error/warning interrupt screen readers; info/success just announce politely. */
  protected readonly role = computed<'alert' | 'status'>(() =>
    this.variant() === 'error' || this.variant() === 'warning' ? 'alert' : 'status',
  );
  protected readonly containerClasses = computed(() => VARIANT_STYLES[this.variant()].container);
  protected readonly iconClasses = computed(() => VARIANT_STYLES[this.variant()].icon);
}
