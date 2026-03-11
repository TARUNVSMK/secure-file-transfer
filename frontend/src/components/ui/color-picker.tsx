import {
  type ChangeEventHandler,
  type ComponentProps,
  type HTMLAttributes,
  type ComponentPropsWithoutRef,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Range as SliderRange,
  Root as SliderRoot,
  Thumb as SliderThumb,
  Track as SliderTrack,
} from "@radix-ui/react-slider";
import Color from "color";
import { PipetteIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ColorValue =
  | string
  | [number, number, number]
  | [number, number, number, number]
  | { r: number; g: number; b: number; alpha?: number };

type ColorPickerMode = "hex" | "rgb" | "css" | "hsl";

interface ColorPickerContextValue {
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  mode: ColorPickerMode;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setLightness: (lightness: number) => void;
  setAlpha: (alpha: number) => void;
  setMode: (mode: ColorPickerMode) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
  undefined
);

const formatOptions: ColorPickerMode[] = ["hex", "rgb", "css", "hsl"];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toColor = (value: ColorValue | undefined, fallback: ColorValue) => {
  try {
    return Color(value ?? fallback);
  } catch {
    return Color(fallback);
  }
};

const getHslState = (value: ColorValue | undefined, fallback: ColorValue) => {
  const color = toColor(value, fallback).hsl();
  const { h = 0, s = 100, l = 50 } = color.object();

  return {
    hue: clamp(Math.round(h || 0), 0, 360),
    saturation: clamp(Math.round(s || 0), 0, 100),
    lightness: clamp(Math.round(l || 0), 0, 100),
    alpha: clamp(Math.round(color.alpha() * 100), 0, 100),
  };
};

const syncFromColor = (
  nextColor: ReturnType<typeof toColor>,
  update: Pick<
    ColorPickerContextValue,
    "setHue" | "setSaturation" | "setLightness" | "setAlpha"
  >
) => {
  const hsl = nextColor.hsl();
  const { h = 0, s = 100, l = 50 } = hsl.object();

  update.setHue(clamp(Math.round(h || 0), 0, 360));
  update.setSaturation(clamp(Math.round(s || 0), 0, 100));
  update.setLightness(clamp(Math.round(l || 0), 0, 100));
  update.setAlpha(clamp(Math.round(nextColor.alpha() * 100), 0, 100));
};

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error("useColorPicker must be used within a ColorPicker");
  }

  return context;
};

export type ColorPickerProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  value?: ColorValue;
  defaultValue?: ColorValue;
  onChange?: (value: [number, number, number, number]) => void;
};

export const ColorPicker = ({
  value,
  defaultValue = "#000000",
  onChange,
  className,
  children,
  ...props
}: ColorPickerProps) => {
  const initialState = useMemo(
    () => getHslState(value, defaultValue),
    [defaultValue, value]
  );
  const [hue, setHue] = useState(initialState.hue);
  const [saturation, setSaturation] = useState(initialState.saturation);
  const [lightness, setLightness] = useState(initialState.lightness);
  const [alpha, setAlpha] = useState(initialState.alpha);
  const [mode, setMode] = useState<ColorPickerMode>("hex");

  useEffect(() => {
    const nextState = getHslState(value, defaultValue);
    setHue(nextState.hue);
    setSaturation(nextState.saturation);
    setLightness(nextState.lightness);
    setAlpha(nextState.alpha);
  }, [defaultValue, value]);

  useEffect(() => {
    if (!onChange) {
      return;
    }

    const rgba = Color.hsl(hue, saturation, lightness)
      .alpha(alpha / 100)
      .rgb()
      .array();

    onChange([
      Math.round(rgba[0] || 0),
      Math.round(rgba[1] || 0),
      Math.round(rgba[2] || 0),
      Number((alpha / 100).toFixed(2)),
    ]);
  }, [alpha, hue, lightness, onChange, saturation]);

  return (
    <ColorPickerContext.Provider
      value={{
        alpha,
        hue,
        lightness,
        mode,
        saturation,
        setAlpha,
        setHue,
        setLightness,
        setMode,
        setSaturation,
      }}
    >
      <div className={cn("grid w-full gap-4", className)} {...props}>
        {children}
      </div>
    </ColorPickerContext.Provider>
  );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = ({
  className,
  ...props
}: ColorPickerSelectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { hue, lightness, saturation, setLightness, setSaturation } =
    useColorPicker();

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = clamp((clientX - rect.left) / rect.width, 0, 1);
      const y = clamp((clientY - rect.top) / rect.height, 0, 1);

      setSaturation(Math.round(x * 100));
      setLightness(Math.round((1 - y) * 100));
    },
    [setLightness, setSaturation]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDragging) {
        return;
      }

      updateFromPointer(event.clientX, event.clientY);
    },
    [isDragging, updateFromPointer]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp, isDragging]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] w-full cursor-crosshair overflow-hidden rounded-xl",
        className
      )}
      style={{
        background: [
          "linear-gradient(180deg, rgb(255 255 255 / 1), rgb(255 255 255 / 0))",
          "linear-gradient(0deg, rgb(0 0 0 / 1), rgb(0 0 0 / 0))",
          `linear-gradient(90deg, hsl(${hue}, 0%, 50%), hsl(${hue}, 100%, 50%))`,
        ].join(", "),
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        setIsDragging(true);
        updateFromPointer(event.clientX, event.clientY);
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
        style={{
          left: `${saturation}%`,
          top: `${100 - lightness}%`,
        }}
      />
    </div>
  );
};

export type ColorPickerHueProps = Omit<
  ComponentPropsWithoutRef<typeof SliderRoot>,
  "value" | "defaultValue" | "onValueChange"
>;

export const ColorPickerHue = ({
  className,
  ...props
}: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker();

  return (
    <SliderRoot
      value={[hue]}
      max={360}
      step={1}
      className={cn("relative flex h-4 w-full touch-none items-center", className)}
      onValueChange={([nextHue]) => setHue(nextHue ?? 0)}
      {...props}
    >
      <SliderTrack className="relative h-3 w-full grow overflow-hidden rounded-full bg-[linear-gradient(90deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)]">
        <SliderRange className="absolute h-full" />
      </SliderTrack>
      <SliderThumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderRoot>
  );
};

export type ColorPickerAlphaProps = Omit<
  ComponentPropsWithoutRef<typeof SliderRoot>,
  "value" | "defaultValue" | "onValueChange"
>;

export const ColorPickerAlpha = ({
  className,
  ...props
}: ColorPickerAlphaProps) => {
  const { alpha, hue, lightness, saturation, setAlpha } = useColorPicker();
  const solidColor = Color.hsl(hue, saturation, lightness).hex();

  return (
    <SliderRoot
      value={[alpha]}
      max={100}
      step={1}
      className={cn("relative flex h-4 w-full touch-none items-center", className)}
      onValueChange={([nextAlpha]) => setAlpha(nextAlpha ?? 100)}
      {...props}
    >
      <SliderTrack
        className="relative h-3 w-full grow overflow-hidden rounded-full"
        style={{
          background:
            'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${solidColor})`,
          }}
        />
        <SliderRange className="absolute h-full rounded-full bg-transparent" />
      </SliderTrack>
      <SliderThumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderRoot>
  );
};

type EyeDropperResult = {
  sRGBHex: string;
};

type EyeDropperInstance = {
  open: () => Promise<EyeDropperResult>;
};

type EyeDropperWindow = Window & {
  EyeDropper?: new () => EyeDropperInstance;
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({
  className,
  ...props
}: ColorPickerEyeDropperProps) => {
  const { setAlpha, setHue, setLightness, setSaturation } = useColorPicker();

  const handleEyeDropper = async () => {
    const eyeDropperWindow = window as EyeDropperWindow;

    if (!eyeDropperWindow.EyeDropper) {
      return;
    }

    try {
      const eyeDropper = new eyeDropperWindow.EyeDropper();
      const result = await eyeDropper.open();
      syncFromColor(Color(result.sRGBHex), {
        setAlpha,
        setHue,
        setLightness,
        setSaturation,
      });
      setAlpha(100);
    } catch (error) {
      console.error("EyeDropper failed:", error);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleEyeDropper}
      className={cn("shrink-0 text-muted-foreground", className)}
      {...props}
    >
      <PipetteIcon size={16} />
    </Button>
  );
};

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

export const ColorPickerOutput = ({
  className,
  ...props
}: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select value={mode} onValueChange={(value) => setMode(value as ColorPickerMode)}>
      <SelectTrigger className={cn("h-8 w-[4.5rem] shrink-0 text-xs", className)} {...props}>
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {formatOptions.map((format) => (
          <SelectItem key={format} value={format} className="text-xs">
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

type PercentageInputProps = ComponentProps<typeof Input>;

const PercentageInput = ({ className, ...props }: PercentageInputProps) => {
  return (
    <div className="relative">
      <Input
        type="number"
        min={0}
        max={100}
        {...props}
        className={cn(
          "h-8 w-[4rem] rounded-l-none bg-secondary px-2 pr-7 text-xs shadow-none",
          className
        )}
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        %
      </span>
    </div>
  );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({
  className,
  ...props
}: ColorPickerFormatProps) => {
  const {
    alpha,
    hue,
    lightness,
    mode,
    saturation,
    setAlpha,
    setHue,
    setLightness,
    setSaturation,
  } = useColorPicker();
  const color = Color.hsl(hue, saturation, lightness).alpha(alpha / 100);

  const handleHexChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const rawValue = event.target.value.trim();

    if (!rawValue) {
      return;
    }

    try {
      syncFromColor(Color(rawValue.startsWith("#") ? rawValue : `#${rawValue}`), {
        setAlpha,
        setHue,
        setLightness,
        setSaturation,
      });
    } catch (error) {
      console.error("Invalid hex color:", error);
    }
  };

  const handleAlphaChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const nextAlpha = Number(event.target.value);
    if (Number.isNaN(nextAlpha)) {
      return;
    }

    setAlpha(clamp(nextAlpha, 0, 100));
  };

  if (mode === "hex") {
    const hex = (alpha < 100 ? color.hexa() : color.hex()).replace("#", "");

    return (
      <div
        className={cn("relative flex items-center -space-x-px shadow-sm", className)}
        {...props}
      >
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          #
        </span>
        <Input
          type="text"
          value={hex}
          onChange={handleHexChange}
          className="h-8 rounded-r-none bg-secondary px-7 text-xs shadow-none"
        />
        <PercentageInput value={alpha} onChange={handleAlphaChange} />
      </div>
    );
  }

  if (mode === "rgb") {
    const rgb = color.rgb().array().map((value) => Math.round(value));

    return (
      <div
        className={cn("flex items-center -space-x-px shadow-sm", className)}
        {...props}
      >
        {rgb.map((value, index) => (
          <Input
            key={index}
            type="text"
            value={value}
            readOnly
            className={cn(
              "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index > 0 && "rounded-l-none"
            )}
          />
        ))}
        <PercentageInput value={alpha} onChange={handleAlphaChange} />
      </div>
    );
  }

  if (mode === "css") {
    const rgba = color.rgb().array().map((value) => Math.round(value));

    return (
      <div className={cn("w-full shadow-sm", className)} {...props}>
        <Input
          type="text"
          className="h-8 w-full bg-secondary px-2 text-xs shadow-none"
          value={`rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${(alpha / 100).toFixed(2)})`}
          readOnly
        />
      </div>
    );
  }

  if (mode === "hsl") {
    const hsl = [
      Math.round(hue),
      Math.round(saturation),
      Math.round(lightness),
    ];

    return (
      <div
        className={cn("flex items-center -space-x-px shadow-sm", className)}
        {...props}
      >
        {hsl.map((value, index) => (
          <Input
            key={index}
            type="text"
            value={value}
            readOnly
            className={cn(
              "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index > 0 && "rounded-l-none"
            )}
          />
        ))}
        <PercentageInput value={alpha} onChange={handleAlphaChange} />
      </div>
    );
  }

  return null;
};
