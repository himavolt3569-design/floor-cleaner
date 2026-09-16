/**
 * Nepal administrative divisions, used to validate and structure delivery
 * addresses. Province names use the current official set.
 */

export const NEPAL_PROVINCES = [
  "Koshi",
  "Madhesh",
  "Bagmati",
  "Gandaki",
  "Lumbini",
  "Karnali",
  "Sudurpashchim",
] as const;

export type NepalProvince = (typeof NEPAL_PROVINCES)[number];

export const NEPAL_DISTRICTS: Record<NepalProvince, string[]> = {
  Koshi: [
    "Bhojpur", "Dhankuta", "Ilam", "Jhapa", "Khotang", "Morang", "Okhaldhunga",
    "Panchthar", "Sankhuwasabha", "Solukhumbu", "Sunsari", "Taplejung",
    "Terhathum", "Udayapur",
  ],
  Madhesh: [
    "Bara", "Dhanusha", "Mahottari", "Parsa", "Rautahat", "Saptari", "Sarlahi",
    "Siraha",
  ],
  Bagmati: [
    "Bhaktapur", "Chitwan", "Dhading", "Dolakha", "Kathmandu", "Kavrepalanchok",
    "Lalitpur", "Makwanpur", "Nuwakot", "Ramechhap", "Rasuwa", "Sindhuli",
    "Sindhupalchok",
  ],
  Gandaki: [
    "Baglung", "Gorkha", "Kaski", "Lamjung", "Manang", "Mustang", "Myagdi",
    "Nawalpur", "Parbat", "Syangja", "Tanahun",
  ],
  Lumbini: [
    "Arghakhanchi", "Banke", "Bardiya", "Dang", "Eastern Rukum", "Gulmi",
    "Kapilvastu", "Palpa", "Parasi", "Pyuthan", "Rolpa", "Rupandehi",
  ],
  Karnali: [
    "Dailekh", "Dolpa", "Humla", "Jajarkot", "Jumla", "Kalikot", "Mugu",
    "Salyan", "Surkhet", "Western Rukum",
  ],
  Sudurpashchim: [
    "Achham", "Baitadi", "Bajhang", "Bajura", "Dadeldhura", "Darchula",
    "Doti", "Kailali", "Kanchanpur",
  ],
};

export const KATHMANDU_VALLEY_DISTRICTS = ["Kathmandu", "Lalitpur", "Bhaktapur"];

/**
 * Nepali mobile numbers are 10 digits beginning 97/98 (mobile) or 96
 * (some newer NTC ranges). Landlines are rejected: couriers need a mobile.
 */
export const NEPAL_MOBILE_PATTERN = /^9[6-8]\d{8}$/;

/**
 * Accepts the shapes people actually type: `+977 98...`, `0098...`,
 * `977-98...`, `98 12 34 56 78`. Returns the bare 10 digit national number,
 * or null when it cannot be read as a Nepali mobile.
 */
export function normalizeNepaliMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let national = digits;

  if (national.startsWith("00977")) national = national.slice(5);
  else if (national.startsWith("977") && national.length > 10) national = national.slice(3);

  if (national.length === 11 && national.startsWith("0")) national = national.slice(1);

  return NEPAL_MOBILE_PATTERN.test(national) ? national : null;
}

/** Presentation form: +977 98XXXXXXXX */
export function formatNepaliMobile(national: string): string {
  return `+977 ${national}`;
}
