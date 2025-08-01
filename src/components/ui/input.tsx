
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-base uppercase ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium file:text-foreground placeholder:text-muted-foreground placeholder:normal-case focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // The following style hides the spin buttons on number inputs for a cleaner look
          type === "number" && "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        ref={ref}
        // Prevent the input value from changing when scrolling while the input is focused
        onWheel={(event) => {
            if (type === "number" && document.activeElement === event.currentTarget) {
                event.currentTarget.blur();
            }
        }}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
