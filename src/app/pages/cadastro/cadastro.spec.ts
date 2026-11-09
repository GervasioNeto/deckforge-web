import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Auth } from '../../core/auth/auth';
import { Toasts } from '../../shared/toast/toasts';
import { Cadastro } from './cadastro';

describe('Cadastro', () => {
  const signUp = vi.fn<(name: string, email: string, password: string) => Promise<boolean>>();
  const toast = vi.fn();

  beforeEach(() => {
    signUp.mockReset();
    toast.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        // The real Auth talks to Supabase.
        { provide: Auth, useValue: { signUp } },
        { provide: Toasts, useValue: { success: toast } },
      ],
    });
  });

  function setup() {
    const fixture = TestBed.createComponent(Cadastro);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const fill = (id: string, value: string) => {
      const input = root.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const submit = async () => {
      root.querySelector('form')!.dispatchEvent(new Event('submit'));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    return { root, fill, submit };
  }

  it('explains what is wrong instead of silently ignoring the click', async () => {
    const { root, fill, submit } = setup();
    fill('email', 'nao-e-email');
    fill('password', '123');

    await submit();

    expect(signUp).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Informe como quer ser chamado.');
    expect(root.textContent).toContain('Informe um e-mail válido.');
    expect(root.textContent).toContain('pelo menos 6 caracteres');
  });

  it('goes straight to the decks when the account is already signed in', async () => {
    signUp.mockResolvedValue(true);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { root, fill, submit } = setup();
    fill('name', '  Emerson ');
    fill('email', 'emerson@deckforge.com');
    fill('password', 'segredo1');

    await submit();

    expect(signUp).toHaveBeenCalledWith('Emerson', 'emerson@deckforge.com', 'segredo1');
    expect(navigate).toHaveBeenCalledWith('/decks');
    expect(toast).toHaveBeenCalled();
    expect(root.textContent).not.toContain('Verifique seu e-mail');
  });

  it('asks for the confirmation only when the account still needs it', async () => {
    signUp.mockResolvedValue(false);
    const { root, fill, submit } = setup();
    fill('name', 'Emerson');
    fill('email', 'emerson@deckforge.com');
    fill('password', 'segredo1');

    await submit();

    expect(root.textContent).toContain('Verifique seu e-mail');
  });
});
