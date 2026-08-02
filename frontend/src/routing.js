const PUBLIC_PATHS = new Set(["/", "/login"]);

const PRIVATE_PATHS = new Set([
  "/dashboard",
  "/pos",
  "/products",
  "/stock",
  "/transactions",
  "/reports/sales",
  "/settings",
  "/design-system",
]);

const PRODUCT_EDITOR_PATH = /^\/products\/(?:new|[^/]+\/edit)$/;

export function isProductEditorPath(pathname) {
  return PRODUCT_EDITOR_PATH.test(pathname);
}

export function routeAccess(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return "public";
  if (PRIVATE_PATHS.has(pathname) || isProductEditorPath(pathname)) return "private";
  return "unknown";
}

export function normalizePath(pathname, isSignedIn, isAuthLoaded = true) {
  if (pathname === "/" && !isAuthLoaded) return pathname;
  if (pathname === "/" && isSignedIn) return "/dashboard";

  const access = routeAccess(pathname);

  if (access === "public") return pathname;
  if (access === "private" && !isAuthLoaded) return pathname;
  if (access === "private") return isSignedIn ? pathname : "/login";
  return isSignedIn ? "/dashboard" : "/";
}
