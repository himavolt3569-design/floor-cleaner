import { NEPAL_DISTRICTS, NEPAL_PROVINCES } from "../../config/nepal";

const normalize = (value: string) => value.toLowerCase().replace(/\b(district|province|metropolitan city|sub-metropolitan city|municipality|rural municipality)\b/g, "").replace(/[^a-z0-9]/g, "");
const aliases: Record<string, string> = { kavre: "Kavrepalanchok", kavrepalanchowk: "Kavrepalanchok", sindhupalchowk: "Sindhupalchok", nawalparasieast: "Nawalpur", nawalparasibardaghatsustaeast: "Nawalpur", nawalparasiwest: "Parasi", rukumeast: "Eastern Rukum", rukumwest: "Western Rukum" };

export function normalizeNepalAddress(address: Record<string, string>) {
  if (address.country_code?.toLowerCase() !== "np") throw new Error("This location is outside Nepal. Enter a Nepal delivery address manually.");
  const candidates = [address.county, address.state_district, address.district].filter(Boolean).map(normalize);
  let district = "";
  let province = "";
  for (const p of NEPAL_PROVINCES) {
    const match = NEPAL_DISTRICTS[p].find((d) => candidates.some((c) => c === normalize(d) || aliases[c] === d));
    if (match) { district = match; province = p; break; }
  }
  if (!province) province = NEPAL_PROVINCES.find((p) => normalize(address.state ?? "") === normalize(p)) ?? "";
  const municipality = address.city || address.town || address.municipality || address.village || "";
  const wardMatch = [address.suburb, address.city_district, address.neighbourhood].filter(Boolean).join(" ").match(/\bward\s*(?:no\.?\s*)?[-:]?\s*(\d{1,2})\b/i);
  return { province, district, municipality, ward: wardMatch?.[1] ?? "", area: address.neighbourhood || address.quarter || address.suburb || "", street: address.road || "" };
}
