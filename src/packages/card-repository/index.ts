import type {
  CardDraft,
  DiscountCard,
} from '../discount-card';
import {createUuid} from '../discount-card/uuid';

function copyCard(card: DiscountCard): DiscountCard {
  return {...card, photos: [...card.photos]};
}

export interface CardRepository {
  initialize(): Promise<void>;
  list(): Promise<DiscountCard[]>;
  get(id: string): Promise<DiscountCard | null>;
  findByCode(code: string, exceptId?: string): Promise<DiscountCard[]>;
  create(draft: CardDraft): Promise<DiscountCard>;
  update(id: string, draft: CardDraft): Promise<DiscountCard>;
  delete(id: string): Promise<void>;
  recordPresentationOpen(id: string): Promise<void>;
}

export class MemoryCardRepository implements CardRepository {
  private cards: DiscountCard[] = [];

  async initialize(): Promise<void> {}

  async list(): Promise<DiscountCard[]> {
    return this.cards.map(copyCard);
  }

  async get(id: string): Promise<DiscountCard | null> {
    const card = this.cards.find(item => item.id === id);
    return card ? copyCard(card) : null;
  }

  async findByCode(
    code: string,
    exceptId?: string,
  ): Promise<DiscountCard[]> {
    return this.cards
      .filter(card => card.code === code && card.id !== exceptId)
      .map(copyCard);
  }

  async create(draft: CardDraft): Promise<DiscountCard> {
    const now = new Date().toISOString();
    const card: DiscountCard = {
      ...draft,
      photos: [...draft.photos],
      id: createUuid(),
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.cards.push(card);
    return copyCard(card);
  }

  async update(id: string, draft: CardDraft): Promise<DiscountCard> {
    const index = this.cards.findIndex(card => card.id === id);
    if (index < 0) {
      throw new Error(`Unknown card ${id}`);
    }
    const updated: DiscountCard = {
      ...this.cards[index],
      ...draft,
      photos: [...draft.photos],
      updatedAt: new Date().toISOString(),
    };
    this.cards[index] = updated;
    return copyCard(updated);
  }

  async delete(id: string): Promise<void> {
    this.cards = this.cards.filter(card => card.id !== id);
  }

  async recordPresentationOpen(id: string): Promise<void> {
    const card = this.cards.find(item => item.id === id);
    if (card) {
      card.usageCount += 1;
      card.updatedAt = new Date().toISOString();
    }
  }
}
