import { useId } from 'react';
import { Switch } from 'radix-ui';
import { cn } from '@/lib/cn';

type Props = {
  id?: string;
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
};

export function SUICoreSwitch({
  id,
  label,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  name,
  className,
}: Props) {
  const reactId = useId();
  const switchId = id ?? `sui-switch-${reactId}`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Switch.Root
        id={switchId}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-pill bg-neutral-300 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-200 data-[state=checked]:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Switch.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px]" />
      </Switch.Root>
      {label && (
        <label htmlFor={switchId} className="text-body-sm text-fg-primary select-none cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
}
