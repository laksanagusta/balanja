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
import ReportPatternsShowcase from "../components/design/ReportPatternsShowcase.jsx";
import MarketingPatternsShowcase from "../components/design/MarketingPatternsShowcase.jsx";
import ProductPhotoShowcase from "../components/design/ProductPhotoShowcase.jsx";
import NavigationPatternsShowcase from "../components/design/NavigationPatternsShowcase.jsx";
import MasterDataPatternsShowcase from "../components/design/MasterDataPatternsShowcase.jsx";
import OrganizationOnboardingShowcase from "../components/design/OrganizationOnboardingShowcase.jsx";
import EntitlementPatternsShowcase from "../components/design/EntitlementPatternsShowcase.jsx";

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
            <Button type="button" variant="primary" onClick={() => onNavigate(routes.pos)} className="h-[42px]">
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
        <section className="rounded-panel border border-border bg-surface p-4 shadow-low">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Brand identity</p>
          <div className="mt-4 flex items-start gap-4">
            <div className="flex shrink-0 gap-2" aria-label="Approved favicon variations">
              <img src="/favicon.svg" alt="Primary dark favicon" className="size-12" />
              <img src="/favicon-soft.svg" alt="Soft dark favicon" className="size-12" />
              <img src="/favicon-inverse.svg" alt="Inverse light favicon" className="size-12" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-text">Isometric Balanja mark variations</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
                The active browser mark uses the primary dark treatment. Soft and inverse treatments vary only
                the neutral tones; all versions use the same enlarged, uninterrupted three-plane geometry without doors or text.
              </p>
            </div>
          </div>
        </section>
        <TokenGrid />
        <TypographyPanel />
        <MarketingPatternsShowcase />
        <OrganizationOnboardingShowcase />
        <EntitlementPatternsShowcase />
        <section className="rounded-panel border border-border bg-surface p-4 shadow-low">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">Login page pattern</p>
          <h3 className="mt-2 text-xl font-semibold text-text">Centered sign-in surface without top bar</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
            The login route uses dynamic viewport height and one full-width, max-400px container so a single Clerk card
            stays centered without horizontal overflow from 320px upward. There is no duplicate outer card, header logo
            row, or back button; signed-in confirmation follows the same compact mobile-first geometry.
          </p>
        </section>
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
                Primary flat button
              </Button>
            </div>
          </div>
        </div>
        <PillShowcase />
        <ComponentPrimitives />
        <NavigationPatternsShowcase />
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
        <ProductPhotoShowcase />
        <MasterDataPatternsShowcase />
        <ModalFormShowcase />
        <DataTableShowcase />
        <section className="rounded-panel border border-border bg-surface p-4 shadow-low">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">Operational pattern</p>
          <h3 className="mt-2 text-xl font-semibold text-text">Stock movement dialogs</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
            Perubahan stok memakai pola header dan tabel operasional yang sama plus dialog alasan wajib isi. Pencarian, jenis pergerakan,
            dan Pergerakan baru tetap berada di header halaman. Form pergerakan memakai picker produk searchable dengan debounce yang
            terhubung ke API produk dengan enam hasil, lalu menampilkan stok saat ini, delta bertanda, dan stok setelah perubahan di bawah field.
            Tabel operasional memakai cursor pagination server dengan Sebelumnya dan Berikutnya, ukuran halaman 20, 50, dan 100, tanpa total
            yang tidak terverifikasi. Refetch mempertahankan baris yang ada dengan indikator memperbarui yang ringkas dan opacity yang dilembutkan.
            Kolom audit stok menggunakan label Nama user dari snapshot saat aktivitas dicatat; riwayat lama tanpa nama menampilkan Tidak diketahui, bukan id internal.
          </p>
        </section>
        <EmptyStateShowcase />
        <KpiCardShowcase />
        <DashboardPatternsShowcase />
        <ReportPatternsShowcase />
      </section>
    </main>
  );
}
