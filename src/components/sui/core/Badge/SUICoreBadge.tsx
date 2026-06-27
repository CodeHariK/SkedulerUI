import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { SUICoreIcon } from "@/components/sui/core/Icon/SUICoreIcon";
import type { IconName } from "@/components/sui/constants/icons";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-pill font-medium ring-1 ring-inset",
  {
    variants: {
      size: {
        sm: "px-2 py-0.5 text-body-xs",
        md: "px-2.5 py-0.5 text-body-sm",
      },
      variant: {
        neutral: "bg-neutral-100 text-fg-secondary ring-neutral-200",
        primary: "bg-primary-50 text-primary-700 ring-primary-100",
        success: "bg-success-500/10 text-success-700 ring-success-500/20",
        warning: "bg-warning-500/10 text-warning-700 ring-warning-500/30",
        danger: "bg-danger-50 text-danger-700 ring-danger-100",
        info: "bg-info-500/10 text-info-700 ring-info-500/20",
      },
    },
    defaultVariants: { size: "sm", variant: "neutral" },
  },
);

type Props = VariantProps<typeof badgeVariants> & {
  text: string;
  icon?: IconName;
  className?: string;
};

export function SUICoreBadge({ text, icon, size, variant, className }: Props) {
  return (
    <span className={cn(badgeVariants({ size, variant }), className)}>
      {icon && <SUICoreIcon name={icon} size="xs" />}
      {text}
    </span>
  );
}
