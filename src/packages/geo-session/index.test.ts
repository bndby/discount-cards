import {GeoSession} from './index';

describe('гео-сессия', () => {
  it('сохраняет результат пока пользователь не сдвинулся на 500 м', () => {
    const session = new GeoSession();
    expect(
      session.updatePosition({latitude: 53.9, longitude: 27.56}),
    ).toBe(false);
    expect(
      session.updatePosition({latitude: 53.901, longitude: 27.56}),
    ).toBe(false);
  });

  it('очищает кэш после сдвига больше 500 м', () => {
    const session = new GeoSession();
    session.updatePosition({latitude: 53.9, longitude: 27.56});
    expect(
      session.updatePosition({latitude: 53.91, longitude: 27.56}),
    ).toBe(true);
  });
});
