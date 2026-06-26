import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const bodyTextVariants = cva("", {
  variants: {
    size: {
      md: "text-body-md", // B1 / B2 — 16/24
      sm: "text-body-sm", // B3 / B4 — 14/20
      xs: "text-body-xs", // C1 / C2 / Label — 12/16
      "2xs": "text-body-2xs", // C3 — 10/14
    },
    weight: {
      regular: "font-normal",
      medium: "font-medium",
      bold: "font-bold",
    },
    tone: {
      default: "text-fg-primary",
      secondary: "text-fg-secondary",
      muted: "text-fg-tertiary",
      disabled: "text-fg-disabled",
      danger: "text-danger-500",
      inverse: "text-fg-inverse",
    },
  },
  defaultVariants: { size: "md", weight: "regular", tone: "default" },
});

type Props = VariantProps<typeof bodyTextVariants> & {
  as?: "p" | "span";
  children: React.ReactNode;
  className?: string;
};

export function SUICoreBodyText({ as: Component = "p", size, weight, tone, className, children }: Props) {
  return (
    <Component className={cn(bodyTextVariants({ size, weight, tone }), className)}>
      {children}
    </Component>
  );
}
