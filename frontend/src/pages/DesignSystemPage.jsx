import React from "react";
import { Button, Icon } from "../components/primitives.jsx";
import { routes, Logo } from "../shared.jsx";
import TokenGrid from "../components/design/TokenGrid.jsx";
import TypographyPanel from "../components/design/TypographyPanel.jsx";
import ComponentPrimitives from "../components/design/ComponentPrimitives.jsx";
import POSPatterns from "../components/design/POSPatterns.jsx";
import MenuCardShowcase from "../components/design/MenuCardShowcase.jsx";
import ModalShowcase from "../components/design/ModalShowcase.jsx";
import NumpadShowcase from "../components/design/NumpadShowcase.jsx";
import ToastShowcase from "../components/design/ToastShowcase.jsx";
import SkeletonShowcase from "../components/design/SkeletonShowcase.jsx";
import EmptyStateShowcase from "../components/design/EmptyStateShowcase.jsx";
import PaymentShowcase from "../components/design/PaymentShowcase.jsx";
import OrderTypeShowcase from "../components/design/OrderTypeShowcase.jsx";
import DataTableShowcase from "../components/design/DataTableShowcase.jsx";
import CartItemShowcase from "../components/design/CartItemShowcase.jsx";
import DialogShowcase from "../components/design/DialogShowcase.jsx";
import ModalFormShowcase from "../components/design/ModalFormShowcase.jsx";
import KpiCardShowcase from "../components/design/KpiCardShowcase.jsx";
import PillShowcase from "../components/design/PillShowcase.jsx";
import DashboardPatternsShowcase from "../components/design/DashboardPatternsShowcase.jsx";

export default function DesignSystemPage({ onNavigate }) {
  return (
    <main className="min-h-screen bg-app-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate(routes.products)}
              className="h-[42px] rounded-control px-4 text-sm font-semibold text-text-muted transition hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Products
            </button>
            <Button type="button" onClick={() => onNavigate(routes.pos)} className="h-[42px]">
              Open POS
            </Button>
          </div>
        </div>
      </header>
      <section id="design-system" className="mx-auto grid w-full max-w-[1480px] gap-6 px-4 py-10 sm:px-6 [&>*]:min-w-0">
        <div className="grid min-w-0 gap-2">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-accent">Design system</p>
          <h2 className="text-3xl font-semibold text-text">Balanja retail POS tokens and components</h2>
          <p className="max-w-3xl text-base leading-7 text-text-muted">
            Retail POS pages must be built from these primitives and composite patterns: semantic tokens,
            dense controls, barcode-first product cards, quiet borders, dark checkout actions, and compact
            operational spacing for UMKM cashier workflows.
          </p>
        </div>
        <TokenGrid />
        <TypographyPanel />
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Button sizes</h3>
          <div className="grid gap-4 rounded-panel border border-border bg-surface p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Button size="xs">text-xs</Button>
              <Button size="sm">text-sm</Button>
              <Button size="base">text-base</Button>
              <Button size="lg">text-lg</Button>
              <Button size="xl">text-xl</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="primary" size="xs">text-xs</Button>
              <Button variant="primary" size="sm">text-sm</Button>
              <Button variant="primary" size="base">text-base</Button>
              <Button variant="primary" size="lg">text-lg</Button>
              <Button variant="primary" size="xl">text-xl</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="ghost" size="xs">text-xs</Button>
              <Button variant="ghost" size="sm">text-sm</Button>
              <Button variant="ghost" size="base">text-base</Button>
              <Button variant="ghost" size="lg">text-lg</Button>
              <Button variant="ghost" size="xl">text-xl</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="primary" size="base">
                <Icon name="scan" className="size-4" />
                Primary 3D button
              </Button>
            </div>
          </div>
        </div>
        <PillShowcase />
        <ComponentPrimitives />
        <POSPatterns />
        <MenuCardShowcase />
        <OrderTypeShowcase />
        <PaymentShowcase />
        <ModalShowcase />
        <NumpadShowcase />
        <ToastShowcase />
        <SkeletonShowcase />
        <CartItemShowcase />
        <DialogShowcase />
        <ModalFormShowcase />
        <DataTableShowcase />
        <section className="rounded-panel border border-border bg-surface p-4 shadow-low">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">Operational pattern</p>
          <h3 className="mt-2 text-xl font-semibold text-text">Stock movement dialogs</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
            Stock changes use the shared compact header and table page pattern plus a required reason dialog. Search, movement type,
            and New movement stay in the page header. Movement forms use a debounced searchable product picker backed by the products
            API with six results, then preview current stock, signed delta, and stock-after below the fields. Refetches preserve the
            existing content with a compact updating indicator and softened opacity while keeping controls usable instead of replacing
            settled content with a skeleton or disabling filters.
            Page-level search fields keep typing immediate and debounce filtering or API work by roughly 220ms across POS, products,
            transactions, and stock.
          </p>
        </section>
        <EmptyStateShowcase />
        <KpiCardShowcase />
        <DashboardPatternsShowcase />
      </section>
    </main>
  );
}
