#!/usr/bin/env node
import fs from 'node:fs/promises';

const CAPABILITIES_URL = process.env.TURRUTE_TURRUTEBASEN_WFS_CAPABILITIES_URL
  || 'https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter?service=WFS&request=GetCapabilities';

const outPath = 'data/imported/turrutebasen-capabilities.json';

function textBetweenAll(xml, tagName) {
  const re = new RegExp(`<[^:>]*:?${tagName}[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tagName}>`, 'gi');
  const values = [];
  let match;
  while ((match = re.exec(xml))) values.push(match[1].trim());
  return values;
}

function parseFeatureTypes(xml) {
  const blocks = xml.match(/<[^:>]*:?FeatureType[\s\S]*?<\/[^:>]*:?FeatureType>/gi) || [];
  return blocks
    .map((block) => {
      const name = textBetweenAll(block, 'Name')[0] || '';
      const title = textBetweenAll(block, 'Title')[0] || '';
      const abstract = textBetweenAll(block, 'Abstract')[0] || '';
      return { name, title, abstract };
    })
    .filter((item) => item.name);
}

async function main() {
  await fs.mkdir('data/imported', { recursive: true });
  console.log(`Fetching WFS capabilities: ${CAPABILITIES_URL}`);
  const res = await fetch(CAPABILITIES_URL, { headers: { 'User-Agent': process.env.TURRUTE_IMPORT_USER_AGENT || 'TurApp import script' } });
  if (!res.ok) throw new Error(`GetCapabilities failed: ${res.status} ${res.statusText}`);
  const xml = await res.text();
  const featureTypes = parseFeatureTypes(xml);
  await fs.writeFile(outPath, JSON.stringify({ url: CAPABILITIES_URL, featureTypes }, null, 2));
  console.log(`Found ${featureTypes.length} feature types.`);
  for (const item of featureTypes) console.log(`- ${item.name}${item.title ? ` (${item.title})` : ''}`);
  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
