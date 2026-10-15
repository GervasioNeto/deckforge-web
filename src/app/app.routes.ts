import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'decks' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./pages/cadastro/cadastro').then((m) => m.Cadastro),
    canActivate: [guestGuard],
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.Perfil),
    canActivate: [authGuard],
  },
  {
    // No guard: GET /decks/public works signed out, so visitors can browse too.
    path: 'explorar',
    loadComponent: () =>
      import('./pages/decks/decks-explore/decks-explore').then((m) => m.DecksExplore),
  },
  {
    path: 'decks',
    loadComponent: () =>
      import('./pages/decks/decks-list/decks-list').then((m) => m.DecksList),
    canActivate: [authGuard],
  },
  {
    path: 'decks/novo',
    loadComponent: () => import('./pages/decks/deck-new/deck-new').then((m) => m.DeckNew),
    canActivate: [authGuard],
  },
  {
    // No guard: public decks open signed out too; the API answers 404 for private ones.
    path: 'decks/:deckId',
    loadComponent: () =>
      import('./pages/decks/deck-detail/deck-detail').then((m) => m.DeckDetail),
    // Card stacks and grids need more room than the default column (see Shell).
    data: { wide: true },
  },
  { path: '**', redirectTo: 'decks' },
];
