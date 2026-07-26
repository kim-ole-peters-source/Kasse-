"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";

type Product = {
  sku: string;
  name: string;
  buttonName: string;
  type: string;
  price: number | null;
  group: string;
  color: string;
  style: string;
  taxRate: number;
  isCustomPrice: boolean;
};

type AdminProduct = Product & {
  id: string;
  screenKey: string;
  createdAt: string;
  source?: "custom" | "catalog";
  baseSku?: string;
};

type ProductGroup = {
  sku: string;
  name: string;
  buttonName: string;
  color: string;
  childSkus: string[];
};

type ScreenButton =
  | { kind: "screen"; key: string; label: string }
  | { kind: "sku"; sku: string };

type Catalog = {
  products: Product[];
  productBySku: Map<string, Product>;
  groupsBySku: Map<string, ProductGroup>;
  screenOrder: Map<string, ScreenButton[]>;
  screenKeys: string[];
  loadedAt: string;
};

type CartLine = {
  id: string;
  sku: string;
  name: string;
  group: string;
  qty: number;
  unitPrice: number;
  taxRate: number;
};

type PaymentMethod = "Bar" | "Gutschein";
type LegacyPaymentMethod = PaymentMethod | "Karte";

type PaymentSplit = {
  method: PaymentMethod;
  amount: number;
};

type PortalArea = "cash" | "admin";
type DeviceKind = "phone" | "tablet" | "desktop";
type DiscountType = "percent" | "amount";
type AdminSection = "products" | "discounts" | "users" | "receipts" | "tenants";
type PrinterCommandSet = "escpos" | "star";
type PrinterProfile =
  | "star-mcprint"
  | "star-tsp100"
  | "star-tsp650"
  | "star-mobile";

type DiscountPreset = {
  id: string;
  name: string;
  type: DiscountType;
  value: number;
  custom: boolean;
  createdAt: string;
};

type DiscountDraft = {
  name: string;
  type: DiscountType;
  value: string;
  custom: boolean;
};

type UserPermissions = {
  sell: boolean;
  discounts: boolean;
  reports: boolean;
  admin: boolean;
};

type PosUser = {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  group: string;
  active: boolean;
  pin: string;
  requiresPassword: boolean;
  localOrderId: string;
  permissions: UserPermissions;
};

type UserDraft = {
  username: string;
  firstName: string;
  lastName: string;
  group: string;
  pin: string;
  requiresPassword: boolean;
  active: boolean;
  permissions: UserPermissions;
};

type Transaction = {
  id: string;
  completedAt: string;
  lines: CartLine[];
  grossBeforeDiscount: number;
  discountPct: number;
  discountLabel?: string;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount: number;
  tip: number;
  total: number;
  payments: PaymentSplit[];
  paymentMethod?: LegacyPaymentMethod;
  paid: number;
  change: number;
  tax: TaxRow[];
};

type TseStampRow =
  | { center: string; label?: never; value?: never }
  | { label: string; value: string; center?: never };

type TaxRow = {
  rate: number;
  gross: number;
  net: number;
  tax: number;
};

type CustomDraft = {
  sku: string;
  name: string;
  group: string;
  color: string;
  taxRate: number;
  price: string;
};

type AdminProductDraft = {
  sku: string;
  name: string;
  buttonName: string;
  price: string;
  group: string;
  taxRate: number;
  color: string;
  style: string;
  screenKey: string;
  subScreenName: string;
};

type ReceiptConfig = {
  businessName: string;
  addressLine: string;
  footerText: string;
  widthMm: 57 | 80;
  showTax: boolean;
  showTseSimulation: boolean;
  tseDeviceId: string;
  printerProfile: PrinterProfile;
  printerCommandSet: PrinterCommandSet;
  cutAfterPrint: boolean;
};

type BluetoothWritableCharacteristic = {
  properties?: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue(value: BufferSource): Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
};

type BluetoothServiceLike = {
  getCharacteristics(): Promise<BluetoothWritableCharacteristic[]>;
};

type BluetoothServerLike = {
  getPrimaryServices(): Promise<BluetoothServiceLike[]>;
};

type BluetoothDeviceLike = {
  name?: string;
  gatt?: {
    connect(): Promise<BluetoothServerLike>;
  };
};

type BluetoothLike = {
  requestDevice(options: {
    acceptAllDevices: boolean;
    optionalServices: string[];
  }): Promise<BluetoothDeviceLike>;
};

type DeviceInfo = {
  kind: DeviceKind;
  label: string;
  touch: boolean;
  standalone: boolean;
  orientation: "hoch" | "quer";
  width: number;
  height: number;
};

type InstallPromptEvent = Event & {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type TenantCatalogMode = "seed" | "empty";

type Tenant = {
  id: string;
  businessName: string;
  loginName: string;
  password: string;
  catalogMode: TenantCatalogMode;
  createdAt: string;
};

type TenantDraft = {
  businessName: string;
  loginName: string;
  password: string;
  adminPin: string;
};

type TenantBackupFile = {
  app?: string;
  version?: number;
  exportedAt?: string;
  tenants?: Tenant[];
  data?: Record<string, Partial<Record<string, string | null>>>;
};

const BUSINESS_NAME = "Carsten & Kim-Ole Peters GbR";
const DEFAULT_TENANT_ID = "opa-peters";
const STORAGE_TENANTS = "peters-kasse-tenants-v1";
const STORAGE_TRANSACTIONS = "peters-kasse-transactions-v1";
const STORAGE_ADMIN_PRODUCTS = "peters-kasse-admin-products-v1";
const STORAGE_RECEIPT_CONFIG = "peters-kasse-receipt-config-v1";
const STORAGE_DISCOUNTS = "peters-kasse-discounts-v1";
const STORAGE_USERS = "peters-kasse-users-v1";
const STORAGE_ADMIN_PASSWORD = "peters-kasse-admin-password-v1";
const TENANT_DATA_STORAGE_KEYS = [
  STORAGE_TRANSACTIONS,
  STORAGE_ADMIN_PRODUCTS,
  STORAGE_RECEIPT_CONFIG,
  STORAGE_DISCOUNTS,
  STORAGE_USERS,
  STORAGE_ADMIN_PASSWORD,
] as const;
const SYSTEM_SKUS = new Set(["FT1", "FT2", "MSG0", "MSG1", "MSG2"]);
const BLUETOOTH_PRINTER_SERVICES = [
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  businessName: BUSINESS_NAME,
  addressLine: "Schwarzenbek",
  footerText: "Vielen Dank fuer Ihren Besuch",
  widthMm: 80,
  showTax: true,
  showTseSimulation: true,
  tseDeviceId: "TSE-SIM-LOCAL-001",
  printerProfile: "star-mcprint",
  printerCommandSet: "escpos",
  cutAfterPrint: true,
};

const ADMIN_SECTIONS: { id: AdminSection; label: string }[] = [
  { id: "products", label: "Produkte" },
  { id: "discounts", label: "Rabatte" },
  { id: "users", label: "Benutzer" },
  { id: "receipts", label: "Bons" },
  { id: "tenants", label: "Kassen" },
];

const PRINTER_PROFILES: { id: PrinterProfile; label: string; detail: string }[] = [
  {
    id: "star-mcprint",
    label: "Star mC-Print2 / mC-Print3",
    detail: "58 oder 80 mm, StarPRNT/ESC-POS je nach Modellmodus",
  },
  {
    id: "star-tsp100",
    label: "Star TSP100 / TSP143",
    detail: "80 mm Standard, 58 mm mit Papierfuehrung",
  },
  {
    id: "star-tsp650",
    label: "Star TSP650II / TSP654II",
    detail: "80 mm, Bluetooth/USB/LAN je nach Schnittstelle",
  },
  {
    id: "star-mobile",
    label: "Star SM-L200 / SM-L300",
    detail: "Mobile 58/80-mm Bluetooth/BLE-Drucker",
  },
];

const DEFAULT_ADMIN_DRAFT: AdminProductDraft = {
  sku: "",
  name: "",
  buttonName: "",
  price: "",
  group: "Eis",
  taxRate: 7,
  color: "BLUE",
  style: "Akzent",
  screenKey: "Menü",
  subScreenName: "",
};

const DEFAULT_DISCOUNTS: DiscountPreset[] = [
  {
    id: "disc-one-scoop",
    name: "- 1 Kugel",
    type: "amount",
    value: 2,
    custom: false,
    createdAt: "2026-07-26T00:00:00.000Z",
  },
  {
    id: "disc-cream",
    name: "- Sahne",
    type: "amount",
    value: 1.6,
    custom: false,
    createdAt: "2026-07-26T00:00:00.000Z",
  },
  {
    id: "disc-100",
    name: "100 % Rabatt",
    type: "percent",
    value: 100,
    custom: false,
    createdAt: "2026-07-26T00:00:00.000Z",
  },
  {
    id: "disc-breakage",
    name: "Bruch",
    type: "percent",
    value: 100,
    custom: false,
    createdAt: "2026-07-26T00:00:00.000Z",
  },
  {
    id: "disc-staff-meal",
    name: "Eigenverzehr",
    type: "percent",
    value: 100,
    custom: false,
    createdAt: "2026-07-26T00:00:00.000Z",
  },
  {
    id: "disc-staff",
    name: "Personalrabatt",
    type: "percent",
    value: 25,
    custom: false,
    createdAt: "2026-07-26T00:00:00.000Z",
  },
  {
    id: "disc-regular",
    name: "Stammkunde",
    type: "percent",
    value: 5,
    custom: false,
    createdAt: "2026-07-26T00:00:00.000Z",
  },
];

const DEFAULT_DISCOUNT_DRAFT: DiscountDraft = {
  name: "",
  type: "percent",
  value: "",
  custom: false,
};

const DEFAULT_USERS: PosUser[] = [
  {
    id: "733603",
    username: "Manager",
    firstName: "",
    lastName: "",
    group: "Managers",
    active: true,
    pin: "1902",
    requiresPassword: true,
    localOrderId: "",
    permissions: {
      sell: true,
      discounts: true,
      reports: true,
      admin: true,
    },
  },
  {
    id: "733605",
    username: "Team",
    firstName: "",
    lastName: "",
    group: "Verkauf",
    active: true,
    pin: "",
    requiresPassword: false,
    localOrderId: "",
    permissions: {
      sell: true,
      discounts: false,
      reports: false,
      admin: false,
    },
  },
];

const DEFAULT_USER_DRAFT: UserDraft = {
  username: "",
  firstName: "",
  lastName: "",
  group: "Verkauf",
  pin: "",
  requiresPassword: false,
  active: true,
  permissions: {
    sell: true,
    discounts: false,
    reports: false,
    admin: false,
  },
};

const DEFAULT_ADMIN_PASSWORD = "1902";
const EMPTY_CATALOG_CSV =
  "SKU,Name,Typ,Warengruppe,Standardpreis,Schaltflächenname,Schaltflächenfarbe,Schaltflächenstil,Menü/Bildschirm\n";
const EMPTY_SCREENS_CSV = '"SKU","Bildschirm"\n';
const CATALOG_TEMPLATE_HEADERS = [
  "SKU",
  "Name",
  "Typ",
  "Warengruppe",
  "Standardpreis",
  "Schaltflächenname",
  "Schaltflächenfarbe",
  "Schaltflächenstil",
  "Menü/Bildschirm",
];

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: DEFAULT_TENANT_ID,
    businessName: "Opa Peters",
    loginName: "opa",
    password: DEFAULT_ADMIN_PASSWORD,
    catalogMode: "seed",
    createdAt: "2026-07-26T00:00:00.000Z",
  },
];

const DEFAULT_TENANT_DRAFT: TenantDraft = {
  businessName: "",
  loginName: "",
  password: "",
  adminPin: "",
};

const SAMPLE_PRODUCTS: Omit<AdminProduct, "id" | "createdAt">[] = [
  {
    sku: "MUSTER-001",
    name: "Muster Eis",
    buttonName: "Muster Eis",
    type: "Artikel",
    price: 2,
    group: "Muster",
    color: "BLUE",
    style: "Akzent",
    taxRate: 7,
    isCustomPrice: false,
    screenKey: "Menü",
    source: "custom",
  },
  {
    sku: "MUSTER-002",
    name: "Muster Kaffee",
    buttonName: "Muster Kaffee",
    type: "Artikel",
    price: 2.5,
    group: "Muster",
    color: "BROWN",
    style: "Akzent",
    taxRate: 19,
    isCustomPrice: false,
    screenKey: "Menü",
    source: "custom",
  },
  {
    sku: "MUSTER-003",
    name: "Muster Kuchen",
    buttonName: "Muster Kuchen",
    type: "Artikel",
    price: 3.5,
    group: "Muster",
    color: "YELLOW",
    style: "Akzent",
    taxRate: 7,
    isCustomPrice: false,
    screenKey: "Menü",
    source: "custom",
  },
];

const colorMap: Record<string, string> = {
  BLUE: "#2f5cf6",
  DARK_RED: "#ce0b2d",
  LIGHT_RED: "#ff4f68",
  PINK: "#f48a96",
  GREEN: "#36b37e",
  YELLOW: "#f5b24e",
  ORANGE: "#ff8a5b",
  BROWN: "#d2a679",
  BLACK: "#364247",
  DARK_GRAY: "#6f766f",
  WHITE: "#e6eaff",
  PURPLE: "#8589e8",
};

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

const number = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows;
}

function rowsToObjects(text: string) {
  const [header, ...rows] = parseCsv(text);
  if (!header) {
    return [];
  }

  return rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) =>
      Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""])),
    );
}

function csvRow(cells: string[]) {
  return cells
    .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
    .join(",");
}

function normalizeName(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/^Michshake$/i, "Milchshake")
    .trim();
}

function screenPaths(raw: string) {
  if (!raw.trim()) {
    return [];
  }

  return raw
    .split(/,(?=\s*(?:Kasse|Menü))/g)
    .map((path) => {
      let clean = path.trim().replace(/\s+\/\s+/g, "/");
      const menuIndex = clean.indexOf("Menü");
      if (menuIndex >= 0) {
        clean = clean.slice(menuIndex);
      }

      const delimiter = clean.includes("##") ? "##" : "/";
      return clean
        .split(delimiter)
        .map(normalizeName)
        .filter(Boolean);
    })
    .filter((parts) => parts[0] === "Menü");
}

function parsePrice(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function taxForGroup(group: string) {
  const clean = group.trim().toLowerCase();
  if (clean === "gutschein") {
    return 0;
  }
  if (clean === "getränke") {
    return 19;
  }
  return 7;
}

function pushUnique<T>(list: T[], item: T, getKey: (value: T) => string) {
  const key = getKey(item);
  if (!list.some((existing) => getKey(existing) === key)) {
    list.push(item);
  }
}

function buttonKey(button: ScreenButton) {
  return button.kind === "screen" ? `screen:${button.key}` : `sku:${button.sku}`;
}

function addSkuToScreenOrder(
  screenOrder: Map<string, ScreenButton[]>,
  knownScreenKeys: Set<string>,
  pathParts: string[],
  sku: string,
) {
  if (!pathParts.length) {
    return;
  }

  for (let index = 1; index < pathParts.length; index += 1) {
    const parentKey = pathParts.slice(0, index).join("/");
    const screenKey = pathParts.slice(0, index + 1).join("/");
    const label = pathParts[index];
    const buttons = screenOrder.get(parentKey) ?? [];
    pushUnique(buttons, { kind: "screen", key: screenKey, label }, buttonKey);
    screenOrder.set(parentKey, buttons);
    knownScreenKeys.add(parentKey);
    knownScreenKeys.add(screenKey);
  }

  const exactKey = pathParts.join("/");
  const buttons = screenOrder.get(exactKey) ?? [];
  pushUnique(buttons, { kind: "sku", sku }, buttonKey);
  screenOrder.set(exactKey, buttons);
  knownScreenKeys.add(exactKey);
}

function screenKeyParts(key: string) {
  const parts = key
    .replaceAll("##", "/")
    .split("/")
    .map(normalizeName)
    .filter(Boolean);

  if (parts[0] !== "Menü") {
    parts.unshift("Menü");
  }

  return parts;
}

function composeTargetScreen(baseKey: string, subScreenName: string) {
  const parts = screenKeyParts(baseKey);
  const child = normalizeName(subScreenName);
  if (child) {
    parts.push(child);
  }
  return parts.join("/");
}

function displayScreenKey(key: string) {
  return key.replaceAll("/", " / ");
}

function findProductScreenKey(catalog: Catalog, sku: string) {
  for (const [screenKey, buttons] of catalog.screenOrder.entries()) {
    if (buttons.some((button) => button.kind === "sku" && button.sku === sku)) {
      return screenKey;
    }
  }

  return "Menü";
}

function removeSkuFromScreenOrder(
  screenOrder: Map<string, ScreenButton[]>,
  sku: string,
) {
  for (const [screenKey, buttons] of screenOrder.entries()) {
    screenOrder.set(
      screenKey,
      buttons.filter((button) => button.kind !== "sku" || button.sku !== sku),
    );
  }
}

function applyAdminProducts(baseCatalog: Catalog, adminProducts: AdminProduct[]) {
  const products = [...baseCatalog.products];
  const productBySku = new Map(baseCatalog.productBySku);
  const groupsBySku = new Map(
    [...baseCatalog.groupsBySku.entries()].map(([sku, group]) => [
      sku,
      { ...group, childSkus: [...group.childSkus] },
    ]),
  );
  const screenOrder = new Map(
    [...baseCatalog.screenOrder.entries()].map(([key, buttons]) => [
      key,
      [...buttons],
    ]),
  );
  const knownScreenKeys = new Set(baseCatalog.screenKeys);

  for (const product of adminProducts) {
    const baseSku = product.baseSku ?? product.sku;
    const existingIndex = products.findIndex(
      (item) => item.sku === baseSku || item.sku === product.sku,
    );

    if (product.source === "catalog" && existingIndex >= 0) {
      products[existingIndex] = product;
      productBySku.delete(baseSku);
      removeSkuFromScreenOrder(screenOrder, baseSku);
      for (const group of groupsBySku.values()) {
        group.childSkus = group.childSkus.map((sku) =>
          sku === baseSku ? product.sku : sku,
        );
      }
    } else if (existingIndex >= 0) {
      products[existingIndex] = product;
      productBySku.delete(baseSku);
    } else {
      products.push(product);
    }

    productBySku.set(product.sku, product);
    addSkuToScreenOrder(
      screenOrder,
      knownScreenKeys,
      screenKeyParts(product.screenKey),
      product.sku,
    );
  }

  return {
    ...baseCatalog,
    products,
    productBySku,
    groupsBySku,
    screenOrder,
    screenKeys: [...knownScreenKeys],
  };
}

function buildCatalog(catalogCsv: string, screensCsv: string): Catalog {
  const catalogRows = rowsToObjects(catalogCsv);
  const screenRows = rowsToObjects(screensCsv);
  const products: Product[] = [];
  const productBySku = new Map<string, Product>();
  const groupsBySku = new Map<string, ProductGroup>();
  const screenOrder = new Map<string, ScreenButton[]>();
  const knownScreenKeys = new Set(["Menü"]);

  let currentGroup: ProductGroup | null = null;

  for (const row of catalogRows) {
    const sku = row.SKU?.trim();
    const name = row.Name?.trim();
    const type = row.Typ?.trim();

    if (!sku) {
      continue;
    }

    if (type === "Gruppe" && name) {
      currentGroup = {
        sku,
        name,
        buttonName: row["Schaltflächenname"]?.trim() || name,
        color: row.Schaltflächenfarbe?.trim() || "BLUE",
        childSkus: [],
      };
      groupsBySku.set(sku, currentGroup);
      continue;
    }

    if (currentGroup && !name && !type) {
      currentGroup.childSkus.push(sku);
      continue;
    }

    currentGroup = null;
  }

  for (const row of catalogRows) {
    const sku = row.SKU?.trim();
    const name = row.Name?.trim();
    const type = row.Typ?.trim();

    if (!sku || !name || SYSTEM_SKUS.has(sku) || /^-+$/.test(name)) {
      continue;
    }

    if (type !== "Artikel" && type !== "Unterartikel") {
      continue;
    }

    const group = row.Warengruppe?.trim() || "Ohne Warengruppe";
    const price = parsePrice(row.Standardpreis ?? "");
    const product: Product = {
      sku,
      name,
      buttonName: row["Schaltflächenname"]?.trim() || name,
      type,
      price,
      group,
      color: row.Schaltflächenfarbe?.trim() || "BLUE",
      style: row.Schaltflächenstil?.trim() || "Akzent",
      taxRate: taxForGroup(group),
      isCustomPrice: price === null,
    };

    products.push(product);
    productBySku.set(sku, product);
  }

  for (const row of screenRows) {
    const sku = row.SKU?.trim();
    if (!sku) {
      continue;
    }
    for (const parts of screenPaths(row.Bildschirm ?? "")) {
      addSkuToScreenOrder(screenOrder, knownScreenKeys, parts, sku);
    }
  }

  for (const row of catalogRows) {
    const sku = row.SKU?.trim();
    const name = row.Name?.trim();
    if (!sku || !name) {
      continue;
    }
    for (const parts of screenPaths(row["Menü/Bildschirm"] ?? "")) {
      addSkuToScreenOrder(screenOrder, knownScreenKeys, parts, sku);
    }
  }

  return {
    products,
    productBySku,
    groupsBySku,
    screenOrder,
    screenKeys: [...knownScreenKeys],
    loadedAt: new Date().toISOString(),
  };
}

function buildEmptyCatalog() {
  return buildCatalog(EMPTY_CATALOG_CSV, EMPTY_SCREENS_CSV);
}

function createTenantSampleProducts(): AdminProduct[] {
  const createdAt = new Date().toISOString();
  return SAMPLE_PRODUCTS.map((product, index) => ({
    ...product,
    id: `sample-${index + 1}`,
    createdAt,
  }));
}

function buildCatalogTemplateCsv() {
  const rows = SAMPLE_PRODUCTS.map((product) => [
    product.sku,
    product.name,
    product.type,
    product.group,
    product.price === null
      ? ""
      : product.price.toLocaleString("de-DE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    product.buttonName,
    product.color,
    product.style,
    product.screenKey,
  ]);

  return [csvRow(CATALOG_TEMPLATE_HEADERS), ...rows.map(csvRow)].join("\n");
}

function tenantStorageKey(baseKey: string, tenantId: string) {
  return `${baseKey}:${tenantId}`;
}

function readTenantStorage(baseKey: string, tenantId: string) {
  const scoped = window.localStorage.getItem(tenantStorageKey(baseKey, tenantId));
  if (scoped !== null) {
    return scoped;
  }

  return tenantId === DEFAULT_TENANT_ID ? window.localStorage.getItem(baseKey) : null;
}

function removeTenantStorage(baseKey: string, tenantId: string) {
  window.localStorage.removeItem(tenantStorageKey(baseKey, tenantId));
  if (tenantId === DEFAULT_TENANT_ID) {
    window.localStorage.removeItem(baseKey);
  }
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function createTenantUsers(pin: string): PosUser[] {
  return [
    {
      ...DEFAULT_USERS[0],
      id: `tenant-manager-${Date.now().toString(36)}`,
      pin,
      requiresPassword: Boolean(pin),
    },
  ];
}

function normalizeStoredTenants(tenants: Tenant[]) {
  return tenants.map((tenant) => ({
    ...tenant,
    id: tenant.id || `tenant-${Date.now().toString(36)}`,
    businessName: tenant.businessName || tenant.loginName || "Neue Kasse",
    loginName: tenant.loginName || tenant.id || "kasse",
    password: tenant.password || DEFAULT_ADMIN_PASSWORD,
    catalogMode: tenant.catalogMode ?? "empty",
    createdAt: tenant.createdAt || new Date().toISOString(),
  }));
}

function todayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA").format(date);
}

function calculateTax(lines: CartLine[], discountAmount: number) {
  const gross = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const factor = gross > 0 ? Math.max(0, 1 - discountAmount / gross) : 1;
  const buckets = new Map<number, { gross: number; net: number; tax: number }>();

  for (const line of lines) {
    const discountedGross = line.qty * line.unitPrice * factor;
    const net = line.taxRate === 0 ? discountedGross : discountedGross / (1 + line.taxRate / 100);
    const tax = discountedGross - net;
    const bucket = buckets.get(line.taxRate) ?? { gross: 0, net: 0, tax: 0 };
    bucket.gross += discountedGross;
    bucket.net += net;
    bucket.tax += tax;
    buckets.set(line.taxRate, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, value]) => ({ rate, ...value }));
}

function sanitizeAmount(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function receiptId(index: number) {
  const compactDate = todayKey().replaceAll("-", "");
  return `K-${compactDate}-${String(index + 1).padStart(4, "0")}`;
}

function discountValueText(discount: Pick<DiscountPreset, "type" | "value">) {
  return discount.type === "percent"
    ? `${number.format(discount.value)} %`
    : currency.format(discount.value);
}

function calculateDiscountAmount(gross: number, discount: DiscountPreset | null) {
  if (!discount || gross <= 0) {
    return 0;
  }

  if (discount.type === "percent") {
    return Math.min(gross, gross * (discount.value / 100));
  }

  return Math.min(gross, discount.value);
}

function permissionsForGroup(group: string): UserPermissions {
  const clean = group.trim().toLowerCase();
  if (clean.includes("manager") || clean.includes("admin")) {
    return { sell: true, discounts: true, reports: true, admin: true };
  }

  return { sell: true, discounts: false, reports: false, admin: false };
}

function parseUsersCsv(text: string) {
  return rowsToObjects(text)
    .map((row, index): PosUser | null => {
      const username = row.Benutzername?.trim();
      if (!username) {
        return null;
      }

      const group = row.Gruppe?.trim() || "Verkauf";
      return {
        id: row.ID?.trim() || `user-${Date.now().toString(36)}-${index}`,
        username,
        firstName: row.Vorname?.trim() || "",
        lastName: row.Nachname?.trim() || "",
        group,
        active: (row.Aktiv?.trim() || "Ja").toLowerCase() !== "nein",
        pin: row["PIN-Code"]?.trim() || "",
        requiresPassword: Boolean(row["PIN-Code"]?.trim()),
        localOrderId: row["Lokale Bestell-ID"]?.trim() || "",
        permissions: permissionsForGroup(group),
      };
    })
    .filter((user): user is PosUser => Boolean(user));
}

function normalizeStoredUsers(users: PosUser[]) {
  return users.map((user) => ({
    ...user,
    requiresPassword:
      typeof user.requiresPassword === "boolean"
        ? user.requiresPassword
        : Boolean(user.pin),
  }));
}

function normalizeStoredAdminProducts(products: AdminProduct[]) {
  return products.map((product) => ({
    ...product,
    source: product.source ?? "custom",
  }));
}

function transactionPayments(transaction: Transaction) {
  if (Array.isArray(transaction.payments) && transaction.payments.length > 0) {
    return transaction.payments;
  }

  if (transaction.paymentMethod === "Gutschein") {
    return [{ method: "Gutschein" as const, amount: transaction.total }];
  }

  return [{ method: "Bar" as const, amount: transaction.total }];
}

function detectDeviceInfo(): DeviceInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const minSide = Math.min(width, height);
  const maxSide = Math.max(width, height);
  const nav = navigator as Navigator & { standalone?: boolean };
  const userAgent = nav.userAgent.toLowerCase();
  const touch = nav.maxTouchPoints > 0 || "ontouchstart" in window;
  const iosTablet = /ipad/.test(userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
  const phone =
    /iphone|ipod|android.*mobile|windows phone/.test(userAgent) || minSide < 640;
  const tablet =
    !phone &&
    (iosTablet ||
      /tablet|android/.test(userAgent) ||
      (minSide >= 640 && maxSide <= 1400 && (touch || width <= 1180)));
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean(nav.standalone);
  const kind: DeviceKind = phone ? "phone" : tablet ? "tablet" : "desktop";

  return {
    kind,
    label:
      kind === "phone"
        ? "Handy"
        : kind === "tablet"
          ? "Tablet"
          : "Desktop",
    touch,
    standalone,
    orientation: width >= height ? "quer" : "hoch",
    width,
    height,
  };
}

function receiptWidthChars(widthMm: ReceiptConfig["widthMm"]) {
  return widthMm === 57 ? 32 : 48;
}

function receiptMoney(value: number) {
  return `${number.format(value)} EUR`;
}

function centerReceiptText(value: string, width: number) {
  const clean = value.trim();
  if (clean.length >= width) {
    return clean;
  }

  const left = Math.floor((width - clean.length) / 2);
  return `${" ".repeat(left)}${clean}`;
}

function formatReceiptTextLine(left: string, right: string, width: number) {
  const leftText = left.trim();
  const rightText = right.trim();
  const gap = Math.max(1, width - leftText.length - rightText.length);
  if (leftText.length + rightText.length + gap <= width) {
    return `${leftText}${" ".repeat(gap)}${rightText}`;
  }

  return `${leftText.slice(0, Math.max(0, width - rightText.length - 1))} ${rightText}`;
}

function hashValue(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function fakeEncodedValue(seed: string, length: number) {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let state = hashValue(seed) || 0x7a11ce;
  let output = "";

  for (let index = 0; index < length; index += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    output += alphabet[state % alphabet.length];
  }

  return output;
}

function fakeTseSignature(transaction: Transaction) {
  return `${fakeEncodedValue(
    `${transaction.id}|${transaction.completedAt}|${transaction.total}|sig`,
    82,
  )}==`;
}

function fakeTsePublicKey(config: ReceiptConfig) {
  return `${fakeEncodedValue(`${config.tseDeviceId}|public-key`, 86)}=`;
}

function fakeTseSerial(transaction: Transaction, config: ReceiptConfig) {
  const input = `${config.tseDeviceId}|${transaction.id}|serial`;
  const hash = fakeEncodedValue(input, 56)
    .replaceAll("+", "")
    .replaceAll("/", "")
    .toLowerCase();
  return hash.slice(0, 56);
}

function fakeCashRegisterSerial(config: ReceiptConfig) {
  const hash = fakeEncodedValue(`${config.tseDeviceId}|register`, 32).replaceAll(
    "/",
    "A",
  );
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ]
    .join("-")
    .toUpperCase();
}

function formatTseTimestamp(date: Date) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function buildTseStampRows(
  transaction: Transaction,
  config: ReceiptConfig,
): TseStampRow[] {
  const completedAt = new Date(transaction.completedAt);
  const firstOrderAt = new Date(
    completedAt.getTime() - Math.max(4, transaction.lines.length * 3) * 1000,
  );
  const baseHash = hashValue(
    `${transaction.id}|${transaction.completedAt}|${transaction.total}`,
  );

  return [
    { center: "TSE Informationen" },
    {
      label: "TSE-Transaktion:",
      value: String(100000 + (baseHash % 900000)),
    },
    {
      label: "TSE-Signatur-Nr.:",
      value: String(200000 + ((baseHash >>> 4) % 900000)),
    },
    {
      label: "TSE-ErsteBestellung:",
      value: formatTseTimestamp(firstOrderAt),
    },
    { label: "TSE-Start:", value: formatTseTimestamp(completedAt) },
    { label: "TSE-Stop:", value: formatTseTimestamp(completedAt) },
    { label: "TSE-Signatur:", value: fakeTseSignature(transaction) },
    { label: "TSE-PublicKey:", value: fakeTsePublicKey(config) },
    { label: "TSE-Seriennummer:", value: fakeTseSerial(transaction, config) },
    {
      label: "Kasse-Seriennummer:",
      value: fakeCashRegisterSerial(config),
    },
  ];
}

function splitReceiptValue(value: string, width: number) {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += width) {
    chunks.push(value.slice(index, index + width));
  }
  return chunks.length ? chunks : [""];
}

function formatTseReceiptRows(transaction: Transaction, config: ReceiptConfig) {
  const width = receiptWidthChars(config.widthMm);
  const lines: string[] = [];

  for (const row of buildTseStampRows(transaction, config)) {
    if (row.center !== undefined) {
      lines.push(centerReceiptText(row.center, width));
      continue;
    }

    const value = row.value ?? "";
    if (row.label.length + value.length <= width) {
      lines.push(formatReceiptTextLine(row.label, value, width));
      continue;
    }

    const valueWidth = Math.max(8, width - row.label.length - 1);
    const chunks = splitReceiptValue(value, valueWidth);
    lines.push(`${row.label} ${chunks[0]}`.slice(0, width));
    lines.push(...chunks.slice(1));
  }

  return lines;
}

function normalizePrinterText(text: string) {
  return text
    .replaceAll("Ä", "Ae")
    .replaceAll("Ö", "Oe")
    .replaceAll("Ü", "Ue")
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const payload = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    payload.set(part, offset);
    offset += part.length;
  }

  return payload;
}

function buildPrinterPayload(text: string, config: ReceiptConfig) {
  const encoder = new TextEncoder();
  const init = Uint8Array.from([0x1b, 0x40]);
  const body = encoder.encode(normalizePrinterText(text));
  const feed = Uint8Array.from([0x0a, 0x0a, 0x0a]);
  const cut = config.cutAfterPrint
    ? config.printerCommandSet === "star"
      ? Uint8Array.from([0x1b, 0x64, 0x00])
      : Uint8Array.from([0x1d, 0x56, 0x00])
    : Uint8Array.from([]);

  return concatBytes([init, body, feed, cut]);
}

function buildReceiptText(transaction: Transaction, config: ReceiptConfig) {
  const width = receiptWidthChars(config.widthMm);
  const lines: string[] = [];

  lines.push(centerReceiptText(config.businessName, width));
  if (config.addressLine.trim()) {
    lines.push(centerReceiptText(config.addressLine, width));
  }
  lines.push("");
  lines.push(`Bon: ${transaction.id}`);
  lines.push(new Date(transaction.completedAt).toLocaleString("de-DE"));
  lines.push("-".repeat(width));

  for (const line of transaction.lines) {
    lines.push(formatReceiptTextLine(`${line.qty} x ${line.name}`, receiptMoney(line.qty * line.unitPrice), width));
  }

  lines.push("-".repeat(width));
  if (transaction.discountAmount > 0) {
    lines.push(formatReceiptTextLine(transaction.discountLabel || "Rabatt", `-${receiptMoney(transaction.discountAmount)}`, width));
  }
  if (transaction.tip > 0) {
    lines.push(formatReceiptTextLine("Trinkgeld", receiptMoney(transaction.tip), width));
  }
  lines.push(formatReceiptTextLine("Summe", receiptMoney(transaction.total), width));

  if (config.showTax) {
    for (const row of transaction.tax) {
      lines.push(formatReceiptTextLine(`MwSt. ${row.rate}%`, receiptMoney(row.tax), width));
    }
  }

  lines.push("-".repeat(width));
  for (const payment of transactionPayments(transaction)) {
    lines.push(formatReceiptTextLine(payment.method, receiptMoney(payment.amount), width));
  }
  if (transaction.change > 0) {
    lines.push(formatReceiptTextLine("Rueckgeld", receiptMoney(transaction.change), width));
  }

  if (config.showTseSimulation) {
    lines.push("-".repeat(width));
    lines.push(...formatTseReceiptRows(transaction, config));
  }

  if (config.footerText.trim()) {
    lines.push("");
    lines.push(centerReceiptText(config.footerText, width));
  }

  lines.push("\n\n");
  return lines.join("\n");
}

export default function Home() {
  const [tenants, setTenants] = useState<Tenant[]>(DEFAULT_TENANTS);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState("");
  const [portalArea, setPortalArea] = useState<PortalArea>("cash");
  const [portalLoginName, setPortalLoginName] = useState("");
  const [portalPassword, setPortalPassword] = useState("");
  const [tenantDraft, setTenantDraft] =
    useState<TenantDraft>(DEFAULT_TENANT_DRAFT);
  const [baseCatalog, setBaseCatalog] = useState<Catalog | null>(null);
  const [screenCsv, setScreenCsv] = useState("");
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [adminProductsLoaded, setAdminProductsLoaded] = useState(false);
  const [adminDraft, setAdminDraft] = useState<AdminProductDraft>(DEFAULT_ADMIN_DRAFT);
  const [discounts, setDiscounts] = useState<DiscountPreset[]>(DEFAULT_DISCOUNTS);
  const [discountsLoaded, setDiscountsLoaded] = useState(false);
  const [discountDraft, setDiscountDraft] =
    useState<DiscountDraft>(DEFAULT_DISCOUNT_DRAFT);
  const [users, setUsers] = useState<PosUser[]>(DEFAULT_USERS);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userDraft, setUserDraft] = useState<UserDraft>(DEFAULT_USER_DRAFT);
  const [activeUserId, setActiveUserId] = useState("");
  const [loginUserId, setLoginUserId] = useState(DEFAULT_USERS[0].id);
  const [loginPassword, setLoginPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState(DEFAULT_ADMIN_PASSWORD);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>("products");
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig>(DEFAULT_RECEIPT_CONFIG);
  const [receiptConfigLoaded, setReceiptConfigLoaded] = useState(false);
  const [printerCharacteristic, setPrinterCharacteristic] =
    useState<BluetoothWritableCharacteristic | null>(null);
  const [printerDeviceName, setPrinterDeviceName] = useState("");
  const [printerStatus, setPrinterStatus] = useState("Kein Drucker verbunden");
  const [currentScreen, setCurrentScreen] = useState("Menü");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<ProductGroup | null>(null);
  const [customDraft, setCustomDraft] = useState<CustomDraft | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [adminProductQuery, setAdminProductQuery] = useState("");
  const [selectedDiscountId, setSelectedDiscountId] = useState("");
  const [customDiscountValue, setCustomDiscountValue] = useState("");
  const [tip, setTip] = useState("");
  const [voucherAmount, setVoucherAmount] = useState("");
  const [cashReceived, setCashReceived] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [journalLoaded, setJournalLoaded] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<Transaction | null>(null);
  const [mode, setMode] = useState<"sale" | "report" | "admin">("sale");
  const [cashMenuOpen, setCashMenuOpen] = useState(false);
  const [notice, setNotice] = useState("Bitte Unternehmen anmelden");
  const [now, setNow] = useState<Date | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const activeTenant =
    tenants.find((tenant) => tenant.id === activeTenantId) ?? null;
  const isAdminPortal = portalArea === "admin";
  const canManageTenants = activeTenant?.id === DEFAULT_TENANT_ID;
  const visibleAdminSections = useMemo(
    () =>
      ADMIN_SECTIONS.filter(
        (section) => section.id !== "tenants" || canManageTenants,
      ),
    [canManageTenants],
  );
  const activeAdminSection =
    canManageTenants || adminSection !== "tenants" ? adminSection : "products";

  useEffect(() => {
    const refreshClock = () => setNow(new Date());
    const firstTick = window.setTimeout(refreshClock, 0);
    const timer = window.setInterval(refreshClock, 30_000);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const updateDeviceInfo = () => setDeviceInfo(detectDeviceInfo());
    const standaloneQuery = window.matchMedia("(display-mode: standalone)");

    updateDeviceInfo();
    window.addEventListener("resize", updateDeviceInfo);
    window.addEventListener("orientationchange", updateDeviceInfo);
    standaloneQuery.addEventListener("change", updateDeviceInfo);

    return () => {
      window.removeEventListener("resize", updateDeviceInfo);
      window.removeEventListener("orientationchange", updateDeviceInfo);
      standaloneQuery.removeEventListener("change", updateDeviceInfo);
    };
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const localOrSecure =
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost";

    if (!localOrSecure) {
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setDeviceInfo(detectDeviceInfo());
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    async function loadTenants() {
      await Promise.resolve();
      const saved = window.localStorage.getItem(STORAGE_TENANTS);

      if (saved) {
        try {
          const parsedTenants = normalizeStoredTenants(JSON.parse(saved) as Tenant[]);
          setTenants(parsedTenants.length ? parsedTenants : DEFAULT_TENANTS);
        } catch {
          window.localStorage.removeItem(STORAGE_TENANTS);
        }
      }

      setTenantsLoaded(true);
    }

    loadTenants();
  }, []);

  useEffect(() => {
    if (!tenantsLoaded) {
      return;
    }

    window.localStorage.setItem(STORAGE_TENANTS, JSON.stringify(tenants));
  }, [tenantsLoaded, tenants]);

  useEffect(() => {
    async function loadData() {
      if (!activeTenant) {
        setBaseCatalog(null);
        setScreenCsv("");
        return;
      }

      if (activeTenant.catalogMode === "empty") {
        setBaseCatalog(buildEmptyCatalog());
        setScreenCsv(EMPTY_SCREENS_CSV);
        setNotice(`${activeTenant.businessName} als Musterkasse geladen`);
        return;
      }

      try {
        const [catalogResponse, screensResponse] = await Promise.all([
          fetch("/data/catalog.csv"),
          fetch("/data/screens.csv"),
        ]);
        const [catalogText, screensText] = await Promise.all([
          catalogResponse.text(),
          screensResponse.text(),
        ]);
        setBaseCatalog(buildCatalog(catalogText, screensText));
        setScreenCsv(screensText);
        setNotice(`${activeTenant.businessName} geladen`);
      } catch {
        setNotice("CSV-Daten konnten nicht geladen werden");
      }
    }

    loadData();
  }, [activeTenant]);

  useEffect(() => {
    async function loadJournal() {
      setJournalLoaded(false);
      if (!activeTenant) {
        setTransactions([]);
        return;
      }

      await Promise.resolve();
      const saved = readTenantStorage(STORAGE_TRANSACTIONS, activeTenant.id);

      if (!saved) {
        setTransactions([]);
        setJournalLoaded(true);
        return;
      }

      try {
        setTransactions(JSON.parse(saved) as Transaction[]);
      } catch {
        removeTenantStorage(STORAGE_TRANSACTIONS, activeTenant.id);
      } finally {
        setJournalLoaded(true);
      }
    }

    loadJournal();
  }, [activeTenant]);

  useEffect(() => {
    async function loadAdminProducts() {
      setAdminProductsLoaded(false);
      if (!activeTenant) {
        setAdminProducts([]);
        return;
      }

      await Promise.resolve();
      const saved = readTenantStorage(STORAGE_ADMIN_PRODUCTS, activeTenant.id);

      if (!saved) {
        setAdminProducts(
          activeTenant.catalogMode === "empty" ? createTenantSampleProducts() : [],
        );
        setAdminProductsLoaded(true);
        return;
      }

      try {
        setAdminProducts(
          normalizeStoredAdminProducts(JSON.parse(saved) as AdminProduct[]),
        );
      } catch {
        removeTenantStorage(STORAGE_ADMIN_PRODUCTS, activeTenant.id);
      } finally {
        setAdminProductsLoaded(true);
      }
    }

    loadAdminProducts();
  }, [activeTenant]);

  useEffect(() => {
    async function loadReceiptConfig() {
      setReceiptConfigLoaded(false);
      if (!activeTenant) {
        setReceiptConfig(DEFAULT_RECEIPT_CONFIG);
        return;
      }

      await Promise.resolve();
      const saved = readTenantStorage(STORAGE_RECEIPT_CONFIG, activeTenant.id);
      const tenantReceiptConfig = {
        ...DEFAULT_RECEIPT_CONFIG,
        businessName: activeTenant.businessName,
      };

      if (!saved) {
        setReceiptConfig(tenantReceiptConfig);
        setReceiptConfigLoaded(true);
        return;
      }

      try {
        setReceiptConfig({
          ...tenantReceiptConfig,
          ...(JSON.parse(saved) as Partial<ReceiptConfig>),
        });
      } catch {
        removeTenantStorage(STORAGE_RECEIPT_CONFIG, activeTenant.id);
      } finally {
        setReceiptConfigLoaded(true);
      }
    }

    loadReceiptConfig();
  }, [activeTenant]);

  useEffect(() => {
    async function loadDiscounts() {
      setDiscountsLoaded(false);
      if (!activeTenant) {
        setDiscounts([]);
        return;
      }

      await Promise.resolve();
      const saved = readTenantStorage(STORAGE_DISCOUNTS, activeTenant.id);

      if (!saved) {
        setDiscounts(activeTenant.catalogMode === "seed" ? DEFAULT_DISCOUNTS : []);
        setDiscountsLoaded(true);
        return;
      }

      try {
        setDiscounts(JSON.parse(saved) as DiscountPreset[]);
      } catch {
        removeTenantStorage(STORAGE_DISCOUNTS, activeTenant.id);
      } finally {
        setDiscountsLoaded(true);
      }
    }

    loadDiscounts();
  }, [activeTenant]);

  useEffect(() => {
    async function loadUsers() {
      setUsersLoaded(false);
      if (!activeTenant) {
        setUsers(DEFAULT_USERS);
        setActiveUserId("");
        setLoginUserId(DEFAULT_USERS[0].id);
        setAdminPassword(DEFAULT_ADMIN_PASSWORD);
        return;
      }

      await Promise.resolve();
      const saved = readTenantStorage(STORAGE_USERS, activeTenant.id);
      const savedPassword = readTenantStorage(STORAGE_ADMIN_PASSWORD, activeTenant.id);

      if (savedPassword) {
        setAdminPassword(savedPassword);
      } else if (activeTenant.id !== DEFAULT_TENANT_ID) {
        setAdminPassword(activeTenant.password);
      }

      if (saved) {
        try {
          const parsedUsers = normalizeStoredUsers(JSON.parse(saved) as PosUser[]);
          setUsers(parsedUsers);
          setLoginUserId(parsedUsers.find((user) => user.active)?.id ?? "");
        } catch {
          removeTenantStorage(STORAGE_USERS, activeTenant.id);
        } finally {
          setUsersLoaded(true);
        }
        return;
      }

      if (activeTenant.id !== DEFAULT_TENANT_ID) {
        const tenantUsers = createTenantUsers(activeTenant.password);
        setUsers(tenantUsers);
        setLoginUserId(tenantUsers[0]?.id ?? "");
        setUsersLoaded(true);
        return;
      }

      try {
        const response = await fetch("/data/users.csv");
        const text = await response.text();
        const importedUsers = parseUsersCsv(text);
        if (importedUsers.length > 0) {
          setUsers(importedUsers);
          setLoginUserId(importedUsers.find((user) => user.active)?.id ?? "");
          const managerPin = importedUsers.find((user) => user.permissions.admin)?.pin;
          if (managerPin && !savedPassword) {
            setAdminPassword(managerPin);
          }
        }
      } catch {
        setUsers(DEFAULT_USERS);
      } finally {
        setUsersLoaded(true);
      }
    }

    loadUsers();
  }, [activeTenant]);

  useEffect(() => {
    if (!journalLoaded || !activeTenant) {
      return;
    }

    window.localStorage.setItem(
      tenantStorageKey(STORAGE_TRANSACTIONS, activeTenant.id),
      JSON.stringify(transactions),
    );
  }, [activeTenant, journalLoaded, transactions]);

  useEffect(() => {
    if (!adminProductsLoaded || !activeTenant) {
      return;
    }

    window.localStorage.setItem(
      tenantStorageKey(STORAGE_ADMIN_PRODUCTS, activeTenant.id),
      JSON.stringify(adminProducts),
    );
  }, [activeTenant, adminProductsLoaded, adminProducts]);

  useEffect(() => {
    if (!receiptConfigLoaded || !activeTenant) {
      return;
    }

    window.localStorage.setItem(
      tenantStorageKey(STORAGE_RECEIPT_CONFIG, activeTenant.id),
      JSON.stringify(receiptConfig),
    );
  }, [activeTenant, receiptConfigLoaded, receiptConfig]);

  useEffect(() => {
    if (!discountsLoaded || !activeTenant) {
      return;
    }

    window.localStorage.setItem(
      tenantStorageKey(STORAGE_DISCOUNTS, activeTenant.id),
      JSON.stringify(discounts),
    );
  }, [activeTenant, discountsLoaded, discounts]);

  useEffect(() => {
    if (!usersLoaded || !activeTenant) {
      return;
    }

    window.localStorage.setItem(
      tenantStorageKey(STORAGE_USERS, activeTenant.id),
      JSON.stringify(users),
    );
    window.localStorage.setItem(
      tenantStorageKey(STORAGE_ADMIN_PASSWORD, activeTenant.id),
      adminPassword,
    );
  }, [activeTenant, usersLoaded, users, adminPassword]);

  const catalog = useMemo(
    () => (baseCatalog ? applyAdminProducts(baseCatalog, adminProducts) : null),
    [baseCatalog, adminProducts],
  );

  const availableScreens = useMemo(() => {
    const keys = catalog?.screenKeys ?? ["Menü"];
    return [...keys].sort((a, b) => {
      const depth = a.split("/").length - b.split("/").length;
      return depth || a.localeCompare(b, "de");
    });
  }, [catalog]);

  const activeUser = users.find((user) => user.id === activeUserId) ?? null;
  const selectedLoginUser =
    users.find((user) => user.id === loginUserId) ??
    users.find((user) => user.active) ??
    null;
  const canUseDiscounts = Boolean(
    activeUser?.active && activeUser.permissions.discounts,
  );
  const canCompleteSale = Boolean(
    activeUser?.active && activeUser.permissions.sell,
  );
  const canOpenReports = Boolean(
    activeUser?.active && activeUser.permissions.reports,
  );
  const editingProduct =
    adminProducts.find((product) => product.id === editingProductId) ?? null;
  const isEditingProduct = Boolean(editingProductId);
  const isCatalogProductEdit = Boolean(
    editingProduct?.source === "catalog" || editingProductId?.startsWith("catalog:"),
  );
  const selectedDiscount =
    discounts.find((discount) => discount.id === selectedDiscountId) ?? null;

  const managedProducts = useMemo(() => {
    if (!catalog) {
      return [];
    }

    const queryText = adminProductQuery.trim().toLowerCase();
    const overrideByBaseSku = new Map(
      adminProducts
        .filter((product) => product.source === "catalog")
        .map((product) => [product.baseSku ?? product.sku, product]),
    );
    const customIds = new Set(
      adminProducts
        .filter((product) => product.source !== "catalog")
        .map((product) => product.id),
    );
    const rows = catalog.products
      .filter((product) => {
        if (!queryText) {
          return true;
        }

        return `${product.sku} ${product.name} ${product.buttonName} ${product.group}`
          .toLowerCase()
          .includes(queryText);
      })
      .map((product) => {
        const override = overrideByBaseSku.get(product.sku);
        const custom = customIds.has((product as AdminProduct).id);
        return {
          product,
          custom,
          overridden: Boolean(override),
        };
      });

    return rows.slice(0, 80);
  }, [adminProductQuery, adminProducts, catalog]);

  const currentButtons = useMemo(() => {
    if (!catalog) {
      return [];
    }

    if (query.trim()) {
      const needle = query.trim().toLowerCase();
      return catalog.products
        .filter((product) =>
          `${product.sku} ${product.name} ${product.buttonName} ${product.group}`
            .toLowerCase()
            .includes(needle),
        )
        .slice(0, 60)
        .map<ScreenButton>((product) => ({ kind: "sku", sku: product.sku }));
    }

    return catalog.screenOrder.get(currentScreen) ?? [];
  }, [catalog, currentScreen, query]);

  const currentPath = currentScreen.split("/");
  const cartItemCount = cart.reduce((sum, line) => sum + line.qty, 0);
  const grossBeforeDiscount = cart.reduce(
    (sum, line) => sum + line.qty * line.unitPrice,
    0,
  );
  const effectiveDiscount =
    selectedDiscount && selectedDiscount.custom
      ? {
          ...selectedDiscount,
          value: sanitizeAmount(customDiscountValue),
        }
      : selectedDiscount;
  const discountAmount = canUseDiscounts
    ? calculateDiscountAmount(grossBeforeDiscount, effectiveDiscount)
    : 0;
  const discountPct =
    grossBeforeDiscount > 0 ? (discountAmount / grossBeforeDiscount) * 100 : 0;
  const grossAfterDiscount = Math.max(0, grossBeforeDiscount - discountAmount);
  const tipAmount = sanitizeAmount(tip);
  const totalDue = grossAfterDiscount + tipAmount;
  const voucherTendered = sanitizeAmount(voucherAmount);
  const voucherPayment = Math.min(voucherTendered, totalDue);
  const cashDue = Math.max(0, totalDue - voucherPayment);
  const cashPayment = cashReceived.trim()
    ? sanitizeAmount(cashReceived)
    : cashDue;
  const paidAmount = voucherPayment + cashPayment;
  const change = Math.max(0, cashPayment - cashDue);
  const unusedVoucher = Math.max(0, voucherTendered - voucherPayment);
  const taxRows = calculateTax(cart, discountAmount);
  const todaysTransactions = transactions.filter(
    (transaction) => todayKey(new Date(transaction.completedAt)) === todayKey(),
  );
  const canComplete =
    canCompleteSale && cart.length > 0 && cashPayment + 0.001 >= cashDue;

  function resetRegisterSession() {
    setActiveUserId("");
    setLoginPassword("");
    setAdminUnlocked(false);
    setAdminPasswordInput("");
    setMode("sale");
    setCurrentScreen("Menü");
    setCart([]);
    setQuery("");
    setActiveGroup(null);
    setCustomDraft(null);
    setEditingProductId(null);
    setAdminProductQuery("");
    setSelectedDiscountId("");
    setCustomDiscountValue("");
    setTip("");
    setVoucherAmount("");
    setCashReceived("");
    setLastReceipt(null);
    setCashMenuOpen(false);
  }

  function loginTenant() {
    const loginName = portalLoginName.trim().toLowerCase();
    const password = portalPassword.trim();
    const tenant = tenants.find(
      (item) => item.loginName.trim().toLowerCase() === loginName,
    );
    const savedAdminPassword = tenant
      ? readTenantStorage(STORAGE_ADMIN_PASSWORD, tenant.id)
      : null;
    const tenantPasswordMatches = Boolean(tenant && tenant.password === password);
    const adminPasswordMatches = Boolean(savedAdminPassword && savedAdminPassword === password);
    const passwordAllowed =
      portalArea === "admin"
        ? tenantPasswordMatches || adminPasswordMatches
        : tenantPasswordMatches;

    if (!tenant || !passwordAllowed) {
      setNotice("Unternehmenskennung oder Passwort ist falsch");
      return;
    }

    resetRegisterSession();
    if (portalArea === "admin") {
      setAdminUnlocked(true);
      setMode("admin");
    }
    setActiveTenantId(tenant.id);
    setPortalPassword("");
    setNotice(
      portalArea === "admin"
        ? `${tenant.businessName} Adminbereich geöffnet`
        : `${tenant.businessName} Kassenbereich geöffnet`,
    );
  }

  function logoutTenant() {
    resetRegisterSession();
    setActiveTenantId("");
    setPortalArea("cash");
    setPortalLoginName("");
    setPortalPassword("");
    setNotice("Unternehmen abgemeldet");
  }

  function createTenantRegister() {
    if (!canManageTenants) {
      setNotice("Nur die Hauptkasse darf neue Unternehmenskassen anlegen");
      return;
    }

    const businessName = normalizeName(tenantDraft.businessName);
    const loginName = tenantDraft.loginName.trim().toLowerCase();
    const password = tenantDraft.password.trim();
    const adminPin = tenantDraft.adminPin.trim() || password;

    if (!businessName || !loginName || !password) {
      setNotice("Bitte Firmenname, Kennung und Passwort eingeben");
      return;
    }

    if (tenants.some((tenant) => tenant.loginName.toLowerCase() === loginName)) {
      setNotice("Diese Unternehmenskennung ist bereits vergeben");
      return;
    }

    const tenant: Tenant = {
      id: `tenant-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      businessName,
      loginName,
      password,
      catalogMode: "empty",
      createdAt: new Date().toISOString(),
    };
    const tenantReceiptConfig: ReceiptConfig = {
      ...receiptConfig,
      businessName,
      addressLine: "",
      footerText: "Vielen Dank fuer Ihren Besuch",
    };

    setTenants((items) => [...items, tenant]);
    window.localStorage.setItem(
      tenantStorageKey(STORAGE_USERS, tenant.id),
      JSON.stringify(createTenantUsers(adminPin)),
    );
    window.localStorage.setItem(
      tenantStorageKey(STORAGE_ADMIN_PASSWORD, tenant.id),
      adminPin,
    );
    window.localStorage.setItem(
      tenantStorageKey(STORAGE_RECEIPT_CONFIG, tenant.id),
      JSON.stringify(tenantReceiptConfig),
    );
    window.localStorage.setItem(
      tenantStorageKey(STORAGE_ADMIN_PRODUCTS, tenant.id),
      JSON.stringify(createTenantSampleProducts()),
    );
    window.localStorage.setItem(
      tenantStorageKey(STORAGE_DISCOUNTS, tenant.id),
      JSON.stringify([]),
    );
    window.localStorage.setItem(
      tenantStorageKey(STORAGE_TRANSACTIONS, tenant.id),
      JSON.stringify([]),
    );
    setTenantDraft(DEFAULT_TENANT_DRAFT);
    setNotice(`${tenant.businessName} wurde mit 3 Musterprodukten angelegt`);
  }

  function exportTenantBackup() {
    if (!canManageTenants) {
      setNotice("Nur die Hauptkasse darf Mandantendaten exportieren");
      return;
    }

    const data = Object.fromEntries(
      tenants.map((tenant) => [
        tenant.id,
        Object.fromEntries(
          TENANT_DATA_STORAGE_KEYS.map((key) => [
            key,
            readTenantStorage(key, tenant.id),
          ]),
        ),
      ]),
    );
    const backup: TenantBackupFile = {
      app: "peters-kasse",
      version: 1,
      exportedAt: new Date().toISOString(),
      tenants,
      data,
    };

    downloadTextFile(
      `peters-kasse-mandanten-backup-${todayKey()}.json`,
      JSON.stringify(backup, null, 2),
      "application/json;charset=utf-8",
    );
    setNotice("Mandanten-Sicherung exportiert");
  }

  function importTenantBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!canManageTenants) {
      setNotice("Nur die Hauptkasse darf Mandantendaten importieren");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result ?? "")) as TenantBackupFile;
        if (
          backup.app !== "peters-kasse" ||
          !Array.isArray(backup.tenants) ||
          !backup.data
        ) {
          setNotice("Diese Sicherungsdatei passt nicht zu Peters Kasse");
          return;
        }

        const importedTenants = normalizeStoredTenants(backup.tenants);
        if (!importedTenants.length) {
          setNotice("In der Sicherung wurden keine Kassen gefunden");
          return;
        }

        const confirmed = window.confirm(
          `${importedTenants.length} Kassen aus der Sicherung importieren? Bestehende Kassen mit gleicher ID werden überschrieben.`,
        );
        if (!confirmed) {
          setNotice("Import abgebrochen");
          return;
        }

        for (const tenant of importedTenants) {
          const tenantData = backup.data[tenant.id] ?? {};
          for (const key of TENANT_DATA_STORAGE_KEYS) {
            const value = tenantData[key];
            if (typeof value === "string") {
              window.localStorage.setItem(tenantStorageKey(key, tenant.id), value);
            }
          }
        }

        setTenants(importedTenants);
        resetRegisterSession();
        setActiveTenantId("");
        setPortalLoginName("");
        setPortalPassword("");
        setNotice("Mandanten-Sicherung importiert. Bitte Unternehmen neu anmelden");
      } catch {
        setNotice("Sicherungsdatei konnte nicht gelesen werden");
      }
    };
    reader.readAsText(file);
  }

  function addLine(product: Product, customPrice?: number) {
    const unitPrice = customPrice ?? product.price ?? 0;
    const lineId = `${product.sku}-${product.name}-${unitPrice}-${product.taxRate}`;

    setCart((lines) => {
      const existing = lines.find((line) => line.id === lineId);
      if (existing) {
        return lines.map((line) =>
          line.id === lineId ? { ...line, qty: line.qty + 1 } : line,
        );
      }

      return [
        ...lines,
        {
          id: lineId,
          sku: product.sku,
          name: product.buttonName,
          group: product.group,
          qty: 1,
          unitPrice,
          taxRate: product.taxRate,
        },
      ];
    });
  }

  function handleProduct(product: Product) {
    if (product.isCustomPrice) {
      setCustomDraft({
        sku: product.sku,
        name: product.buttonName,
        group: product.group,
        color: product.color,
        taxRate: product.taxRate,
        price: "",
      });
      return;
    }

    addLine(product);
  }

  function confirmCustomPrice() {
    if (!customDraft || !catalog) {
      return;
    }

    const price = sanitizeAmount(customDraft.price);
    if (price <= 0) {
      return;
    }

    const product = catalog.productBySku.get(customDraft.sku);
    if (!product) {
      return;
    }

    addLine({ ...product, buttonName: customDraft.name, taxRate: customDraft.taxRate }, price);
    setCustomDraft(null);
  }

  function updateQty(id: string, delta: number) {
    setCart((lines) =>
      lines
        .map((line) =>
          line.id === id ? { ...line, qty: Math.max(0, line.qty + delta) } : line,
        )
        .filter((line) => line.qty > 0),
    );
  }

  function completeSale() {
    if (!canComplete) {
      return;
    }

    const transaction: Transaction = {
      id: receiptId(todaysTransactions.length),
      completedAt: new Date().toISOString(),
      lines: cart,
      grossBeforeDiscount,
      discountPct,
      discountLabel: effectiveDiscount?.name,
      discountType: effectiveDiscount?.type,
      discountValue: effectiveDiscount?.value,
      discountAmount,
      tip: tipAmount,
      total: totalDue,
      payments: [
        ...(voucherPayment > 0
          ? [{ method: "Gutschein" as const, amount: voucherPayment }]
          : []),
        ...(cashDue > 0 ? [{ method: "Bar" as const, amount: cashDue }] : []),
      ],
      paid: paidAmount,
      change,
      tax: taxRows,
    };

    setTransactions((items) => [...items, transaction]);
    setLastReceipt(transaction);
    setCart([]);
    setSelectedDiscountId("");
    setCustomDiscountValue("");
    setTip("");
    setVoucherAmount("");
    setCashReceived("");
    setNotice(`Bon ${transaction.id} abgeschlossen`);
  }

  function importCatalog(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !screenCsv) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setBaseCatalog(buildCatalog(text, screenCsv));
      setCurrentScreen("Menü");
      setActiveGroup(null);
      setQuery("");
      setNotice(`${file.name} importiert`);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function exportCatalogTemplate() {
    downloadTextFile(
      "peters-kasse-produkte-muster.csv",
      buildCatalogTemplateCsv(),
      "text/csv;charset=utf-8",
    );
    setNotice("CSV-Musterdatei exportiert");
  }

  function exportDailyReport() {
    const header = [
      "Bon",
      "Datum",
      "Bar",
      "Gutschein",
      "Bezahlt",
      "Rückgeld",
      "Brutto",
      "Rabattname",
      "Rabatt",
      "Trinkgeld",
      "Steuer 7%",
      "Steuer 19%",
      "Positionen",
    ];
    const lines = todaysTransactions.map((transaction) => {
      const tax7 = transaction.tax.find((row) => row.rate === 7)?.tax ?? 0;
      const tax19 = transaction.tax.find((row) => row.rate === 19)?.tax ?? 0;
      const payments = transactionPayments(transaction);
      const cash = payments
        .filter((payment) => payment.method === "Bar")
        .reduce((sum, payment) => sum + payment.amount, 0);
      const voucher = payments
        .filter((payment) => payment.method === "Gutschein")
        .reduce((sum, payment) => sum + payment.amount, 0);
      const positions = transaction.lines
        .map((line) => `${line.qty}x ${line.name}`)
        .join(" | ");
      return [
        transaction.id,
        new Date(transaction.completedAt).toLocaleString("de-DE"),
        number.format(cash),
        number.format(voucher),
        number.format(transaction.paid),
        number.format(transaction.change),
        number.format(transaction.total),
        transaction.discountLabel ?? "",
        number.format(transaction.discountAmount),
        number.format(transaction.tip),
        number.format(tax7),
        number.format(tax19),
        positions,
      ];
    });
    const csv = [header, ...lines].map(csvRow).join("\n");
    downloadTextFile(`tagesabschluss-${todayKey()}.csv`, csv, "text/csv;charset=utf-8");
  }

  function resetDay() {
    const keep = transactions.filter(
      (transaction) => todayKey(new Date(transaction.completedAt)) !== todayKey(),
    );
    if (
      todaysTransactions.length > 0 &&
      window.confirm("Heutige Bons aus dem lokalen Journal löschen?")
    ) {
      setTransactions(keep);
      setNotice("Tagesjournal zurückgesetzt");
    }
  }

  function startEditAdminProduct(product: Product) {
    if (!catalog) {
      return;
    }

    const possibleAdminProduct = product as Partial<AdminProduct>;
    const existingAdminProduct =
      (possibleAdminProduct.id
        ? adminProducts.find((item) => item.id === possibleAdminProduct.id)
        : null) ??
      adminProducts.find(
        (item) =>
          item.source === "catalog" &&
          (item.baseSku === product.sku || item.sku === product.sku),
      );
    const editableProduct: AdminProduct =
      existingAdminProduct ??
      ({
        ...product,
        id: `catalog:${product.sku}`,
        source: "catalog",
        baseSku: product.sku,
        screenKey: findProductScreenKey(catalog, product.sku),
        createdAt: new Date().toISOString(),
      } satisfies AdminProduct);

    setEditingProductId(editableProduct.id);
    setAdminDraft({
      sku: editableProduct.sku,
      name: editableProduct.name,
      buttonName: editableProduct.buttonName,
      price:
        editableProduct.price === null
          ? ""
          : String(editableProduct.price).replace(".", ","),
      group: editableProduct.group,
      taxRate: editableProduct.taxRate,
      color: editableProduct.color,
      style: editableProduct.style,
      screenKey: editableProduct.screenKey,
      subScreenName: "",
    });
    setNotice(`${editableProduct.buttonName} wird bearbeitet`);
  }

  function cancelAdminProductEdit() {
    setEditingProductId(null);
    setAdminDraft(DEFAULT_ADMIN_DRAFT);
    setNotice("Produktbearbeitung abgebrochen");
  }

  function addAdminProduct() {
    if (!catalog) {
      setNotice("Katalog ist noch nicht geladen");
      return;
    }

    const existingProduct = editingProduct;
    const catalogBaseSku =
      existingProduct?.source === "catalog"
        ? existingProduct.baseSku ?? existingProduct.sku
        : editingProductId?.startsWith("catalog:")
          ? editingProductId.slice("catalog:".length)
          : "";
    const name = normalizeName(adminDraft.name);
    const buttonName = normalizeName(adminDraft.buttonName) || name;
    const sku =
      catalogBaseSku ||
      adminDraft.sku.trim() ||
      existingProduct?.sku ||
      `ADM-${Date.now().toString(36).toUpperCase()}`;
    const priceText = adminDraft.price.trim();
    const price = priceText ? parsePrice(priceText) : null;
    const targetScreen = composeTargetScreen(
      adminDraft.screenKey,
      adminDraft.subScreenName,
    );

    if (!name) {
      setNotice("Bitte einen Produktnamen eingeben");
      return;
    }

    if (priceText && price === null) {
      setNotice("Der Preis konnte nicht gelesen werden");
      return;
    }

    if (
      !catalogBaseSku &&
      catalog.productBySku.has(sku) &&
      existingProduct?.sku !== sku
    ) {
      setNotice(`SKU ${sku} ist bereits vorhanden`);
      return;
    }

    const product: AdminProduct = {
      id:
        existingProduct?.id ??
        (catalogBaseSku
          ? `catalog:${catalogBaseSku}`
          : `admin-${Date.now().toString(36)}-${Math.random()
              .toString(36)
              .slice(2, 7)}`),
      sku,
      name,
      buttonName,
      type:
        existingProduct?.type ??
        (catalogBaseSku
          ? baseCatalog?.productBySku.get(catalogBaseSku)?.type
          : undefined) ??
        "Artikel",
      price,
      group: normalizeName(adminDraft.group) || "Ohne Warengruppe",
      color: adminDraft.color,
      style: adminDraft.style,
      taxRate: adminDraft.taxRate,
      isCustomPrice: price === null,
      screenKey: targetScreen,
      createdAt: existingProduct?.createdAt ?? new Date().toISOString(),
      source: catalogBaseSku ? "catalog" : existingProduct?.source ?? "custom",
      baseSku: catalogBaseSku || existingProduct?.baseSku,
    };

    if (existingProduct) {
      setAdminProducts((items) =>
        items.map((item) => (item.id === existingProduct.id ? product : item)),
      );
      setEditingProductId(null);
      setNotice(`${product.buttonName} wurde aktualisiert`);
    } else if (catalogBaseSku) {
      setAdminProducts((items) => [...items, product]);
      setEditingProductId(null);
      setNotice(`${product.buttonName} wurde aktualisiert`);
    } else {
      setAdminProducts((items) => [...items, product]);
      setNotice(`${product.buttonName} wurde hinzugefügt`);
    }

    setAdminDraft({
      ...DEFAULT_ADMIN_DRAFT,
      group: product.group,
      taxRate: product.taxRate,
      screenKey: targetScreen,
    });
    setCurrentScreen(targetScreen);
  }

  function removeAdminProduct(id: string) {
    setAdminProducts((items) => items.filter((product) => product.id !== id));
    if (editingProductId === id) {
      setEditingProductId(null);
      setAdminDraft(DEFAULT_ADMIN_DRAFT);
    }
    setNotice("Admin-Produkt entfernt");
  }

  function addDiscountPreset() {
    const name = normalizeName(discountDraft.name);
    const value = sanitizeAmount(discountDraft.value);

    if (!name || value <= 0) {
      setNotice("Bitte Rabattname und Rabattwert eingeben");
      return;
    }

    const discount: DiscountPreset = {
      id: `disc-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      name,
      type: discountDraft.type,
      value,
      custom: discountDraft.custom,
      createdAt: new Date().toISOString(),
    };

    setDiscounts((items) => [...items, discount]);
    setDiscountDraft(DEFAULT_DISCOUNT_DRAFT);
    setNotice(`${discount.name} wurde angelegt`);
  }

  function removeDiscountPreset(id: string) {
    setDiscounts((items) => items.filter((discount) => discount.id !== id));
    if (selectedDiscountId === id) {
      setSelectedDiscountId("");
      setCustomDiscountValue("");
    }
    setNotice("Rabattvorlage entfernt");
  }

  function importUsers(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const importedUsers = parseUsersCsv(String(reader.result ?? ""));
      if (importedUsers.length === 0) {
        setNotice("Keine Benutzer im CSV gefunden");
        return;
      }

      setUsers(importedUsers);
      setActiveUserId("");
      setLoginUserId(importedUsers.find((user) => user.active)?.id ?? "");
      const managerPin = importedUsers.find((user) => user.permissions.admin)?.pin;
      if (managerPin) {
        setAdminPassword(managerPin);
      }
      setNotice(`${importedUsers.length} Benutzer importiert`);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function addUser() {
    const username = normalizeName(userDraft.username);
    if (!username) {
      setNotice("Bitte einen Benutzernamen eingeben");
      return;
    }

    const user: PosUser = {
      id: `user-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      username,
      firstName: normalizeName(userDraft.firstName),
      lastName: normalizeName(userDraft.lastName),
      group: normalizeName(userDraft.group) || "Verkauf",
      active: userDraft.active,
      pin: userDraft.pin.trim(),
      requiresPassword: userDraft.requiresPassword,
      localOrderId: "",
      permissions: userDraft.permissions,
    };

    if (user.requiresPassword && !user.pin) {
      setNotice("Bitte ein Passwort fuer diesen Benutzer eingeben");
      return;
    }

    setUsers((items) => [...items, user]);
    setUserDraft(DEFAULT_USER_DRAFT);
    setNotice(`${user.username} wurde angelegt`);
  }

  function removeUser(id: string) {
    setUsers((items) => {
      const remaining = items.filter((user) => user.id !== id);
      if (activeUserId === id) {
        setActiveUserId("");
      }
      if (loginUserId === id) {
        setLoginUserId(remaining.find((user) => user.active)?.id ?? "");
      }
      return remaining.length
        ? remaining
        : activeTenant?.id === DEFAULT_TENANT_ID
          ? DEFAULT_USERS
          : createTenantUsers(adminPassword);
    });
    setNotice("Benutzer entfernt");
  }

  function updateUserPermission(
    id: string,
    permission: keyof UserPermissions,
    value: boolean,
  ) {
    setUsers((items) =>
      items.map((user) =>
        user.id === id
          ? {
              ...user,
              permissions: {
                ...user.permissions,
                [permission]: value,
              },
            }
          : user,
      ),
    );
  }

  function updateUserAuth(
    id: string,
    changes: Partial<Pick<PosUser, "pin" | "requiresPassword" | "active">>,
  ) {
    if (changes.active === false && activeUserId === id) {
      setActiveUserId("");
      setAdminUnlocked(false);
      setMode("sale");
    }

    if (changes.active === false && loginUserId === id) {
      setLoginUserId(users.find((user) => user.id !== id && user.active)?.id ?? "");
    }

    setUsers((items) =>
      items.map((user) =>
        user.id === id
          ? {
              ...user,
              ...changes,
            }
          : user,
      ),
    );
  }

  function loginUser(user = selectedLoginUser) {
    if (!user || !user.active) {
      setNotice("Bitte einen aktiven Benutzer auswählen");
      return;
    }

    if (user.requiresPassword && user.pin !== loginPassword.trim()) {
      setNotice("Passwort ist falsch");
      return;
    }

    setActiveUserId(user.id);
    setLoginUserId(user.id);
    setLoginPassword("");
    setMode("sale");
    setNotice(`${user.username} angemeldet`);
  }

  function logoutUser() {
    setActiveUserId("");
    setAdminUnlocked(false);
    setMode("sale");
    setCart([]);
    setActiveGroup(null);
    setCustomDraft(null);
    setSelectedDiscountId("");
    setCustomDiscountValue("");
    setTip("");
    setVoucherAmount("");
    setCashReceived("");
    setLastReceipt(null);
    setNotice("Abgemeldet");
  }

  function unlockAdmin() {
    const entered = adminPasswordInput.trim();
    const matchingAdmin = users.some(
      (user) =>
        user.active &&
        user.permissions.admin &&
        user.requiresPassword &&
        user.pin &&
        user.pin === entered,
    );

    if (entered && (entered === adminPassword || matchingAdmin)) {
      setAdminUnlocked(true);
      setAdminPasswordInput("");
      setNotice("Adminbereich freigeschaltet");
      return;
    }

    setNotice("Admin-Passwort ist falsch");
  }

  function changeAdminPassword() {
    const value = newAdminPassword.trim();
    if (value.length < 4) {
      setNotice("Admin-Passwort muss mindestens 4 Zeichen haben");
      return;
    }

    setAdminPassword(value);
    setNewAdminPassword("");
    setNotice("Admin-Passwort aktualisiert");
  }

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setNotice(
      choice.outcome === "accepted"
        ? "App-Installation gestartet"
        : "App-Installation abgebrochen",
    );
  }

  async function connectBluetoothPrinter() {
    const bluetooth = (navigator as Navigator & { bluetooth?: BluetoothLike })
      .bluetooth;

    if (!bluetooth) {
      setPrinterStatus(
        "Bluetooth-Druck wird von diesem Browser nicht unterstützt. Browserdruck bleibt verfügbar.",
      );
      return;
    }

    try {
      setPrinterStatus("Drucker auswählen");
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLUETOOTH_PRINTER_SERVICES,
      });
      const server = await device.gatt?.connect();
      if (!server) {
        throw new Error("Keine Bluetooth-GATT-Verbindung");
      }

      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writable = characteristics.find(
          (characteristic) =>
            characteristic.properties?.write ||
            characteristic.properties?.writeWithoutResponse,
        );

        if (writable) {
          setPrinterCharacteristic(writable);
          setPrinterDeviceName(device.name || "Bluetooth-Drucker");
          setPrinterStatus("Bluetooth-Drucker verbunden");
          return;
        }
      }

      setPrinterStatus("Kein beschreibbarer Druckkanal gefunden");
    } catch (error) {
      setPrinterCharacteristic(null);
      setPrinterDeviceName("");
      setPrinterStatus(
        error instanceof Error
          ? `Bluetooth-Verbindung fehlgeschlagen: ${error.message}`
          : "Bluetooth-Verbindung fehlgeschlagen",
      );
    }
  }

  async function writeBluetoothPrint(text: string) {
    if (!printerCharacteristic) {
      setPrinterStatus("Bitte zuerst einen Bluetooth-Drucker verbinden");
      return;
    }

    const payload = buildPrinterPayload(text, receiptConfig);

    for (let offset = 0; offset < payload.length; offset += 180) {
      const chunk = payload.slice(offset, offset + 180);
      if (printerCharacteristic.writeValueWithoutResponse) {
        await printerCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await printerCharacteristic.writeValue(chunk);
      }
    }

    setPrinterStatus(
      `Druckauftrag gesendet (${receiptConfig.widthMm} mm, ${
        receiptConfig.printerCommandSet === "star" ? "Star" : "ESC/POS"
      })`,
    );
  }

  async function printReceiptBluetooth(transaction: Transaction) {
    await writeBluetoothPrint(buildReceiptText(transaction, receiptConfig));
  }

  async function printBluetoothTest() {
    const testTransaction: Transaction = {
      id: "TESTDRUCK",
      completedAt: new Date().toISOString(),
      lines: [
        {
          id: "testdruck",
          sku: "TEST",
          name: "Testdruck",
          group: "Drucker",
          qty: 1,
          unitPrice: 0,
          taxRate: 0,
        },
      ],
      grossBeforeDiscount: 0,
      discountPct: 0,
      discountAmount: 0,
      tip: 0,
      total: 0,
      payments: [{ method: "Bar", amount: 0 }],
      paid: 0,
      change: 0,
      tax: [],
    };

    await printReceiptBluetooth(testTransaction);
  }

  function renderSkuButton(sku: string) {
    if (!catalog) {
      return null;
    }

    const group = catalog.groupsBySku.get(sku);
    if (group) {
      return (
        <button
          className="product-button group-button"
          key={`group-${sku}`}
          onClick={() => setActiveGroup(group)}
          style={{ "--tile-color": colorMap[group.color] ?? colorMap.BLUE } as React.CSSProperties}
          type="button"
        >
          <span className="button-main">{group.buttonName}</span>
          <span className="button-meta">{group.childSkus.length} Optionen</span>
        </button>
      );
    }

    const product = catalog.productBySku.get(sku);
    if (!product) {
      return null;
    }

    return (
      <button
        className={`product-button ${product.style === "Hintergrund" ? "filled" : ""}`}
        disabled={!canCompleteSale}
        key={`product-${sku}`}
        onClick={() => handleProduct(product)}
        style={{ "--tile-color": colorMap[product.color] ?? colorMap.BLUE } as React.CSSProperties}
        type="button"
      >
        <span className="button-main">{product.buttonName}</span>
        <span className="button-meta">
          {product.isCustomPrice ? "Preis eingeben" : currency.format(product.price ?? 0)}
        </span>
      </button>
    );
  }

  const reportTotals = todaysTransactions.reduce(
    (totals, transaction) => {
      totals.total += transaction.total;
      totals.discount += transaction.discountAmount;
      totals.tip += transaction.tip;
      totals.count += 1;
      for (const payment of transactionPayments(transaction)) {
        totals.byPayment[payment.method] =
          (totals.byPayment[payment.method] ?? 0) + payment.amount;
      }
      for (const row of transaction.tax) {
        totals.tax[row.rate] = (totals.tax[row.rate] ?? 0) + row.tax;
        totals.net[row.rate] = (totals.net[row.rate] ?? 0) + row.net;
      }
      return totals;
    },
    {
      total: 0,
      discount: 0,
      tip: 0,
      count: 0,
      byPayment: {} as Record<string, number>,
      tax: {} as Record<number, number>,
      net: {} as Record<number, number>,
    },
  );

  return (
    <main
      className={[
        "pos-shell",
        deviceInfo ? `device-${deviceInfo.kind}` : "device-unknown",
        deviceInfo?.touch ? "touch-device" : "pointer-device",
        deviceInfo?.standalone ? "installed-app" : "browser-app",
      ].join(" ")}
    >
      {!activeTenant ? (
        <section className="portal-screen" aria-label="Unternehmensanmeldung">
          <div className="portal-panel">
            <div className="portal-brand">
              <Image
                alt="Opa Peters"
                height={120}
                priority
                src="/opa-peters-logo.png"
                width={120}
              />
              <div>
                <p className="eyebrow">Kassenportal</p>
                <h1>Opa Peters Kassensystem</h1>
              </div>
            </div>
            <div className="portal-copy">
              <strong>
                {portalArea === "admin"
                  ? "Adminbereich anmelden"
                  : "Kassenbereich anmelden"}
              </strong>
              <span>{notice}</span>
            </div>
            <div className="portal-area-grid" aria-label="Bereich auswählen">
              <button
                className={portalArea === "cash" ? "active" : ""}
                onClick={() => {
                  setPortalArea("cash");
                  setPortalPassword("");
                  setNotice("Kassenbereich ausgewählt");
                }}
                type="button"
              >
                <strong>Kassenbereich</strong>
              </button>
              <button
                className={portalArea === "admin" ? "active" : ""}
                onClick={() => {
                  setPortalArea("admin");
                  setPortalPassword("");
                  setNotice("Adminbereich ausgewählt");
                }}
                type="button"
              >
                <strong>Adminbereich</strong>
              </button>
            </div>
            <div className="field-grid portal-fields">
              <label>
                Unternehmenskennung
                <input
                  autoComplete="username"
                  autoFocus
                  onChange={(event) => setPortalLoginName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      loginTenant();
                    }
                  }}
                  placeholder="z. B. opa"
                  value={portalLoginName}
                />
              </label>
              <label>
                Passwort
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPortalPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      loginTenant();
                    }
                  }}
                  type="password"
                  value={portalPassword}
                />
              </label>
            </div>
            <button
              className="complete-button"
              disabled={!tenantsLoaded}
              onClick={loginTenant}
              type="button"
            >
              {portalArea === "admin" ? "Adminbereich öffnen" : "Kassenbereich öffnen"}
            </button>
            <div className="portal-help">
              <span>Zugang</span>
              <strong>vom Admin vergeben</strong>
            </div>
          </div>
        </section>
      ) : activeUser || isAdminPortal ? (
        <>
      <header
        className={
          isAdminPortal
            ? "topbar"
            : `topbar cash-topbar ${cashMenuOpen ? "cash-topbar-open" : "cash-topbar-closed"}`
        }
      >
        <div className="topbar-brand">
          <Image
            alt=""
            aria-hidden="true"
            className="topbar-logo"
            height={52}
            src="/opa-peters-logo.png"
            width={52}
          />
          <div>
            <p className="eyebrow">
              {isAdminPortal
                ? "Verwaltung"
                : `${mode === "sale" ? "Verkauf" : "Tagesabschluss"} · ${
                    activeUser?.username ?? "Kasse"
                  }`}
            </p>
            <h1>
              {isAdminPortal
                ? `${activeTenant.businessName} Adminbereich`
                : receiptConfig.businessName}
            </h1>
          </div>
        </div>
        {!isAdminPortal ? (
          <button
            aria-expanded={cashMenuOpen}
            className="cash-menu-toggle"
            onClick={() => setCashMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            {cashMenuOpen ? "Menü schließen" : "Menü"}
          </button>
        ) : null}
        {isAdminPortal || cashMenuOpen ? (
        <div className={isAdminPortal ? "status-line" : "status-line cash-toolbar-panel"}>
          <span>
            {now
              ? now.toLocaleString("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "Zeit wird geladen"}
          </span>
          <span>{notice}</span>
          <span>
            {deviceInfo
              ? `${deviceInfo.label} · ${
                  deviceInfo.standalone ? "App-Modus" : "Browser-Modus"
                } · ${deviceInfo.orientation}`
              : "Gerät wird erkannt"}
          </span>
          {installPrompt && !deviceInfo?.standalone ? (
            <button className="install-app-button" onClick={installApp} type="button">
              App installieren
            </button>
          ) : null}
          {isAdminPortal ? (
            <div className="user-switch">
              <span>Bereich</span>
              <strong>Admin</strong>
              <button className="logout-button" onClick={logoutTenant} type="button">
                Verlassen
              </button>
            </div>
          ) : activeUser ? (
            <div className="user-switch">
              <span>Benutzer</span>
              <strong>{activeUser.username}</strong>
              <button className="logout-button" onClick={logoutUser} type="button">
                Logout
              </button>
            </div>
          ) : null}
        </div>
        ) : null}
        {!isAdminPortal && cashMenuOpen ? (
          <div className="mode-tabs cash-toolbar-panel" aria-label="Arbeitsbereich">
            <button
              className={mode === "sale" ? "active" : ""}
              onClick={() => {
                setMode("sale");
                setCashMenuOpen(false);
              }}
              type="button"
            >
              Verkauf
            </button>
            <button
              className={mode === "report" ? "active" : ""}
              disabled={!canOpenReports}
              onClick={() => {
                setMode("report");
                setCashMenuOpen(false);
              }}
              type="button"
            >
              Tagesabschluss
            </button>
          </div>
        ) : null}
      </header>

      <div className={isAdminPortal ? "workspace admin-workspace" : "workspace"}>
        {!isAdminPortal ? (
        <aside className="screen-rail" aria-label="Bildschirme">
          <div className="rail-title">Bildschirme</div>
          <button
            className={currentScreen === "Menü" && !query ? "screen-pill active" : "screen-pill"}
            onClick={() => {
              setCurrentScreen("Menü");
              setQuery("");
              setActiveGroup(null);
            }}
            type="button"
          >
            Menü
          </button>
          {catalog?.screenKeys
            .filter((key) => key !== "Menü" && key.split("/").length === 2)
            .map((key) => (
              <button
                className={currentScreen === key && !query ? "screen-pill active" : "screen-pill"}
                key={key}
                onClick={() => {
                  setCurrentScreen(key);
                  setQuery("");
                  setActiveGroup(null);
                }}
                type="button"
              >
                {key.split("/").at(-1)}
              </button>
            ))}
          <div className="rail-footer">
            <label className="import-button" htmlFor="catalog-import">
              CSV importieren
            </label>
            <button
              className="import-button"
              onClick={exportCatalogTemplate}
              type="button"
            >
              Muster CSV
            </button>
            <input
              accept=".csv,text/csv"
              id="catalog-import"
              onChange={importCatalog}
              type="file"
            />
            <span>{catalog ? `${catalog.products.length} Artikel geladen` : "Warten auf CSV"}</span>
          </div>
        </aside>
        ) : null}

        {mode === "sale" && !isAdminPortal ? (
          <section className="menu-area" aria-label="Artikelauswahl">
            <div className="menu-toolbar">
              <div>
                <div className="breadcrumb">
                  {currentPath.map((part, index) => {
                    const key = currentPath.slice(0, index + 1).join("/");
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setCurrentScreen(key);
                          setQuery("");
                          setActiveGroup(null);
                        }}
                        type="button"
                      >
                        {part}
                      </button>
                    );
                  })}
                </div>
                <h2>{query ? "Suche" : currentPath.at(-1)}</h2>
              </div>
              <label className="search-box">
                <span>Suche</span>
                <input
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveGroup(null);
                  }}
                  placeholder="Artikel, SKU oder Warengruppe"
                  value={query}
                />
              </label>
            </div>

            <div className="sale-status-strip" aria-label="Verkaufsstatus">
              <span>
                <strong>{cartItemCount}</strong> Positionen
              </span>
              <span>
                <strong>{currency.format(totalDue)}</strong> offen
              </span>
              <span>{query.trim() ? "Suche aktiv" : displayScreenKey(currentScreen)}</span>
            </div>

            {activeGroup && catalog ? (
              <div className="option-strip">
                <div>
                  <strong>{activeGroup.buttonName}</strong>
                  <span>{activeGroup.childSkus.length} verknüpfte Artikel</span>
                </div>
                <button onClick={() => setActiveGroup(null)} type="button">
                  Schließen
                </button>
              </div>
            ) : null}

            {activeGroup && catalog ? (
              <div className="product-grid option-grid">
                {activeGroup.childSkus.map((sku) => renderSkuButton(sku))}
              </div>
            ) : (
              <div className="product-grid">
                {!catalog ? <div className="empty-state">Kassendaten werden geladen</div> : null}
                {currentButtons.map((button) =>
                  button.kind === "screen" ? (
                    <button
                      className="product-button screen-button"
                      key={`screen-${button.key}`}
                      onClick={() => {
                        setCurrentScreen(button.key);
                        setQuery("");
                        setActiveGroup(null);
                      }}
                      type="button"
                    >
                      <span className="button-main">{button.label}</span>
                      <span className="button-meta">Unterbildschirm</span>
                    </button>
                  ) : (
                    renderSkuButton(button.sku)
                  ),
                )}
                {catalog && currentButtons.length === 0 ? (
                  <div className="empty-state">Keine Artikel auf diesem Bildschirm</div>
                ) : null}
              </div>
            )}
          </section>
        ) : mode === "report" && !isAdminPortal ? (
          <section className="report-area" aria-label="Tagesabschluss">
            <div className="report-header">
              <div>
                <p className="eyebrow">Heute</p>
                <h2>Tagesabschluss {todayKey().split("-").reverse().join(".")}</h2>
              </div>
              <div className="report-actions">
                <button onClick={exportDailyReport} type="button">
                  CSV
                </button>
                <button onClick={() => window.print()} type="button">
                  Drucken
                </button>
                <button className="danger" onClick={resetDay} type="button">
                  Zurücksetzen
                </button>
              </div>
            </div>

            <div className="metric-grid">
              <div className="metric">
                <span>Umsatz</span>
                <strong>{currency.format(reportTotals.total)}</strong>
              </div>
              <div className="metric">
                <span>Bons</span>
                <strong>{reportTotals.count}</strong>
              </div>
              <div className="metric">
                <span>Rabatte</span>
                <strong>{currency.format(reportTotals.discount)}</strong>
              </div>
              <div className="metric">
                <span>Trinkgeld</span>
                <strong>{currency.format(reportTotals.tip)}</strong>
              </div>
            </div>

            <div className="report-columns">
              <div className="report-block">
                <h3>Zahlarten</h3>
                {(["Bar", "Gutschein"] as PaymentMethod[]).map((method) => (
                  <div className="report-row" key={method}>
                    <span>{method}</span>
                    <strong>{currency.format(reportTotals.byPayment[method] ?? 0)}</strong>
                  </div>
                ))}
              </div>
              <div className="report-block">
                <h3>Steuern</h3>
                {[0, 7, 19].map((rate) => (
                  <div className="report-row" key={rate}>
                    <span>{rate}% MwSt.</span>
                    <strong>{currency.format(reportTotals.tax[rate] ?? 0)}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="journal-list">
              {todaysTransactions.length === 0 ? (
                <div className="empty-state">Noch keine Bons abgeschlossen</div>
              ) : (
                [...todaysTransactions].reverse().map((transaction) => (
                  <button
                    className="journal-entry"
                    key={transaction.id}
                    onClick={() => setLastReceipt(transaction)}
                    type="button"
                  >
                    <span>{transaction.id}</span>
                    <span>{new Date(transaction.completedAt).toLocaleTimeString("de-DE")}</span>
                    <strong>{currency.format(transaction.total)}</strong>
                  </button>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="admin-area" aria-label="Adminbereich">
            {!adminUnlocked ? (
              <div className="admin-lock">
                <div>
                  <p className="eyebrow">Geschützt</p>
                  <h2>Adminbereich entsperren</h2>
                  <p>
                    Gib das Admin-Passwort oder die PIN eines Benutzers mit
                    Adminrecht ein.
                  </p>
                </div>
                <label>
                  Passwort / PIN
                  <input
                    autoFocus
                    onChange={(event) => setAdminPasswordInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        unlockAdmin();
                      }
                    }}
                    type="password"
                    value={adminPasswordInput}
                  />
                </label>
                <button className="admin-primary" onClick={unlockAdmin} type="button">
                  Entsperren
                </button>
              </div>
            ) : (
              <>
                <div className="report-header">
                  <div>
                    <p className="eyebrow">Admin</p>
                    <h2>
                      {canManageTenants
                        ? "Produkte, Rabatte, Benutzer, Bons & Kassen"
                        : "Produkte, Rabatte, Benutzer & Bons"}
                    </h2>
                  </div>
                  <div className="admin-summary">
                    {adminProducts.length} eigene Produkte · {discounts.length} Rabatte ·{" "}
                    {users.length} Benutzer
                    {canManageTenants ? ` · ${tenants.length} Kassen` : ""}
                  </div>
                </div>

                <div className="admin-menu" aria-label="Adminmenue">
                  {visibleAdminSections.map((section) => (
                    <button
                      className={activeAdminSection === section.id ? "active" : ""}
                      key={section.id}
                      onClick={() => setAdminSection(section.id)}
                      type="button"
                    >
                      {section.label}
                    </button>
                  ))}
                </div>

                {activeAdminSection === "products" ? (
            <div className="admin-grid">
              <div className="admin-block">
                <h3>{isEditingProduct ? "Produkt bearbeiten" : "Produkt hinzufügen"}</h3>
                <div className="field-grid">
                  <label>
                    SKU
                    <input
                      disabled={isCatalogProductEdit}
                      onChange={(event) =>
                        setAdminDraft({ ...adminDraft, sku: event.target.value })
                      }
                      placeholder={
                        isCatalogProductEdit
                          ? "Standard-SKU bleibt erhalten"
                          : isEditingProduct
                            ? "leer = bisherige SKU"
                            : "leer = automatisch"
                      }
                      value={adminDraft.sku}
                    />
                  </label>
                  <label>
                    Produktname
                    <input
                      onChange={(event) =>
                        setAdminDraft({ ...adminDraft, name: event.target.value })
                      }
                      placeholder="z. B. Sommerbecher"
                      value={adminDraft.name}
                    />
                  </label>
                  <label>
                    Kacheltext
                    <input
                      onChange={(event) =>
                        setAdminDraft({
                          ...adminDraft,
                          buttonName: event.target.value,
                        })
                      }
                      placeholder="leer = Produktname"
                      value={adminDraft.buttonName}
                    />
                  </label>
                  <label>
                    Preis
                    <input
                      inputMode="decimal"
                      onChange={(event) =>
                        setAdminDraft({ ...adminDraft, price: event.target.value })
                      }
                      placeholder="leer = Preisabfrage"
                      value={adminDraft.price}
                    />
                  </label>
                  <label>
                    Warengruppe
                    <input
                      onChange={(event) =>
                        setAdminDraft({ ...adminDraft, group: event.target.value })
                      }
                      value={adminDraft.group}
                    />
                  </label>
                  <label>
                    MwSt.
                    <select
                      onChange={(event) =>
                        setAdminDraft({
                          ...adminDraft,
                          taxRate: Number(event.target.value),
                        })
                      }
                      value={adminDraft.taxRate}
                    >
                      <option value="0">0%</option>
                      <option value="7">7%</option>
                      <option value="19">19%</option>
                    </select>
                  </label>
                  <label>
                    Anzeigeort
                    <select
                      onChange={(event) =>
                        setAdminDraft({
                          ...adminDraft,
                          screenKey: event.target.value,
                        })
                      }
                      value={adminDraft.screenKey}
                    >
                      {availableScreens.map((key) => (
                        <option key={key} value={key}>
                          {displayScreenKey(key)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Neue Unterkachel
                    <input
                      onChange={(event) =>
                        setAdminDraft({
                          ...adminDraft,
                          subScreenName: event.target.value,
                        })
                      }
                      placeholder="optional, z. B. Saison"
                      value={adminDraft.subScreenName}
                    />
                  </label>
                  <label>
                    Farbe
                    <select
                      onChange={(event) =>
                        setAdminDraft({ ...adminDraft, color: event.target.value })
                      }
                      value={adminDraft.color}
                    >
                      {Object.keys(colorMap).map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Kachelstil
                    <select
                      onChange={(event) =>
                        setAdminDraft({ ...adminDraft, style: event.target.value })
                      }
                      value={adminDraft.style}
                    >
                      <option value="Akzent">Akzent</option>
                      <option value="Hintergrund">Hintergrund</option>
                    </select>
                  </label>
                </div>
                <div className="admin-target">
                  Ziel: {displayScreenKey(composeTargetScreen(adminDraft.screenKey, adminDraft.subScreenName))}
                </div>
                <div className="admin-actions">
                  <button className="admin-primary" onClick={addAdminProduct} type="button">
                    {isEditingProduct ? "Änderungen speichern" : "Produkt speichern"}
                  </button>
                  {isEditingProduct ? (
                    <button
                      className="admin-secondary"
                      onClick={cancelAdminProductEdit}
                      type="button"
                    >
                      Abbrechen
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="admin-block">
                <h3>Produkte verwalten</h3>
                <label className="search-box admin-product-search">
                  <span>Suche</span>
                  <input
                    onChange={(event) => setAdminProductQuery(event.target.value)}
                    placeholder="Produkt, SKU oder Warengruppe"
                    value={adminProductQuery}
                  />
                </label>
                <div className="admin-list">
                  {managedProducts.length === 0 ? (
                    <div className="empty-state">Keine Produkte gefunden</div>
                  ) : (
                    managedProducts.map(({ product, custom, overridden }) => {
                      const adminProduct = product as Partial<AdminProduct>;
                      const overrideProduct = adminProducts.find(
                        (item) =>
                          item.source === "catalog" &&
                          (item.baseSku === product.sku || item.sku === product.sku),
                      );
                      const screenKey =
                        adminProduct.screenKey ??
                        (catalog ? findProductScreenKey(catalog, product.sku) : "Menü");
                      const rowIsEditing =
                        editingProductId === adminProduct.id ||
                        editingProductId === overrideProduct?.id ||
                        editingProductId === `catalog:${product.sku}`;

                      return (
                        <div
                          className={`admin-row ${rowIsEditing ? "editing" : ""}`}
                          key={adminProduct.id ?? product.sku}
                        >
                          <div>
                            <strong>{product.buttonName}</strong>
                            <span>
                              {product.sku} · {displayScreenKey(screenKey)} ·{" "}
                              {product.isCustomPrice
                                ? "Preisabfrage"
                                : currency.format(product.price ?? 0)}{" "}
                              ·{" "}
                              {custom
                                ? "eigenes Produkt"
                                : overridden
                                  ? "angepasstes Standardprodukt"
                                  : "Standardprodukt"}
                            </span>
                          </div>
                          <div className="admin-row-actions">
                            <button
                              onClick={() => startEditAdminProduct(product)}
                              type="button"
                            >
                              Bearbeiten
                            </button>
                            {custom && adminProduct.id ? (
                              <button
                                className="danger"
                                onClick={() => removeAdminProduct(adminProduct.id ?? "")}
                                type="button"
                              >
                                Löschen
                              </button>
                            ) : null}
                            {overridden && overrideProduct ? (
                              <button
                                className="danger"
                                onClick={() => removeAdminProduct(overrideProduct.id)}
                                type="button"
                              >
                                Zurücksetzen
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

                ) : null}

                {activeAdminSection === "discounts" ? (
            <div className="admin-grid admin-grid-single">
              <div className="admin-block">
                <h3>Rabattvorlagen</h3>
                <div className="field-grid">
                  <label>
                    Rabattname
                    <input
                      onChange={(event) =>
                        setDiscountDraft({
                          ...discountDraft,
                          name: event.target.value,
                        })
                      }
                      placeholder="z. B. Stammkunde"
                      value={discountDraft.name}
                    />
                  </label>
                  <label>
                    Rabattart
                    <select
                      onChange={(event) =>
                        setDiscountDraft({
                          ...discountDraft,
                          type: event.target.value as DiscountType,
                        })
                      }
                      value={discountDraft.type}
                    >
                      <option value="percent">Prozent</option>
                      <option value="amount">Eurobetrag</option>
                    </select>
                  </label>
                  <label>
                    Rabattwert
                    <input
                      inputMode="decimal"
                      onChange={(event) =>
                        setDiscountDraft({
                          ...discountDraft,
                          value: event.target.value,
                        })
                      }
                      placeholder={discountDraft.type === "percent" ? "5" : "2,00"}
                      value={discountDraft.value}
                    />
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={discountDraft.custom}
                      onChange={(event) =>
                        setDiscountDraft({
                          ...discountDraft,
                          custom: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    Wert an der Kasse frei eingeben
                  </label>
                </div>
                <button className="admin-primary" onClick={addDiscountPreset} type="button">
                  Rabatt speichern
                </button>
                <div className="admin-list">
                  {discounts.map((discount) => (
                    <div className="admin-row" key={discount.id}>
                      <div>
                        <strong>{discount.name}</strong>
                        <span>
                          {discountValueText(discount)} ·{" "}
                          {discount.custom ? "frei anpassbar" : "fest"}
                        </span>
                      </div>
                      <button
                        className="danger"
                        onClick={() => removeDiscountPreset(discount.id)}
                        type="button"
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
                ) : null}

                {activeAdminSection === "users" ? (
            <div className="admin-grid admin-grid-single">
              <div className="admin-block">
                <h3>Benutzer & Rechte</h3>
                <div className="report-actions">
                  <label className="import-button" htmlFor="users-import">
                    POS-Benutzer importieren
                  </label>
                  <input
                    accept=".csv,text/csv"
                    className="hidden-input"
                    id="users-import"
                    onChange={importUsers}
                    type="file"
                  />
                </div>
                <div className="field-grid">
                  <label>
                    Benutzername
                    <input
                      onChange={(event) =>
                        setUserDraft({ ...userDraft, username: event.target.value })
                      }
                      value={userDraft.username}
                    />
                  </label>
                  <label>
                    Gruppe
                    <input
                      onChange={(event) =>
                        setUserDraft({ ...userDraft, group: event.target.value })
                      }
                      value={userDraft.group}
                    />
                  </label>
                  <label>
                    Vorname
                    <input
                      onChange={(event) =>
                        setUserDraft({ ...userDraft, firstName: event.target.value })
                      }
                      value={userDraft.firstName}
                    />
                  </label>
                  <label>
                    Nachname
                    <input
                      onChange={(event) =>
                        setUserDraft({ ...userDraft, lastName: event.target.value })
                      }
                      value={userDraft.lastName}
                    />
                  </label>
                  <label>
                    Passwort / PIN
                    <input
                      inputMode="numeric"
                      onChange={(event) =>
                        setUserDraft({ ...userDraft, pin: event.target.value })
                      }
                      value={userDraft.pin}
                    />
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={userDraft.requiresPassword}
                      onChange={(event) =>
                        setUserDraft({
                          ...userDraft,
                          requiresPassword: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    Passwort erforderlich
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={userDraft.active}
                      onChange={(event) =>
                        setUserDraft({ ...userDraft, active: event.target.checked })
                      }
                      type="checkbox"
                    />
                    Aktiv
                  </label>
                  {(
                    [
                      ["sell", "Verkaufen"],
                      ["discounts", "Rabatte"],
                      ["reports", "Tagesabschluss"],
                      ["admin", "Admin"],
                    ] as [keyof UserPermissions, string][]
                  ).map(([permission, label]) => (
                    <label className="checkbox-field" key={permission}>
                      <input
                        checked={userDraft.permissions[permission]}
                        onChange={(event) =>
                          setUserDraft({
                            ...userDraft,
                            permissions: {
                              ...userDraft.permissions,
                              [permission]: event.target.checked,
                            },
                          })
                        }
                        type="checkbox"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <button className="admin-primary" onClick={addUser} type="button">
                  Benutzer speichern
                </button>
                <div className="admin-list">
                  {users.map((user) => (
                    <div className="user-row" key={user.id}>
                      <div>
                        <strong>{user.username}</strong>
                        <span>
                          {user.group} · {user.active ? "aktiv" : "inaktiv"} ·{" "}
                          {user.requiresPassword
                            ? user.pin
                              ? "Passwort erforderlich"
                              : "Passwort fehlt"
                            : "ohne Passwort"}
                        </span>
                      </div>
                      <div className="user-auth-grid">
                        <label>
                          <input
                            checked={user.active}
                            onChange={(event) =>
                              updateUserAuth(user.id, {
                                active: event.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                          Aktiv
                        </label>
                        <label>
                          <input
                            checked={user.requiresPassword}
                            onChange={(event) => {
                              updateUserAuth(user.id, {
                                requiresPassword: event.target.checked,
                              });
                              if (event.target.checked && !user.pin) {
                                setNotice(
                                  `Bitte Passwort fuer ${user.username} setzen`,
                                );
                              }
                            }}
                            type="checkbox"
                          />
                          Passwort
                        </label>
                        <label className="user-pin-field">
                          Passwort / PIN
                          <input
                            onChange={(event) =>
                              updateUserAuth(user.id, {
                                pin: event.target.value,
                              })
                            }
                            type="password"
                            value={user.pin}
                          />
                        </label>
                      </div>
                      <div className="permission-grid">
                        {(
                          [
                            ["sell", "Verkauf"],
                            ["discounts", "Rabatt"],
                            ["reports", "Bericht"],
                            ["admin", "Admin"],
                          ] as [keyof UserPermissions, string][]
                        ).map(([permission, label]) => (
                          <label key={permission}>
                            <input
                              checked={user.permissions[permission]}
                              onChange={(event) =>
                                updateUserPermission(
                                  user.id,
                                  permission,
                                  event.target.checked,
                                )
                              }
                              type="checkbox"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                      <button
                        className="danger"
                        onClick={() => removeUser(user.id)}
                        type="button"
                      >
                        Löschen
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

                ) : null}

                {canManageTenants && activeAdminSection === "tenants" ? (
            <div className="admin-grid admin-grid-single">
              <div className="admin-block">
                <h3>Unternehmen & Musterkassen</h3>
                <p className="admin-note">
                  Neue Unternehmen erhalten eine eigene Anmeldung und eine
                  Musterkasse mit drei Beispielprodukten. Bon- und
                  Druckeinstellungen werden als Startpunkt aus dieser Kasse
                  übernommen.
                </p>
                <div className="field-grid">
                  <label>
                    Firmenname
                    <input
                      onChange={(event) =>
                        setTenantDraft({
                          ...tenantDraft,
                          businessName: event.target.value,
                        })
                      }
                      placeholder="z. B. Muster Cafe GmbH"
                      value={tenantDraft.businessName}
                    />
                  </label>
                  <label>
                    Unternehmenskennung
                    <input
                      autoComplete="off"
                      onChange={(event) =>
                        setTenantDraft({
                          ...tenantDraft,
                          loginName: event.target.value,
                        })
                      }
                      placeholder="z. B. muster-cafe"
                      value={tenantDraft.loginName}
                    />
                  </label>
                  <label>
                    Firmenpasswort
                    <input
                      autoComplete="new-password"
                      onChange={(event) =>
                        setTenantDraft({
                          ...tenantDraft,
                          password: event.target.value,
                        })
                      }
                      type="password"
                      value={tenantDraft.password}
                    />
                  </label>
                  <label>
                    Manager-PIN in der neuen Kasse
                    <input
                      autoComplete="new-password"
                      inputMode="numeric"
                      onChange={(event) =>
                        setTenantDraft({
                          ...tenantDraft,
                          adminPin: event.target.value,
                        })
                      }
                      placeholder="leer = Firmenpasswort"
                      type="password"
                      value={tenantDraft.adminPin}
                    />
                  </label>
                </div>
                <button
                  className="admin-primary"
                  onClick={createTenantRegister}
                  type="button"
                >
                  Kasse für Unternehmen anlegen
                </button>
                <div className="tenant-backup-panel">
                  <h4>Mandanten-Sicherung</h4>
                  <p className="admin-note">
                    Exportiert alle angelegten Kassen inklusive lokaler
                    Produkte, Benutzer, Bons und Passwörter. Die Datei sicher
                    aufbewahren und nicht öffentlich teilen.
                  </p>
                  <div className="report-actions">
                    <button
                      className="admin-secondary"
                      onClick={exportTenantBackup}
                      type="button"
                    >
                      Alle Kassen exportieren
                    </button>
                    <label className="import-button" htmlFor="tenant-backup-import">
                      Sicherung importieren
                    </label>
                    <input
                      accept=".json,application/json"
                      className="hidden-input"
                      id="tenant-backup-import"
                      onChange={importTenantBackup}
                      type="file"
                    />
                  </div>
                </div>
                <div className="tenant-list">
                  {tenants.map((tenant) => (
                    <div className="tenant-row" key={tenant.id}>
                      <div>
                        <strong>{tenant.businessName}</strong>
                        <span>
                          Kennung: {tenant.loginName} ·{" "}
                          {tenant.catalogMode === "seed"
                            ? "bestehende Opa-Peters-Kasse"
                            : "Musterkasse mit Beispielprodukten"}
                        </span>
                      </div>
                      <span>{tenant.id === activeTenantId ? "geöffnet" : "bereit"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

                ) : null}

                {activeAdminSection === "receipts" ? (
            <div className="admin-grid">
              <div className="admin-block">
                <h3>Bonlayout</h3>
                <div className="field-grid">
                  <label>
                    Firmenname
                    <input
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          businessName: event.target.value,
                        })
                      }
                      value={receiptConfig.businessName}
                    />
                  </label>
                  <label>
                    Adresse / Ort
                    <input
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          addressLine: event.target.value,
                        })
                      }
                      value={receiptConfig.addressLine}
                    />
                  </label>
                  <label className="field-wide">
                    Bon-Fußzeile
                    <input
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          footerText: event.target.value,
                        })
                      }
                      value={receiptConfig.footerText}
                    />
                  </label>
                  <label>
                    Bonrollenbreite
                    <select
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          widthMm: Number(event.target.value) as 57 | 80,
                        })
                      }
                      value={receiptConfig.widthMm}
                    >
                      <option value="57">57 mm</option>
                      <option value="80">80 mm</option>
                    </select>
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={receiptConfig.showTax}
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          showTax: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    MwSt. auf Bon anzeigen
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={receiptConfig.showTseSimulation}
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          showTseSimulation: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    TSE-Simulation drucken
                  </label>
                  <label>
                    TSE-Sim-ID
                    <input
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          tseDeviceId: event.target.value,
                        })
                      }
                      value={receiptConfig.tseDeviceId}
                    />
                  </label>
                </div>
                <div
                  className="receipt-preview"
                  style={
                    {
                      "--receipt-width": `${receiptConfig.widthMm}mm`,
                    } as React.CSSProperties
                  }
                >
                  <strong>{receiptConfig.businessName}</strong>
                  <span>{receiptConfig.addressLine}</span>
                  <hr />
                  <div>
                    <span>1 x Beispielartikel</span>
                    <span>10,00 EUR</span>
                  </div>
                  <div>
                    <strong>Summe</strong>
                    <strong>10,00 EUR</strong>
                  </div>
                  {receiptConfig.showTseSimulation ? (
                    <div className="receipt-preview-tse">
                      <strong>TSE Informationen</strong>
                      <span>TSE-Transaktion: fiktiv</span>
                      <span>TSE-Start: aktueller Bonzeitpunkt</span>
                      <span>TSE-Signatur: fiktiv</span>
                    </div>
                  ) : null}
                  <span>{receiptConfig.footerText}</span>
                </div>
              </div>

              <div className="admin-block">
                <h3>Drucker & TSE</h3>
                <div className="field-grid">
                  <label>
                    Star-Druckerprofil
                    <select
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          printerProfile: event.target.value as PrinterProfile,
                        })
                      }
                      value={receiptConfig.printerProfile}
                    >
                      {PRINTER_PROFILES.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Druckersprache
                    <select
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          printerCommandSet: event.target
                            .value as PrinterCommandSet,
                        })
                      }
                      value={receiptConfig.printerCommandSet}
                    >
                      <option value="escpos">ESC/POS kompatibel</option>
                      <option value="star">Star Line Mode</option>
                    </select>
                  </label>
                  <label className="checkbox-field">
                    <input
                      checked={receiptConfig.cutAfterPrint}
                      onChange={(event) =>
                        setReceiptConfig({
                          ...receiptConfig,
                          cutAfterPrint: event.target.checked,
                        })
                      }
                      type="checkbox"
                    />
                    Bon nach Druck schneiden
                  </label>
                </div>
                <div className="admin-target">
                  {
                    PRINTER_PROFILES.find(
                      (profile) => profile.id === receiptConfig.printerProfile,
                    )?.detail
                  }{" "}
                  · aktuelle Breite: {receiptConfig.widthMm} mm
                </div>
                <div className="admin-password-box">
                  <label>
                    Neues Admin-Passwort
                    <input
                      onChange={(event) => setNewAdminPassword(event.target.value)}
                      type="password"
                      value={newAdminPassword}
                    />
                  </label>
                  <button onClick={changeAdminPassword} type="button">
                    Passwort speichern
                  </button>
                </div>
                <div className="printer-status">
                  <span>Status</span>
                  <strong>{printerDeviceName || printerStatus}</strong>
                </div>
                <div className="report-actions">
                  <button onClick={connectBluetoothPrinter} type="button">
                    Bluetooth verbinden
                  </button>
                  <button
                    disabled={!printerCharacteristic}
                    onClick={printBluetoothTest}
                    type="button"
                  >
                    Testdruck
                  </button>
                </div>
                <p className="admin-note">
                  Web-Bluetooth funktioniert vorerst mit kompatiblen BLE/ESC-POS
                  Druckern. Klassische Bluetooth-SPP-Drucker brauchen spaeter
                  eine native Bridge oder Hersteller-SDK.
                </p>
                <p className="admin-note warning">
                  Der TSE-Stempel ist nur eine Simulation und nicht rechtssicher.
                  Die echte TSE-Schnittstelle kann spaeter an derselben Stelle
                  angebunden werden.
                </p>
              </div>
            </div>
                ) : null}
              </>
            )}
          </section>
        )}

        {!isAdminPortal ? (
        <aside className="cart-panel" aria-label="Warenkorb">
          <div className="cart-header">
            <div>
              <p className="eyebrow">Aktueller Verkauf</p>
              <h2>{currency.format(totalDue)}</h2>
            </div>
            <button
              className="icon-action"
              disabled={!cart.length}
              onClick={() => setCart([])}
              title="Warenkorb leeren"
              type="button"
            >
              ×
            </button>
          </div>

          <div className="cart-lines">
            {cart.length === 0 ? (
              <div className="empty-cart">Artikel antippen, um den Verkauf zu starten.</div>
            ) : (
              cart.map((line) => (
                <div className="cart-line" key={line.id}>
                  <div>
                    <strong>{line.name}</strong>
                    <span>
                      {line.group} · {currency.format(line.unitPrice)} · {line.taxRate}% MwSt.
                    </span>
                  </div>
                  <div className="qty-controls">
                    <button onClick={() => updateQty(line.id, -1)} type="button">
                      −
                    </button>
                    <span>{line.qty}</span>
                    <button onClick={() => updateQty(line.id, 1)} type="button">
                      +
                    </button>
                  </div>
                  <strong>{currency.format(line.qty * line.unitPrice)}</strong>
                </div>
              ))
            )}
          </div>

          <div className="adjustments">
            <label>
              Rabatt
              <select
                disabled={!canUseDiscounts}
                onChange={(event) => {
                  setSelectedDiscountId(event.target.value);
                  setCustomDiscountValue("");
                }}
                value={canUseDiscounts ? selectedDiscountId : ""}
              >
                <option value="">
                  {canUseDiscounts ? "Kein Rabatt" : "Keine Berechtigung"}
                </option>
                {discounts.map((discount) => (
                  <option key={discount.id} value={discount.id}>
                    {discount.name} · {discountValueText(discount)}
                  </option>
                ))}
              </select>
            </label>
            {canUseDiscounts && selectedDiscount?.custom ? (
              <label>
                Rabattwert
                <input
                  inputMode="decimal"
                  onChange={(event) => setCustomDiscountValue(event.target.value)}
                  placeholder={selectedDiscount.type === "percent" ? "0 %" : "0,00"}
                  value={customDiscountValue}
                />
              </label>
            ) : null}
            <label>
              Trinkgeld
              <input
                inputMode="decimal"
                onChange={(event) => setTip(event.target.value)}
                placeholder="0,00"
                value={tip}
              />
            </label>
          </div>

          <div className="totals">
            <div>
              <span>Zwischensumme</span>
              <strong>{currency.format(grossBeforeDiscount)}</strong>
            </div>
            <div>
              <span>{effectiveDiscount ? effectiveDiscount.name : "Rabatt"}</span>
              <strong>-{currency.format(discountAmount)}</strong>
            </div>
            {taxRows.map((row) => (
              <div key={row.rate}>
                <span>MwSt. {row.rate}%</span>
                <strong>{currency.format(row.tax)}</strong>
              </div>
            ))}
            <div className="grand-total">
              <span>Zu zahlen</span>
              <strong>{currency.format(totalDue)}</strong>
            </div>
          </div>

          <div className="payment-box">
            <div className="payment-plan">
              <div>
                <span>Gutschein</span>
                <strong>{currency.format(voucherPayment)}</strong>
              </div>
              <div>
                <span>Rest Bar</span>
                <strong>{currency.format(cashDue)}</strong>
              </div>
            </div>
            <div className="split-inputs">
              <label>
                Gutscheinbetrag
                <input
                  inputMode="decimal"
                  onChange={(event) => setVoucherAmount(event.target.value)}
                  placeholder="0,00"
                  value={voucherAmount}
                />
              </label>
              <label className="cash-input">
                Bar erhalten
                <input
                  inputMode="decimal"
                  onChange={(event) => setCashReceived(event.target.value)}
                  placeholder={number.format(cashDue)}
                  value={cashReceived}
                />
                <button onClick={() => setCashReceived(number.format(cashDue))} type="button">
                  Rest passend
                </button>
              </label>
            </div>
            {unusedVoucher > 0 ? (
              <p className="payment-note">
                {currency.format(unusedVoucher)} vom Gutschein werden nicht
                angerechnet.
              </p>
            ) : null}
            <div className="change-row">
              <span>Rückgeld</span>
              <strong>{currency.format(change)}</strong>
            </div>
            <button
              className="complete-button"
              disabled={!canComplete}
              onClick={completeSale}
              type="button"
            >
              Zahlung abschließen
            </button>
          </div>
        </aside>
        ) : null}
      </div>

      {customDraft ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Sonderpreis</p>
                <h2>{customDraft.name}</h2>
              </div>
              <button onClick={() => setCustomDraft(null)} type="button">
                ×
              </button>
            </div>
            <label>
              Name
              <input
                onChange={(event) =>
                  setCustomDraft({ ...customDraft, name: event.target.value })
                }
                value={customDraft.name}
              />
            </label>
            <label>
              Preis
              <input
                autoFocus
                inputMode="decimal"
                onChange={(event) =>
                  setCustomDraft({ ...customDraft, price: event.target.value })
                }
                placeholder="0,00"
                value={customDraft.price}
              />
            </label>
            <div className="payment-tabs" aria-label="Steuersatz">
              {[0, 7, 19].map((rate) => (
                <button
                  className={customDraft.taxRate === rate ? "active" : ""}
                  key={rate}
                  onClick={() => setCustomDraft({ ...customDraft, taxRate: rate })}
                  type="button"
                >
                  {rate}% MwSt.
                </button>
              ))}
            </div>
            <button className="complete-button" onClick={confirmCustomPrice} type="button">
              In den Warenkorb
            </button>
          </div>
        </div>
      ) : null}

      {lastReceipt ? (
        <div className="modal-backdrop receipt-modal" role="dialog" aria-modal="true">
          <div
            className="modal receipt-print"
            style={
              {
                "--receipt-width": `${receiptConfig.widthMm}mm`,
              } as React.CSSProperties
            }
          >
            <div className="modal-header no-print">
              <div>
                <p className="eyebrow">Bon</p>
                <h2>{lastReceipt.id}</h2>
              </div>
              <button onClick={() => setLastReceipt(null)} type="button">
                ×
              </button>
            </div>
            <div className="receipt">
              <h3>{receiptConfig.businessName}</h3>
              <p>{receiptConfig.addressLine}</p>
              <p>{new Date(lastReceipt.completedAt).toLocaleString("de-DE")}</p>
              <p>Bon: {lastReceipt.id}</p>
              <hr />
              {lastReceipt.lines.map((line) => (
                <div className="receipt-line" key={line.id}>
                  <span>
                    {line.qty} x {line.name}
                  </span>
                  <strong>{currency.format(line.qty * line.unitPrice)}</strong>
                </div>
              ))}
              <hr />
              {lastReceipt.discountAmount > 0 ? (
                <div className="receipt-line">
                  <span>{lastReceipt.discountLabel || "Rabatt"}</span>
                  <strong>-{currency.format(lastReceipt.discountAmount)}</strong>
                </div>
              ) : null}
              {lastReceipt.tip > 0 ? (
                <div className="receipt-line">
                  <span>Trinkgeld</span>
                  <strong>{currency.format(lastReceipt.tip)}</strong>
                </div>
              ) : null}
              <div className="receipt-line receipt-total">
                <span>Summe</span>
                <strong>{currency.format(lastReceipt.total)}</strong>
              </div>
              {receiptConfig.showTax
                ? lastReceipt.tax.map((row) => (
                    <div className="receipt-line small" key={row.rate}>
                      <span>MwSt. {row.rate}%</span>
                      <strong>{currency.format(row.tax)}</strong>
                    </div>
                  ))
                : null}
              <hr />
              {transactionPayments(lastReceipt).map((payment) => (
                <div className="receipt-line" key={payment.method}>
                  <span>{payment.method}</span>
                  <strong>{currency.format(payment.amount)}</strong>
                </div>
              ))}
              {lastReceipt.paid > lastReceipt.total ? (
                <div className="receipt-line">
                  <span>Erhalten</span>
                  <strong>{currency.format(lastReceipt.paid)}</strong>
                </div>
              ) : null}
              <div className="receipt-line">
                <span>Rückgeld</span>
                <strong>{currency.format(lastReceipt.change)}</strong>
              </div>
              {receiptConfig.showTseSimulation ? (
                <>
                  <hr />
                  <div className="tse-stamp">
                    {buildTseStampRows(lastReceipt, receiptConfig).map((row, index) =>
                      row.center !== undefined ? (
                        <strong key={`tse-${index}`}>{row.center}</strong>
                      ) : (
                        <span key={`tse-${index}`}>
                          <b>{row.label}</b> {row.value}
                        </span>
                      ),
                    )}
                  </div>
                </>
              ) : null}
              {receiptConfig.footerText.trim() ? (
                <p>{receiptConfig.footerText}</p>
              ) : null}
              <p className="receipt-note">
                Entwurf ohne TSE-Fiskalisierung. Nicht als produktives Kassensystem
                freigegeben.
              </p>
            </div>
            <div className="modal-actions no-print">
              <button
                disabled={!printerCharacteristic}
                onClick={() => printReceiptBluetooth(lastReceipt)}
                type="button"
              >
                Bluetooth drucken
              </button>
              <button onClick={() => window.print()} type="button">
                Bon drucken
              </button>
              <button onClick={() => setLastReceipt(null)} type="button">
                Schließen
              </button>
            </div>
          </div>
        </div>
      ) : null}
        </>
      ) : (
        <section className="login-screen" aria-label="Benutzeranmeldung">
          <div className="login-panel">
            <div>
              <p className="eyebrow">Anmeldung</p>
              <h1>{activeTenant.businessName}</h1>
            </div>
            <div className="login-status">
              <span>
                {deviceInfo
                  ? `${deviceInfo.label} · ${
                      deviceInfo.standalone ? "App-Modus" : "Browser-Modus"
                    }`
                  : "Gerät wird erkannt"}
              </span>
              <span>{notice}</span>
            </div>
            <div className="login-users">
              {users.filter((user) => user.active).length === 0 ? (
                <div className="empty-state">Keine aktiven Benutzer vorhanden</div>
              ) : (
                users
                  .filter((user) => user.active)
                  .map((user) => (
                    <button
                      className={
                        loginUserId === user.id
                          ? "login-user-button active"
                          : "login-user-button"
                      }
                      key={user.id}
                      onClick={() => {
                        setLoginUserId(user.id);
                        setLoginPassword("");
                        if (!user.requiresPassword) {
                          loginUser(user);
                        }
                      }}
                      type="button"
                    >
                      <strong>{user.username}</strong>
                      <span>{user.requiresPassword ? "Passwort" : "Direkt"}</span>
                    </button>
                  ))
              )}
            </div>
            {selectedLoginUser?.requiresPassword ? (
              <label className="login-password">
                Passwort / PIN
                <input
                  autoFocus
                  inputMode="numeric"
                  onChange={(event) => setLoginPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      loginUser();
                    }
                  }}
                  type="password"
                  value={loginPassword}
                />
              </label>
            ) : null}
            <div className="login-actions">
              <button
                className="complete-button"
                disabled={!selectedLoginUser}
                onClick={() => loginUser()}
                type="button"
              >
                Anmelden
              </button>
              <button className="admin-secondary" onClick={logoutTenant} type="button">
                Unternehmen wechseln
              </button>
              {installPrompt && !deviceInfo?.standalone ? (
                <button
                  className="admin-secondary"
                  onClick={installApp}
                  type="button"
                >
                  App installieren
                </button>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
