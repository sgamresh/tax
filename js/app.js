import { compareRegimes, asCurrency, validateInputs } from "./calculator.js";
import {
  loadDefaultConfigs,
  getConfigs,
  setConfig,
  resetToDefaults,
  parseJsonText,
  importFiles,
  downloadConfig,
  downloadAllConfigs,
} from "./storage.js";

const els = {
  tabs: document.querySelectorAll(".tab-btn"),
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
  applyJsonBtn: document.getElementById("applyJsonBtn"),
  downloadAllBtn: document.getElementById("downloadAllBtn"),
  uploadJsonInput: document.getElementById("uploadJsonInput"),
  adminMessage: document.getElementById("adminMessage"),
  oldJsonEditor: document.getElementById("oldJsonEditor"),
  newJsonEditor: document.getElementById("newJsonEditor"),
  settingsJsonEditor: document.getElementById("settingsJsonEditor"),
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

const NUMERIC_SELECT_CONFIG = {
  annualCtc: {
    placeholder: "Select annual CTC",
    min: 300000,
    max: 10000000,
    step: 50000,
    extras: [1800000],
  },
  basicSalary: {
    placeholder: "Select basic salary",
    min: 120000,
    max: 4000000,
    step: 20000,
    extras: [720000],
  },
  hraReceived: {
    placeholder: "Select HRA (or 0)",
    min: 0,
    max: 2000000,
    step: 10000,
    extras: [300000],
  },
  rentPaidAnnually: {
    placeholder: "Select annual rent (or 0)",
    min: 0,
    max: 2000000,
    step: 10000,
    extras: [360000],
  },
  otherAllowances: {
    placeholder: "Select other allowances (or 0)",
    min: 0,
    max: 2000000,
    step: 10000,
    extras: [180000],
  },
  employerPfContribution: {
    placeholder: "Select employer PF (or 0)",
    min: 0,
    max: 400000,
    step: 5000,
    extras: [86400],
  },
  employeePfContribution: {
    placeholder: "Select employee PF (or 0)",
    min: 0,
    max: 400000,
    step: 5000,
    extras: [86400],
  },
  professionalTax: {
    placeholder: "Select professional tax (or 0)",
    min: 0,
    max: 50000,
    step: 200,
    extras: [2400],
  },
  standardDeduction: {
    placeholder: "Use FY default",
    min: 0,
    max: 100000,
    step: 5000,
    allowEmpty: true,
    extras: [50000, 75000],
  },
  deduction80C: {
    placeholder: "Select 80C deduction (or 0)",
    min: 0,
    max: 150000,
    step: 5000,
    extras: [150000],
  },
  deduction80D: {
    placeholder: "Select 80D deduction (or 0)",
    min: 0,
    max: 50000,
    step: 5000,
    extras: [25000],
  },
  homeLoanInterest: {
    placeholder: "Select home loan interest (or 0)",
    min: 0,
    max: 200000,
    step: 10000,
    extras: [200000],
  },
  otherDeductions: {
    placeholder: "Select other deductions (or 0)",
    min: 0,
    max: 300000,
    step: 10000,
  },
  monthlyBonus: {
    placeholder: "Select monthly bonus (or 0)",
    min: 0,
    max: 500000,
    step: 5000,
    extras: [15000],
  },
  otherIncome: {
    placeholder: "Select other income (or 0)",
    min: 0,
    max: 2000000,
    step: 10000,
    extras: [25000],
  },
};

const buildNumericOptionValues = (config) => {
  const values = new Set(config.extras || []);
  for (let value = config.min; value <= config.max; value += config.step) {
    values.add(value);
  }
  return [...values].sort((a, b) => a - b);
};

const populateNumericSelects = () => {
  const selects = els.form.querySelectorAll("select[data-options]");

  selects.forEach((select) => {
    const key = select.dataset.options;
    const config = NUMERIC_SELECT_CONFIG[key];
    if (!config) return;

    const optionValues = buildNumericOptionValues(config);
    const placeholder = `<option value="">${config.placeholder}</option>`;
    const options = optionValues
      .map((value) => {
        const suffix = value === 0 ? " (None)" : "";
        return `<option value="${value}">${formatInrNumber(value)}${suffix}</option>`;
      })
      .join("");

    select.innerHTML = `${placeholder}${options}`;
  });
};

const parseFormData = () => {
  const fd = new FormData(els.form);
  const data = Object.fromEntries(fd.entries());

  return {
    annualCtc: Number(data.annualCtc || 0),
    basicSalary: Number(data.basicSalary || 0),
    hraReceived: Number(data.hraReceived || 0),
    rentPaidAnnually: Number(data.rentPaidAnnually || 0),
    otherAllowances: Number(data.otherAllowances || 0),
    employerPfContribution: Number(data.employerPfContribution || 0),
    employeePfContribution: Number(data.employeePfContribution || 0),
    professionalTax: Number(data.professionalTax || 0),
    standardDeduction: Number(data.standardDeduction || 0),
    deduction80C: Number(data.deduction80C || 0),
    deduction80D: Number(data.deduction80D || 0),
    homeLoanInterest: Number(data.homeLoanInterest || 0),
    otherDeductions: Number(data.otherDeductions || 0),
    ageCategory: data.ageCategory,
    cityType: data.cityType,
    includeRebate: data.includeRebate === "yes",
    monthlyBonus: Number(data.monthlyBonus || 0),
    otherIncome: Number(data.otherIncome || 0),
  };
};

const metricRow = (label, value) => `
  <div class="metric">
    <span>${label}</span>
    <strong>${value}</strong>
  </div>
`;

const renderRegimeCard = (title, result) => {
  return `
    <h3>${title}</h3>
    <div class="metric-list">
      ${metricRow("Gross Annual Salary", asCurrency(result.grossIncome))}
      ${metricRow("Taxable Income", asCurrency(result.taxableIncome))}
      ${metricRow("Tax Payable", asCurrency(result.taxPayable))}
      ${metricRow("Annual Take-home", asCurrency(result.annualTakeHome))}
      ${metricRow("Monthly In-hand", asCurrency(result.monthlyTakeHome))}
    </div>
    <details>
      <summary>View step-by-step tax breakdown</summary>
      <pre>${result.breakdownText}</pre>
    </details>
  `;
};

const renderRecommendation = (summary) => {
  const tone =
    summary.betterRegime === "Tie"
      ? "Both regimes are very close in this estimate."
      : `${summary.betterRegime} is better for your take-home.`;

  return `
    <h3>Recommendation: ${summary.betterRegime}</h3>
    <p>${tone}</p>
    <p><strong>Tax savings difference:</strong> ${asCurrency(summary.absoluteDiff)}</p>
    <p>${summary.message}</p>
  `;
};

const tableRow = (metric, oldValue, newValue) => `
  <tr>
    <td>${metric}</td>
    <td>${oldValue}</td>
    <td>${newValue}</td>
  </tr>
`;

const renderComparisonTable = (oldResult, newResult) => {
  const rows = [
    tableRow("Gross Annual Salary", asCurrency(oldResult.grossIncome), asCurrency(newResult.grossIncome)),
    tableRow("Taxable Income", asCurrency(oldResult.taxableIncome), asCurrency(newResult.taxableIncome)),
    tableRow("Tax Payable", asCurrency(oldResult.taxPayable), asCurrency(newResult.taxPayable)),
    tableRow("Monthly In-hand", asCurrency(oldResult.monthlyTakeHome), asCurrency(newResult.monthlyTakeHome)),
    tableRow("Annual Take-home", asCurrency(oldResult.annualTakeHome), asCurrency(newResult.annualTakeHome)),
    tableRow(
      "Rebate Applied",
      asCurrency(oldResult.rebateApplied),
      asCurrency(newResult.rebateApplied)
    ),
    tableRow("Cess", asCurrency(oldResult.cess), asCurrency(newResult.cess)),
  ];

  els.comparisonTableBody.innerHTML = rows.join("");
};

const renderMiniSummary = (oldResult, newResult) => {
  const diffMonthly = oldResult.monthlyTakeHome - newResult.monthlyTakeHome;
  const diffAnnual = oldResult.annualTakeHome - newResult.annualTakeHome;

  els.miniSummary.innerHTML = `
    <div class="mini-box">
      <h4>Old Regime</h4>
      <p>Monthly: <strong>${asCurrency(oldResult.monthlyTakeHome)}</strong></p>
      <p>Annual: <strong>${asCurrency(oldResult.annualTakeHome)}</strong></p>
    </div>
    <div class="mini-box">
      <h4>New Regime</h4>
      <p>Monthly: <strong>${asCurrency(newResult.monthlyTakeHome)}</strong></p>
      <p>Annual: <strong>${asCurrency(newResult.annualTakeHome)}</strong></p>
    </div>
    <div class="mini-box">
      <h4>Difference</h4>
      <p>Monthly: <strong>${asCurrency(Math.abs(diffMonthly))}</strong> ${diffMonthly >= 0 ? "(Old higher)" : "(New higher)"}</p>
      <p>Annual: <strong>${asCurrency(Math.abs(diffAnnual))}</strong> ${diffAnnual >= 0 ? "(Old higher)" : "(New higher)"}</p>
    </div>
  `;
};

const renderResults = (comparison) => {
  els.recommendationCard.innerHTML = renderRecommendation(comparison.summary);
  els.oldResultCard.innerHTML = renderRegimeCard("Old Regime", comparison.oldResult);
  els.newResultCard.innerHTML = renderRegimeCard("New Regime", comparison.newResult);
  renderComparisonTable(comparison.oldResult, comparison.newResult);
  renderMiniSummary(comparison.oldResult, comparison.newResult);
  els.resultsSection.classList.remove("hidden");
};

const setFormValues = (values) => {
  Object.entries(values).forEach(([key, value]) => {
    const field = els.form.elements.namedItem(key);
    if (!field) return;
    field.value = value;
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
  els.adminMessage.textContent = message;
  els.adminMessage.style.color = isError ? "var(--danger)" : "var(--subtle)";
};

const updateEditorsFromState = () => {
  const configs = getConfigs();
  els.oldJsonEditor.value = JSON.stringify(configs.old, null, 2);
  els.newJsonEditor.value = JSON.stringify(configs.new, null, 2);
  els.settingsJsonEditor.value = JSON.stringify(configs.settings, null, 2);
};

const applyEditorsToState = () => {
  const oldJson = parseJsonText(els.oldJsonEditor.value);
  const newJson = parseJsonText(els.newJsonEditor.value);
  const settingsJson = parseJsonText(els.settingsJsonEditor.value);

  setConfig("old", oldJson);
  setConfig("new", newJson);
  setConfig("settings", settingsJson);
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
  const storedTheme = localStorage.getItem("tax-theme");
  if (storedTheme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  els.themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    if (next === "light") {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("tax-theme", "light");
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("tax-theme", "dark");
    }
  });
};

const initEventListeners = () => {
  els.tabs.forEach((tab) => {
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

    const comparison = compareRegimes(inputs, getConfigs());
    renderResults(comparison);
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
    updateEditorsFromState();
    showAdminMessage("Default FY slab config restored.");
  });

  els.reloadDefaultsBtn.addEventListener("click", () => {
    resetToDefaults();
    updateEditorsFromState();
    showAdminMessage("Default FY slab config restored in editors.");
  });

  els.applyJsonBtn.addEventListener("click", () => {
    try {
      applyEditorsToState();
      showAdminMessage("Updated JSON applied successfully.");
    } catch (error) {
      showAdminMessage(error.message, true);
    }
  });

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

  els.uploadJsonInput.addEventListener("change", async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      const types = await importFiles(files);
      updateEditorsFromState();
      showAdminMessage(`Uploaded and applied: ${types.join(", ")}.`);
    } catch (error) {
      showAdminMessage(error.message, true);
    } finally {
      event.target.value = "";
    }
  });

  els.printBtn.addEventListener("click", () => window.print());
};

const init = async () => {
  await loadDefaultConfigs();
  populateNumericSelects();
  updateEditorsFromState();
  setupTheme();
  initEventListeners();
};

init();
