import { compareRegimes, asCurrency, validateInputs } from "./calculator.js";
import {
  loadDefaultConfigs,
  getConfigs,
  setConfigs,
  resetToDefaults,
  saveConfigsToLocalServer,
  downloadConfig,
  downloadAllConfigs,
} from "./storage.js";

const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

const els = {
  tabs: document.querySelectorAll(".tab-btn"),
  adminTabButton: document.querySelector('.tab-btn[data-tab="admin"]'),
  panels: {
    calculator: document.getElementById("calculatorTab"),
    admin: document.getElementById("adminTab"),
  },
  themeToggle: document.getElementById("themeToggle"),
  printBtn: document.getElementById("printBtn"),
  form: document.getElementById("salaryForm"),
  formError: document.getElementById("formError"),
  resultsSection: document.getElementById("resultsSection"),
  recommendationCard: document.getElementById("recommendationCard"),
  oldResultCard: document.getElementById("oldResultCard"),
  newResultCard: document.getElementById("newResultCard"),
  comparisonTableBody: document.querySelector("#comparisonTable tbody"),
  miniSummary: document.getElementById("miniSummary"),
  resetBtn: document.getElementById("resetBtn"),
  sampleBtn: document.getElementById("sampleBtn"),
  useDefaultsBtn: document.getElementById("useDefaultsBtn"),
  reloadDefaultsBtn: document.getElementById("reloadDefaultsBtn"),
  saveConfigBtn: document.getElementById("saveConfigBtn"),
  downloadAllBtn: document.getElementById("downloadAllBtn"),
  adminMessage: document.getElementById("adminMessage"),
  perFileDownloadButtons: document.querySelectorAll("[data-download]"),
};

const SAMPLE_INPUTS = {
  annualCtc: 1800000,
  basicSalary: 720000,
  hraReceived: 300000,
  rentPaidAnnually: 360000,
  otherAllowances: 180000,
  employerPfContribution: 86400,
  employeePfContribution: 86400,
  professionalTax: 2400,
  standardDeduction: "",
  deduction80C: 150000,
  deduction80D: 25000,
  homeLoanInterest: 200000,
  otherDeductions: 0,
  ageCategory: "below60",
  cityType: "metro",
  includeRebate: "yes",
  monthlyBonus: 15000,
  otherIncome: 25000,
};

const formatInrNumber = (value) => new Intl.NumberFormat("en-IN").format(value);
const toNumber = (value) => Number(value || 0);
const toFixedIfNeeded = (value) => (Number.isInteger(value) ? String(value) : value.toFixed(2));

const formatCompactIndian = (value) => {
  if (value >= 10000000) return `${toFixedIfNeeded(value / 10000000)} crore`;
  if (value >= 100000) return `${toFixedIfNeeded(value / 100000)} lakh`;
  if (value >= 1000) return `${toFixedIfNeeded(value / 1000)} thousand`;
  return `${value}`;
};

const NUMERIC_SELECT_CONFIG = {
  annualCtc: { placeholder: "Select annual CTC", min: 300000, max: 10000000, step: 50000, extras: [1800000] },
  basicSalary: { placeholder: "Select basic salary", min: 120000, max: 4000000, step: 20000, extras: [720000] },
  hraReceived: { placeholder: "Select HRA (or 0)", min: 0, max: 2000000, step: 10000, extras: [300000] },
  rentPaidAnnually: { placeholder: "Select annual rent (or 0)", min: 0, max: 2000000, step: 10000, extras: [360000] },
  otherAllowances: { placeholder: "Select other allowances (or 0)", min: 0, max: 2000000, step: 10000, extras: [180000] },
  employerPfContribution: { placeholder: "Select employer PF (or 0)", min: 0, max: 400000, step: 5000, extras: [86400] },
  employeePfContribution: { placeholder: "Select employee PF (or 0)", min: 0, max: 400000, step: 5000, extras: [86400] },
  professionalTax: { placeholder: "Select professional tax (or 0)", min: 0, max: 50000, step: 200, extras: [2400] },
  standardDeduction: { placeholder: "Use FY default", min: 0, max: 100000, step: 5000, extras: [50000, 75000] },
  deduction80C: { placeholder: "Select 80C deduction (or 0)", min: 0, max: 150000, step: 5000, extras: [150000] },
  deduction80D: { placeholder: "Select 80D deduction (or 0)", min: 0, max: 50000, step: 5000, extras: [25000] },
  homeLoanInterest: { placeholder: "Select home loan interest (or 0)", min: 0, max: 200000, step: 10000, extras: [200000] },
  otherDeductions: { placeholder: "Select other deductions (or 0)", min: 0, max: 300000, step: 10000 },
  monthlyBonus: { placeholder: "Select monthly bonus (or 0)", min: 0, max: 500000, step: 5000, extras: [15000] },
  otherIncome: { placeholder: "Select other income (or 0)", min: 0, max: 2000000, step: 10000, extras: [25000] },
};

const adminRefs = {
  old: {
    standardDeduction: document.getElementById("oldStandardDeduction"),
    cessPercent: document.getElementById("oldCessPercent"),
    rebateEnabled: document.getElementById("oldRebateEnabled"),
    rebateIncomeLimit: document.getElementById("oldRebateIncomeLimit"),
    rebateMax: document.getElementById("oldRebateMax"),
    exemptionBelow60: document.getElementById("oldExemptionBelow60"),
    exemption60to80: document.getElementById("oldExemption60to80"),
    exemptionAbove80: document.getElementById("oldExemptionAbove80"),
    allow80C: document.getElementById("oldAllow80C"),
    allow80D: document.getElementById("oldAllow80D"),
    allowHRA: document.getElementById("oldAllowHRA"),
    allowHomeLoan: document.getElementById("oldAllowHomeLoan"),
    allowOtherDeductions: document.getElementById("oldAllowOtherDeductions"),
    surchargeEnabled: document.getElementById("oldSurchargeEnabled"),
    slabsEditor: document.getElementById("oldSlabsEditor"),
    surchargeEditor: document.getElementById("oldSurchargeEditor"),
    addSlabBtn: document.getElementById("addOldSlabBtn"),
    addSurchargeBtn: document.getElementById("addOldSurchargeBtn"),
  },
  new: {
    standardDeduction: document.getElementById("newStandardDeduction"),
    cessPercent: document.getElementById("newCessPercent"),
    rebateEnabled: document.getElementById("newRebateEnabled"),
    rebateIncomeLimit: document.getElementById("newRebateIncomeLimit"),
    rebateMax: document.getElementById("newRebateMax"),
    allow80C: document.getElementById("newAllow80C"),
    allow80D: document.getElementById("newAllow80D"),
    allowHRA: document.getElementById("newAllowHRA"),
    allowHomeLoan: document.getElementById("newAllowHomeLoan"),
    allowOtherDeductions: document.getElementById("newAllowOtherDeductions"),
    surchargeEnabled: document.getElementById("newSurchargeEnabled"),
    slabsEditor: document.getElementById("newSlabsEditor"),
    surchargeEditor: document.getElementById("newSurchargeEditor"),
    addSlabBtn: document.getElementById("addNewSlabBtn"),
    addSurchargeBtn: document.getElementById("addNewSurchargeBtn"),
  },
  settings: {
    financialYearLabel: document.getElementById("settingsFinancialYearLabel"),
    defaultCessPercent: document.getElementById("settingsDefaultCessPercent"),
    cap80C: document.getElementById("settingsCap80C"),
    cap80D: document.getElementById("settingsCap80D"),
    capHomeLoan: document.getElementById("settingsCapHomeLoan"),
    surchargeEnabled: document.getElementById("settingsSurchargeEnabled"),
    surchargeEditor: document.getElementById("settingsSurchargeEditor"),
    addSurchargeBtn: document.getElementById("addSettingsSurchargeBtn"),
  },
};

const createSlabRow = (type = "tax", values = {}) => {
  const minKey = type === "tax" ? "min" : "minIncome";
  const maxCell =
    type === "tax"
      ? `<input type="number" class="slab-max" min="0" step="1000" value="${values.max ?? ""}" placeholder="Max (blank = no limit)" />`
      : "";

  const row = document.createElement("div");
  row.className = "slab-row";
  row.innerHTML = `
    <input type="number" class="slab-min" min="0" step="1000" value="${values[minKey] ?? 0}" placeholder="${minKey}" />
    ${maxCell || '<input type="hidden" class="slab-max" value="" />'}
    <input type="number" class="slab-rate" min="0" step="0.1" value="${values.rate ?? 0}" placeholder="Rate %" />
    <button type="button" class="small-btn remove-slab-btn">Remove</button>
  `;
  row.querySelector(".remove-slab-btn").addEventListener("click", () => row.remove());
  return row;
};

const readSlabRows = (container, type = "tax") => {
  const rows = Array.from(container.querySelectorAll(".slab-row"));
  const minKey = type === "tax" ? "min" : "minIncome";

  return rows.map((row) => {
    const min = toNumber(row.querySelector(".slab-min")?.value);
    const rate = toNumber(row.querySelector(".slab-rate")?.value);
    if (type === "surcharge") return { [minKey]: min, rate };
    const maxRaw = row.querySelector(".slab-max")?.value;
    return { min, max: maxRaw === "" ? null : toNumber(maxRaw), rate };
  });
};

const renderSlabRows = (container, values, type = "tax") => {
  container.innerHTML = "";
  (values || []).forEach((item) => container.appendChild(createSlabRow(type, item)));
  if (!container.children.length) container.appendChild(createSlabRow(type, {}));
};

const buildNumericOptionValues = (config) => {
  const values = new Set(config.extras || []);
  for (let value = config.min; value <= config.max; value += config.step) values.add(value);
  return [...values].sort((a, b) => a - b);
};

const populateNumericSelects = () => {
  const selects = els.form.querySelectorAll("select[data-options]");
  selects.forEach((select) => {
    const config = NUMERIC_SELECT_CONFIG[select.dataset.options];
    if (!config) return;
    const optionValues = buildNumericOptionValues(config);
    select.innerHTML = [
      `<option value="">${config.placeholder}</option>`,
      ...optionValues.map((value) => {
        if (value === 0) return `<option value="0">0 (None)</option>`;
        return `<option value="${value}">${formatInrNumber(value)} (${formatCompactIndian(value)})</option>`;
      }),
    ].join("");
  });
};

const parseFormData = () => {
  const fd = new FormData(els.form);
  const data = Object.fromEntries(fd.entries());
  return {
    annualCtc: toNumber(data.annualCtc),
    basicSalary: toNumber(data.basicSalary),
    hraReceived: toNumber(data.hraReceived),
    rentPaidAnnually: toNumber(data.rentPaidAnnually),
    otherAllowances: toNumber(data.otherAllowances),
    employerPfContribution: toNumber(data.employerPfContribution),
    employeePfContribution: toNumber(data.employeePfContribution),
    professionalTax: toNumber(data.professionalTax),
    standardDeduction: toNumber(data.standardDeduction),
    deduction80C: toNumber(data.deduction80C),
    deduction80D: toNumber(data.deduction80D),
    homeLoanInterest: toNumber(data.homeLoanInterest),
    otherDeductions: toNumber(data.otherDeductions),
    ageCategory: data.ageCategory,
    cityType: data.cityType,
    includeRebate: data.includeRebate === "yes",
    monthlyBonus: toNumber(data.monthlyBonus),
    otherIncome: toNumber(data.otherIncome),
  };
};

const metricRow = (label, value) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
const tableRow = (metric, oldValue, newValue, oldClass = "", newClass = "") =>
  `<tr><td>${metric}</td><td class="${oldClass}">${oldValue}</td><td class="${newClass}">${newValue}</td></tr>`;

const renderResults = (comparison) => {
  const { oldResult, newResult, summary } = comparison;
  els.recommendationCard.innerHTML = `
    <h3>Recommendation: ${summary.betterRegime}</h3>
    <p>${summary.betterRegime === "Tie" ? "Both regimes are very close in this estimate." : `${summary.betterRegime} is better for your take-home.`}</p>
    <p><strong>Tax savings difference:</strong> ${asCurrency(summary.absoluteDiff)}</p>
    <p>${summary.message}</p>
  `;

  const renderRegimeCard = (title, result) => `
    <h3>${title}</h3>
    <div class="metric-list">
      ${metricRow("Gross Annual Salary", asCurrency(result.grossIncome))}
      ${metricRow("Taxable Income", asCurrency(result.taxableIncome))}
      ${metricRow("Tax Payable", asCurrency(result.taxPayable))}
      ${metricRow("Annual Take-home", asCurrency(result.annualTakeHome))}
      ${metricRow("Monthly In-hand", asCurrency(result.monthlyTakeHome))}
    </div>
    <details><summary>View step-by-step tax breakdown</summary><pre>${result.breakdownText}</pre></details>
  `;

  els.oldResultCard.innerHTML = renderRegimeCard("Old Regime", oldResult);
  els.newResultCard.innerHTML = renderRegimeCard("New Regime", newResult);

  els.oldResultCard.classList.remove("regime-better", "regime-worse");
  els.newResultCard.classList.remove("regime-better", "regime-worse");
  if (summary.betterRegime === "Old Regime") {
    els.oldResultCard.classList.add("regime-better");
    els.newResultCard.classList.add("regime-worse");
  } else if (summary.betterRegime === "New Regime") {
    els.newResultCard.classList.add("regime-better");
    els.oldResultCard.classList.add("regime-worse");
  }

  const oldWinClass = summary.betterRegime === "Old Regime" ? "value-better" : summary.betterRegime === "New Regime" ? "value-worse" : "";
  const newWinClass = summary.betterRegime === "New Regime" ? "value-better" : summary.betterRegime === "Old Regime" ? "value-worse" : "";

  els.comparisonTableBody.innerHTML = [
    tableRow("Gross Annual Salary", asCurrency(oldResult.grossIncome), asCurrency(newResult.grossIncome)),
    tableRow("Taxable Income", asCurrency(oldResult.taxableIncome), asCurrency(newResult.taxableIncome)),
    tableRow("Tax Payable", asCurrency(oldResult.taxPayable), asCurrency(newResult.taxPayable), oldResult.taxPayable <= newResult.taxPayable ? "value-better" : "value-worse", newResult.taxPayable <= oldResult.taxPayable ? "value-better" : "value-worse"),
    tableRow("Monthly In-hand", asCurrency(oldResult.monthlyTakeHome), asCurrency(newResult.monthlyTakeHome), oldWinClass, newWinClass),
    tableRow("Annual Take-home", asCurrency(oldResult.annualTakeHome), asCurrency(newResult.annualTakeHome), oldWinClass, newWinClass),
    tableRow("Rebate Applied", asCurrency(oldResult.rebateApplied), asCurrency(newResult.rebateApplied)),
    tableRow("Cess", asCurrency(oldResult.cess), asCurrency(newResult.cess)),
  ].join("");

  const diffMonthly = oldResult.monthlyTakeHome - newResult.monthlyTakeHome;
  const diffAnnual = oldResult.annualTakeHome - newResult.annualTakeHome;
  els.miniSummary.innerHTML = `
    <div class="mini-box"><h4>Old Regime</h4><p>Monthly: <strong>${asCurrency(oldResult.monthlyTakeHome)}</strong></p><p>Annual: <strong>${asCurrency(oldResult.annualTakeHome)}</strong></p></div>
    <div class="mini-box"><h4>New Regime</h4><p>Monthly: <strong>${asCurrency(newResult.monthlyTakeHome)}</strong></p><p>Annual: <strong>${asCurrency(newResult.annualTakeHome)}</strong></p></div>
    <div class="mini-box"><h4>Difference</h4><p>Monthly: <strong>${asCurrency(Math.abs(diffMonthly))}</strong> ${diffMonthly >= 0 ? "(Old higher)" : "(New higher)"}</p><p>Annual: <strong>${asCurrency(Math.abs(diffAnnual))}</strong> ${diffAnnual >= 0 ? "(Old higher)" : "(New higher)"}</p></div>
  `;
  els.resultsSection.classList.remove("hidden");
};

const setFormValues = (values) => {
  Object.entries(values).forEach(([key, value]) => {
    const field = els.form.elements.namedItem(key);
    if (field) field.value = value;
  });
};

const clearResults = () => {
  els.resultsSection.classList.add("hidden");
  els.oldResultCard.innerHTML = "";
  els.newResultCard.innerHTML = "";
  els.recommendationCard.innerHTML = "";
  els.comparisonTableBody.innerHTML = "";
  els.miniSummary.innerHTML = "";
};

const showAdminMessage = (message, isError = false) => {
  if (!els.adminMessage) return;
  els.adminMessage.textContent = message;
  els.adminMessage.style.color = isError ? "var(--danger)" : "var(--subtle)";
};

const assertNonNegative = (value, label) => {
  if (value < 0) throw new Error(`${label} cannot be negative.`);
};

const validateTaxSlabs = (slabs, label) => {
  if (!Array.isArray(slabs) || slabs.length === 0) throw new Error(`${label} must have at least one slab.`);
  const sorted = [...slabs].sort((a, b) => a.min - b.min);
  if (sorted[0].min !== 0) throw new Error(`${label} first slab must start at 0.`);

  for (let i = 0; i < sorted.length; i += 1) {
    const slab = sorted[i];
    assertNonNegative(slab.min, `${label} slab min`);
    assertNonNegative(slab.rate, `${label} slab rate`);
    if (slab.rate > 100) throw new Error(`${label} slab rate cannot exceed 100%.`);

    if (slab.max !== null) {
      assertNonNegative(slab.max, `${label} slab max`);
      if (slab.max <= slab.min) throw new Error(`${label} slab max must be greater than min.`);
    }

    const next = sorted[i + 1];
    if (next) {
      if (slab.max === null) throw new Error(`${label} only last slab can have blank max.`);
      if (next.min < slab.max) throw new Error(`${label} slabs overlap. Fix min/max ranges.`);
      if (next.min > slab.max) throw new Error(`${label} slabs have gaps. Make next min equal current max.`);
    }
  }
};

const validateSurchargeSlabs = (slabs, label) => {
  const sorted = [...(slabs || [])].sort((a, b) => a.minIncome - b.minIncome);
  for (let i = 0; i < sorted.length; i += 1) {
    const slab = sorted[i];
    assertNonNegative(slab.minIncome, `${label} min income`);
    assertNonNegative(slab.rate, `${label} rate`);
    if (slab.rate > 100) throw new Error(`${label} rate cannot exceed 100%.`);
    if (i > 0 && slab.minIncome <= sorted[i - 1].minIncome) {
      throw new Error(`${label} min incomes must be strictly increasing.`);
    }
  }
};

const validateAdminConfigs = (configs) => {
  assertNonNegative(configs.old.standardDeduction, "Old regime standard deduction");
  assertNonNegative(configs.new.standardDeduction, "New regime standard deduction");
  assertNonNegative(configs.settings.defaultCessPercent, "Settings default cess percent");
  assertNonNegative(configs.settings.deductionCaps.section80C, "80C cap");
  assertNonNegative(configs.settings.deductionCaps.section80D, "80D cap");
  assertNonNegative(configs.settings.deductionCaps.homeLoanInterest, "Home loan interest cap");
  validateTaxSlabs(configs.old.slabs, "Old regime tax slabs");
  validateTaxSlabs(configs.new.slabs, "New regime tax slabs");
  validateSurchargeSlabs(configs.old.surcharge.slabs, "Old regime surcharge slabs");
  validateSurchargeSlabs(configs.new.surcharge.slabs, "New regime surcharge slabs");
  validateSurchargeSlabs(configs.settings.surcharge.slabs, "Settings surcharge slabs");
};

const setActiveTab = (tabKey) => {
  els.tabs.forEach((tab) => {
    const active = tab.dataset.tab === tabKey;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  Object.entries(els.panels).forEach(([key, panel]) => {
    const active = key === tabKey;
    panel.classList.toggle("active", active);
    panel.setAttribute("aria-hidden", String(!active));
  });
};

const setupTheme = () => {
  if (localStorage.getItem("tax-theme") === "dark") document.documentElement.setAttribute("data-theme", "dark");
  els.themeToggle.addEventListener("click", () => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("tax-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("tax-theme", "dark");
    }
  });
};

const renderAdminFormsFromState = () => {
  if (!isLocalhost) return;
  const configs = getConfigs();

  adminRefs.old.standardDeduction.value = toNumber(configs.old.standardDeduction);
  adminRefs.old.cessPercent.value = toNumber(configs.old.cessPercent);
  adminRefs.old.rebateEnabled.value = String(Boolean(configs.old.rebate?.enabled));
  adminRefs.old.rebateIncomeLimit.value = toNumber(configs.old.rebate?.incomeLimit);
  adminRefs.old.rebateMax.value = toNumber(configs.old.rebate?.maxRebate);
  adminRefs.old.exemptionBelow60.value = toNumber(configs.old.basicExemptionByAge?.below60);
  adminRefs.old.exemption60to80.value = toNumber(configs.old.basicExemptionByAge?.age60to80);
  adminRefs.old.exemptionAbove80.value = toNumber(configs.old.basicExemptionByAge?.above80);
  adminRefs.old.allow80C.checked = Boolean(configs.old.deductionRules?.allow80C);
  adminRefs.old.allow80D.checked = Boolean(configs.old.deductionRules?.allow80D);
  adminRefs.old.allowHRA.checked = Boolean(configs.old.deductionRules?.allowHRA);
  adminRefs.old.allowHomeLoan.checked = Boolean(configs.old.deductionRules?.allowHomeLoanInterest);
  adminRefs.old.allowOtherDeductions.checked = Boolean(configs.old.deductionRules?.allowOtherDeductions);
  adminRefs.old.surchargeEnabled.checked = Boolean(configs.old.surcharge?.enabled);
  renderSlabRows(adminRefs.old.slabsEditor, configs.old.slabs, "tax");
  renderSlabRows(adminRefs.old.surchargeEditor, configs.old.surcharge?.slabs, "surcharge");

  adminRefs.new.standardDeduction.value = toNumber(configs.new.standardDeduction);
  adminRefs.new.cessPercent.value = toNumber(configs.new.cessPercent);
  adminRefs.new.rebateEnabled.value = String(Boolean(configs.new.rebate?.enabled));
  adminRefs.new.rebateIncomeLimit.value = toNumber(configs.new.rebate?.incomeLimit);
  adminRefs.new.rebateMax.value = toNumber(configs.new.rebate?.maxRebate);
  adminRefs.new.allow80C.checked = Boolean(configs.new.deductionRules?.allow80C);
  adminRefs.new.allow80D.checked = Boolean(configs.new.deductionRules?.allow80D);
  adminRefs.new.allowHRA.checked = Boolean(configs.new.deductionRules?.allowHRA);
  adminRefs.new.allowHomeLoan.checked = Boolean(configs.new.deductionRules?.allowHomeLoanInterest);
  adminRefs.new.allowOtherDeductions.checked = Boolean(configs.new.deductionRules?.allowOtherDeductions);
  adminRefs.new.surchargeEnabled.checked = Boolean(configs.new.surcharge?.enabled);
  renderSlabRows(adminRefs.new.slabsEditor, configs.new.slabs, "tax");
  renderSlabRows(adminRefs.new.surchargeEditor, configs.new.surcharge?.slabs, "surcharge");

  adminRefs.settings.financialYearLabel.value = configs.settings.financialYearLabel || "";
  adminRefs.settings.defaultCessPercent.value = toNumber(configs.settings.defaultCessPercent);
  adminRefs.settings.cap80C.value = toNumber(configs.settings.deductionCaps?.section80C);
  adminRefs.settings.cap80D.value = toNumber(configs.settings.deductionCaps?.section80D);
  adminRefs.settings.capHomeLoan.value = toNumber(configs.settings.deductionCaps?.homeLoanInterest);
  adminRefs.settings.surchargeEnabled.value = String(Boolean(configs.settings.surcharge?.enabled));
  renderSlabRows(adminRefs.settings.surchargeEditor, configs.settings.surcharge?.slabs, "surcharge");
};

const buildConfigsFromAdminForms = () => {
  const current = getConfigs();
  return {
    old: {
      ...current.old,
      standardDeduction: toNumber(adminRefs.old.standardDeduction.value),
      cessPercent: toNumber(adminRefs.old.cessPercent.value),
      rebate: {
        enabled: adminRefs.old.rebateEnabled.value === "true",
        incomeLimit: toNumber(adminRefs.old.rebateIncomeLimit.value),
        maxRebate: toNumber(adminRefs.old.rebateMax.value),
      },
      basicExemptionByAge: {
        below60: toNumber(adminRefs.old.exemptionBelow60.value),
        age60to80: toNumber(adminRefs.old.exemption60to80.value),
        above80: toNumber(adminRefs.old.exemptionAbove80.value),
      },
      deductionRules: {
        allow80C: adminRefs.old.allow80C.checked,
        allow80D: adminRefs.old.allow80D.checked,
        allowHRA: adminRefs.old.allowHRA.checked,
        allowHomeLoanInterest: adminRefs.old.allowHomeLoan.checked,
        allowOtherDeductions: adminRefs.old.allowOtherDeductions.checked,
      },
      slabs: readSlabRows(adminRefs.old.slabsEditor, "tax"),
      surcharge: {
        enabled: adminRefs.old.surchargeEnabled.checked,
        slabs: readSlabRows(adminRefs.old.surchargeEditor, "surcharge"),
      },
    },
    new: {
      ...current.new,
      standardDeduction: toNumber(adminRefs.new.standardDeduction.value),
      cessPercent: toNumber(adminRefs.new.cessPercent.value),
      rebate: {
        enabled: adminRefs.new.rebateEnabled.value === "true",
        incomeLimit: toNumber(adminRefs.new.rebateIncomeLimit.value),
        maxRebate: toNumber(adminRefs.new.rebateMax.value),
      },
      deductionRules: {
        allow80C: adminRefs.new.allow80C.checked,
        allow80D: adminRefs.new.allow80D.checked,
        allowHRA: adminRefs.new.allowHRA.checked,
        allowHomeLoanInterest: adminRefs.new.allowHomeLoan.checked,
        allowOtherDeductions: adminRefs.new.allowOtherDeductions.checked,
      },
      slabs: readSlabRows(adminRefs.new.slabsEditor, "tax"),
      surcharge: {
        enabled: adminRefs.new.surchargeEnabled.checked,
        slabs: readSlabRows(adminRefs.new.surchargeEditor, "surcharge"),
      },
    },
    settings: {
      ...current.settings,
      financialYearLabel: adminRefs.settings.financialYearLabel.value.trim(),
      defaultCessPercent: toNumber(adminRefs.settings.defaultCessPercent.value),
      deductionCaps: {
        section80C: toNumber(adminRefs.settings.cap80C.value),
        section80D: toNumber(adminRefs.settings.cap80D.value),
        homeLoanInterest: toNumber(adminRefs.settings.capHomeLoan.value),
      },
      surcharge: {
        enabled: adminRefs.settings.surchargeEnabled.value === "true",
        slabs: readSlabRows(adminRefs.settings.surchargeEditor, "surcharge"),
      },
    },
  };
};

const wireAdminDynamicButtons = () => {
  if (!isLocalhost) return;
  adminRefs.old.addSlabBtn.addEventListener("click", () => adminRefs.old.slabsEditor.appendChild(createSlabRow("tax", {})));
  adminRefs.old.addSurchargeBtn.addEventListener("click", () => adminRefs.old.surchargeEditor.appendChild(createSlabRow("surcharge", {})));
  adminRefs.new.addSlabBtn.addEventListener("click", () => adminRefs.new.slabsEditor.appendChild(createSlabRow("tax", {})));
  adminRefs.new.addSurchargeBtn.addEventListener("click", () => adminRefs.new.surchargeEditor.appendChild(createSlabRow("surcharge", {})));
  adminRefs.settings.addSurchargeBtn.addEventListener("click", () => adminRefs.settings.surchargeEditor.appendChild(createSlabRow("surcharge", {})));
};

const enforceLocalhostAdminVisibility = () => {
  if (isLocalhost) return;
  if (els.adminTabButton) els.adminTabButton.style.display = "none";
  if (els.panels.admin) els.panels.admin.style.display = "none";
  setActiveTab("calculator");
};

const initEventListeners = () => {
  els.tabs.forEach((tab) => {
    if (!isLocalhost && tab.dataset.tab === "admin") return;
    tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
  });

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    els.formError.textContent = "";
    const inputs = parseFormData();
    const validationError = validateInputs(inputs);
    if (validationError) {
      els.formError.textContent = validationError;
      clearResults();
      return;
    }
    renderResults(compareRegimes(inputs, getConfigs()));
  });

  els.resetBtn.addEventListener("click", () => {
    els.form.reset();
    els.formError.textContent = "";
    clearResults();
  });

  els.sampleBtn.addEventListener("click", () => {
    setFormValues(SAMPLE_INPUTS);
    els.form.requestSubmit();
  });

  els.useDefaultsBtn.addEventListener("click", () => {
    resetToDefaults();
    if (isLocalhost) renderAdminFormsFromState();
    showAdminMessage("Default FY slab config restored.");
  });

  if (els.reloadDefaultsBtn) {
    els.reloadDefaultsBtn.addEventListener("click", () => {
      resetToDefaults();
      renderAdminFormsFromState();
      showAdminMessage("Default FY slab config restored in forms.");
    });
  }

  if (els.saveConfigBtn) {
    els.saveConfigBtn.addEventListener("click", async () => {
      if (!isLocalhost) {
        showAdminMessage("Saving is available only on localhost.", true);
        return;
      }
      try {
        const updated = buildConfigsFromAdminForms();
        validateAdminConfigs(updated);
        setConfigs(updated);
        await saveConfigsToLocalServer(updated);
        showAdminMessage("Saved successfully to local data/*.json files.");
      } catch (error) {
        showAdminMessage(error.message || "Could not save local config files.", true);
      }
    });
  }

  els.perFileDownloadButtons.forEach((button) => {
    button.addEventListener("click", () => {
      downloadConfig(button.dataset.download);
      showAdminMessage(`Downloaded ${button.dataset.download} config.`);
    });
  });

  els.downloadAllBtn.addEventListener("click", () => {
    downloadAllConfigs();
    showAdminMessage("Downloaded old-regime.json, new-regime.json, and settings.json.");
  });

  els.printBtn.addEventListener("click", () => window.print());
};

const init = async () => {
  await loadDefaultConfigs();
  populateNumericSelects();
  setupTheme();
  enforceLocalhostAdminVisibility();
  if (isLocalhost) {
    renderAdminFormsFromState();
    wireAdminDynamicButtons();
  }
  initEventListeners();
};

init();
