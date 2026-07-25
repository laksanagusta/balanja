export function organizationName(firstName) {
  const normalizedFirstName = String(firstName ?? "").trim();
  return normalizedFirstName
    ? `Toko ${normalizedFirstName}`
    : "Toko Saya";
}

export function organizationBootstrapDecision({
  authLoaded,
  signedIn,
  organizationId,
  organizationListLoaded,
  membershipsLoading,
  memberships,
  emptyListVerified,
  failure,
}) {
  if (!authLoaded) return { type: "loading" };
  if (!signedIn) return { type: "bypass" };
  if (organizationId) return { type: "ready" };

  if (!organizationListLoaded || membershipsLoading) {
    return { type: "loading" };
  }

  const existingOrganizationId = memberships?.[0]?.organization?.id;
  if (existingOrganizationId && failure !== "activate") {
    return {
      type: "activate",
      organizationId: existingOrganizationId,
    };
  }

  if (failure) return { type: "error" };
  if (!emptyListVerified) return { type: "revalidate" };
  return { type: "create" };
}
