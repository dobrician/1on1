"use client";

import { useCallback, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface PeriodValue {
  preset: string;
  startDate: Date;
  endDate: Date;
}

const PRESETS = [
  { value: "30d", label: "Last 30 days" },
  { value: "3mo", label: "Last 3 months" },
  { value: "6mo", label: "Last 6 months" },
  { value: "1yr", label: "Last year" },
  { value: "custom", label: "Custom range" },
] as const;

/**
 * Compute start/end dates from a preset string.
 */
export function periodToDateRange(preset: string): { startDate: Date; endDate: Date } {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "3mo":
      start.setMonth(start.getMonth() - 3);
      break;
    case "6mo":
      start.setMonth(start.getMonth() - 6);
      break;
    case "1yr":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setMonth(start.getMonth() - 3);
  }

  return { startDate: start, endDate: end };
}

interface PeriodSelectorProps {
  value: PeriodValue;
  onChange: (period: PeriodValue) => void;
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const isCustom = value.preset === "custom";

  const handlePresetChange = useCallback(
    (preset: string) => {
      if (preset === "custom") {
        onChange({ ...value, preset: "custom" });
      } else {
        const { startDate, endDate } = periodToDateRange(preset);
        onChange({ preset, startDate, endDate });
      }
    },
    [onChange, value],
  );

  const handleStartChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(e.target.value);
      if (!isNaN(date.getTime())) {
        onChange({ ...value, startDate: date });
      }
    },
    [onChange, value],
  );

  const handleEndChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(e.target.value);
      if (!isNaN(date.getTime())) {
        onChange({ ...value, endDate: date });
      }
    },
    [onChange, value],
  );

  const startStr = useMemo(
    () => value.startDate.toISOString().split("T")[0],
    [value.startDate],
  );
  const endStr = useMemo(
    () => value.endDate.toISOString().split("T")[0],
    [value.endDate],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Period</Label>
        <Select value={value.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isCustom && (
        <>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={startStr}
              onChange={handleStartChange}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={endStr}
              onChange={handleEndChange}
              className="w-[160px]"
            />
          </div>
        </>
      )}
    </div>
  );
}
