import { useId } from 'react';
import { Checkbox } from 'radix-ui';
import { cn } from '@/lib/cn';
import { SUICoreIcon } from '@/components/sui/core/Icon/SUICoreIcon';

type Props = {
  id?: string;
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
};

export function SUICoreCheckbox({
  id,
  label,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
  name,
  className,
}: Props) {
  const reactId = useId();
  const cbId = id ?? `sui-checkbox-${reactId}`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Checkbox.Root
        id={cbId}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(c) => onCheckedChange?.(c === true)}
        disabled={disabled}
        required={required}
        className="flex size-4 shrink-0 items-center justify-center rounded border border-neutral-300 bg-white text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary-200 data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Checkbox.Indicator>
          <SUICoreIcon name="check" size="xs" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      {label && (
        <label htmlFor={cbId} className="text-body-sm text-fg-primary select-none cursor-pointer">
          {label}
        </label>
      )}
    </div>
  );
}
