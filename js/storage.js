// Update these fallback values only when you want built-in FY defaults to change.
const FALLBACK_CONFIGS = {
  old: {
    regime: "old",
    standardDeduction: 50000,
    cessPercent: 4,
    rebate: {
      enabled: true,
      incomeLimit: 500000,
      maxRebate: 12500,
    },
    basicExemptionByAge: {
      below60: 250000,
      age60to80: 300000,
      above80: 500000,
    },
    slabs: [
      { min: 0, max: 250000, rate: 0 },
      { min: 250000, max: 500000, rate: 5 },
      { min: 500000, max: 1000000, rate: 20 },
      { min: 1000000, max: null, rate: 30 },
    ],
    deductionRules: {
      allow80C: true,
      allow80D: true,
      allowHRA: true,
      allowHomeLoanInterest: true,
      allowOtherDeductions: true,
    },
  },
  new: {
    regime: "new",
    standardDeduction: 75000,
    cessPercent: 4,
    rebate: {
      enabled: true,
      incomeLimit: 1200000,
      maxRebate: 60000,
    },
    basicExemption: 400000,
    slabs: [
      { min: 0, max: 400000, rate: 0 },
      { min: 400000, max: 800000, rate: 5 },
      { min: 800000, max: 1200000, rate: 10 },
      { min: 1200000, max: 1600000, rate: 15 },
      { min: 1600000, max: 2000000, rate: 20 },
      { min: 2000000, max: 2400000, rate: 25 },
      { min: 2400000, max: null, rate: 30 },
    ],
    deductionRules: {
      allow80C: false,
      allow80D: false,
      allowHRA: false,
      allowHomeLoanInterest: false,
      allowOtherDeductions: false,
    },
  },
  settings: {
    financialYearLabel: "FY 2025-26 Defaults",
    defaultCessPercent: 4,
    deductionCaps: {
      section80C: 150000,
      section80D: 50000,
      homeLoanInterest: 200000,
    },
    surcharge: {
      enabled: false,
      slabs: [
        { minIncome: 5000000, rate: 10 },
        { minIncome: 10000000, rate: 15 },
        { minIncome: 20000000, rate: 25 },
      ],
    },
    taxRuleReference: {
      assessmentYearLabel: "AY 2026-27",
      financialYearLabel: "FY 2025-26",
      applicableFrom: "2025-04-01",
      applicableTo: "2026-03-31",
      sources: [
        {
          label: "Income Tax Department: Salaried Individuals for AY 2026-27",
          url: "https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1",
        },
        {
          label: "Income Tax Department: Finance Bill 2025 and Budget Material",
          url: "https://incometaxindia.gov.in/Pages/budget-and-bills/finance-bills.aspx",
        },
      ],
    },
    disclaimers: [
      "For estimation only; not a legal tax opinion.",
      "Final payroll may vary by employer policy and tax interpretations.",
    ],
  },
};

const FILE_MAP = {
  old: "data/old-regime.json",
  new: "data/new-regime.json",
  settings: "data/settings.json",
};

let currentConfigs = structuredClone(FALLBACK_CONFIGS);
let defaultSnapshot = structuredClone(FALLBACK_CONFIGS);

const safeJsonFetch = async (path) => {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
};

export const loadDefaultConfigs = async () => {
  try {
    const [oldData, newData, settingsData] = await Promise.all([
      safeJsonFetch(FILE_MAP.old),
      safeJsonFetch(FILE_MAP.new),
      safeJsonFetch(FILE_MAP.settings),
    ]);

    currentConfigs = {
      old: oldData,
      new: newData,
      settings: settingsData,
    };

    defaultSnapshot = structuredClone(currentConfigs);
  } catch (_error) {
    currentConfigs = structuredClone(FALLBACK_CONFIGS);
    defaultSnapshot = structuredClone(FALLBACK_CONFIGS);
  }

  return structuredClone(currentConfigs);
};

export const getConfigs = () => structuredClone(currentConfigs);

export const setConfig = (key, config) => {
  if (!["old", "new", "settings"].includes(key)) {
    throw new Error("Unsupported config key");
  }
  currentConfigs[key] = structuredClone(config);
};

export const setConfigs = (configs) => {
  currentConfigs = structuredClone(configs);
};

export const resetToDefaults = () => {
  currentConfigs = structuredClone(defaultSnapshot);
  return getConfigs();
};

export const parseJsonText = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
};

export const detectConfigType = (json, fileName = "") => {
  const normalizedName = fileName.toLowerCase();

  if (json?.regime === "old" || normalizedName.includes("old")) return "old";
  if (json?.regime === "new" || normalizedName.includes("new")) return "new";
  if (
    normalizedName.includes("settings") ||
    Object.prototype.hasOwnProperty.call(json || {}, "financialYearLabel")
  ) {
    return "settings";
  }

  throw new Error(`Could not identify config type for file ${fileName || "(unknown)"}`);
};

export const applyConfigJson = (json, fileName = "") => {
  const type = detectConfigType(json, fileName);
  setConfig(type, json);
  return type;
};

const readTextFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Unable to read file: ${file.name}`));
    reader.readAsText(file);
  });

export const importFiles = async (files) => {
  const updatedTypes = [];

  for (const file of files) {
    const text = await readTextFile(file);
    const json = parseJsonText(text);
    const type = applyConfigJson(json, file.name);
    updatedTypes.push(type);
  }

  return Array.from(new Set(updatedTypes));
};

const downloadBlob = (text, fileName) => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const downloadConfig = (type) => {
  const fileName =
    type === "old" ? "old-regime.json" : type === "new" ? "new-regime.json" : "settings.json";

  downloadBlob(JSON.stringify(currentConfigs[type], null, 2), fileName);
};

export const downloadAllConfigs = () => {
  downloadConfig("old");
  downloadConfig("new");
  downloadConfig("settings");
};

export const saveConfigsToLocalServer = async (configs) => {
  const response = await fetch("save-config.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(configs),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok !== true) {
    throw new Error(payload.error || `Failed to save configs (${response.status})`);
  }

  currentConfigs = structuredClone(configs);
  return payload;
};

export const getDefaultSnapshot = () => structuredClone(defaultSnapshot);

export const getFallbackSnapshot = () => structuredClone(FALLBACK_CONFIGS);
