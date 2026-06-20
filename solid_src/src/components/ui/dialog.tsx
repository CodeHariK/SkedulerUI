import { splitProps, type ComponentProps } from "solid-js"
import { Dialog as DialogPrimitive } from "@kobalte/core/dialog"
import { XIcon } from "lucide-solid"
import { cn } from "../../lib/utils"

const Dialog = DialogPrimitive
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.CloseButton

function DialogOverlay(props: ComponentProps<typeof DialogPrimitive.Overlay>) {
  const [local, rest] = splitProps(props, ["class"])
  return (
    <DialogPrimitive.Overlay
      class={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs ui-expanded:animate-in ui-expanded:fade-in-0 ui-not-expanded:animate-out ui-not-expanded:fade-out-0",
        local.class
      )}
      {...rest}
    />
  )
}

function DialogContent(props: ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) {
  const [local, rest] = splitProps(props, ["class", "children", "showCloseButton"])
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        class={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm ui-expanded:animate-in ui-expanded:fade-in-0 ui-expanded:zoom-in-95 ui-not-expanded:animate-out ui-not-expanded:fade-out-0 ui-not-expanded:zoom-out-95",
          local.class
        )}
        {...rest}
      >
        {local.children}
        {(local.showCloseButton ?? true) && (
          <DialogPrimitive.CloseButton class="absolute top-2 right-2 flex size-6 items-center justify-center rounded-sm hover:bg-muted">
            <XIcon class="size-4" />
            <span class="sr-only">Close</span>
          </DialogPrimitive.CloseButton>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader(props: ComponentProps<"div">) {
  const [local, rest] = splitProps(props, ["class"])
  return <div class={cn("flex flex-col gap-2", local.class)} {...rest} />
}

function DialogFooter(props: ComponentProps<"div">) {
  const [local, rest] = splitProps(props, ["class"])
  return (
    <div
      class={cn("-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end", local.class)}
      {...rest}
    />
  )
}

function DialogTitle(props: ComponentProps<typeof DialogPrimitive.Title>) {
  const [local, rest] = splitProps(props, ["class"])
  return <DialogPrimitive.Title class={cn("font-heading text-base leading-none font-medium", local.class)} {...rest} />
}

function DialogDescription(props: ComponentProps<typeof DialogPrimitive.Description>) {
  const [local, rest] = splitProps(props, ["class"])
  return <DialogPrimitive.Description class={cn("text-sm text-muted-foreground", local.class)} {...rest} />
}

export {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose
}
