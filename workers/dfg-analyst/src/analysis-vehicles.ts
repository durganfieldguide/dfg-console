// analysis-vehicles.ts - Vehicle Market Data and Repair Logic

import type { PriceRange } from "./types";

// Vehicle condition type for this module
interface VehicleCondition {
  year?: number | null;
  make?: string | null;
  model?: string | null;
  mileage?: number | null;
  title_status?: string;
  drive_status?: string;
  tires?: { condition?: string };
  mechanical?: {
    engine_status?: string;
    transmission_status?: string;
    brakes?: string;
  };
  exterior?: {
    paint_condition?: string;
    body_damage?: string;
  };
}

// Phoenix vehicle market baseline values (conservative estimates)
// These are rough market rates for common vehicle types in Phoenix metro
// IMPORTANT: premium_mult and quick_mult must create meaningful spread (not just rounding)
const VEHICLE_BASELINES: Record<string, { base: number; premium_mult: number; quick_mult: number }> = {
  // Luxury SUVs - wider spreads due to variable buyer pool
  "land_rover": { base: 12000, premium_mult: 1.35, quick_mult: 0.70 },
  "range_rover": { base: 15000, premium_mult: 1.40, quick_mult: 0.65 },
  "lexus": { base: 10000, premium_mult: 1.30, quick_mult: 0.75 },
  "mercedes": { base: 11000, premium_mult: 1.35, quick_mult: 0.70 },
  "bmw": { base: 9000, premium_mult: 1.30, quick_mult: 0.72 },
  "audi": { base: 9000, premium_mult: 1.30, quick_mult: 0.72 },

  // Mainstream SUVs - tighter spreads due to consistent demand
  "toyota": { base: 10000, premium_mult: 1.25, quick_mult: 0.80 },
  "honda": { base: 9000, premium_mult: 1.25, quick_mult: 0.80 },
  "ford": { base: 7000, premium_mult: 1.30, quick_mult: 0.75 },
  "chevrolet": { base: 6500, premium_mult: 1.30, quick_mult: 0.75 },
  "jeep": { base: 8000, premium_mult: 1.35, quick_mult: 0.72 },
  "nissan": { base: 6000, premium_mult: 1.25, quick_mult: 0.78 },

  // Trucks - strong demand in AZ
  "truck_ford": { base: 12000, premium_mult: 1.30, quick_mult: 0.78 },
  "truck_chevrolet": { base: 11000, premium_mult: 1.30, quick_mult: 0.78 },
  "truck_toyota": { base: 15000, premium_mult: 1.25, quick_mult: 0.82 },
  "truck_ram": { base: 10000, premium_mult: 1.30, quick_mult: 0.75 },

  // Default fallback - wider spread for unknown vehicles
  "default": { base: 5000, premium_mult: 1.35, quick_mult: 0.70 }
};

// Mileage adjustment factors
function getMileageMultiplier(mileage: number | null | undefined): number {
  if (!mileage || mileage < 0) return 0.9; // Unknown = assume higher mileage
  if (mileage < 50000) return 1.15;
  if (mileage < 75000) return 1.05;
  if (mileage < 100000) return 1.00;
  if (mileage < 125000) return 0.90;
  if (mileage < 150000) return 0.80;
  if (mileage < 200000) return 0.65;
  return 0.50; // 200k+ is budget territory
}

// Year adjustment factors
function getYearMultiplier(year: number | null | undefined): number {
  if (!year) return 0.85; // Unknown = assume older
  const currentYear = new Date().getFullYear();
  const age = currentYear - year;

  if (age <= 3) return 1.30;
  if (age <= 5) return 1.15;
  if (age <= 8) return 1.00;
  if (age <= 12) return 0.85;
  if (age <= 15) return 0.70;
  return 0.55; // 15+ years old
}

// Title status adjustment
function getTitleMultiplier(titleStatus: string | undefined): number {
  if (!titleStatus || titleStatus === "unknown") return 0.85;
  switch (titleStatus.toLowerCase()) {
    case "clean": return 1.00;
    case "rebuilt": return 0.70;
    case "salvage": return 0.50;
    case "lien": return 0.90; // Assume lien will be cleared
    case "branded": return 0.65;
    default: return 0.85;
  }
}

// Condition adjustment
function getConditionMultiplier(condition: VehicleCondition): number {
  let mult = 1.0;

  // Engine/transmission issues are major
  if (condition.mechanical?.engine_status === "runs_rough") mult *= 0.85;
  if (condition.mechanical?.engine_status === "cranks_no_start") mult *= 0.60;
  if (condition.mechanical?.engine_status === "no_crank") mult *= 0.40;
  if (condition.mechanical?.transmission_status === "slips") mult *= 0.75;
  if (condition.mechanical?.transmission_status === "hard_shifts") mult *= 0.85;

  // Body damage
  if (condition.exterior?.body_damage === "major_dents") mult *= 0.90;
  if (condition.exterior?.body_damage === "collision_damage") mult *= 0.70;
  if (condition.exterior?.body_damage === "rust") mult *= 0.75;

  return mult;
}

export function lookupVehicleComps(
  make: string | null | undefined,
  model: string | null | undefined,
  year: number | null | undefined,
  mileage: number | null | undefined,
  titleStatus: string | undefined,
  condition: VehicleCondition
): PriceRange {
  // Determine base category
  const makeLower = (make || "").toLowerCase().replace(/\s+/g, "_");
  const modelLower = (model || "").toLowerCase();

  // Check for trucks first
  let baseline = VEHICLE_BASELINES["default"];
  if (modelLower.includes("f-150") || modelLower.includes("f150") || modelLower.includes("ranger")) {
    baseline = VEHICLE_BASELINES["truck_ford"];
  } else if (modelLower.includes("silverado") || modelLower.includes("colorado")) {
    baseline = VEHICLE_BASELINES["truck_chevrolet"];
  } else if (modelLower.includes("tacoma") || modelLower.includes("tundra")) {
    baseline = VEHICLE_BASELINES["truck_toyota"];
  } else if (modelLower.includes("ram") || modelLower.includes("1500") || modelLower.includes("2500")) {
    baseline = VEHICLE_BASELINES["truck_ram"];
  } else if (VEHICLE_BASELINES[makeLower]) {
    baseline = VEHICLE_BASELINES[makeLower];
  }

  // Apply all multipliers
  const yearMult = getYearMultiplier(year);
  const mileageMult = getMileageMultiplier(mileage);
  const titleMult = getTitleMultiplier(titleStatus);
  const conditionMult = getConditionMultiplier(condition);

  const adjustedBase = baseline.base * yearMult * mileageMult * titleMult * conditionMult;

  const market_rate = Math.round(adjustedBase / 100) * 100;
  const quick_sale = Math.round((adjustedBase * baseline.quick_mult) / 100) * 100;
  const premium = Math.round((adjustedBase * baseline.premium_mult) / 100) * 100;

  // Determine scarcity
  let scarcity: "common" | "moderate" | "scarce" | "unicorn" = "common";
  if (makeLower === "land_rover" || makeLower === "range_rover") {
    scarcity = "moderate"; // Luxury = fewer buyers but also fewer sellers
  }
  if (titleStatus === "clean" && mileage && mileage < 100000 && year && year >= new Date().getFullYear() - 8) {
    scarcity = "scarce"; // Low mileage, recent, clean title = premium
  }

  return {
    quick_sale,
    market_rate,
    premium,
    scarcity,
    note: `${make || "Unknown"} ${model || ""} - ${year || "?"} w/ ${mileage?.toLocaleString() || "unknown"} miles, ${titleStatus || "unknown"} title`
  };
}

interface RepairItem {
  item: string;
  cost: number;
  marketing_note?: string;
}

interface RepairPlan {
  items: RepairItem[];
  grand_total: number;
  assumptions: string[];
}

export function calculateMinimumViableRepairVehicles(condition: VehicleCondition): RepairPlan {
  const items: RepairItem[] = [];

  // Detailing is almost always worthwhile
  items.push({ item: "Detail (interior/exterior)", cost: 150, marketing_note: "Freshly detailed" });

  // Tires - only if clearly needed
  const tireCondition = condition.tires?.condition;
  if (tireCondition === "worn" || tireCondition === "bald" || tireCondition === "mismatched") {
    items.push({ item: "Replace tires (4x budget)", cost: 400 });
  }

  // Brakes - only if stated issue
  if (condition.mechanical?.brakes === "needs_service" || condition.mechanical?.brakes === "grinding") {
    items.push({ item: "Brake service (pads/rotors)", cost: 350 });
  }

  // Minor cosmetic
  if (condition.exterior?.body_damage === "minor_dents") {
    items.push({ item: "PDR (paintless dent repair)", cost: 200 });
  }

  // Don't include major mechanical repairs - those are deal killers, not repair items
  // The investor should walk away, not try to fix an engine

  const grandTotal = items.reduce((sum, i) => sum + i.cost, 0);

  return {
    items,
    grand_total: grandTotal,
    assumptions: ["DIY-friendly items only", "Phoenix metro pricing", "No major mechanical work (walk away instead)"]
  };
}
