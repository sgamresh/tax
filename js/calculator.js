const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export const asCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const normalizeSlabs = (slabs) =>
  [...(slabs || [])]
    .map((slab) => ({
      min: toNumber(slab.min),
      max: slab.max === null ? null : toNumber(slab.max),
      rate: toNumber(slab.rate),
    }))
    .sort((a, b) => a.min - b.min);

const calculateHraExemption = (inputs) => {
  const basic = toNumber(inputs.basicSalary);
  const hraReceived = toNumber(inputs.hraReceived);
  const rentPaid = toNumber(inputs.rentPaidAnnually);
  const metroLimit = inputs.cityType === "metro" ? 0.5 * basic : 0.4 * basic;
  const rentMinusBasic = Math.max(0, rentPaid - 0.1 * basic);
  return Math.max(0, Math.min(hraReceived, metroLimit, rentMinusBasic));
};

const applyAgeExemptionShift = (slabs, selectedExemption) => {
  if (!slabs.length) return slabs;

  const firstZeroSlab = slabs.find((slab) => slab.rate === 0 && slab.min === 0 && slab.max !== null);
  if (!firstZeroSlab) return slabs;

  const defaultExemption = firstZeroSlab.max;
  const shift = Math.max(0, selectedExemption - defaultExemption);
  if (shift === 0) return slabs;

  return slabs.map((slab) => {
    const shifted = { ...slab };
    if (shifted.min >= defaultExemption) shifted.min += shift;
    if (shifted.max !== null && shifted.max >= defaultExemption) shifted.max += shift;
    return shifted;
  });
};

const calculateTaxFromSlabs = (taxableIncome, slabs) => {
  const breakdown = [];
  let tax = 0;

  for (const slab of slabs) {
    if (taxableIncome <= slab.min) continue;
    const upper = slab.max === null ? taxableIncome : Math.min(taxableIncome, slab.max);
    const amountInSlab = Math.max(0, upper - slab.min);
    if (!amountInSlab) continue;

    const slabTax = (amountInSlab * slab.rate) / 100;
    tax += slabTax;

    breakdown.push({
      slabMin: slab.min,
      slabMax: slab.max,
      rate: slab.rate,
      taxableAmount: amountInSlab,
      tax: slabTax,
    });
  }

  return { taxBeforeRebate: tax, slabBreakdown: breakdown };
};

const calculateSurcharge = (taxBase, taxableIncome, surchargeConfig) => {
  if (!surchargeConfig || !surchargeConfig.enabled || !Array.isArray(surchargeConfig.slabs)) {
    return { surcharge: 0, selectedRate: 0 };
  }

  const match = surchargeConfig.slabs
    .map((s) => ({ minIncome: toNumber(s.minIncome), rate: toNumber(s.rate) }))
    .sort((a, b) => a.minIncome - b.minIncome)
    .filter((s) => taxableIncome >= s.minIncome)
    .at(-1);

  if (!match) return { surcharge: 0, selectedRate: 0 };

  const surcharge = (taxBase * match.rate) / 100;
  return { surcharge, selectedRate: match.rate };
};

const clamp = (value, min = 0) => Math.max(min, value);

const calculateRegimeDeductions = (regimeKey, inputs, regimeConfig, settings) => {
  const rules = regimeConfig.deductionRules || {};
  const caps = settings?.deductionCaps || {};
  const standardDeductionInput = toNumber(inputs.standardDeduction);

  // Keep this override path so FY-level standard deduction updates can remain JSON-driven.
  const standardDeduction = standardDeductionInput > 0
    ? standardDeductionInput
    : toNumber(regimeConfig.standardDeduction);

  let hraExemption = 0;
  if (rules.allowHRA) {
    hraExemption = calculateHraExemption(inputs);
  }

  const employeePf = toNumber(inputs.employeePfContribution);
  const sec80C = toNumber(inputs.deduction80C) + employeePf;
  const sec80CCapped = rules.allow80C
    ? Math.min(sec80C, toNumber(caps.section80C) || sec80C)
    : 0;

  const sec80D = rules.allow80D
    ? Math.min(toNumber(inputs.deduction80D), toNumber(caps.section80D) || toNumber(inputs.deduction80D))
    : 0;

  const homeLoan = rules.allowHomeLoanInterest
    ? Math.min(toNumber(inputs.homeLoanInterest), toNumber(caps.homeLoanInterest) || toNumber(inputs.homeLoanInterest))
    : 0;

  const other = rules.allowOtherDeductions ? toNumber(inputs.otherDeductions) : 0;

  const professionalTax = regimeKey === "old" ? toNumber(inputs.professionalTax) : 0;

  const total = standardDeduction + hraExemption + sec80CCapped + sec80D + homeLoan + other + professionalTax;

  return {
    total,
    standardDeduction,
    hraExemption,
    sec80C: sec80CCapped,
    sec80D,
    homeLoan,
    other,
    professionalTax,
  };
};

const getRegimeSlabs = (regimeKey, regimeConfig, ageCategory) => {
  const slabs = normalizeSlabs(regimeConfig.slabs);

  if (regimeKey !== "old") return slabs;

  const ageExemption = toNumber(regimeConfig.basicExemptionByAge?.[ageCategory]);
  if (!ageExemption) return slabs;

  // Old regime age-based exemption is intentionally derived from JSON config for future FY changes.
  return applyAgeExemptionShift(slabs, ageExemption);
};

const calculateRebate = (taxBeforeRebate, taxableIncome, regimeConfig, includeRebate) => {
  const rebate = regimeConfig.rebate || {};
  if (!includeRebate || !rebate.enabled) return 0;
  if (taxableIncome > toNumber(rebate.incomeLimit)) return 0;
  return Math.min(taxBeforeRebate, toNumber(rebate.maxRebate));
};

const buildBreakdownText = (result) => {
  const lines = [];
  lines.push(`Gross income considered: ${asCurrency(result.grossIncome)}`);
  lines.push(`Taxable income: ${asCurrency(result.taxableIncome)}`);
  lines.push("Slab-wise tax:");
  if (!result.slabBreakdown.length) {
    lines.push("- No tax slabs applied (taxable income is zero or within exempt limits).");
  } else {
    result.slabBreakdown.forEach((row) => {
      const maxLabel = row.slabMax === null ? "Above" : asCurrency(row.slabMax);
      lines.push(
        `- ${asCurrency(row.slabMin)} to ${maxLabel} @ ${row.rate}% on ${asCurrency(row.taxableAmount)} = ${asCurrency(row.tax)}`
      );
    });
  }
  lines.push(`Tax before rebate: ${asCurrency(result.taxBeforeRebate)}`);
  lines.push(`Rebate applied: ${asCurrency(result.rebateApplied)}`);
  lines.push(`Surcharge (${result.surchargeRate}%): ${asCurrency(result.surcharge)}`);
  lines.push(`Cess (${result.cessPercent}%): ${asCurrency(result.cess)}`);
  lines.push(`Final tax payable: ${asCurrency(result.taxPayable)}`);
  return lines.join("\n");
};

const calculateRegime = (regimeKey, inputs, regimeConfig, settings) => {
  const monthlyBonusAnnual = toNumber(inputs.monthlyBonus) * 12;
  const grossIncome = clamp(toNumber(inputs.annualCtc) + monthlyBonusAnnual + toNumber(inputs.otherIncome));
  const deductions = calculateRegimeDeductions(regimeKey, inputs, regimeConfig, settings);
  const taxableIncome = clamp(grossIncome - deductions.total);

  const slabs = getRegimeSlabs(regimeKey, regimeConfig, inputs.ageCategory);
  const slabTax = calculateTaxFromSlabs(taxableIncome, slabs);
  const rebateApplied = calculateRebate(
    slabTax.taxBeforeRebate,
    taxableIncome,
    regimeConfig,
    inputs.includeRebate
  );

  const taxAfterRebate = clamp(slabTax.taxBeforeRebate - rebateApplied);

  // Surcharge is wired from JSON so higher-income rule changes can be applied without UI edits.
  const surchargeConfig = settings?.surcharge || regimeConfig?.surcharge;
  const surchargeResult = calculateSurcharge(taxAfterRebate, taxableIncome, surchargeConfig);

  const cessPercent = toNumber(regimeConfig.cessPercent ?? settings?.defaultCessPercent ?? 4);
  const cess = ((taxAfterRebate + surchargeResult.surcharge) * cessPercent) / 100;
  const taxPayable = clamp(taxAfterRebate + surchargeResult.surcharge + cess);

  const annualTakeHome = clamp(
    grossIncome - taxPayable - toNumber(inputs.employeePfContribution) - toNumber(inputs.professionalTax)
  );

  const monthlyTakeHome = annualTakeHome / 12;

  const result = {
    regime: regimeKey,
    grossIncome,
    deductions,
    taxableIncome,
    slabs,
    slabBreakdown: slabTax.slabBreakdown,
    taxBeforeRebate: slabTax.taxBeforeRebate,
    rebateApplied,
    surcharge: surchargeResult.surcharge,
    surchargeRate: surchargeResult.selectedRate,
    cessPercent,
    cess,
    taxPayable,
    annualTakeHome,
    monthlyTakeHome,
  };

  result.breakdownText = buildBreakdownText(result);
  return result;
};

export const compareRegimes = (inputs, configs) => {
  const oldResult = calculateRegime("old", inputs, configs.old, configs.settings);
  const newResult = calculateRegime("new", inputs, configs.new, configs.settings);

  const annualDifference = oldResult.annualTakeHome - newResult.annualTakeHome;
  const absoluteDiff = Math.abs(annualDifference);

  let betterRegime = "Tie";
  if (annualDifference > 0) betterRegime = "Old Regime";
  if (annualDifference < 0) betterRegime = "New Regime";

  return {
    oldResult,
    newResult,
    summary: {
      betterRegime,
      annualDifference,
      absoluteDiff,
      message:
        betterRegime === "Tie"
          ? "Both regimes give similar annual take-home in this estimate."
          : `${betterRegime} gives higher annual take-home by ${asCurrency(absoluteDiff)}.`,
    },
  };
};

export const validateInputs = (inputs) => {
  if (toNumber(inputs.annualCtc) <= 0) return "Annual CTC must be greater than 0.";
  if (toNumber(inputs.basicSalary) <= 0) return "Basic salary must be greater than 0.";
  if (toNumber(inputs.basicSalary) > toNumber(inputs.annualCtc) * 1.5) {
    return "Basic salary looks unusually high compared with CTC. Please verify.";
  }
  return "";
};
