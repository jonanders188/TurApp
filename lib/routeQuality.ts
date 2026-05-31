export type TrailMode = "walking" | "cycling" | "skiing" | "unknown";

export function isBadImportedName(name?: string | null) {
  const value = String(name || "").trim();

  if (!value) return true;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^app:/i.test(value)) return true;
  if (value.length > 72) return true;
  if (/^(AnnenRute|Sykkelrute|Skiløype|Fotrute)\s+\d+$/i.test(value)) return true;

  return false;
}

export function classifyTrailMode(category?: string | null, name?: string | null): TrailMode {
  const c = String(category || "").toLowerCase();
  const n = String(name || "").toLowerCase();
  const text = `${c} ${n}`;

  if (text.includes("sykkel")) return "cycling";
  if (text.includes("ski") || text.includes("skiløype") || text.includes("loype") || text.includes("løype")) return "skiing";
  if (text.includes("fot") || text.includes("sti") || text.includes("turveg") || text.includes("turvei") || text.includes("gå")) return "walking";

  // AnnenRute i Kartverket kan være mye forskjellig.
  // For MVP: behandle som walking hvis navnet ikke tydelig er sjø/båt/padling.
  if (text.includes("annenrute") || text.includes("annen rute")) return "walking";

  return "unknown";
}

export function looksLikeWaterRoute(name?: string | null, category?: string | null) {
  const text = `${category || ""} ${name || ""}`.toLowerCase();

  return [
    "båt",
    "bat",
    "sjø",
    "sjo",
    "padle",
    "kajakk",
    "kano",
    "anker",
    "ankring",
    "havn",
    "led",
    "farled",
    "ferge",
    "ferry",
  ].some((word) => text.includes(word));
}

export function makeFriendlyRouteName(input: {
  name?: string | null;
  category?: string | null;
  distanceKm?: number | null;
  municipality?: string | null;
}) {
  const name = String(input.name || "").trim();
  const category = String(input.category || "").replace(/^app:/, "").trim();
  const km = typeof input.distanceKm === "number" && Number.isFinite(input.distanceKm)
    ? `${input.distanceKm.toFixed(input.distanceKm < 10 ? 1 : 0)} km`
    : null;

  if (!isBadImportedName(name)) return name;

  const mode = classifyTrailMode(category, name);

  const label =
    mode === "cycling" ? "Sykkelrute" :
    mode === "skiing" ? "Skiløype" :
    mode === "walking" ? "Turrute" :
    "Rute";

  const place = input.municipality || "Vestfold";
  return km ? `${label} i ${place}, ${km}` : `${label} i ${place}`;
}

export function shouldPublishImportedTrail(input: {
  name?: string | null;
  category?: string | null;
  distanceKm?: number | null;
  hasRoute?: boolean;
}) {
  const distance = Number(input.distanceKm || 0);
  const mode = classifyTrailMode(input.category, input.name);

  if (!input.hasRoute) return false;
  if (distance < 0.8) return false;
  if (looksLikeWaterRoute(input.name, input.category)) return false;

  // For MVP: allow walking/cycling/skiing. AnnenRute becomes walking unless water-like.
:q!  return mode === "walking" || mode === "cycling" || mode === "skiing";
}
