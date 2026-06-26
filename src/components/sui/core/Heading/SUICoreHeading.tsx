import { cn } from "@/lib/cn";

type Size = "h1" | "h2" | "h3" | "h4" | "h5" | "s1" | "s2";

type Props = {
  size: Size;
  semanticLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
  children: React.ReactNode;
  className?: string;
};

const sizeClasses: Record<Size, string> = {
  h1: "text-h1 font-bold",
  h2: "text-h2 font-bold",
  h3: "text-h3 font-bold",
  h4: "text-h4 font-bold",
  h5: "text-h5 font-bold",
  s1: "text-s1 font-semibold",
  s2: "text-s2 font-semibold",
};

const defaultLevel: Record<Size, 1 | 2 | 3 | 4 | 5 | 6> = {
  h1: 1,
  h2: 2,
  h3: 3,
  h4: 4,
  h5: 5,
  s1: 6,
  s2: 6,
};

export function SUICoreHeading({ size, semanticLevel, id, className, children }: Props) {
  const level = semanticLevel ?? defaultLevel[size];
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <Tag id={id} className={cn(sizeClasses[size], "text-fg-primary", className)}>
      {children}
    </Tag>
  );
}
