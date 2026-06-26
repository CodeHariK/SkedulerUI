import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center font-semibold rounded-pill border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed",
  {
    variants: {
      size: {
        sm: "h-6 px-3 gap-1.5 text-btn-sm",
        md: "h-9 px-4 gap-2 text-btn-md",
        lg: "h-12 px-6 gap-2 text-btn-lg",
      },
      variant: {
        primary:
          "border-primary-600 bg-primary-600 text-white hover:bg-primary-700 hover:border-primary-700 active:bg-primary-800 active:border-primary-800 disabled:bg-primary-200 disabled:border-primary-200",
        secondary:
          "border-primary-600 bg-white text-primary-600 hover:bg-primary-50 active:bg-primary-100 disabled:bg-white disabled:border-neutral-200 disabled:text-fg-disabled",
        outline:
          "border-neutral-200 bg-white text-fg-secondary hover:bg-neutral-50 active:bg-neutral-100 disabled:bg-white disabled:border-neutral-200 disabled:text-fg-disabled",
        critical:
          "border-danger-500 bg-danger-500 text-white hover:bg-danger-600 hover:border-danger-600 active:bg-danger-700 active:border-danger-700 disabled:bg-neutral-200 disabled:border-neutral-200 disabled:text-fg-disabled",
        textLink:
          "border-transparent bg-transparent text-primary-600 underline-offset-4 hover:text-primary-700 hover:underline active:text-primary-800 disabled:text-fg-disabled",
        ghost:
          "border-transparent bg-transparent text-fg-secondary hover:bg-neutral-100 active:bg-neutral-200 disabled:text-fg-disabled",
      },
      width: { fit: "w-fit", full: "w-full" },
      // Icon-only: square per size (no horizontal padding). Pair with `aria-label`.
      iconOnly: { true: "", false: "" },
    },
    compoundVariants: [
      { variant: "textLink", size: "sm", className: "h-auto px-0 gap-1" },
      { variant: "textLink", size: "md", className: "h-auto px-0 gap-1.5" },
      { variant: "textLink", size: "lg", className: "h-auto px-0 gap-2" },
      { iconOnly: true, size: "sm", className: "w-6 px-0" },
      { iconOnly: true, size: "md", className: "w-9 px-0" },
      { iconOnly: true, size: "lg", className: "w-12 px-0" },
    ],
    defaultVariants: { size: "md", variant: "primary", width: "fit", iconOnly: false },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
