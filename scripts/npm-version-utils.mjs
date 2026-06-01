/**
 * npm 版本列表与 openclaw 日历版本号比较
 */

/** @param {string} v */
export function isStableVersion(v) {
  if (!v || typeof v !== 'string') return false;
  if (/-(alpha|beta|rc|pre|dev|canary|nightly)/i.test(v)) return false;
  return /^\d{4}\.\d+\.\d+/.test(v) || /^\d+\.\d+\.\d+/.test(v);
}

/** openclaw 现行日历版本（如 2026.5.28），用于老版本回填队列 */
export function isOpenclawCalverVersion(v) {
  if (!v || typeof v !== 'string') return false;
  if (!/^\d{4}\.\d+\.\d+$/.test(v)) return false;
  const year = Number.parseInt(v.slice(0, 4), 10);
  return year >= 2024;
}

/** @param {string} a @param {string} b @returns {number} */
export function compareOpenclawVersion(a, b) {
  const pa = a.split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split(/[.-]/).map((x) => Number.parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

/** @param {string[]} versions */
export function sortVersionsDesc(versions) {
  return [...versions].sort(compareOpenclawVersion).reverse();
}

/**
 * 从汉化包版本解析对应官方版本号
 * @param {string} zhVer 如 2026.5.28-zh 或 2026.5.28-zh.20260601
 */
export function parseZhUpstreamBase(zhVer) {
  const m = String(zhVer).match(/^(\d{4}\.\d+\.\d+|\d+\.\d+\.\d+)-zh/);
  return m ? m[1] : null;
}

/** @param {string[]} zhVersions */
export function publishedUpstreamBases(zhVersions) {
  const bases = new Set();
  for (const v of zhVersions) {
    const base = parseZhUpstreamBase(v);
    if (base) bases.add(base);
  }
  return bases;
}

/**
 * @param {string} pkg 如 openclaw 或 @scope/pkg
 */
export async function fetchNpmVersions(pkg) {
  const enc = pkg.startsWith('@') ? pkg.replace('/', '%2f') : pkg;
  const res = await fetch(`https://registry.npmjs.org/${enc}`);
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`npm registry ${pkg}: HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.time?.unpublished) return [];
  return Object.keys(json.versions || {});
}

/**
 * 从 latest 的「上一个」起，找第一个尚未发布汉化包的官方稳定版
 * @param {string[]} officialStable 已按新→旧排序
 * @param {Set<string>} publishedBases
 */
export function pickNextBackfillVersion(officialStable, publishedBases) {
  if (officialStable.length === 0) return null;

  for (let i = 1; i < officialStable.length; i++) {
    const v = officialStable[i];
    if (!publishedBases.has(v)) return v;
  }
  return null;
}
