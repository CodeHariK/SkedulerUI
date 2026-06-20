import { splitProps, type ComponentProps } from "solid-js"
import { Popover as PopoverPrimitive } from "@kobalte/core/popover"
import { cn } from "../../lib/utils"

const Popover = PopoverPrimitive
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

function PopoverContent(props: ComponentProps<typeof PopoverPrimitive.Content>) {
  const [local, rest] = splitProps(props, ["class"])
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        class={cn(
          "z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 ui-expanded:animate-in ui-expanded:fade-in-0 ui-expanded:zoom-in-95 ui-not-expanded:animate-out ui-not-expanded:fade-out-0 ui-not-expanded:zoom-out-95",
          local.class
        )}
        {...rest}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverHeader(props: ComponentProps<"div">) {
  const [local, rest] = splitProps(props, ["class"])
  return <div class={cn("flex flex-col gap-0.5 text-sm", local.class)} {...rest} />
}

function PopoverTitle(props: ComponentProps<typeof PopoverPrimitive.Title>) {
  const [local, rest] = splitProps(props, ["class"])
  return <PopoverPrimitive.Title class={cn("font-medium", local.class)} {...rest} />
}

function PopoverDescription(props: ComponentProps<typeof PopoverPrimitive.Description>) {
  const [local, rest] = splitProps(props, ["class"])
  return <PopoverPrimitive.Description class={cn("text-muted-foreground", local.class)} {...rest} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle, PopoverDescription, PopoverAnchor }
