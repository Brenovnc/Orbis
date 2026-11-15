import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache');

// Generic client name on purpose: no personal data goes to the sources.
export const USER_AGENT =
  'OrbisDataBuild/1.0 (educational geography quiz; static data build script)';

const refresh = process.argv.includes('--refresh');

/**
 * Downloads a URL once and keeps it in scripts/.cache, so re-running the build is fast,
 * works offline and does not hammer the sources. Pass --refresh to download everything again.
 */
export async function cachedFetch(url, { as = 'json', cacheKey, init = {} } = {}) {
  const key =
    cacheKey ??
    createHash('sha1')
      .update(url + (init.body ?? ''))
      .digest('hex');
  const file = join(CACHE_DIR, key);

  if (!refresh && existsSync(file)) {
    const buffer = readFileSync(file);
    return as === 'json'
      ? JSON.parse(buffer.toString('utf8'))
      : as === 'text'
        ? buffer.toString('utf8')
        : buffer;
  }

  const buffer = await fetchWithRetry(url, init);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buffer);
  return as === 'json'
    ? JSON.parse(buffer.toString('utf8'))
    : as === 'text'
      ? buffer.toString('utf8')
      : buffer;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, init, attempts = 6) {
  for (let i = 1; ; i++) {
    // A short pause between real downloads keeps us under the public APIs' rate limits.
    await sleep(500);
    let wait = 3000 * i;
    try {
      const response = await fetch(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, ...(init.headers ?? {}) },
      });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      const retryAfter = Number(response.headers.get('retry-after'));
      if (retryAfter > 0) wait = retryAfter * 1000;
      throw new Error(`HTTP ${response.status} em ${url}`);
    } catch (error) {
      if (i >= attempts) throw error;
      console.warn(`Tentando de novo em ${Math.round(wait / 1000)} s: ${error.message}`);
      await sleep(wait);
    }
  }
}
