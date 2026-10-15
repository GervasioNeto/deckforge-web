import { DeckCard } from '../../models/card.model';
import {
  CardGroupInfo,
  DeckIssue,
  DeckValidation,
  GameRules,
  GroupingId,
  NO_ISSUES,
} from '../game-rules';

/**
 * First pass at Pokémon TCG rules, so Pokémon decks already open and group.
 * The API doesn't serve Pokémon cards yet; the `typeLine` checks below assume
 * the provider maps the card's supertype ("Pokémon", "Trainer", "Energy") into it.
 */

const DECK_SIZE = 60;
const COPY_LIMIT = 4;

function supertype(card: DeckCard): CardGroupInfo {
  const typeLine = card.typeLine.toLowerCase();
  if (typeLine.includes('energy') || typeLine.includes('energia')) {
    return { key: 'energy', label: 'Energias', order: 2 };
  }
  if (typeLine.includes('trainer') || typeLine.includes('treinador')) {
    return { key: 'trainer', label: 'Treinadores', order: 1 };
  }
  if (typeLine.includes('pokémon') || typeLine.includes('pokemon')) {
    return { key: 'pokemon', label: 'Pokémon', order: 0 };
  }
  return { key: 'other', label: 'Outras', order: 3 };
}

function groupOf(card: DeckCard, grouping: GroupingId): CardGroupInfo {
  return grouping === 'none' ? { key: 'all', label: 'Cartas', order: 0 } : supertype(card);
}

function validate(cards: readonly DeckCard[], format: string | null): DeckValidation {
  if (!format) {
    return NO_ISSUES;
  }

  const issues: DeckIssue[] = [];
  const cardIssues = new Map<string, string>();
  const deck = cards.filter((card) => card.board === 'main');
  const size = deck.reduce((sum, card) => sum + card.quantity, 0);

  if (size !== DECK_SIZE) {
    issues.push({
      severity: size > DECK_SIZE ? 'error' : 'warning',
      message: `O deck tem ${size} cartas; o formato pede exatamente ${DECK_SIZE}.`,
    });
  }

  for (const card of deck) {
    const basicEnergy = /basic/i.test(card.typeLine) && supertype(card).key === 'energy';
    if (!basicEnergy && card.quantity > COPY_LIMIT) {
      cardIssues.set(card.id, `${card.quantity} cópias; o máximo é ${COPY_LIMIT}`);
    }
  }
  if (cardIssues.size > 0) {
    issues.push({ severity: 'error', message: 'Há cartas acima do limite de 4 cópias.' });
  }

  return { issues, cardIssues };
}

export const POKEMON_RULES: GameRules = {
  groupings: [
    { id: 'type', label: 'Tipo' },
    { id: 'none', label: 'Sem agrupamento' },
  ],
  formats: [
    { id: 'standard', label: 'Standard' },
    { id: 'expanded', label: 'Expanded' },
    { id: 'unlimited', label: 'Unlimited' },
  ],
  hasMana: false,
  // Pokémon has no sideboard.
  boards: () => ['main', 'maybe'],
  groupOf,
  isLand: () => false,
  validate,
};
