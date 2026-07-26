import React from "react";
import { Badge, Button } from "../primitives.jsx";

const examples = [
  { used: 12, tone: "neutral", label: "12 dari 50 transaksi digunakan", copy: "Status ringkas tidak mengganggu alur kasir." },
  { used: 40, tone: "warning", label: "10 transaksi trial tersisa", copy: "Peringatan ringan mulai muncul bersama aksi upgrade." },
  { used: 45, tone: "warning", label: "5 transaksi trial tersisa", copy: "Urgensi meningkat tanpa menyembunyikan pembayaran." },
  { used: 50, tone: "danger", label: "Kuota trial telah habis", copy: "Keranjang tetap tersedia; hanya transaksi baru yang diblokir." },
];

export default function EntitlementPatternsShowcase() {
  return (
    <section className="rounded-panel border border-border bg-surface p-4 shadow-low">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Transaction entitlement states</p>
      <h3 className="mt-2 text-xl font-semibold text-text">Kuota terlihat sebelum checkout terhenti</h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-text-muted">
        Trial memakai satu batas yang jujur dan bertahap. Status tetap compact, sementara keadaan habis mempertahankan cart dan menawarkan kanal upgrade yang dikonfigurasi.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {examples.map((example) => (
          <article key={example.used} className={`rounded-card border p-3 ${example.used === 50 ? "border-danger/20 bg-danger-soft/30" : "border-border bg-surface-muted/45"}`}>
            <Badge tone={example.tone}>{example.label}</Badge>
            <p className="mt-3 text-sm leading-6 text-text-muted">{example.copy}</p>
            {example.used >= 40 ? (
              <Button type="button" variant={example.used === 50 ? "primary" : "secondary"} size="sm" className="mt-3">
                {example.used === 50 ? "Upgrade untuk melanjutkan" : "Lihat paket"}
              </Button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
