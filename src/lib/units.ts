import type { Enums } from "@/types/database.types";

export type UnitType = Enums<"unit_type">;

export const UNIT_TYPE_VALUES = [
  "unit",
  "m2",
  "m3",
  "linear_m",
  "hour",
  "day",
] as const satisfies readonly UnitType[];

export interface UnitOption {
  value: UnitType;
  label: string;
  shortLabel: string;
}

export const UNIT_OPTIONS: readonly UnitOption[] = [
  { value: "unit", label: "Unidade (un)", shortLabel: "un" },
  { value: "m2", label: "Metro quadrado (m²)", shortLabel: "m²" },
  { value: "m3", label: "Metro cúbico (m³)", shortLabel: "m³" },
  { value: "linear_m", label: "Metro linear (m)", shortLabel: "m" },
  { value: "hour", label: "Hora (h)", shortLabel: "h" },
  { value: "day", label: "Diária (dia)", shortLabel: "dia" },
] as const;

const UNIT_SHORT_MAP: Record<UnitType, string> = {
  unit: "un",
  m2: "m²",
  m3: "m³",
  linear_m: "m",
  hour: "h",
  day: "dia",
};

const UNIT_LABEL_MAP: Record<UnitType, string> = {
  unit: "Unidade (un)",
  m2: "Metro quadrado (m²)",
  m3: "Metro cúbico (m³)",
  linear_m: "Metro linear (m)",
  hour: "Hora (h)",
  day: "Diária (dia)",
};

export function formatUnitShort(unit: UnitType): string {
  return UNIT_SHORT_MAP[unit];
}

export function formatUnitLabel(unit: UnitType): string {
  return UNIT_LABEL_MAP[unit];
}
