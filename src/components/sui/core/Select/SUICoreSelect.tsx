import { useId } from "react";
import { Select } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { SUICoreIcon } from "@/components/sui/core/Icon/SUICoreIcon";
import type { IconName } from "@/components/sui/constants/icons";

export type SUISelectOption = { value: string; label: string };

// Radix Select reserves the empty string for its placeholder and throws if an
// item uses it, so empty option values are mapped to a private sentinel and
// translated back at the onChange / value boundary (keeps `value=""` working).
const EMPTY_VALUE = "__sui_select_empty__";
const toRadix = (v: string) => (v === "" ? EMPTY_VALUE : v);
const fromRadix = (v: string) => (v === EMPTY_VALUE ? "" : v);

const triggerClasses = cva(
  "group inline-flex w-full items-center justify-between gap-2 rounded-lg border bg-white font-sans font-medium text-fg-primary shadow-xs transition-colors data-[placeholder]:text-fg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-fg-disabled",
  {
    variants: {
      size: {
        sm: "h-8 px-2.5 text-body-sm",
        md: "h-9 px-3 text-body-sm",
        lg: "h-11 px-3.5 text-body-md",
      },
      state: {
        default: "border-neutral-200 focus-visible:border-primary-600",
        error: "border-danger-500 focus-visible:ring-danger-500/20",
      },
    },
    defaultVariants: { size: "md", state: "default" },
  },
);

type SelectSize = NonNullable<VariantProps<typeof triggerClasses>["size"]>;

type Props = {
  id?: string;
  name?: string;
  label?: string;
  hideLabel?: boolean;
  helperText?: string;
  error?: string;
  options: SUISelectOption[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  size?: SelectSize;
  width?: "fit" | "full";
  /** Optional icon shown before the value in the trigger and beside each option. */
  leadingIcon?: IconName;
  onChange?: (value: string) => void;
  className?: string;
  triggerClassName?: string;
};

export function SUICoreSelect({
  id,
  name,
  label,
  hideLabel,
  helperText,
  error,
  options,
  placeholder,
  value,
  defaultValue,
  required,
  disabled,
  size = "md",
  width = "full",
  leadingIcon,
  onChange,
  className,
  triggerClassName,
}: Props) {
  const reactId = useId();
  const selectId = id ?? `sui-select-${reactId}`;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;
  const state = error ? "error" : "default";

  return (
    <div className={cn(width === "fit" ? "w-fit" : "w-full", className)}>
      {label && (
        <label
          htmlFor={selectId}
          className={cn(
            "mb-1.5 block text-body-sm font-medium text-fg-secondary",
            hideLabel && "sr-only",
          )}
        >
          {label}
          {required && <span className="text-danger-600"> *</span>}
        </label>
      )}

      <Select.Root
        value={value === undefined ? undefined : toRadix(value)}
        defaultValue={defaultValue === undefined ? undefined : toRadix(defaultValue)}
        onValueChange={(v) => onChange?.(fromRadix(v))}
        disabled={disabled}
        required={required}
        name={name}
      >
        <Select.Trigger
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(triggerClasses({ size, state }), triggerClassName)}
        >
          <span className="flex min-w-0 items-center gap-2">
            {leadingIcon && (
              <SUICoreIcon name={leadingIcon} size="sm" className="shrink-0 text-fg-tertiary" />
            )}
            <span className="truncate">
              <Select.Value placeholder={placeholder} />
            </span>
          </span>
          <Select.Icon className="shrink-0 text-fg-tertiary transition-transform group-data-[state=open]:rotate-180">
            <SUICoreIcon name="chevronDown" size="sm" />
          </Select.Icon>
        </Select.Trigger>

        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            className="z-50 overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 shadow-md"
            style={{
              minWidth: "var(--radix-select-trigger-width)",
              maxHeight: "var(--radix-select-content-available-height)",
            }}
          >
            <Select.Viewport>
              {options.map((opt) => (
                <Select.Item
                  key={opt.value}
                  value={toRadix(opt.value)}
                  className="relative flex h-8 cursor-pointer select-none items-center gap-2 rounded-md px-2 text-body-sm font-medium text-fg-primary outline-none data-[highlighted]:bg-neutral-100 data-[state=checked]:bg-primary-50 data-[state=checked]:text-primary-600 data-[disabled]:cursor-not-allowed data-[disabled]:text-fg-disabled"
                >
                  {leadingIcon && (
                    <SUICoreIcon name={leadingIcon} size="sm" className="shrink-0" />
                  )}
                  <Select.ItemText>{opt.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      {error && (
        <p id={errorId} className="mt-1.5 text-body-sm text-danger-600">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="mt-1.5 text-body-sm text-fg-tertiary">
          {helperText}
        </p>
      )}
    </div>
  );
}
