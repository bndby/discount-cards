import {open, type DB, type QueryResult} from '@op-engineering/op-sqlite';

import {
  normalizeDraft,
  type CardDraft,
  type CodeType,
  type DiscountCard,
} from '../discount-card';
import {createUuid} from '../discount-card/uuid';
import type {CardRepository} from './index';

type CardRow = {
  id: string;
  catalog_brand_id: string | null;
  custom_brand_name: string | null;
  code: string;
  code_type: CodeType;
  color_override: string | null;
  is_favorite: number;
  photos_json: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
};

function cardFromRow(row: CardRow): DiscountCard {
  return {
    id: row.id,
    catalogBrandId: row.catalog_brand_id,
    customBrandName: row.custom_brand_name,
    code: row.code,
    codeType: row.code_type,
    colorOverride: row.color_override,
    isFavorite: Boolean(row.is_favorite),
    photos: JSON.parse(row.photos_json) as string[],
    usageCount: row.usage_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowsFrom(result: QueryResult): CardRow[] {
  return result.rows as unknown as CardRow[];
}

const CARD_COLUMNS = `
  id, catalog_brand_id, custom_brand_name, code, code_type,
  color_override, is_favorite, photos_json, usage_count,
  created_at, updated_at
`;

export class SQLiteCardRepository implements CardRepository {
  constructor(private readonly database: DB) {}

  async initialize(): Promise<void> {
    await this.database.executeBatch([
      [
        `CREATE TABLE IF NOT EXISTS discount_cards (
          id TEXT PRIMARY KEY NOT NULL,
          catalog_brand_id TEXT,
          custom_brand_name TEXT,
          code TEXT NOT NULL,
          code_type TEXT NOT NULL,
          color_override TEXT,
          is_favorite INTEGER NOT NULL DEFAULT 0,
          photos_json TEXT NOT NULL DEFAULT '[]',
          usage_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          CHECK (
            (catalog_brand_id IS NOT NULL AND custom_brand_name IS NULL) OR
            (catalog_brand_id IS NULL AND length(trim(custom_brand_name)) > 0)
          ),
          CHECK (length(trim(code)) > 0)
        )`,
      ],
      ['CREATE INDEX IF NOT EXISTS discount_cards_code ON discount_cards(code)'],
    ]);
  }

  async list(): Promise<DiscountCard[]> {
    const result = await this.database.execute(
      `SELECT ${CARD_COLUMNS} FROM discount_cards`,
    );
    return rowsFrom(result).map(cardFromRow);
  }

  async get(id: string): Promise<DiscountCard | null> {
    const result = await this.database.execute(
      `SELECT ${CARD_COLUMNS} FROM discount_cards WHERE id = ? LIMIT 1`,
      [id],
    );
    return rowsFrom(result)[0] ? cardFromRow(rowsFrom(result)[0]) : null;
  }

  async findByCode(
    code: string,
    exceptId?: string,
  ): Promise<DiscountCard[]> {
    const result = await this.database.execute(
      `SELECT ${CARD_COLUMNS} FROM discount_cards
       WHERE code = ? AND (? IS NULL OR id != ?)`,
      [code.trim(), exceptId ?? null, exceptId ?? null],
    );
    return rowsFrom(result).map(cardFromRow);
  }

  async create(draft: CardDraft): Promise<DiscountCard> {
    const card: DiscountCard = {
      ...normalizeDraft(draft),
      id: createUuid(),
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.write(card, true);
    return card;
  }

  async update(id: string, draft: CardDraft): Promise<DiscountCard> {
    const current = await this.get(id);
    if (!current) {
      throw new Error(`Unknown card ${id}`);
    }
    const card: DiscountCard = {
      ...current,
      ...normalizeDraft(draft),
      updatedAt: new Date().toISOString(),
    };
    await this.write(card, false);
    return card;
  }

  async delete(id: string): Promise<void> {
    await this.database.transaction(async transaction => {
      await transaction.execute('DELETE FROM discount_cards WHERE id = ?', [
        id,
      ]);
    });
  }

  async recordPresentationOpen(id: string): Promise<void> {
    await this.database.transaction(async transaction => {
      await transaction.execute(
        `UPDATE discount_cards
         SET usage_count = usage_count + 1, updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), id],
      );
    });
  }

  private async write(card: DiscountCard, isNew: boolean): Promise<void> {
    const values = [
      card.id,
      card.catalogBrandId,
      card.customBrandName,
      card.code,
      card.codeType,
      card.colorOverride,
      card.isFavorite ? 1 : 0,
      JSON.stringify(card.photos),
      card.usageCount,
      card.createdAt,
      card.updatedAt,
    ];
    await this.database.transaction(async transaction => {
      if (isNew) {
        await transaction.execute(
          `INSERT INTO discount_cards (${CARD_COLUMNS})
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          values,
        );
      } else {
        await transaction.execute(
          `UPDATE discount_cards SET
            catalog_brand_id = ?, custom_brand_name = ?, code = ?,
            code_type = ?, color_override = ?, is_favorite = ?,
            photos_json = ?, usage_count = ?, created_at = ?, updated_at = ?
           WHERE id = ?`,
          [...values.slice(1), card.id],
        );
      }
    });
  }
}

let connection: DB | undefined;

export function openCardDatabase(): DB {
  connection ??= open({name: 'discount-cards.sqlite'});
  return connection;
}
