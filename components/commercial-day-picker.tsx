"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const COMMERCIAL_DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

export type CommercialDayPickerProps = {
  value: number | null;
  onChange: (day: number) => void;
  disabled?: boolean;
  /** Días ya elegidos en otras ranuras (no seleccionables). */
  excludedDays?: number[];
  /** No permitir días comerciales menores a este (p. ej. ranura anterior). */
  minDay?: number;
  placeholder?: string;
  id?: string;
};

export function CommercialDayPicker({
  value,
  onChange,
  disabled,
  excludedDays = [],
  minDay,
  placeholder = "Elegir día",
  id,
}: CommercialDayPickerProps) {
  const excluded = new Set(excludedDays);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            value == null && "text-muted-foreground",
          )}
        >
          {value != null ? `Día ${value}` : placeholder}
          <CalendarIcon className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <p className="text-xs text-muted-foreground mb-2 px-0.5">
          Mes comercial (1–30). Sin día 31.
          {minDay != null && (
            <>
              {" "}
              Mínimo: día {minDay}.
            </>
          )}
        </p>
        <div
          className="grid grid-cols-6 gap-1"
          role="grid"
          aria-label="Día del mes comercial"
        >
          {COMMERCIAL_DAYS.map((day) => {
            const isBelowMin = minDay != null && day < minDay;
            const isExcluded =
              (excluded.has(day) && day !== value) || isBelowMin;
            const isSelected = value === day;
            return (
              <Button
                key={day}
                type="button"
                variant={isSelected ? "default" : "ghost"}
                size="icon"
                disabled={isExcluded}
                className={cn(
                  "h-9 w-9 text-sm font-normal",
                  isExcluded && "opacity-30",
                )}
                onClick={() => {
                  onChange(day);
                  setOpen(false);
                }}
              >
                {day}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
