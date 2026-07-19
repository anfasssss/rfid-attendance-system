import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface Props extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  sweep?: boolean;
  corners?: boolean;
}

export const GlassPanel = forwardRef<HTMLDivElement, Props>(
  ({ className, corners: _c, glow: _g, sweep: _s, children, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("glass-panel", className)}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
GlassPanel.displayName = "GlassPanel";