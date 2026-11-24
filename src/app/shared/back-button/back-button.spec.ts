import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BackButton, HAS_PREVIOUS_PAGE } from './back-button';

@Component({
  imports: [BackButton],
  template: '<app-back-button label="Meus Decks" fallback="/decks" />',
})
class DeckPage {}

@Component({ template: '' })
class DecksPage {}

describe('BackButton', () => {
  let harness: RouterTestingHarness;
  let hasPreviousPage: boolean;

  beforeEach(async () => {
    hasPreviousPage = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'decks', component: DecksPage },
          { path: 'decks/:deckId', component: DeckPage },
        ]),
        // jsdom has no Navigation API; each test says whether the app has an earlier page.
        { provide: HAS_PREVIOUS_PAGE, useValue: () => hasPreviousPage },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  async function open(): Promise<HTMLAnchorElement> {
    await harness.navigateByUrl('/decks/deck-1', DeckPage);
    return harness.routeNativeElement!.querySelector('a')!;
  }

  /** Clicks the link; true when the button took over the click instead of the browser. */
  function click(link: HTMLAnchorElement, init: MouseEventInit = {}): boolean {
    let handled = false;
    // Runs after the button's handler: notes its decision, then stops jsdom following the href.
    link.ownerDocument.addEventListener(
      'click',
      (event) => {
        handled = event.defaultPrevented;
        event.preventDefault();
      },
      { once: true },
    );
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
    return handled;
  }

  it('names the fallback and goes there when the page was opened directly', async () => {
    const link = await open();

    expect(link.textContent?.trim()).toBe('Meus Decks');
    expect(link.getAttribute('href')).toBe('/decks');

    click(link);
    await harness.fixture.whenStable();
    expect(TestBed.inject(Location).path()).toBe('/decks');
  });

  it('goes back through the history when an earlier page of the app is there', async () => {
    hasPreviousPage = true;
    const back = vi.spyOn(TestBed.inject(Location), 'back');
    const link = await open();

    expect(link.textContent?.trim()).toBe('Voltar');

    expect(click(link)).toBe(true);
    expect(back).toHaveBeenCalledOnce();
  });

  it('leaves Ctrl+click to the browser, to open the fallback in a new tab', async () => {
    hasPreviousPage = true;
    const back = vi.spyOn(TestBed.inject(Location), 'back');
    const link = await open();

    expect(click(link, { ctrlKey: true })).toBe(false);
    expect(back).not.toHaveBeenCalled();
  });
});
