import type { CapacitorConfig } from "@capacitor/cli";

const PRODUCTION_SERVER_URL = "https://kcpremium.de";
const productionHost = new URL(PRODUCTION_SERVER_URL).hostname;
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "de.kcpremium.peterskasse",
  appName: "Peters Kasse",
  webDir: "native-fallback",
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
        allowNavigation: [productionHost, `*.${productionHost}`, "localhost", "127.0.0.1"],
      }
    : undefined,
  ios: {
    contentInset: "automatic",
    scheme: "PetersKasse",
  },
};

export default config;
