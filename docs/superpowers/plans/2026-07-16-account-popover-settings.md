# Account Popover Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the account popover the sole Settings entry point across desktop and mobile.

**Architecture:** Remove standalone system-navigation data and reuse one account-menu content component for desktop and mobile triggers. Keep the desktop popover anchored above the footer and render the mobile popover below the compact header.

**Tech Stack:** React 19, Tailwind CSS 4, Clerk, Node test runner, Vite 7.

---

### Task 1: Synchronize Design Sources

- [ ] Update `frontend/DESIGN.md`, `NavigationPatternsShowcase.jsx`, and `PosProductMockup.jsx` to remove the standalone System section and show Settings inside the account popover.
- [ ] Run `git diff --check` on those files.

### Task 2: Drive the Shell Change with Tests

- [ ] Add failing `AppShell.test.js` assertions that `systemNavItems` is absent, Pengaturan calls `go(routes.settings)`, the account menu separates neutral Settings from danger Logout, and mobile uses the same account menu instead of Clerk `UserButton`.
- [ ] Run the targeted test and verify the expected failure.
- [ ] Remove `systemNavItems` from `shared.jsx`.
- [ ] Extract reusable account-menu content in `AppShell.jsx`, remove standalone System navigation, and add desktop/mobile anchored presentations.
- [ ] Re-run the targeted test and verify it passes.

### Task 3: Verify

- [ ] Run `npm run test`, `npm run build`, and `git diff --check`.
