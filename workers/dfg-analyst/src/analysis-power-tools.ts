// analysis-power-tools.ts - Power Tools Category Analysis Logic

import type { RepairPlan, PriceRange } from "./types";

export function calculateMinimumViableRepairPowerTools(condition: any): RepairPlan {
  const items: Array<{ item: string; cost: number; marketing_note?: string }> = [];

  // Battery replacement (if dead/missing/swollen)
  const batteryCondition = condition.battery_system?.condition;
  const batteryCount = condition.battery_system?.count || 0;

  if (batteryCondition === "dead" || batteryCondition === "swollen" || batteryCondition === "missing") {
    const voltage = condition.battery_system?.voltage || "20V";
    const costPerBattery =
      voltage === "60V" || voltage === "40V" ? 120 :
      voltage === "20V" || voltage === "18V" ? 60 :
      40; // 12V

    const batteriesToReplace = batteryCount > 0 ? batteryCount : 1;
    items.push({
      item: `Replace ${batteriesToReplace}x ${voltage} battery`,
      cost: batteriesToReplace * costPerBattery,
      marketing_note: "New battery included"
    });
  }

  // Charger (if missing and battery system exists)
  if (condition.charger_included === "no" && condition.power_source === "cordless") {
    items.push({ item: "Charger", cost: 35 });
  }

  // Chuck/blade replacement (if worn/damaged)
  if (condition.condition?.chuck_or_blade === "worn" || condition.condition?.chuck_or_blade === "damaged") {
    items.push({ item: "Chuck/blade replacement", cost: 25 });
  }

  // Deep cleaning (if heavy wear)
  if (condition.condition?.cosmetic === "heavy_wear") {
    items.push({ item: "Deep clean + detail", cost: 0, marketing_note: "Professionally cleaned" });
  }

  const grandTotal = items.reduce((sum, i) => sum + i.cost, 0);

  return {
    items,
    grand_total: grandTotal,
    assumptions: ["DIY labor", "Amazon/eBay parts pricing", "OEM batteries from liquidation"]
  };
}

export function lookupPowerToolComps(
  toolType: string,
  make: string | null,
  model: string | null,
  batteryVoltage: string | null
): PriceRange & { scarcity?: string } {
  // Normalize brand
  const brand = (make || "").toLowerCase();
  const isPremiumBrand = ["dewalt", "milwaukee", "makita", "bosch"].includes(brand);

  // Base pricing by tool type and brand tier
  let baseQuick = 0;
  let baseMarket = 0;
  let basePremium = 0;

  if (toolType === "combo_kit") {
    if (isPremiumBrand) {
      baseQuick = 150;
      baseMarket = 200;
      basePremium = 280;
    } else {
      baseQuick = 80;
      baseMarket = 120;
      basePremium = 160;
    }
  } else if (toolType === "drill" || toolType === "impact_driver") {
    if (isPremiumBrand) {
      baseQuick = 60;
      baseMarket = 90;
      basePremium = 130;
    } else {
      baseQuick = 30;
      baseMarket = 50;
      basePremium = 70;
    }
  } else if (toolType === "circular_saw" || toolType === "reciprocating_saw") {
    if (isPremiumBrand) {
      baseQuick = 70;
      baseMarket = 100;
      basePremium = 145;
    } else {
      baseQuick = 35;
      baseMarket = 55;
      basePremium = 80;
    }
  } else {
    // Other tools
    if (isPremiumBrand) {
      baseQuick = 50;
      baseMarket = 75;
      basePremium = 110;
    } else {
      baseQuick = 25;
      baseMarket = 40;
      basePremium = 60;
    }
  }

  // Voltage premium (higher voltage = more value)
  const voltageMultiplier =
    batteryVoltage === "60V" || batteryVoltage === "40V" ? 1.4 :
    batteryVoltage === "20V" || batteryVoltage === "18V" ? 1.2 :
    1.0; // 12V or corded

  return {
    quick_sale: Math.round(baseQuick * voltageMultiplier),
    market_rate: Math.round(baseMarket * voltageMultiplier),
    premium: Math.round(basePremium * voltageMultiplier),
    scarcity: isPremiumBrand ? "moderate" : "common"
  };
}
