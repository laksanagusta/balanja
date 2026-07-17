# Account Popover Settings Design

## Goal

Remove the dedicated System section from the sidebar and place Settings inside the account popover without weakening wayfinding or sign-out safety.

## Approved Structure

The desktop sidebar footer contains only the account control, without a separating top divider. The control owns its visual grouping through a soft border, standard surface, and subtle low shadow. Opening it reveals one source-anchored account popover with three layers:

1. Identity header: avatar context is already visible in the source row, while the popover repeats name and email for confirmation.
2. Neutral account action: `Pengaturan`, with the settings icon, navigates to `/settings` and closes the popover.
3. Destructive session action: `Keluar`, visually separated below Pengaturan and retaining the danger treatment.

The System label, divider, and standalone Settings row are removed from the desktop footer and mobile navigation sheet. Settings remains reachable through the account control on both desktop and mobile; the compact mobile header's account entry continues to be the source.

## Interaction

Selecting Pengaturan uses the existing app navigation callback, closes the account popover, and preserves the current route behavior. The account source remains highlighted while the popover is open. The popover keeps outside-click dismissal and existing sign-out behavior.

Settings and Logout are never styled identically: Settings uses a neutral hover surface, while Logout remains danger-colored and separated by a divider so destructive intent stays explicit.

## Design-System Synchronization

Before production changes:

- Update `frontend/DESIGN.md` to make the account popover the sole Settings entry point.
- Update `NavigationPatternsShowcase` to remove the System group and demonstrate Settings above Logout inside an account popover example.

## Testing

Source-contract tests verify that the shell no longer imports or renders `systemNavItems`, the account popover includes Pengaturan and `routes.settings`, Settings closes through the shared navigation path, and Logout remains visually separated with danger styling. Full frontend tests and the production build must continue to pass.

## Non-Goals

- Changing authentication or sign-out semantics.
- Adding profile-editing, organization switching, or other account commands.
- Changing the primary navigation groups or cashier workflow.
