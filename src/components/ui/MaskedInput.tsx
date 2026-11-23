import { forwardRef, type ChangeEvent } from "react";
import { Input, type InputProps } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export interface MaskedInputProps
  extends Omit<InputProps, "value" | "onChange"> {
  value: string;
  onValueChange: (maskedValue: string) => void;
  mask: (raw: string) => string;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  function MaskedInput(
    { value, onValueChange, mask, className, ...props },
    ref,
  ) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      onValueChange(mask(event.target.value));
    }

    return (
      <Input
        ref={ref}
        value={value}
        onChange={handleChange}
        className={cn("tabular-nums", className)}
        {...props}
      />
    );
  },
);
