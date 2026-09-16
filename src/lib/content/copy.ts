import { TRANSLATIONS } from "../../config/translations";
export function flattenCopy(value: unknown, prefix = ""): Record<string,string> {
  if (typeof value === "string") return {[prefix]:value};
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => Object.entries(flattenCopy(item, prefix ? `${prefix}.${key}` : key))));
}
export const COPY_DEFAULTS = flattenCopy(TRANSLATIONS);
export function applyCopy(overrides: Record<string,string> = {}) {
  const copy = structuredClone(TRANSLATIONS);
  for (const [path, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(COPY_DEFAULTS, path)) continue;
    const keys = path.split('.');
    let target: Record<string,unknown> = copy;
    for (const key of keys.slice(0,-1)) target = target[key] as Record<string,unknown>;
    target[keys.at(-1)!] = value;
  }
  return copy;
}
