import { splitProps, type ComponentProps } from "solid-js"
import { Separator as SeparatorPrimitive } from "@kobalte/core/separator"
import { cn } from "../../lib/utils"

function Separator(props: ComponentProps<typeof SeparatorPrimitive>) {
  const [local, rest] = splitProps(props, ["class"])

  return (
    <SeparatorPrimitive
      class={cn(
        "shrink-0 bg-border ui-horizontal:h-px ui-horizontal:w-full ui-vertical:w-px ui-vertical:self-stretch",
        local.class
      )}
      {...rest}
    />
  )
}

export { Separator }
