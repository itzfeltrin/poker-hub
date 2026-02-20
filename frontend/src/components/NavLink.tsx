import { Link, LinkProps } from "@tanstack/react-router";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkCompatProps extends Omit<LinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        to={to}
        activeProps={{ className: cn(className, activeClassName) }}
        inactiveProps={{ className }}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
