import i18n from '../src/app/i18n';
import {appTheme} from '../src/app/theme';

describe('каркас приложения', () => {
  it('запускается с русской локалью и темой главного действия', () => {
    expect(i18n.language).toBe('ru');
    expect(i18n.t('home.add')).toBe('Добавить карточку');
    expect(appTheme.colors.primaryContainer).toBe('#c8f04b');
  });
});
