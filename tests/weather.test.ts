import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  getForecast,
  getForecastOverview,
  getForecastWeekly,
  getTyphoonInfo,
  getSeismicHazard,
  getAmedasStations,
  getAmedasData,
  getEarthquakeList,
  getTsunamiList,
} from '../build/providers/weather.js';
import { mockJsonResponse, setupFetchMock } from './helpers.ts';

setupFetchMock();

describe('気象・防災API', () => {
  it('getForecast should fetch JMA forecast by areaCode', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /forecast\/130000\.json/);
      return mockJsonResponse([{ publishingOffice: '気象庁' }]);
    };

    const result = await getForecast({ areaCode: '130000' });
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.data));
  });

  it('getForecast should fail when areaCode is invalid', async () => {
    const result = await getForecast({ areaCode: '13A000' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /6-digit numeric code/);
  });

  it('getForecastOverview should fetch JMA overview by areaCode', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /overview_forecast\/270000\.json/);
      return mockJsonResponse({ text: '近畿地方では...' });
    };

    const result = await getForecastOverview({ areaCode: '270000' });
    assert.equal(result.success, true);
    assert.equal((result.data as { text?: string })?.text, '近畿地方では...');
  });

  it('getForecastOverview should fail when areaCode is empty', async () => {
    const result = await getForecastOverview({ areaCode: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /areaCode is required/);
  });

  it('getForecastWeekly should fetch JMA weekly overview by areaCode', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /overview_week\/130000\.json/);
      return mockJsonResponse({ text: '向こう一週間は晴れの日が多いでしょう。' });
    };

    const result = await getForecastWeekly({ areaCode: '130000' });
    assert.equal(result.success, true);
    assert.equal((result.data as { text?: string })?.text, '向こう一週間は晴れの日が多いでしょう。');
  });

  it('getForecastWeekly should fail when areaCode is invalid', async () => {
    const result = await getForecastWeekly({ areaCode: '1300AA' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /6-digit numeric code/);
  });

  it('getTyphoonInfo should fetch typhoon JSON', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /bosai\/typhoon\/data\/tinfo\.json/);
      return mockJsonResponse({ comment: '台風情報' });
    };

    const result = await getTyphoonInfo();
    assert.equal(result.success, true);
    assert.equal((result.data as { comment?: string })?.comment, '台風情報');
  });

  it('getSeismicHazard should fetch J-SHIS hazard by lat/lon', async () => {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.match(url.pathname, /meshinfo\.geojson/);
      assert.equal(url.searchParams.get('position'), '139.6917,35.6895');
      return mockJsonResponse({ type: 'FeatureCollection', features: [] });
    };

    const result = await getSeismicHazard({ lat: 35.6895, lon: 139.6917 });
    assert.equal(result.success, true);
    assert.equal((result.data as { type?: string })?.type, 'FeatureCollection');
  });

  it('getSeismicHazard should fail when lat out of range', async () => {
    const result = await getSeismicHazard({ lat: 95, lon: 139.7 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /lat must be between -90 and 90/);
  });

  it('getSeismicHazard should fail when lon out of range', async () => {
    const result = await getSeismicHazard({ lat: 35.6, lon: -181 });
    assert.equal(result.success, false);
    assert.match(result.error || '', /lon must be between -180 and 180/);
  });

  it('getAmedasStations should fetch station master', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /amedas\/const\/amedastable\.json/);
      return mockJsonResponse({ '44132': { kjName: '東京' } });
    };

    const result = await getAmedasStations();
    assert.equal(result.success, true);
    assert.equal((result.data as Record<string, unknown>)?.['44132'] !== undefined, true);
  });

  it('getAmedasData should use latest_time when date is omitted', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      if (url.includes('/latest_time.txt')) {
        return new Response('2026-02-18T14:00:00+09:00', {
          status: 200,
          headers: { 'content-type': 'text/plain' },
        });
      }
      assert.match(url, /amedas\/data\/point\/44132\/2026021814\.json/);
      return mockJsonResponse({ '20260218140000': { temp: [10.2, 0] } });
    };

    const result = await getAmedasData({ pointId: '44132' });
    assert.equal(result.success, true);
  });

  it('getAmedasData should use explicit date when provided', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /amedas\/data\/point\/44132\/2025010109\.json/);
      assert.equal(url.includes('/latest_time.txt'), false);
      return mockJsonResponse({ '20250101090000': { temp: [5.1, 0] } });
    };

    const result = await getAmedasData({ pointId: '44132', date: '2025010109' });
    assert.equal(result.success, true);
  });

  it('getAmedasData should fail when pointId is missing', async () => {
    const result = await getAmedasData({ pointId: '' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /pointId is required/);
  });

  it('getAmedasData should fail when pointId format is invalid', async () => {
    const result = await getAmedasData({ pointId: '123' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /5-digit numeric code/);

    const result2 = await getAmedasData({ pointId: 'abcde' });
    assert.equal(result2.success, false);
    assert.match(result2.error || '', /5-digit numeric code/);
  });

  it('getAmedasData should fail when date format is invalid', async () => {
    const result = await getAmedasData({ pointId: '44132', date: '2025-01-01' });
    assert.equal(result.success, false);
    assert.match(result.error || '', /date must be YYYYMMDDHH/);
  });

  it('getEarthquakeList should fetch JMA earthquake list JSON', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /bosai\/quake\/data\/list\.json/);
      return mockJsonResponse([{ eid: 'EQ001', mag: 4.5 }]);
    };

    const result = await getEarthquakeList();
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.data));
  });

  it('getTsunamiList should fetch JMA tsunami list JSON', async () => {
    globalThis.fetch = async (input) => {
      const url = String(input);
      assert.match(url, /bosai\/tsunami\/data\/list\.json/);
      return mockJsonResponse([{ tid: 'TS001', areas: [] }]);
    };

    const result = await getTsunamiList();
    assert.equal(result.success, true);
    assert.ok(Array.isArray(result.data));
  });
});
