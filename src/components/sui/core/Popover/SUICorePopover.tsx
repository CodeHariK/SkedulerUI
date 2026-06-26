/* eslint-disable react-refresh/only-export-components -- thin Radix re-exports, not HMR component boundaries */
import * as React from "react";
import { Popover } from "radix-ui";
import { cn } from "@/lib/cn";

/** Popover root — controlled via `open` / `onOpenChange`, or uncontrolled. */
export const SUICorePopover = Popover.Root;

/** Trigger element. Use `asChild` to render your own element as the trigger. */
export const SUICorePopoverTrigger = Popover.Trigger;

type ContentProps = React.ComponentPropsWithoutRef<typeof Popover.Content>;

/**
 * Floating content, rendered in a portal and anchored to the trigger.
 * Forwards its ref and every Radix Content prop (e.g. `onOpenAutoFocus`,
 * `onEscapeKeyDown`, `onInteractOutside`, `collisionPadding`, `aria-*`) so
 * consumers like a hover popover can suppress focus-trapping / outside-close.
 */
export const SUICorePopoverContent = React.forwardRef<
  React.ElementRef<typeof Popover.Content>,
  ContentProps
>(function SUICorePopoverContent(
  { children, side = "bottom", align = "center", sideOffset = 8, className, ...rest },
  ref,
) {
  return (
    <Popover.Portal>
      <Popover.Content
        ref={ref}
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-card bg-white p-4 shadow-lg ring-1 ring-neutral-200 outline-none",
          className,
        )}
        {...rest}
      >
        {children}
      </Popover.Content>
    </Popover.Portal>
  );
});

SUICorePopoverContent.displayName = "SUICorePopoverContent";
