"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-8.5 shrink-0 items-center rounded-full border border-transparent bg-(--color-border) transition-colors outline-none data-checked:bg-(--color-accent) focus-visible:ring-[3px] focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full bg-white shadow-sm ring-0 transition-transform translate-x-0.5 data-checked:translate-x-3.75"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
