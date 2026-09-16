/**
 * Money helpers.
 *
 * Everything is an integer number of paisa (1 NPR = 100 paisa). No float ever
 * touches a total. Values crossing a boundary (form input, Firestore, API) are
 * validated as safe integers before use.
 */

const MINOR_PER_MAJOR = 100;

export function rupeesToMinor(rupees: number): number {
  return Math.round(rupees * MINOR_PER_MAJOR);
}

export function minorToRupees(minor: number): number {
  return minor / MINOR_PER_MAJOR;
}

/** `75000` renders as `Rs. 750`, `75050` as `Rs. 750.50`. */
export function formatNpr(minor: number): string {
  if (!Number.isFinite(minor)) return "Rs. 0";

  const negative = minor < 0;
  const abs = Math.abs(Math.round(minor));
  const major = Math.floor(abs / MINOR_PER_MAJOR);
  const paisa = abs % MINOR_PER_MAJOR;

  const grouped = groupNepali(major);
  const body = paisa === 0 ? grouped : `${grouped}.${String(paisa).padStart(2, "0")}`;

  return `${negative ? "-" : ""}Rs. ${body}`;
}

/**
 * Nepali digit grouping follows the South Asian system: the last three digits
 * group together, then pairs. 1234567 becomes 12,34,567.
 */
function groupNepali(value: number): string {
  const s = String(value);
  if (s.length <= 3) return s;

  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");

  return `${grouped},${last3}`;
}

export function isValidMinor(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
  );
}
