import React from "react";
import { Button, Icon } from "../primitives.jsx";

function StateCard({ children, label }) {
  return (
    <article className="grid gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle">
        {label}
      </p>
      <div className="flex min-h-72 items-center justify-center rounded-card border border-border bg-app-bg p-6">
        {children}
      </div>
    </article>
  );
}

function BootstrapSurface({ actions, children, icon, role = "status", title }) {
  return (
    <div
      className="w-full max-w-md rounded-panel border border-border bg-surface p-6 text-center shadow-low"
      role={role}
    >
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-card bg-accent-soft text-accent">
        {icon}
      </div>
      <h4 className="text-lg font-semibold text-text">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-text-muted">{children}</p>
      {actions}
    </div>
  );
}

export default function OrganizationOnboardingShowcase() {
  return (
    <section className="grid gap-4 rounded-panel border border-border bg-surface p-4 shadow-low">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-success">
          Authentication pattern
        </p>
        <h3 className="mt-2 text-xl font-semibold text-text">
          Organization onboarding
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
          Blocking states shown before tenant-scoped POS data is mounted.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StateCard label="Loading">
          <BootstrapSurface
            icon={<Icon name="loader" className="size-5" />}
            title="Menyiapkan toko Anda"
          >
            Kami sedang menghubungkan akun Anda ke toko.
          </BootstrapSurface>
        </StateCard>

        <StateCard label="Recoverable error">
          <BootstrapSurface
            actions={
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button type="button" variant="primary">
                  Coba lagi
                </Button>
                <Button type="button">Keluar</Button>
              </div>
            }
            icon={<Icon name="bag" className="size-5" />}
            role="alert"
            title="Toko belum berhasil disiapkan"
          >
            Periksa koneksi Anda, lalu coba lagi. Anda juga dapat keluar dan
            masuk kembali.
          </BootstrapSurface>
        </StateCard>
      </div>
    </section>
  );
}
