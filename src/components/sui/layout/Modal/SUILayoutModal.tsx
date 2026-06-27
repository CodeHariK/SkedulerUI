import { useEffect, useRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { SUICoreButton } from "@/components/sui/core/Button/SUICoreButton";
import { SUICoreHeading } from "@/components/sui/core/Heading/SUICoreHeading";
import { SUICoreBodyText } from "@/components/sui/core/BodyText/SUICoreBodyText";

const dialogVariants = cva(
  "relative z-10 w-full overflow-hidden rounded-card border border-neutral-200 bg-white shadow-lg",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

type Props = VariantProps<typeof dialogVariants> & {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
};

export function SUILayoutModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !closeOnEscape) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus management: move focus into the dialog on open, trap Tab within it,
  // and restore focus to the previously-focused element on close.
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    const prevFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      container
        ? Array.from(
            container.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => el.offsetParent !== null)
        : [];

    (focusables()[0] ?? container)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !container) return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      prevFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "sui-modal-title" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        aria-hidden
        onClick={closeOnBackdropClick ? onClose : undefined}
        className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm"
      />
      <div ref={containerRef} tabIndex={-1} className={cn(dialogVariants({ size }), "outline-none", className)}>
        {(title || description || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-6 py-5">
            <div className="min-w-0">
              {title && (
                <SUICoreHeading id="sui-modal-title" size="s1" semanticLevel={2}>
                  {title}
                </SUICoreHeading>
              )}
              {description && (
                <SUICoreBodyText size="sm" tone="muted" className="mt-1">
                  {description}
                </SUICoreBodyText>
              )}
            </div>
            {showCloseButton && (
              <SUICoreButton
                variant="secondary"
                size="sm"
                icon="close"
                iconOnly
                aria-label="Close dialog"
                onClick={onClose}
              />
            )}
          </div>
        )}
        {children && <div className="px-6 py-5">{children}</div>}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
