import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "data/imported";
const OUT_GEOJSON = path.join(OUT_DIR, "turrutebasen-vestfold.raw.geojson");
const OUT_SQL = path.join(OUT_DIR, "seed-raw-turruter.sql");

const BASE = "https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter";

const LAYERS = [
  "app:Fotrute",
  "app:Sykkelrute",
  "app:Skiløype",
  "app:AnnenRute",
];

const VESTFOLD_BBOX = {
  minLon: 9.55,
  minLat: 58.85,
  maxLon: 10.75,
  maxLat: 59.75,
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function stripXml(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function xmlText(featureXml, localName) {
  const re = new RegExp(`<[^>]*:?${localName}[^>]*>([\\s\\S]*?)<\\/[^>]*:?${localName}>`, "i");
  const m = featureXml.match(re);
  return m ? stripXml(m[1]) : "";
}

function findFeatureBlocks(xml) {
  const blocks = [];

  const memberRe = /<(?:\w+:)?(?:member|featureMember)[^>]*>([\s\S]*?)<\/(?:\w+:)?(?:member|featureMember)>/gi;
  let m;

  while ((m = memberRe.exec(xml))) {
    blocks.push(m[1]);
  }

  if (blocks.length) return blocks;

  return [];
}

function parsePosList(featureXml) {
  const posListMatch = featureXml.match(/<(?:\w+:)?posList[^>]*>([\s\S]*?)<\/(?:\w+:)?posList>/i);
  if (posListMatch) {
    const nums = posListMatch[1]
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter(Number.isFinite);

    const coords = [];
    for (let i = 0; i < nums.length - 1; i += 2) {
      let a = nums[i];
      let b = nums[i + 1];

      // GML from Norwegian WFS often uses lat lon for EPSG:4326.
      // Convert to GeoJSON lon lat.
      let lon;
      let lat;

      if (a >= 57 && a <= 72 && b >= 3 && b <= 32) {
        lat = a;
        lon = b;
      } else {
        lon = a;
        lat = b;
      }

      coords.push([lon, lat]);
    }

    return coords;
  }

  const posRe = /<(?:\w+:)?pos[^>]*>([\s\S]*?)<\/(?:\w+:)?pos>/gi;
  const coords = [];
  let m;

  while ((m = posRe.exec(featureXml))) {
    const nums = m[1]
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter(Number.isFinite);

    if (nums.length >= 2) {
      let a = nums[0];
      let b = nums[1];

      let lon;
      let lat;

      if (a >= 57 && a <= 72 && b >= 3 && b <= 32) {
        lat = a;
        lon = b;
      } else {
        lon = a;
        lat = b;
      }

      coords.push([lon, lat]);
    }
  }

  return coords;
}

function inVestfold(coords) {
  return coords.some(([lon, lat]) =>
    lon >= VESTFOLD_BBOX.minLon &&
    lon <= VESTFOLD_BBOX.maxLon &&
    lat >= VESTFOLD_BBOX.minLat &&
    lat <= VESTFOLD_BBOX.maxLat
  );
}

function lengthKm(coords) {
  let total = 0;

  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];

    const r = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    total += 2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  return Math.round(total * 10) / 10;
}

function escSql(value) {
  return String(value ?? "").replaceAll("'", "''");
}

async function fetchLayer(layer) {
  const params = new URLSearchParams({
    service: "WFS",
    request: "GetFeature",
    version: "2.0.0",
    typeNames: layer,
    count: "2000",
  });

  const url = `${BASE}?${params.toString()}`;

  console.log(`Fetching ${layer} as GML/XML...`);
  const res = await fetch(url, {
    headers: {
      "User-Agent": process.env.TURRUTE_IMPORT_USER_AGENT || "TurApp import",
      Accept: "application/xml,text/xml,*/*",
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`${layer} failed: ${res.status} ${res.statusText}\n${text.slice(0, 500)}`);
  }

  if (/ExceptionReport|ServiceException/i.test(text)) {
    throw new Error(`${layer} returned exception:\n${text.slice(0, 800)}`);
  }

  return text;
}

function featureToGeoJson(block, layer, index) {
  const coords = parsePosList(block);
  if (coords.length < 2) return null;
  if (!inVestfold(coords)) return null;

  const sourceId =
    block.match(/gml:id="([^"]+)"/i)?.[1] ||
    block.match(/fid="([^"]+)"/i)?.[1] ||
    `${layer}-${index}`;

  const name =
    xmlText(block, "navn") ||
    xmlText(block, "rutenavn") ||
    xmlText(block, "rutemerking") ||
    xmlText(block, "objektnavn") ||
    `${layer.replace("app:", "")} ${index + 1}`;

  const category = layer.replace("app:", "");

  return {
    type: "Feature",
    id: sourceId,
    properties: {
      source: "kartverket_turrutebasen_wfs",
      source_id: sourceId,
      name,
      category,
      layer,
      imported_at: new Date().toISOString(),
      distance_km_estimated: lengthKm(coords),
    },
    geometry: {
      type: "LineString",
      coordinates: coords,
    },
  };
}

ensureDir(OUT_DIR);

const allFeatures = [];

for (const layer of LAYERS) {
  try {
    const xml = await fetchLayer(layer);
    const blocks = findFeatureBlocks(xml);

    console.log(`  found ${blocks.length} feature blocks`);

    let added = 0;
    blocks.forEach((block, index) => {
      const feature = featureToGeoJson(block, layer, index);
      if (feature) {
        allFeatures.push(feature);
        added++;
      }
    });

    console.log(`  added ${added} Vestfold routes`);
  } catch (err) {
    console.log(`  skipped: ${err.message}`);
  }
}

const geojson = {
  type: "FeatureCollection",
  features: allFeatures,
};

fs.writeFileSync(OUT_GEOJSON, JSON.stringify(geojson, null, 2));

const rows = allFeatures.map((f) => {
  const p = f.properties;
  return `('${escSql(p.source)}','${escSql(p.source_id)}','${escSql(p.name)}','${escSql(p.category)}',${JSON.stringify(f.geometry)}::jsonb,${JSON.stringify(p)}::jsonb)`;
});

const sql = rows.length
  ? `insert into raw_turruter (source, source_id, name, category, geometry, properties)
values
${rows.join(",\n")}
on conflict (source, source_id) do update set
  name = excluded.name,
  category = excluded.category,
  geometry = excluded.geometry,
  properties = excluded.properties,
  imported_at = now();
`
  : "-- No features imported\n";

fs.writeFileSync(OUT_SQL, sql);

console.log(`Wrote ${allFeatures.length} features to ${OUT_GEOJSON}`);
console.log(`Wrote SQL to ${OUT_SQL}`);
