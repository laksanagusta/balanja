const PUBLIC_PATHS = new Set(["/", "/login"]);

const PRIVATE_PATHS = new Set([
  "/dashboard",
  "/pos",
  "/products",
  "/stock",
  "/transactions",
  "/settings",
  "/design-system",
]);

export function routeAccess(pathname) {
  if (PUBLIC_PATHS.has(pathname)) return "public";
  if (PRIVATE_PATHS.has(pathname)) return "private";
  return "unknown";
}

export function normalizePath(pathname, isSignedIn, isAuthLoaded = true) {
  const access = routeAccess(pathname);

  if (access === "public") return pathname;
  if (access === "private" && !isAuthLoaded) return pathname;
  if (access === "private") return isSignedIn ? pathname : "/login";
  return isSignedIn ? "/pos" : "/";
}
