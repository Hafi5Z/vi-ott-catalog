import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseVi, dateISO, eligible, catalog } from '../scripts/build.mjs';
const section = (name, language, date) => `<h3>${name}</h3><table><tr><td>Release Date</td><td>${date}</td></tr><tr><td>Where to watch</td><td>Prime</td></tr><tr><td>Language</td><td>${language}</td></tr><tr><td>Cast</td><td>Actor One, Actor Two</td></tr></table>`;
test('reads facts only, excludes other languages and date ranges, deduplicates', () => {
  const good = section('Movie &amp; Two', 'English', 'Oct 8, 2026');
  const result = parseVi(good + good + section('Hindi', 'Hindi', 'Oct 8, 2026') + section('Daily', 'English', 'Oct 10 to Oct 16, 2026'));
  assert.equal(result.length, 1); assert.equal(result[0].title, 'Movie & Two'); assert.equal(result[0].date, '2026-10-08');
});
test('source layout failure never silently publishes empty catalogs', () => assert.throws(() => parseVi('<h3>broken</h3>')));
test('strict date validates real day', () => { assert.equal(dateISO('Feb 30, 2026'), null); assert.equal(dateISO('Oct 00, 2026'), null); assert.equal(dateISO('October 8th, 2026'), '2026-10-08'); });
test('future dates excluded until India date; newest OTT date first; archive expires', () => {
  const entries = ['2026-10-12', '2026-10-03', '2026-10-08', '2026-01-01'].map(date => ({ date, name: 'Title' }));
  assert.deepEqual(eligible(entries, '2026-10-11').map(r => r.date), ['2026-10-08', '2026-10-03']);
  assert.equal(eligible(entries, '2026-10-12')[0].date, '2026-10-12');
});
test('repeated series arrivals update placement, no duplicate tile; original release year unchanged', () => {
  const old = { id: 'tt123', type: 'series', name: 'Returning show', date: '2026-10-01', releaseInfo: '2016-' };
  const result = catalog([old, { ...old, date: '2026-10-09' }], 'series', '2026-10-11');
  assert.equal(result.metas.length, 1); assert.equal(result.metas[0].releaseInfo, '2016-'); assert.match(result.metas[0].description, /2026-10-09/);
});
