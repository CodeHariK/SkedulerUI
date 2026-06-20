import { Toaster as Sonner } from "solid-sonner"
import type { ComponentProps } from "solid-js"

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster = (props: ToasterProps) => {
  return (
    <Sonner
      class="toaster group"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg rounded-xl font-sans",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
