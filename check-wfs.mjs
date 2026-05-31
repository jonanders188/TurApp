const base = "https://wfs.geonorge.no/skwms1/wfs.turogfriluftsruter";

async function test(label, params) {
  const url = `${base}?${new URLSearchParams(params)}`;
  console.log("\n---", label, "---");
  console.log(url);
  const r = await fetch(url);
  const text = await r.text();
  console.log(r.status, r.statusText, r.headers.get("content-type"));
  console.log(text.slice(0, 800));
}

await test("WFS 2.0 typeNames geojson", {
  service: "WFS",
  request: "GetFeature",
  version: "2.0.0",
  typeNames: "app:Fotrute",
  outputFormat: "application/json",
  count: "1"
});

await test("WFS 1.1 typeName json", {
  service: "WFS",
  request: "GetFeature",
  version: "1.1.0",
  typeName: "app:Fotrute",
  outputFormat: "json",
  maxFeatures: "1"
});

await test("WFS 1.0 typeName GML", {
  service: "WFS",
  request: "GetFeature",
  version: "1.0.0",
  typeName: "app:Fotrute",
  maxFeatures: "1"
});
