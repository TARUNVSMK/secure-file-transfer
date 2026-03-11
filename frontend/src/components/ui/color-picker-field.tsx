import { type KeyboardEvent, useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Color from "color";

import { Button } from "@/components/ui/button";
import {
  ColorPicker,
  ColorPickerEyeDropper,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ColorPickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const normalizeHex = (value: string) => {
  const parsed = Color(value.startsWith("#") ? value : `#${value}`);
  return parsed.hex().toLowerCase();
};

export const ColorPickerField = ({
  label,
  value,
  onChange,
  className,
}: ColorPickerFieldProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  const commitDraft = () => {
    try {
      const nextValue = normalizeHex(draftValue.trim());
      setDraftValue(nextValue);
      onChange(nextValue);
    } catch (error) {
      console.error("Invalid color input:", error);
      setDraftValue(value);
    }
  };

  const handlePickerChange = (rgba: [number, number, number, number]) => {
    const [red, green, blue] = rgba;
    const nextValue = Color.rgb(red, green, blue).hex().toLowerCase();
    setDraftValue(nextValue);
    onChange(nextValue);
  };

  const handleManualKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
    }
  };

  return (
    <div
      className={cn(
        "color-picker-field rounded-[1.1rem] border border-white/10 bg-white/[0.05] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.18)]",
        className
      )}
    >
      <div className="color-picker-field__header flex items-start justify-between gap-3">
        <div className="color-picker-field__content min-w-0 flex-1">
          <span className="color-picker-field__label text-[0.68rem] font-medium uppercase tracking-[0.24em] text-white/55">
            {label}
          </span>
          <div className="color-picker-field__row mt-2 flex items-center gap-3">
            <span
              className="color-picker-field__swatch h-9 w-9 shrink-0 rounded-full border border-white/20 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
              style={{ backgroundColor: value }}
            />
            <Input
              type="text"
              value={draftValue}
              onChange={(event) => setDraftValue(event.target.value)}
              onBlur={commitDraft}
              onKeyDown={handleManualKeyDown}
              className="color-picker-field__input h-9 border-white/10 bg-black/35 font-['Azeret_Mono'] text-xs text-white shadow-none placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsOpen((current) => !current)}
          className="color-picker-field__toggle mt-5 h-9 shrink-0 rounded-full border-white/10 bg-black/35 px-3 text-xs text-white/80 ring-offset-0 hover:bg-white/10 hover:text-white"
        >
          {isOpen ? "Hide" : "Edit"}
          {isOpen ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      </div>

      {isOpen ? (
        <ColorPicker
          value={value}
          onChange={handlePickerChange}
          className="color-picker-field__picker mt-3 rounded-[1rem] border border-white/10 bg-black/45 p-3"
        >
          <ColorPickerSelection className="border border-white/10" />
          <div className="flex items-center gap-3">
            <ColorPickerEyeDropper className="h-9 w-9 border-white/10 bg-black/40 text-white/70 ring-offset-0 hover:bg-white/10 hover:text-white" />
            <ColorPickerHue className="h-5" />
          </div>
        </ColorPicker>
      ) : null}
    </div>
  );
};
