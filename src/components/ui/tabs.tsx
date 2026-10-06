"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/*
 * Two tab styles from the file:
 *  - default: segmented control (summary template switcher)
 *  - line: underline tabs (meeting page on mobile)
 */
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("group/tabs flex flex-col gap-3", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva("group/tabs-list inline-flex items-center", {
  variants: {
    variant: {
      default: "w-fit gap-0.5 rounded-xl border border-line-300 bg-mist-paper p-[3px]",
      line: "w-full border-b border-line-200",
    },
  },
  defaultVariants: { variant: "default" },
})

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap outline-none transition-colors focus-visible:shadow-focus disabled:cursor-not-allowed disabled:text-blue-grey",
        // segmented
        "group-data-[variant=default]/tabs-list:rounded-md group-data-[variant=default]/tabs-list:px-3 group-data-[variant=default]/tabs-list:py-1 group-data-[variant=default]/tabs-list:text-xs group-data-[variant=default]/tabs-list:text-slate group-data-[variant=default]/tabs-list:hover:text-ink group-data-[variant=default]/tabs-list:data-active:bg-deep-teal-500 group-data-[variant=default]/tabs-list:data-active:font-medium group-data-[variant=default]/tabs-list:data-active:text-white",
        // underline
        "group-data-[variant=line]/tabs-list:flex-1 group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:p-2.5 group-data-[variant=line]/tabs-list:text-[12.5px] group-data-[variant=line]/tabs-list:text-slate-400 group-data-[variant=line]/tabs-list:hover:text-slate group-data-[variant=line]/tabs-list:data-active:border-deep-teal-500 group-data-[variant=line]/tabs-list:data-active:font-medium group-data-[variant=line]/tabs-list:data-active:text-deep-teal-500",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
