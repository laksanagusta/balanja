# Sidebar Compact Footer Design

## Goal

Make the bottom of the desktop sidebar read as one calm, compact footer instead of two competing cards.

## Approved Layout

The `Sistem` section remains discoverable above the account control, but its vertical rhythm becomes tighter:

- A single short divider introduces the footer region.
- The `Sistem` label sits close to its navigation item.
- `Pengaturan` uses the same quiet 36px navigation row as the rest of the sidebar.
- The account control becomes a flat footer row without a permanent border, filled background, or card-like container.
- The account row gains a neutral background only on hover, keyboard focus, or while its menu is open.
- Avatar, name, email, and chevron remain visible and aligned.

The footer uses one spacing system: 8px between related elements, 12px around the complete footer region, and no redundant nested separators.

## Alternatives Considered

### Shrink both existing cards

This reduces height but preserves the visual competition between two elevated blocks.

### Move Settings into the account menu

This produces the cleanest footer but makes a primary system destination less discoverable and adds a navigation step.

### Flat account footer with visible Settings (selected)

This preserves wayfinding while removing the stacked-card appearance and excessive visual weight.

## Interaction

The account row responds immediately on press and keeps the current popover behavior. Its open state uses the same neutral background as hover so the source and popover remain visually connected. The chevron continues to communicate the expanded state.

Keyboard focus remains explicit through the existing focus token. Reduced-motion behavior is unchanged because this adjustment does not introduce new spatial animation.

## Design-System Synchronization

Before changing `AppShell`, update:

- `frontend/DESIGN.md` with the compact footer contract.
- `NavigationPatternsShowcase` so its navigation example includes the flat account footer and correct footer spacing.

The production shell then consumes the same spacing, border, and state rules.

## Testing

Source-contract tests verify that:

- The footer uses one top divider.
- System navigation does not add its own redundant divider.
- The account control has no permanent border or filled background.
- Hover, focus, and open states still provide visible feedback.
- Existing navigation, account menu, test suite, and production build remain valid.

## Non-Goals

- Moving Settings into the account popover.
- Changing account-menu commands or authentication behavior.
- Redesigning the primary navigation groups or mobile navigation sheet.
