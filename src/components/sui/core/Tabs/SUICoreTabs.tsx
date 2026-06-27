/* eslint-disable react-refresh/only-export-components -- thin Radix re-exports, not HMR component boundaries */
import * as React from 'react';
import { Tabs } from 'radix-ui';
import { cn } from '@/lib/cn';
import { SUICoreIcon } from '@/components/sui/core/Icon/SUICoreIcon';
import type { IconName } from '@/components/sui/constants/icons';

/** Tabs root — controlled via `value`/`onValueChange`, or uncontrolled. */
export const SUICoreTabs = Tabs.Root;

/** Horizontal tab strip with a bottom border. */
export const SUICoreTabsList = React.forwardRef<
  React.ElementRef<typeof Tabs.List>,
  React.ComponentPropsWithoutRef<typeof Tabs.List>
>(function SUICoreTabsList({ className, ...rest }, ref) {
  return (
    <Tabs.List ref={ref} className={cn('flex items-center gap-1 border-b border-neutral-200', className)} {...rest} />
  );
});
SUICoreTabsList.displayName = 'SUICoreTabsList';

type TriggerProps = React.ComponentPropsWithoutRef<typeof Tabs.Trigger> & { icon?: IconName };

/** A single tab. Active state is driven by Radix `data-[state=active]`. */
export const SUICoreTabsTrigger = React.forwardRef<React.ElementRef<typeof Tabs.Trigger>, TriggerProps>(
  function SUICoreTabsTrigger({ className, icon, children, ...rest }, ref) {
    return (
      <Tabs.Trigger
        ref={ref}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 -mb-px text-body-sm font-medium border-b-2 border-transparent text-fg-tertiary transition-colors cursor-pointer outline-none hover:text-fg-secondary focus-visible:text-fg-primary data-[state=active]:border-primary-600 data-[state=active]:text-fg-primary',
          className,
        )}
        {...rest}
      >
        {icon && <SUICoreIcon name={icon} size="sm" />}
        {children}
      </Tabs.Trigger>
    );
  },
);
SUICoreTabsTrigger.displayName = 'SUICoreTabsTrigger';

/** Panel for a tab; shown when its `value` matches the active tab. */
export const SUICoreTabsContent = React.forwardRef<
  React.ElementRef<typeof Tabs.Content>,
  React.ComponentPropsWithoutRef<typeof Tabs.Content>
>(function SUICoreTabsContent({ className, ...rest }, ref) {
  return <Tabs.Content ref={ref} className={cn('outline-none', className)} {...rest} />;
});
SUICoreTabsContent.displayName = 'SUICoreTabsContent';
