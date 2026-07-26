import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the POS shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Peters Kasse/i);
  assert.match(html, /Unternehmensanmeldung/i);
  assert.match(html, /Opa Peters Kassensystem/i);
  assert.match(html, /Kassenbereich/i);
  assert.match(html, /Adminbereich/i);
  assert.match(html, /Unternehmenskennung/i);
  assert.match(html, /Kassen werden geladen/i);
  assert.match(html, /opa-peters-logo\.png/i);
  assert.match(html, /vom Admin vergeben/i);
  assert.doesNotMatch(html, /opa \/ 1902/i);
  assert.doesNotMatch(html, />Karte</i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("keeps Lightspeed CSV data available to the app", async () => {
  const [
    catalog,
    screens,
    users,
    page,
    layout,
    manifest,
    serviceWorker,
    capacitorConfig,
    nativeFallback,
    logo,
  ] =
    await Promise.all([
    readFile(new URL("../public/data/catalog.csv", import.meta.url), "utf8"),
    readFile(new URL("../public/data/screens.csv", import.meta.url), "utf8"),
    readFile(new URL("../public/data/users.csv", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../capacitor.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../native-fallback/index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/opa-peters-logo.png", import.meta.url)),
  ]);

  assert.match(catalog, /SKU,Name,Parent-SKU/);
  assert.match(catalog, /Eiskugel/);
  assert.match(screens, /"SKU","Bildschirm"/);
  assert.match(screens, /Menü##Kaffee & Tee/);
  assert.match(users, /Manager/);
  assert.match(users, /1902/);
  assert.match(page, /Adminbereich entsperren/);
  assert.match(page, /ADMIN_SECTIONS/);
  assert.match(page, /loginUser/);
  assert.match(page, /logoutUser/);
  assert.match(page, /loginTenant/);
  assert.match(page, /PortalArea/);
  assert.match(page, /isAdminPortal/);
  assert.match(page, /createTenantRegister/);
  assert.match(page, /exportCatalogTemplate/);
  assert.match(page, /SAMPLE_PRODUCTS/);
  assert.match(page, /exportTenantBackup/);
  assert.match(page, /importTenantBackup/);
  assert.match(page, /visibleAdminSections/);
  assert.match(page, /DEFAULT_TENANTS/);
  assert.match(page, /Mandanten-Sicherung/);
  assert.match(page, /Musterkasse mit Beispielprodukten/);
  assert.match(page, /Unternehmenskennung/);
  assert.match(page, /requiresPassword/);
  assert.match(page, /Produkte verwalten/);
  assert.match(page, /Standardprodukt/);
  assert.match(page, /Rabattvorlagen/);
  assert.match(page, /Benutzer & Rechte/);
  assert.match(page, /Adminbereich öffnen/);
  assert.match(page, /TSE Informationen/);
  assert.match(page, /Star mC-Print2/);
  assert.match(page, /ESC\/POS kompatibel/);
  assert.match(page, /startEditAdminProduct/);
  assert.match(page, /Änderungen speichern/);
  assert.match(page, /detectDeviceInfo/);
  assert.match(page, /serviceWorker/);
  assert.doesNotMatch(page, /_sites-preview|SkeletonPreview/);
  assert.match(layout, /lang="de"/);
  assert.match(layout, /manifest.webmanifest/);
  assert.match(layout, /noimageindex/);
  assert.match(layout, /viewportFit/);
  assert.match(manifest, /"display": "standalone"/);
  assert.match(manifest, /"theme_color": "#171717"/);
  assert.match(serviceWorker, /peters-kasse-app-v1/);
  assert.match(capacitorConfig, /de\.kcpremium\.peterskasse/);
  assert.match(capacitorConfig, /CAPACITOR_SERVER_URL/);
  assert.match(capacitorConfig, /https:\/\/kcpremium\.de/);
  assert.match(nativeFallback, /App-Huelle ist installiert/);
  assert.ok(logo.byteLength > 1000);
});
