import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

const markSize = {
  sm: "size-5.5",
  md: "size-7",
  lg: "size-7.5",
};

const wordSize = {
  sm: "text-[15px]",
  md: "text-lg",
  lg: "text-xl",
};

/**
 * The logo mark + wordmark lockup. `tone="onTeal"` is the sidebar variant,
 * where the mark sits on the teal panel.
 */
export function Brand({
  size = "md",
  tone = "default",
  href,
  className,
}: {
  size?: keyof typeof markSize;
  tone?: "default" | "onTeal";
  href?: string;
  className?: string;
}) {
  const content = (
    <>
      <LogoMark tone={tone} className={markSize[size]} />
      <span className={cn("font-semibold tracking-tight", wordSize[size])}>Recap</span>
    </>
  );

  const classes = cn(
    "flex w-fit items-center gap-2.5 rounded-sm outline-none focus-visible:shadow-focus",
    tone === "default" ? "text-ink" : "text-white",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }
  return <div className={classes}>{content}</div>;
}
