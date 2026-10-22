/**
 * Philippine Standard Geographic Code (PSGC) lookups used by the cascading
 * Province -> City/Municipality -> Barangay dropdowns on the registration form.
 *
 * Data is read live from the public PSGC API (psgc.gitlab.io) so the repo does
 * not have to bundle the ~42k barangays, and every level is cached in memory
 * for the lifetime of the page. Each helper resolves to `[]` (never throws)
 * when the API is unreachable, so the form degrades to an empty dropdown
 * instead of crashing.
 */

const PSGC_BASE = "https://psgc.gitlab.io/api";

/** @type {Map<string, Promise<Array<{ code: string, name: string }>>>} */
const cache = new Map();

async function getJson(path) {
  if (cache.has(path)) return cache.get(path);

  const promise = (async () => {
    const res = await fetch(`${PSGC_BASE}${path}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`PSGC request failed (${res.status})`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  })();

  cache.set(path, promise);
  try {
    return await promise;
  } catch (error) {
    // Do not cache failures - a later attempt should be able to retry.
    cache.delete(path);
    console.error(`Failed to load PSGC data for ${path}:`, error.message);
    return [];
  }
}

function toOptions(rows) {
  return rows
    .filter((row) => row?.code && row?.name)
    .map((row) => ({ code: row.code, name: row.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** All provinces, alphabetically. */
export async function fetchProvinces() {
  return toOptions(await getJson("/provinces/"));
}

/** Cities and municipalities inside a province, alphabetically. */
export async function fetchCities(provinceCode) {
  if (!provinceCode) return [];
  return toOptions(
    await getJson(`/provinces/${provinceCode}/cities-municipalities/`),
  );
}

/** Barangays inside a city or municipality, alphabetically. */
export async function fetchBarangays(cityCode) {
  if (!cityCode) return [];
  return toOptions(
    await getJson(`/cities-municipalities/${cityCode}/barangays/`),
  );
}
