import { cva } from "class-variance-authority";
import { cn } from "@/lib/cn";

type Orientation = "horizontal" | "vertical";

const separatorVariants = cva("shrink-0 bg-neutral-200", {
  variants: {
    orientation: {
      horizontal: "h-px w-full",
      vertical: "h-full w-px",
    },
  },
  defaultVariants: { orientation: "horizontal" },
});

type Props = {
  orientation?: Orientation;
  /**
   * Purely visual divider (default). When false, the element is exposed to
   * assistive tech as a semantic separator with the correct aria-orientation.
   */
  decorative?: boolean;
  className?: string;
};

export function SUICoreSeparator({
  orientation = "horizontal",
  decorative = true,
  className,
}: Props) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(separatorVariants({ orientation }), className)}
    />
  );
}
