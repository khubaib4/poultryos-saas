import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-page-bg disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary-gradient bg-primary-gradient-hover text-white shadow-sm hover:shadow",
        /** Same green gradient at rest; simple solid darker hover (no second gradient). */
        primarySimple:
          "bg-primary-gradient text-white shadow-sm transition-colors duration-150 hover:bg-primary-dark hover:[background-image:none] hover:shadow-none",
        outline:
          "border-gray-200 bg-white text-gray-700 shadow-card hover:bg-gray-50",
        secondary:
          "border-gray-200 bg-white text-gray-700 shadow-card hover:bg-gray-50",
        ghost: "text-gray-700 shadow-none hover:bg-gray-100",
        destructive:
          "bg-error text-white shadow-sm hover:bg-red-600 border-transparent",
        link: "border-transparent text-primary underline-offset-4 hover:underline shadow-none",
      },
      size: {
        default:
          "h-11 min-h-11 gap-2 px-6 py-3 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        xs: "h-8 min-h-8 gap-1 rounded-lg px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-10 min-h-10 gap-1.5 rounded-xl px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 min-h-12 gap-2 rounded-xl px-8 text-base has-data-[icon=inline-end]:pr-6 has-data-[icon=inline-start]:pl-6",
        icon: "size-11 min-h-11 min-w-11",
        "icon-xs":
          "size-9 min-h-9 min-w-9 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-10 min-h-10 min-w-10 rounded-xl",
        "icon-lg": "size-12 min-h-12 min-w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
