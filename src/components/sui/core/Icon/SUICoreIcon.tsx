import { ICONS, type IconName } from "@/components/sui/constants/icons";
import { cn } from "@/lib/cn";

type Props = {
  name: IconName;
  size?: "xs" | "sm" | "md" | "lg";
  "aria-label"?: string;
  className?: string;
};

const sizeMap: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export function SUICoreIcon({ name, size = "md", className, ...rest }: Props) {
  const Icon = ICONS[name];
  const ariaLabel = rest["aria-label"];
  return (
    <Icon
      className={cn(sizeMap[size], className)}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
    />
  );
}
