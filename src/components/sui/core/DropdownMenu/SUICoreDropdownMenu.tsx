/* eslint-disable react-refresh/only-export-components -- thin Radix re-exports, not HMR component boundaries */
import * as React from 'react';
import { DropdownMenu } from 'radix-ui';
import { cn } from '@/lib/cn';
import { SUICoreIcon } from '@/components/sui/core/Icon/SUICoreIcon';
import type { IconName } from '@/components/sui/constants/icons';

/** Action-menu root (open on trigger click). Use SUICoreButton as the trigger via asChild. */
export const SUICoreDropdownMenu = DropdownMenu.Root;
export const SUICoreDropdownMenuTrigger = DropdownMenu.Trigger;

/** Floating menu surface, rendered in a portal and anchored to the trigger. */
export const SUICoreDropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenu.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenu.Content>
>(function SUICoreDropdownMenuContent({ className, align = 'end', sideOffset = 6, ...rest }, ref) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn('z-50 min-w-44 rounded-lg border border-neutral-200 bg-white p-1 shadow-md outline-none', className)}
        {...rest}
      />
    </DropdownMenu.Portal>
  );
});
SUICoreDropdownMenuContent.displayName = 'SUICoreDropdownMenuContent';

type ItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenu.Item> & { icon?: IconName };

/** A selectable action row. */
export const SUICoreDropdownMenuItem = React.forwardRef<React.ElementRef<typeof DropdownMenu.Item>, ItemProps>(
  function SUICoreDropdownMenuItem({ className, icon, children, ...rest }, ref) {
    return (
      <DropdownMenu.Item
        ref={ref}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1.5 text-body-sm font-medium text-fg-primary cursor-pointer select-none outline-none data-[highlighted]:bg-neutral-100 data-[disabled]:text-fg-disabled data-[disabled]:cursor-not-allowed',
          className,
        )}
        {...rest}
      >
        {icon && <SUICoreIcon name={icon} size="sm" className="shrink-0 text-fg-tertiary" />}
        {children}
      </DropdownMenu.Item>
    );
  },
);
SUICoreDropdownMenuItem.displayName = 'SUICoreDropdownMenuItem';
