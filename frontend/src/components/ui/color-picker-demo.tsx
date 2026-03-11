import { useState } from "react";
import Color from "color";

import {
  ColorPicker,
  ColorPickerAlpha,
  ColorPickerEyeDropper,
  ColorPickerFormat,
  ColorPickerHue,
  ColorPickerOutput,
  ColorPickerSelection,
} from "@/components/ui/color-picker";

export const ColorPickerDemo = () => {
  const [value, setValue] = useState("#ff8a5b");

  return (
    <ColorPicker
      value={value}
      onChange={([red, green, blue, alpha]) => {
        setValue(
          Color.rgb(red, green, blue)
            .alpha(alpha)
            .hexa()
            .toLowerCase()
        );
      }}
      className="w-full max-w-[300px] rounded-md border border-white/10 bg-black/30 p-4 shadow-sm"
    >
      <ColorPickerSelection />
      <div className="flex items-center gap-4">
        <ColorPickerEyeDropper />
        <div className="grid w-full gap-1">
          <ColorPickerHue />
          <ColorPickerAlpha />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ColorPickerOutput />
        <ColorPickerFormat className="min-w-0 flex-1" />
      </div>
    </ColorPicker>
  );
};
