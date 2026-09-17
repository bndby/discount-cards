import type {CardDraft} from '../discount-card';
import {MemoryCardRepository} from './index';

const draft: CardDraft = {
  catalogBrandId: 'green',
  customBrandName: null,
  code: '123',
  codeType: 'text',
  colorOverride: null,
  isFavorite: false,
  photos: [],
};

describe('репозиторий карточек', () => {
  it('создаёт, правит и удаляет карточку через публичный интерфейс', async () => {
    const repository = new MemoryCardRepository();
    const created = await repository.create(draft);
    await repository.update(created.id, {...draft, code: '456'});
    expect((await repository.get(created.id))?.code).toBe('456');
    await repository.delete(created.id);
    expect(await repository.list()).toEqual([]);
  });

  it('увеличивает usageCount только явным открытием предъявления', async () => {
    const repository = new MemoryCardRepository();
    const created = await repository.create(draft);
    await repository.get(created.id);
    expect((await repository.get(created.id))?.usageCount).toBe(0);
    await repository.recordPresentationOpen(created.id);
    expect((await repository.get(created.id))?.usageCount).toBe(1);
  });

  it('находит дубликаты кода, но не запрещает создание', async () => {
    const repository = new MemoryCardRepository();
    await repository.create(draft);
    await repository.create(draft);
    expect(await repository.findByCode('123')).toHaveLength(2);
  });
});
