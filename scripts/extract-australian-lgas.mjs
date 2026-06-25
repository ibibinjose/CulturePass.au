#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ABS_LGA_2025_URL =
  "https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs-edition-3/jul2021-jun2026/access-and-downloads/correspondences/CG_LGA_2024_LGA_2025.csv";
const WALGA_DIRECTORY_URL =
  "https://portal.walga.asn.au/your-local-government/local-government-directory";
const WALGA_DETAILS_URL =
  "https://portal.walga.asn.au/your-local-government/directory/details";
const WALGA_BASE_URL = "https://portal.walga.asn.au";
const WIKIDATA_SPARQL_URL = "https://query.wikidata.org/sparql";
// Queensland open-data "Local Government contacts" datastore (CKAN). Used to
// backfill QLD council websites (derived from the contact email domain) that
// Wikidata is missing.
const QLD_CONTACTS_URL =
  "https://www.data.qld.gov.au/api/3/action/datastore_search?resource_id=e5eed270-880f-4226-b640-4fa5bae6ddb7&limit=300";
const FAVICON_SERVICE = "https://www.google.com/s2/favicons";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

// Wikidata "local government area of <state>" classes -> our state codes. Used to
// bucket Wikidata matches by state. The ACT has no such class (it is governed as
// a single territory, not divided into LGAs).
const WIKIDATA_LGA_STATE_CLASS = {
  Q55558200: "NSW",
  Q1426035: "VIC",
  Q55593624: "QLD",
  Q55557858: "WA",
  Q55558027: "SA",
  Q55687066: "TAS",
  Q55671590: "NT",
};

// Councils with no Wikidata LGA entry get a hand-set website so they can still
// resolve a logo. Keyed by `${state}:${normaliseCouncilName(name)}`.
const WEBSITE_OVERRIDES = {
  "ACT:unincorporated act": "https://www.act.gov.au",
};

const ROOT = path.resolve(import.meta.dirname, "..");
const SEED_SOURCES_DIR = path.join(ROOT, "supabase", "seed_sources");
const OUTPUT_CSV = path.join(SEED_SOURCES_DIR, "australian_lgas.csv");
const OUTPUT_WALGA_JSON = path.join(SEED_SOURCES_DIR, "walga_council_details.json");
const OUTPUT_SEED_SQL = path.join(ROOT, "supabase", "seed.sql");
const NSW_SOURCE_CSV = path.join(SEED_SOURCES_DIR, "nsw_councils.csv");

const STATE_BY_ABS_PREFIX = {
  1: "NSW",
  2: "VIC",
  3: "QLD",
  4: "SA",
  5: "WA",
  6: "TAS",
  7: "NT",
  8: "ACT",
};

const STATES = [
  ["NSW", "New South Wales", "Sydney", "Australia/Sydney", 1],
  ["VIC", "Victoria", "Melbourne", "Australia/Melbourne", 2],
  ["QLD", "Queensland", "Brisbane", "Australia/Brisbane", 3],
  ["WA", "Western Australia", "Perth", "Australia/Perth", 4],
  ["SA", "South Australia", "Adelaide", "Australia/Adelaide", 5],
  ["TAS", "Tasmania", "Hobart", "Australia/Hobart", 6],
  ["ACT", "Australian Capital Territory", "Canberra", "Australia/Sydney", 7],
  ["NT", "Northern Territory", "Darwin", "Australia/Darwin", 8],
];

const NSW_HEADERS = [
  "abs_code",
  "name",
  "postal_line_1",
  "postal_line_2",
  "postal_suburb",
  "postal_state",
  "postal_postcode",
  "street_line_1",
  "street_line_2",
  "street_suburb",
  "street_state",
  "street_postcode",
  "phone",
  "fax",
  "regional_code",
  "gm_title",
  "gm_first_name",
  "gm_last_name",
  "gm_suffix",
  "mayor_title",
  "mayor_first_name",
  "mayor_last_name",
  "mayor_suffix",
  "email",
  "website",
  "area_sqkm",
  "population",
  "abn",
  "is_metro",
];

const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");
const skipWalga = args.has("--skip-walga");
const skipWikidata = args.has("--skip-wikidata");
const skipLogos = args.has("--skip-logos");

function usage() {
  console.log(`Usage:
  node scripts/extract-australian-lgas.mjs          # print counts only
  node scripts/extract-australian-lgas.mjs --write  # regenerate seed sources and supabase/seed.sql

Flags (with --write):
  --skip-walga      skip WA/NT WALGA detail pages
  --skip-wikidata   skip Wikidata website + coordinate enrichment (all states)
  --skip-logos      skip per-council logo resolution (site logo -> favicon)
`);
}

if (args.has("--help")) {
  usage();
  process.exit(0);
}

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value = "") {
  return decodeHtml(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normaliseWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normaliseCouncilName(value) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, "and")
    .replace(/\b(city|shire|town|rural city|regional council|district council|municipality|borough|council|aboriginal|of|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text, headers) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  const [first, ...rest] = rows.filter((items) => items.some((item) => item.trim().length > 0));
  const keys = headers ?? first;
  const dataRows = headers ? rows : rest;
  return dataRows
    .filter((items) => items.some((item) => item.trim().length > 0))
    .map((items) => Object.fromEntries(keys.map((key, index) => [key, items[index] ?? ""])));
}

function toCsv(rows) {
  const headers = [
    "abs_code",
    "name",
    "slug",
    "state_code",
    "region",
    "population",
    "area_sqkm",
    "website",
    "logo_url",
    "latitude",
    "longitude",
    "is_metro",
    "metadata",
  ];
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "CulturePass Australia reference-data extractor/1.0",
      accept: "text/html,text/csv,application/xhtml+xml",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function isSpatialLga(row) {
  const code = row.LGA_CODE_2025;
  const name = row.LGA_NAME_2025;
  if (!/^\d{5}$/.test(code)) return false;
  if (/^(Migratory|No usual address|Outside Australia)/i.test(name)) return false;
  return Boolean(STATE_BY_ABS_PREFIX[code[0]]);
}

async function loadAbsLgas() {
  const csv = await fetchText(ABS_LGA_2025_URL);
  const unique = new Map();
  for (const row of parseCsv(csv)) {
    if (!isSpatialLga(row)) continue;
    unique.set(row.LGA_CODE_2025, {
      abs_code: row.LGA_CODE_2025,
      name: row.LGA_NAME_2025,
      state_code: STATE_BY_ABS_PREFIX[row.LGA_CODE_2025[0]],
      source: "ABS ASGS 2025",
    });
  }
  return [...unique.values()].sort((a, b) => a.state_code.localeCompare(b.state_code) || a.name.localeCompare(b.name));
}

async function loadNswOverlay() {
  try {
    const csv = await readFile(NSW_SOURCE_CSV, "utf8");
    return new Map(
      parseCsv(csv, NSW_HEADERS).map((row) => [
        row.abs_code,
        {
          name: row.name,
          region: null,
          population: toNumber(row.population),
          area_sqkm: toNumber(row.area_sqkm),
          website: row.website || null,
          is_metro: row.is_metro === "1",
          metadata: compactObject({
            source: "NSW Office of Local Government seed source",
            office_suburb: row.street_suburb || null,
            postcode: row.street_postcode || null,
            phone: row.phone || null,
            fax: row.fax && row.fax !== "0" ? row.fax : null,
            email: row.email || null,
            abn: row.abn || null,
            general_manager: compactName(row.gm_title, row.gm_first_name, row.gm_last_name, row.gm_suffix),
            mayor: compactName(row.mayor_title, row.mayor_first_name, row.mayor_last_name, row.mayor_suffix),
          }),
        },
      ]),
    );
  } catch (error) {
    if (error.code === "ENOENT") return new Map();
    throw error;
  }
}

function compactName(...parts) {
  const name = parts.filter(Boolean).join(" ").trim();
  return name || null;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

function compactObject(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== ""),
  );
}

function parseOptionsFromSelect(html, idPart) {
  const selectMatch = html.match(new RegExp(`<select[^>]+id="[^"]*${idPart}"[^>]*>([\\s\\S]*?)<\\/select>`, "i"));
  if (!selectMatch) return [];
  return [...selectMatch[1].matchAll(/<option[^>]+value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)]
    .map(([, value, label]) => normaliseWhitespace(decodeHtml(value || stripTags(label))))
    .filter((value) => value && value !== "Select your Council");
}

async function loadWalgaCouncilNames() {
  const html = await fetchText(WALGA_DIRECTORY_URL);
  return {
    WA: [...new Set(parseOptionsFromSelect(html, "SignUpWACouncil"))],
    NT: [...new Set(parseOptionsFromSelect(html, "SignUpNTCouncil"))],
  };
}

function absoluteUrl(value) {
  if (!value) return null;
  const clean = decodeHtml(value).replace(/^\.\.\//, "/").replace(/^\.\.\/\.\.\//, "/");
  return new URL(clean, WALGA_BASE_URL).toString();
}

function textById(html, idSuffix) {
  const match = html.match(new RegExp(`<[^>]+id="[^"]*${idSuffix}"[^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i"));
  return match ? stripTags(match[1]) : null;
}

function hrefById(html, idSuffix) {
  const match = html.match(new RegExp(`<a[^>]+id="[^"]*${idSuffix}"[^>]+href="([^"]*)"`, "i"));
  return match ? decodeHtml(match[1]) : null;
}

// Placeholder graphics WALGA serves when a real image is missing (e.g. the
// "unknown person" silhouette for mayors/CEOs without a photo).
const PLACEHOLDER_IMAGE_RE = /unknownperson|no[-_]?image|placeholder/i;

function imgById(html, idSuffix) {
  const match = html.match(new RegExp(`<img[^>]+id="[^"]*${idSuffix}"[^>]+src="([^"]*)"`, "i"));
  if (!match) return null;
  const url = absoluteUrl(match[1]);
  return url && PLACEHOLDER_IMAGE_RE.test(url) ? null : url;
}

// WALGA stores social links inconsistently: some are absolute (https://...),
// others are a broken relative path that buries the real URL after a
// ".../LGDirectoryDetails/" marker (e.g. www.facebook.com.au/shireofexmouth).
function socialUrl(href) {
  if (!href) return null;
  let url = decodeHtml(href).trim();
  const markerIndex = url.indexOf("LGDirectoryDetails/");
  if (markerIndex !== -1) url = url.slice(markerIndex + "LGDirectoryDetails/".length);
  url = url.replace(/^(?:\.\.\/)+/, "").replace(/^\/+/, "").trim();
  if (!url || url === "#") return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function nullIfEmpty(object) {
  return object && Object.keys(object).length > 0 ? object : null;
}

// Mayor / CEO share a Name + Title + Image trio of fields under a common prefix.
function personById(html, prefix) {
  return nullIfEmpty(
    compactObject({
      name: textById(html, `${prefix}Name`),
      title: textById(html, `${prefix}Title`),
      image_url: imgById(html, `${prefix}Image`),
    }),
  );
}

function statById(html, idSuffix) {
  return toNumber(textById(html, `${idSuffix}_Orig`));
}

function parseWalgaDetails(html, requestedName, stateCode) {
  const title = textById(html, "PageTitle") || requestedName;
  const latLngMatch = html.match(/findLatLng\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const latitude = latLngMatch ? Number(latLngMatch[1]) : null;
  const longitude = latLngMatch ? Number(latLngMatch[2]) : null;
  const address = textById(html, "CouncilAddress");
  const website = textById(html, "CouncilWebsite") || hrefById(html, "CouncilWebsite");
  const email = textById(html, "CouncilEmail") || hrefById(html, "CouncilEmail")?.replace(/^mailto:/, "");
  const logoUrl = imgById(html, "CouncilLogo");

  const social = nullIfEmpty(
    compactObject({
      facebook: socialUrl(hrefById(html, "CouncilFacebook")),
      twitter: socialUrl(hrefById(html, "CouncilTwitter")),
      linkedin: socialUrl(hrefById(html, "CouncilLinkedIn")),
      youtube: socialUrl(hrefById(html, "CouncilYouTube")),
      instagram: socialUrl(hrefById(html, "CouncilInstagram")),
    }),
  );
  const banner = nullIfEmpty(
    compactObject({
      image_url: imgById(html, "CouncilBannerImage"),
      link: hrefById(html, "CouncilBannerLink"),
      text: textById(html, "CouncilBannerText") || textById(html, "CouncilBannerLink"),
    }),
  );

  return {
    requested_name: requestedName,
    name: title,
    state_code: stateCode,
    logo_url: logoUrl,
    website: website || null,
    population: statById(html, "CouncilStat_Population"),
    area_sqkm: statById(html, "CouncilStat_Area"),
    latitude,
    longitude,
    metadata: compactObject({
      source: "WALGA Local Government Directory",
      source_url: `${WALGA_DETAILS_URL}?council=${encodeURIComponent(requestedName)}`,
      address,
      abn: textById(html, "CouncilABN"),
      phone: textById(html, "CouncilPhone"),
      fax: textById(html, "CouncilFax"),
      email,
      website: website || null,
      mayor: personById(html, "CouncilMayor"),
      ceo: personById(html, "CouncilCeo"),
      social,
      banner,
      suburbs_and_localities: textById(html, "CouncilSuburbsAndLocalities"),
      significant_local_events: textById(html, "CouncilSignificantLocalEvents"),
      ordinary_council_meeting: textById(html, "CouncilOrdinaryCouncilMeeting"),
      tourist_attractions: textById(html, "CouncilTouristAttractions"),
      local_industries: textById(html, "CouncilLocalIndustries"),
      statistics_period: compactObject({
        start_year: textById(html, "StartYearLabel"),
        end_year: textById(html, "EndYearLabel"),
      }),
      distance_from_perth_km: statById(html, "CouncilStat_DistanceFromPerth"),
      sealed_roads_km: statById(html, "CouncilStat_LengthOfSealedRoads"),
      unsealed_roads_km: statById(html, "CouncilStat_LengthOfUnsealedRoads"),
      number_of_electors: statById(html, "CouncilStat_NumberOfElectors"),
      number_of_dwellings: statById(html, "CouncilStat_NumberOfDwellings"),
      rates_levied_total: statById(html, "CouncilStat_TotalRatesLevied"),
      revenue_total: statById(html, "CouncilStat_TotalRevenue"),
      number_of_employees: statById(html, "CouncilStat_NumberOfEmployees"),
    }),
  };
}

async function mapLimit(items, limit, callback) {
  const results = [];
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await callback(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
  return results;
}

async function loadWalgaDetails() {
  const namesByState = await loadWalgaCouncilNames();
  const requests = Object.entries(namesByState).flatMap(([stateCode, names]) =>
    names.map((name) => ({ stateCode, name })),
  );

  const details = await mapLimit(requests, 5, async ({ stateCode, name }) => {
    const url = `${WALGA_DETAILS_URL}?council=${encodeURIComponent(name)}`;
    try {
      const html = await fetchText(url);
      return parseWalgaDetails(html, name, stateCode);
    } catch (error) {
      return {
        requested_name: name,
        name,
        state_code: stateCode,
        logo_url: null,
        website: null,
        population: null,
        area_sqkm: null,
        latitude: null,
        longitude: null,
        metadata: {
          source: "WALGA Local Government Directory",
          source_url: url,
          scrape_error: error.message,
        },
      };
    }
  });

  return details;
}

function buildRows(absRows, nswOverlay, walgaDetails) {
  const walgaByStateAndName = new Map(
    walgaDetails.map((detail) => [`${detail.state_code}:${normaliseCouncilName(detail.name)}`, detail]),
  );

  return absRows.map((row) => {
    const nsw = nswOverlay.get(row.abs_code);
    const walga = walgaByStateAndName.get(`${row.state_code}:${normaliseCouncilName(row.name)}`);
    const name = walga?.name ?? nsw?.name ?? row.name;
    const metadata = compactObject({
      source: row.source,
      abs_name: row.name,
      ...(nsw?.metadata ?? {}),
      ...(walga?.metadata ?? {}),
    });

    return {
      abs_code: row.abs_code,
      name,
      slug: slugify(name),
      state_code: row.state_code,
      region: nsw?.region ?? null,
      population: walga?.population ?? nsw?.population ?? null,
      area_sqkm: walga?.area_sqkm ?? nsw?.area_sqkm ?? null,
      website: walga?.website ?? nsw?.website ?? null,
      logo_url: walga?.logo_url ?? null,
      latitude: walga?.latitude ?? null,
      longitude: walga?.longitude ?? null,
      is_metro: nsw?.is_metro ?? false,
      // Kept as an object so the enrichment stages can mutate it; serialised to
      // JSON in main() just before the seed sources are written.
      metadata,
    };
  });
}

// -----------------------------------------------------------------------------
// Wikidata enrichment: official website + coordinates for every Australian LGA.
// Wikidata is openly queryable (no bot-blocking) and the only consistent source
// that spans all states/territories. We match by normalised name within the
// council's own state so eastern-state name clashes (e.g. the two "Central
// Coast" councils in NSW and TAS) never cross over.
// -----------------------------------------------------------------------------
async function sparqlQuery(query) {
  const url = `${WIKIDATA_SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/sparql-results+json",
      "user-agent": "CulturePass Australia reference-data extractor/1.0 (council enrichment)",
    },
  });
  if (!response.ok) {
    throw new Error(`Wikidata query failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()).results.bindings;
}

async function loadWikidataEnrichment() {
  // Query one state class at a time. A single combined query (VALUES over all
  // classes, with label/alias/website/coord OPTIONALs) is a cartesian-product
  // explosion that times the endpoint out; per-state queries (~80-140 rows each)
  // are fast and naturally bucket every item under the right state.
  const items = new Map();
  for (const [qid, state] of Object.entries(WIKIDATA_LGA_STATE_CLASS)) {
    let bindings;
    try {
      bindings = await sparqlQuery(`
        SELECT ?item ?itemLabel ?alt ?website ?coord WHERE {
          ?item wdt:P31/wdt:P279* wd:${qid} .
          ?item rdfs:label ?itemLabel . FILTER(LANG(?itemLabel) = "en")
          OPTIONAL { ?item skos:altLabel ?alt . FILTER(LANG(?alt) = "en") }
          OPTIONAL { ?item wdt:P856 ?website. }
          OPTIONAL { ?item wdt:P625 ?coord. }
        }`);
    } catch (error) {
      console.warn(`  (Wikidata ${state} query failed: ${error.message})`);
      continue;
    }
    for (const b of bindings) {
      const id = b.item.value.split("/").pop();
      let item = items.get(id);
      if (!item) {
        item = { qid: id, state, names: new Set(), website: null, latitude: null, longitude: null };
        items.set(id, item);
      }
      if (b.itemLabel?.value) item.names.add(b.itemLabel.value);
      if (b.alt?.value) item.names.add(b.alt.value);
      if (b.website?.value && !item.website) item.website = b.website.value;
      if (b.coord?.value && item.latitude === null) {
        const m = b.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
        if (m) {
          item.longitude = Number(m[1]);
          item.latitude = Number(m[2]);
        }
      }
    }
  }

  // Index by `${state}:${normalisedName}` over the label plus every alias so
  // varied naming styles ("City of X", "X Shire Council", ...) all resolve.
  const byKey = new Map();
  for (const item of items.values()) {
    for (const name of item.names) {
      const key = `${item.state}:${normaliseCouncilName(name)}`;
      const existing = byKey.get(key);
      if (!existing || (!existing.website && item.website)) byKey.set(key, item);
    }
  }
  return byKey;
}

function enrichRowsWithWikidata(rows, wikidata) {
  let website = 0;
  let coords = 0;
  for (const row of rows) {
    const key = `${row.state_code}:${normaliseCouncilName(row.name)}`;
    const wd = wikidata.get(key);
    const override = WEBSITE_OVERRIDES[key];
    if (!row.website && (override || wd?.website)) {
      row.website = override ?? wd.website;
      row.metadata.website_source = override ? "manual override" : "Wikidata";
      website += 1;
    }
    if ((row.latitude === null || row.longitude === null) && wd && wd.latitude !== null) {
      row.latitude = wd.latitude;
      row.longitude = wd.longitude;
      row.metadata.coordinates_source = "Wikidata";
      coords += 1;
    }
    if (wd?.qid) row.metadata.wikidata_qid = wd.qid;
  }
  return { website, coords };
}

// -----------------------------------------------------------------------------
// Queensland open-data website backfill. The QLD contacts dataset lists an email
// per council; the email domain is the council's web domain, so we can fill the
// QLD gaps Wikidata misses (and give them a domain to resolve a logo from).
// -----------------------------------------------------------------------------
async function loadQldContacts() {
  const response = await fetch(QLD_CONTACTS_URL, {
    headers: {
      accept: "application/json",
      "user-agent": "CulturePass Australia reference-data extractor/1.0",
    },
  });
  if (!response.ok) throw new Error(`QLD contacts query failed: ${response.status}`);
  const json = await response.json();
  const map = new Map();
  for (const record of json.result?.records ?? []) {
    const name = record["Council Name"];
    const email = String(record.Email ?? "").trim();
    if (!name || !email.includes("@")) continue;
    const domain = email.split("@")[1].toLowerCase();
    map.set(normaliseCouncilName(name), { email, website: `https://www.${domain}` });
  }
  return map;
}

function enrichRowsWithQld(rows, qld) {
  let filled = 0;
  for (const row of rows) {
    if (row.state_code !== "QLD" || row.website) continue;
    const contact = qld.get(normaliseCouncilName(row.name));
    if (!contact?.website) continue;
    row.website = contact.website;
    row.metadata.website_source = "data.qld.gov.au";
    row.metadata.email = row.metadata.email ?? contact.email;
    filled += 1;
  }
  return filled;
}

// -----------------------------------------------------------------------------
// Logo resolution: try the council's own website for a real logo, otherwise fall
// back to a favicon icon so every council still has something to display.
// -----------------------------------------------------------------------------
async function fetchHtml(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": BROWSER_UA, accept: "text/html,application/xhtml+xml" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { html: await response.text(), finalUrl: response.url || url };
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrlMaybe(value, baseUrl) {
  if (!value) return null;
  try {
    return new URL(decodeHtml(value.trim()), baseUrl).toString();
  } catch {
    return null;
  }
}

function pickLogoFromHtml(html, baseUrl) {
  const head = html.slice(0, 200000);
  // 1. A header <img> that advertises itself as a logo (usually the real crest).
  for (const match of head.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/logo|crest/i.test(tag)) continue;
    const src = tag.match(/\bsrc="([^"]+)"/i)?.[1] || tag.match(/\bdata-src="([^"]+)"/i)?.[1];
    if (src && /\.(svg|png|jpe?g|webp)(\?|#|$)/i.test(src) && !/sprite|placeholder|blank/i.test(src)) {
      return { url: resolveUrlMaybe(src, baseUrl), kind: "site logo" };
    }
  }
  // 2. apple-touch-icon (a square brand mark on most modern council sites).
  let best = null;
  for (const match of head.matchAll(/<link\b[^>]*rel="[^"]*apple-touch-icon[^"]*"[^>]*>/gi)) {
    const tag = match[0];
    const href = tag.match(/\bhref="([^"]+)"/i)?.[1];
    const size = Number(tag.match(/\bsizes="(\d+)/i)?.[1] || 0);
    if (href && (!best || size > best.size)) best = { href, size };
  }
  if (best) return { url: resolveUrlMaybe(best.href, baseUrl), kind: "apple-touch-icon" };
  // 3. og:image (social card — often the logo).
  const og =
    head.match(/<meta\b[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
    head.match(/<meta\b[^>]*content="([^"]+)"[^>]*property="og:image"/i);
  if (og) return { url: resolveUrlMaybe(og[1], baseUrl), kind: "og:image" };
  return null;
}

function faviconUrl(website) {
  try {
    return `${FAVICON_SERVICE}?domain=${new URL(website).hostname}&sz=128`;
  } catch {
    return null;
  }
}

async function resolveLogo(website) {
  try {
    const { html, finalUrl } = await fetchHtml(website);
    const picked = pickLogoFromHtml(html, finalUrl);
    if (picked?.url) return { logo_url: picked.url, logo_source: picked.kind };
  } catch {
    // Site blocked us / timed out / had no usable markup — fall through.
  }
  const favicon = faviconUrl(website);
  return favicon ? { logo_url: favicon, logo_source: "favicon" } : { logo_url: null };
}

async function enrichRowsWithLogos(rows) {
  const targets = rows.filter((row) => !row.logo_url && row.website);
  let real = 0;
  let favicon = 0;
  await mapLimit(targets, 12, async (row) => {
    const { logo_url, logo_source } = await resolveLogo(row.website);
    if (!logo_url) return;
    row.logo_url = logo_url;
    row.metadata.logo_source = logo_source;
    if (logo_source === "favicon") favicon += 1;
    else real += 1;
  });
  return { real, favicon, attempted: targets.length };
}

function sqlLiteral(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  return value === null || value === undefined || value === "" ? "null" : String(value);
}

function sqlBool(value) {
  return value ? "true" : "false";
}

function sqlGeographyPoint(longitude, latitude) {
  if (longitude === null || longitude === undefined || latitude === null || latitude === undefined) {
    return "null";
  }
  return `'SRID=4326;POINT(${Number(longitude)} ${Number(latitude)})'::extensions.geography`;
}

function buildSeedSql(rows) {
  const stateValues = STATES.map(
    ([code, name, capital, timezone, sort]) =>
      `  (${sqlLiteral(code)}, ${sqlLiteral(name)}, ${sqlLiteral(capital)}, ${sqlLiteral(timezone)}, ${sort})`,
  ).join(",\n");

  const councilValues = rows
    .map(
      (row) =>
        `  (${sqlLiteral(row.abs_code)}, ${sqlLiteral(row.name)}, ${sqlLiteral(row.slug)}, ${sqlLiteral(row.state_code)}, ${sqlLiteral(row.region)}, ${sqlNumber(row.population)}, ${sqlNumber(row.area_sqkm)}, ${sqlLiteral(row.website)}, ${sqlLiteral(row.logo_url)}, ${sqlGeographyPoint(row.longitude, row.latitude)}, ${sqlBool(row.is_metro)}, ${sqlLiteral(row.metadata)}::jsonb)`,
    )
    .join(",\n");

  return `-- =============================================================================
-- CulturePass Australia - seed data
-- States & territories + Australian Local Government Areas.
-- Generated by scripts/extract-australian-lgas.mjs; do not edit by hand.
--
-- Sources:
-- - ABS ASGS Edition 3 2025 LGA correspondence file (full national LGA list)
-- - supabase/seed_sources/nsw_councils.csv for NSW contact enrichment
-- - WALGA Local Government Directory for WA/NT council names, logos, coordinates,
--   mayor/CEO, social links and contact data (WALGA only covers WA + NT)
-- - Wikidata (all states): official website + coordinates, matched by name
-- - data.qld.gov.au Local Government contacts: QLD website backfill
-- - Council websites + favicon service: logos (logo_source noted in metadata)
--
-- traditional_custodians is intentionally left NULL: First Nations Country
-- attributions must be added from verified, properly-sourced data.
-- =============================================================================

-- States & territories ---------------------------------------------------------
insert into public.australian_states (code, name, capital_city, timezone, sort_order) values
${stateValues}
on conflict (code) do update set
  name = excluded.name,
  capital_city = excluded.capital_city,
  timezone = excluded.timezone,
  sort_order = excluded.sort_order;

-- Australian councils / Local Government Areas --------------------------------
insert into public.australian_councils
  (abs_code, name, slug, state_code, region, population, area_sqkm, website, logo_url, coordinates, is_metro, metadata)
values
${councilValues}
on conflict (abs_code) do update set
  name = excluded.name,
  slug = excluded.slug,
  state_code = excluded.state_code,
  region = excluded.region,
  population = excluded.population,
  area_sqkm = excluded.area_sqkm,
  website = excluded.website,
  logo_url = excluded.logo_url,
  coordinates = excluded.coordinates,
  is_metro = excluded.is_metro,
  metadata = excluded.metadata;
`;
}

async function main() {
  console.log("Loading ABS 2025 LGA list...");
  const absRows = await loadAbsLgas();
  console.log(`Loaded ${absRows.length} ABS LGA rows.`);

  console.log("Loading NSW seed overlay...");
  const nswOverlay = await loadNswOverlay();
  console.log(`Loaded ${nswOverlay.size} NSW enriched rows.`);

  let walgaDetails = [];
  if (!skipWalga) {
    console.log("Loading WALGA WA/NT council detail pages...");
    walgaDetails = await loadWalgaDetails();
    console.log(`Loaded ${walgaDetails.length} WALGA detail rows.`);
  }

  const rows = buildRows(absRows, nswOverlay, walgaDetails);
  const counts = rows.reduce((acc, row) => {
    acc[row.state_code] = (acc[row.state_code] ?? 0) + 1;
    return acc;
  }, {});
  console.log("Rows by state:", counts);

  if (!shouldWrite) return;

  if (!skipWikidata) {
    console.log("Loading Wikidata website + coordinate enrichment (all states)...");
    const wikidata = await loadWikidataEnrichment();
    const wd = enrichRowsWithWikidata(rows, wikidata);
    console.log(`Wikidata filled ${wd.website} websites and ${wd.coords} coordinate pairs.`);

    try {
      const qld = await loadQldContacts();
      const filled = enrichRowsWithQld(rows, qld);
      console.log(`data.qld.gov.au filled ${filled} additional QLD websites.`);
    } catch (error) {
      console.warn(`  (QLD contacts skipped: ${error.message})`);
    }
  }

  if (!skipLogos) {
    console.log("Resolving council logos (site logo -> favicon fallback)...");
    const logos = await enrichRowsWithLogos(rows);
    console.log(
      `Logos: ${logos.real} real + ${logos.favicon} favicon of ${logos.attempted} attempted.`,
    );
  }

  const have = (key) => rows.filter((row) => row[key] !== null && row[key] !== undefined).length;
  console.log(
    `Coverage: website ${have("website")}/${rows.length}, ` +
      `logo ${have("logo_url")}/${rows.length}, coordinates ${have("latitude")}/${rows.length}.`,
  );

  // Serialise the (mutated) metadata objects to JSON for the CSV / SQL writers.
  for (const row of rows) row.metadata = JSON.stringify(row.metadata);

  await mkdir(SEED_SOURCES_DIR, { recursive: true });
  await writeFile(OUTPUT_CSV, `${toCsv(rows)}\n`);
  await writeFile(OUTPUT_WALGA_JSON, `${JSON.stringify(walgaDetails, null, 2)}\n`);
  await writeFile(OUTPUT_SEED_SQL, buildSeedSql(rows));
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_CSV)}`);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_WALGA_JSON)}`);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_SEED_SQL)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
