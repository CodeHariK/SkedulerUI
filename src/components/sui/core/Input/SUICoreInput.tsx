import { useId } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { SUICoreIcon } from "@/components/sui/core/Icon/SUICoreIcon";
import type { IconName } from "@/components/sui/constants/icons";

const inputClasses = cva(
  "block w-full rounded-lg border bg-white font-sans transition-colors placeholder:text-fg-tertiary focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-fg-disabled",
  {
    variants: {
      size: {
        sm: "h-9 text-body-sm",
        md: "h-10 text-body-md",
        lg: "h-12 text-body-md",
        tile: "h-14 text-h4 font-semibold",
      },
      state: {
        default:
          "border-neutral-300 text-fg-primary focus:border-primary-600 focus:ring-primary-200",
        error:
          "border-danger-500 text-fg-primary focus:border-danger-500 focus:ring-danger-500/20",
      },
      textAlign: {
        left: "text-left",
        center: "text-center",
      },
      hasLeadingIcon: { true: "", false: "" },
    },
    compoundVariants: [
      { size: "sm", hasLeadingIcon: false, className: "px-3" },
      { size: "sm", hasLeadingIcon: true, className: "pl-9 pr-3" },
      { size: "md", hasLeadingIcon: false, className: "px-3.5" },
      { size: "md", hasLeadingIcon: true, className: "pl-10 pr-3.5" },
      { size: "lg", hasLeadingIcon: false, className: "px-4" },
      { size: "lg", hasLeadingIcon: true, className: "pl-11 pr-4" },
      { size: "tile", hasLeadingIcon: false, className: "px-0" },
    ],
    defaultVariants: {
      size: "md",
      state: "default",
      textAlign: "left",
      hasLeadingIcon: false,
    },
  },
);

type InputSize = NonNullable<VariantProps<typeof inputClasses>["size"]>;

type Props = {
  id?: string;
  name?: string;
  label?: string;
  hideLabel?: boolean;
  helperText?: string;
  error?: string;
  type?: "text" | "email" | "password" | "tel" | "url" | "search" | "number";
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric" | "decimal" | "search" | "none";
  maxLength?: number;
  size?: InputSize;
  width?: "fit" | "full";
  textAlign?: "left" | "center";
  leadingIcon?: IconName;
  inputRef?: React.Ref<HTMLInputElement>;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  className?: string;
  inputClassName?: string;
};

const iconSizeFor: Record<InputSize, "xs" | "sm" | "md" | "lg"> = {
  sm: "sm",
  md: "sm",
  lg: "md",
  tile: "md",
};

const iconLeftFor: Record<InputSize, string> = {
  sm: "left-3",
  md: "left-3.5",
  lg: "left-4",
  tile: "left-3",
};

export function SUICoreInput({
  id,
  name,
  label,
  hideLabel,
  helperText,
  error,
  type = "text",
  value,
  defaultValue,
  placeholder,
  required,
  disabled,
  autoFocus,
  autoComplete,
  inputMode,
  maxLength,
  size = "md",
  width = "full",
  textAlign = "left",
  leadingIcon,
  inputRef,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  onPaste,
  className,
  inputClassName,
}: Props) {
  const reactId = useId();
  const inputId = id ?? `sui-input-${reactId}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;
  const state = error ? "error" : "default";

  return (
    <div className={cn(width === "fit" ? "w-fit" : "w-full", className)}>
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "mb-1.5 block text-body-sm font-medium text-fg-secondary",
            hideLabel && "sr-only",
          )}
        >
          {label}
          {required && <span className="text-danger-500"> *</span>}
        </label>
      )}

      <div className="relative">
        {leadingIcon && (
          <span
            className={cn(
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-fg-tertiary",
              iconLeftFor[size],
            )}
          >
            <SUICoreIcon name={leadingIcon} size={iconSizeFor[size]} />
          </span>
        )}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          ref={inputRef}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          className={cn(
            inputClasses({ size, state, textAlign, hasLeadingIcon: !!leadingIcon }),
            inputClassName,
          )}
        />
      </div>

      {error && (
        <p id={errorId} className="mt-1.5 text-body-sm text-danger-500">
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
