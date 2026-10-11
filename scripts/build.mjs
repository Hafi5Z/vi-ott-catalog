import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const SOURCE = 'https://www.myvi.in/blog/ott-releases-this-week';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const CINE = 'https://v3-cinemeta.strem.io';
// These three ambiguous titles were checked against source cast and IMDb.
const VERIFIED = {
  'mortal kombat 2': { id: 'tt17490712', type: 'movie' },
  carrie: { id: 'tt11540908', type: 'series' },
  war: { id: 'tt37972251', type: 'series' }
};
export function text(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function dateISO(value) {
  const m = /^(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(20\d{2})$/i.exec(value);
  if (!m) return null;
  const month = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ').indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
  const iso = `${m[3]}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  const date = new Date(iso);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
}
export function parseVi(html) {
  const headings = [...html.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)];
  const found = new Map();
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    if (!/^<h3\b/i.test(h[0])) continue;
    const section = html.slice(h.index + h[0].length, headings[i + 1]?.index ?? html.length);
    const fields = {};
    for (const row of section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(c => text(c[1]));
      if (cells.length === 2) fields[cells[0].toLowerCase()] = cells[1];
    }
    if (fields.language?.toLowerCase() !== 'english') continue;
    const date = dateISO(fields['release date'] ?? '');
    if (!date || !fields['where to watch'] || !fields.cast) continue;
    const title = text(h[1]);
    found.set(`${norm(title)}:${date}`, { title, date, platform: fields['where to watch'], cast: fields.cast.split(',').map(s => s.trim()) });
  }
  if (!found.size) throw new Error('No dated English entries found: refusing to replace the working feed.');
  return [...found.values()];
}
async function fetchText(url) {
  let error;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'Vi-OTT-Catalog/1.0 (personal release discovery; daily refresh)' } });
      if (!r.ok) throw new Error(`HTTP ${r.status} from ${new URL(url).hostname}`);
      return await r.text();
    } catch (e) { error = e; }
  }
  throw error;
}
async function json(url) { return JSON.parse(await fetchText(url)); }
async function resolve(entry) {
  const fixed = VERIFIED[norm(entry.title)];
  if (fixed) {
    const { meta } = await json(`${CINE}/meta/${fixed.type}/${fixed.id}.json`);
    if (meta?.id !== fixed.id || meta.type !== fixed.type) throw new Error('Verified metadata unavailable');
    return meta;
  }
  const matches = [];
  for (const type of ['movie', 'series']) {
    const { metas = [] } = await json(`${CINE}/catalog/${type}/top/search=${encodeURIComponent(entry.title)}.json`);
    for (const candidate of metas.filter(m => norm(m.name) === norm(entry.title))) {
      const { meta } = await json(`${CINE}/meta/${type}/${candidate.id}.json`);
      const castMatches = (meta?.cast ?? []).filter(name => entry.cast.some(c => norm(c) === norm(name))).length;
      if (castMatches > 0 && /^tt\d+$/.test(meta.id)) matches.push(meta);
    }
  }
  // No guess from title alone; ambiguous or missing cast goes to status.json.
  if (matches.length !== 1) throw new Error(`Unresolved title (${matches.length} cast-confirmed matches)`);
  return matches[0];
}
export function eligible(releases, today) {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 90);
  return releases.filter(r => r.date <= today && r.date >= cutoff.toISOString().slice(0, 10))
    .sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}
export function catalog(releases, type, today) {
  const seen = new Set();
  return { metas: eligible(releases, today).filter(r => r.type === type).filter(r => !seen.has(r.id) && seen.add(r.id)).map(r => ({
    id: r.id, type: r.type, name: r.name, poster: r.poster, posterShape: 'poster', releaseInfo: r.releaseInfo,
    description: `Vi reports an OTT arrival on ${r.date}, on ${r.platform}. This is a curated discovery entry, not a playback guarantee.`
  })) };
}
export async function build() {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const entries = parseVi(await fetchText(SOURCE));
  const archivePath = path.join(ROOT, 'data/releases.json');
  const previous = JSON.parse(await readFile(archivePath, 'utf8'));
  const merged = new Map(previous.map(r => [`${norm(r.sourceTitle)}:${r.date}`, r]));
  const unresolved = [];
  for (const entry of entries) {
    const key = `${norm(entry.title)}:${entry.date}`;
    if (merged.has(key)) {
      merged.set(key, { ...merged.get(key), platform: entry.platform });
      continue;
    }
    try {
      const meta = await resolve(entry);
      merged.set(key, { sourceTitle: entry.title, date: entry.date, platform: entry.platform, id: meta.id,
        type: meta.type, name: meta.name, poster: meta.poster, releaseInfo: meta.releaseInfo });
    } catch (e) { unresolved.push({ title: entry.title, date: entry.date, reason: e.message }); }
  }
  const cutoff = new Date(`${today}T00:00:00Z`); cutoff.setUTCDate(cutoff.getUTCDate() - 90);
  const releases = [...merged.values()].filter(r => r.date >= cutoff.toISOString().slice(0, 10));
  const movies = catalog(releases, 'movie', today);
  const series = catalog(releases, 'series', today);
  if (!movies.metas.length && !series.metas.length) throw new Error('No resolved released titles: keeping last published deployment.');
  const manifest = { id: 'community.vi.ott.english', version: '1.0.0', name: 'Vi English OTT Arrivals',
    description: 'English OTT arrivals reported by Vi, newest first. Curated, not exhaustive. Rolling 90-day archive grows from installation; no streams, account keys or laptop server.',
    resources: ['catalog'], types: ['movie', 'series'], idPrefixes: ['tt'],
    catalogs: [ { type: 'movie', id: 'vi_english_movies', name: 'English — New on OTT (Vi)' },
      { type: 'series', id: 'vi_english_series', name: 'English — New & Returning OTT Series (Vi)' } ] };
  const status = { updatedAt: new Date().toISOString(), indiaDate: today, source: SOURCE,
    coverage: 'Vi curated weekly list only; not exhaustive. No pre-installation history is invented.',
    sort: 'Vi-reported OTT date descending', windowDays: 90, movieCount: movies.metas.length, seriesCount: series.metas.length,
    upcoming: releases.filter(r => r.date > today).map(r => ({ title: r.name, date: r.date })), unresolved };
  const outputs = { 'manifest.json': manifest, 'status.json': status, 'catalog/movie/vi_english_movies.json': movies, 'catalog/series/vi_english_series.json': series };
  for (const [relative, value] of Object.entries(outputs)) {
    const filename = path.join(ROOT, 'site', relative); await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, JSON.stringify(value, null, 2) + '\n');
  }
  await writeFile(path.join(ROOT, 'site/index.html'), '<!doctype html><meta charset="utf-8"><title>Vi English OTT Arrivals</title><h1>Vi English OTT Arrivals</h1><p>Catalog-only feed. Curated Vi release facts, not streams or a complete release database.</p><p><a href="manifest.json">Stremio-compatible manifest</a> · <a href="status.json">Update status and coverage</a> · <a href="https://www.myvi.in/blog/ott-releases-this-week">Source</a></p>');
  await writeFile(archivePath, JSON.stringify(releases, null, 2) + '\n');
  await writeFile(path.join(ROOT, 'data/last-update.json'), JSON.stringify(status, null, 2) + '\n');
  console.log(JSON.stringify(status, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
