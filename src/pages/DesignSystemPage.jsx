import React from "react";
import { Button } from "../components/primitives.jsx";
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

export default function DesignSystemPage({ onNavigate }) {
  return (
    <main className="min-h-screen bg-app-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate(routes.login)}
              className="h-[42px] rounded-control px-4 text-sm font-semibold text-text-muted transition hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Login
            </button>
            <Button type="button" onClick={() => onNavigate(routes.pos)} className="h-[42px]">
              Open POS
            </Button>
          </div>
        </div>
      </header>
      <section id="design-system" className="mx-auto grid w-full max-w-[1480px] gap-6 px-4 py-10 sm:px-6">
        <div className="grid gap-2">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-accent">Design system</p>
          <h2 className="text-3xl font-semibold text-text">Balanja POS tokens and components</h2>
          <p className="max-w-3xl text-base leading-7 text-text-muted">
            The page above is built from the same primitives shown here: semantic tokens, dense controls,
            rounded cards, quiet borders, dark purchase actions, and compact operational spacing.
          </p>
        </div>
        <TokenGrid />
        <TypographyPanel />
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">Button sizes</h3>
          <div className="grid gap-4 rounded-panel border border-border bg-surface p-4">
            <div className="flex flex-wrap items-end gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="ghost" size="sm">Small</Button>
              <Button variant="ghost" size="md">Medium</Button>
              <Button variant="ghost" size="lg">Large</Button>
            </div>
          </div>
        </div>
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
        <EmptyStateShowcase />
        <KpiCardShowcase />
      </section>
    </main>
  );
}
