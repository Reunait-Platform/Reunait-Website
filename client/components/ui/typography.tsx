import { cn } from "@/lib/utils"
import { VariantProps, cva } from "class-variance-authority"
import React, { forwardRef } from "react"

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      blockquote: "mt-6 border-l-2 pl-6 italic",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "p",
  },
})

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "blockquote" | "code" | "lead" | "large" | "small" | "muted"
}

const Typography = forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, as = "p", ...props }, ref) => {
    const elementMap: Record<string, keyof React.JSX.IntrinsicElements> = {
      h1: "h1",
      h2: "h2",
      h3: "h3",
      h4: "h4",
      p: "p",
      blockquote: "blockquote",
      code: "code",
      lead: "p",
      large: "p",
      small: "small",
      muted: "p",
    }
    
    const Component = elementMap[as] || "p"
    
    return React.createElement(
      Component,
      {
        className: cn(typographyVariants({ variant }), className),
        ref,
        ...props,
      }
    )
  }
)
Typography.displayName = "Typography"

export { Typography, typographyVariants } 