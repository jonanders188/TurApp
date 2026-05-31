#!/usr/bin/env node
const siteUrl = process.env.NEXT_PUBLIC_TURRUTE_SITE_URL || 'http://localhost:3000';
const token = process.env.TURRUTE_IMPORT_ADMIN_TOKEN || '';
const dryRun = process.argv.includes('--dry-run');

const body = {
  dryRun,
  maxFeaturesPerLayer: Number(process.env.TURRUTE_IMPORT_MAX_FEATURES || 120),
  maxTrails: Number(process.env.TURRUTE_IMPORT_MAX_TRAILS || 80),
  maxLayers: Number(process.env.TURRUTE_IMPORT_MAX_LAYERS || 5),
};

const res = await fetch(`${siteUrl.replace(/\/$/, '')}/api/import/turrutebasen`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { 'x-turrute-import-token': token } : {}),
  },
  body: JSON.stringify(body),
});

const text = await res.text();
let payload;
try { payload = JSON.parse(text); } catch { payload = text; }

if (!res.ok) {
  console.error(payload);
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
