import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'decks' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./pages/cadastro/cadastro').then((m) => m.Cadastro),
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil').then((m) => m.Perfil),
    canActivate: [authGuard],
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
    path: 'decks/:deckId',
    loadComponent: () =>
      import('./pages/decks/deck-detail/deck-detail').then((m) => m.DeckDetail),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'decks' },
];
