import axios from 'axios';

/**
 * Philippine Standard Geographic Code (PSGC) reference data.
 * We call the public API directly (not through our backend) since it's just
 * static reference data with no auth and no privacy concerns, and React
 * Native's fetch isn't subject to browser CORS restrictions.
 *
 * Docs / data source: https://psgc.gitlab.io/api/
 *
 * NOTE: I could not call this API from my own environment to confirm its
 * exact JSON field names, so `pick()` below tries several common variants
 * (`code`/`psgcCode`, `name`/`regionName`/`provinceName`, etc.) instead of
 * assuming one. If the picker shows blank names or throws on first run,
 * the field names differ from what's covered here -- tell me the raw
 * response for one endpoint (e.g. open the region URL in your phone's
 * browser) and I'll adjust `pick()` to match.
 */
const PSGC_BASE = 'https://psgc.gitlab.io/api';

const client = axios.create({ baseURL: PSGC_BASE, timeout: 10000 });

export interface PsgcRegion {
  code: string;
  name: string;
}

export interface PsgcProvince {
  code: string;
  name: string;
}

export interface PsgcCity {
  code: string;
  name: string;
}

function pick(obj: any, keys: string[]): string {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return String(obj[k]);
  }
  return '';
}

const CODE_KEYS = ['code', 'psgcCode', 'psgc_code'];
const NAME_KEYS = ['name', 'regionName', 'provinceName', 'cityName', 'municipalityName', 'area_name'];

function normalize(raw: any[]): { code: string; name: string }[] {
  return raw
    .map((r) => ({ code: pick(r, CODE_KEYS), name: pick(r, NAME_KEYS) }))
    .filter((r) => r.code && r.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Simple in-memory cache: this data changes maybe once a year, and the app
// restarts on every reload during development anyway.
const cache = new Map<string, unknown>();

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  const value = await fetcher();
  cache.set(key, value);
  return value;
}

export async function fetchRegions(): Promise<PsgcRegion[]> {
  return cached('regions', async () => {
    const { data } = await client.get('/regions/');
    return normalize(data);
  });
}

export async function fetchProvinces(regionCode: string): Promise<PsgcProvince[]> {
  return cached(`provinces:${regionCode}`, async () => {
    const { data } = await client.get(`/regions/${regionCode}/provinces/`);
    return normalize(data);
  });
}

/**
 * Cities/municipalities under a province. NCR has no provinces, so pass
 * `regionCode` instead and this fetches directly under the region (NCR's
 * province list is empty; its cities sit one level up).
 */
export async function fetchCities(opts: { provinceCode?: string; regionCode?: string }): Promise<PsgcCity[]> {
  const key = opts.provinceCode ? `cities:province:${opts.provinceCode}` : `cities:region:${opts.regionCode}`;

  return cached(key, async () => {
    const path = opts.provinceCode
      ? `/provinces/${opts.provinceCode}/cities-municipalities/`
      : `/regions/${opts.regionCode}/cities-municipalities/`;

    const { data } = await client.get(path);
    return normalize(data);
  });
}

/** True for NCR, whose cities sit directly under the region (no province level). */
export function isProvincelessRegion(region: PsgcRegion): boolean {
  return /national capital region|\bncr\b/i.test(region.name);
}
