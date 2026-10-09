import { createContext, useContext } from "react";
import type { ComponentProps } from "react";

export const PublicPathContext = createContext("/");
type LinkProps = Omit<ComponentProps<"a">, "href"> & { to: string };

export function Link({ to, ...props }: LinkProps) {
  // Document navigation works with SSR, hash links, and the separate patient portal.
  return <a href={to} {...props} />;
}

export function NavLink({ to, className = "", ...props }: LinkProps) {
  const pathname = useContext(PublicPathContext);
  const active = pathname === to;
  return (
    <a href={to} className={`${className}${active ? " active" : ""}`} aria-current={active ? "page" : undefined} {...props} />
  );
}

export function useLocation() { return { pathname: useContext(PublicPathContext), hash: "" }; }
