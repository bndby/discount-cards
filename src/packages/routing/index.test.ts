import {buildExternalMapUrl, OrsDirections} from './index';

describe('маршруты', () => {
  it('без ключа не обращается к ORS', async () => {
    const request = jest.fn();
    const directions = new OrsDirections('', request as typeof fetch);
    await expect(
      directions.route(
        {latitude: 53.9, longitude: 27.56},
        {latitude: 53.91, longitude: 27.57},
        'walking',
      ),
    ).resolves.toBeNull();
    expect(request).not.toHaveBeenCalled();
  });

  it('открывает системную карту в том же режиме', () => {
    expect(
      buildExternalMapUrl('ios', {latitude: 53.9, longitude: 27.56}, 'walking'),
    ).toContain('dirflg=w');
    expect(
      buildExternalMapUrl(
        'android',
        {latitude: 53.9, longitude: 27.56},
        'driving',
      ),
    ).toContain('travelmode=driving');
  });
});
