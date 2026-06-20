import { splitProps, type ComponentProps } from "solid-js"
import { Select as SelectPrimitive } from "@kobalte/core/select"
import { ChevronDownIcon, CheckIcon } from "lucide-solid"
import { cn } from "../../lib/utils"

const Select = SelectPrimitive
const SelectValue = SelectPrimitive.Value

function SelectTrigger(props: ComponentProps<typeof SelectPrimitive.Trigger>) {
  const [local, rest] = splitProps(props, ["class", "children"])
  return (
    <SelectPrimitive.Trigger
      class={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap outline-none ui-expanded:border-ring ui-disabled:cursor-not-allowed ui-disabled:opacity-50",
        local.class
      )}
      {...rest}
    >
      {local.children}
      <SelectPrimitive.Icon>
        <ChevronDownIcon class="size-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent(props: ComponentProps<typeof SelectPrimitive.Content>) {
  const [local, rest] = splitProps(props, ["class"])
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        class={cn(
          "relative z-50 min-w-36 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 ui-expanded:animate-in ui-expanded:fade-in-0 ui-expanded:zoom-in-95 ui-not-expanded:animate-out ui-not-expanded:fade-out-0 ui-not-expanded:zoom-out-95",
          local.class
        )}
        {...rest}
      >
        <SelectPrimitive.Listbox class="p-1" />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem(props: ComponentProps<typeof SelectPrimitive.Item>) {
  const [local, rest] = splitProps(props, ["class", "children"])
  return (
    <SelectPrimitive.Item
      class={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden ui-highlighted:bg-accent ui-highlighted:text-accent-foreground ui-disabled:pointer-events-none ui-disabled:opacity-50",
        local.class
      )}
      {...rest}
    >
      <span class="absolute right-2 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon class="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemLabel>{local.children}</SelectPrimitive.ItemLabel>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
