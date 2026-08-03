import React from "react";
import { Badge, Button } from "../primitives.jsx";

const contactClass = "inline-flex min-h-11 items-center justify-center rounded-button border px-3 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-fast ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:translate-y-px";

export default function QuotaStatus({
  entitlement,
  error = "",
  loading = false,
  contacts = {},
  onRefresh,
  onContact,
}) {
  if (entitlement?.status === "paid_active") return null;

  if (!entitlement) {
    if (loading && !error) {
      return <p role="status" className="text-xs text-text-muted">Memeriksa status paket…</p>;
    }
    return (
      <section role="alert" className="rounded-card border border-warning/20 bg-warning-soft/35 p-3">
        <p className="text-sm font-semibold text-text">Status paket belum dapat diperiksa</p>
        <p className="mt-1 text-xs leading-5 text-text-muted">Periksa koneksi, lalu coba lagi. Keranjang Anda tetap tersimpan.</p>
        <Button type="button" variant="secondary" size="sm" className="mt-2" onClick={onRefresh}>Coba lagi</Button>
      </section>
    );
  }

  const { transactionsUsed = 0, transactionLimit = 50, remaining = 0, canCheckout } = entitlement;
  const exhausted = canCheckout === false || remaining <= 0;
  const urgent = !exhausted && transactionsUsed >= 45;
  const warning = !exhausted && transactionsUsed >= 40;
  const tone = exhausted ? "danger" : urgent || warning ? "warning" : "neutral";
  const label = exhausted
    ? "Kuota trial telah habis"
    : warning || urgent
      ? `${remaining} transaksi trial tersisa`
      : `${transactionsUsed} dari ${transactionLimit} transaksi digunakan`;

  return (
    <section
      aria-live={exhausted ? "assertive" : "polite"}
      className={`rounded-card border p-3 ${exhausted ? "border-danger/20 bg-danger-soft/30" : urgent || warning ? "border-warning/20 bg-warning-soft/30" : "border-border bg-surface-muted/45"}`}
    >
      <Badge tone={tone}>{label}</Badge>
      {warning || urgent || exhausted ? (
        <p className="mt-2 text-xs leading-5 text-text-muted">
          {exhausted
            ? "Data toko tetap tersedia. Hubungi Wipay untuk melanjutkan transaksi tanpa batas."
            : "Hubungi Wipay sebelum kuota habis agar operasional kasir tetap lancar."}
        </p>
      ) : null}
      {warning || urgent || exhausted ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {contacts.whatsapp ? (
            <a
              href={contacts.whatsapp}
              target="_blank"
              rel="noreferrer"
              className={`${contactClass} border-transparent bg-text text-white hover:bg-text/90`}
              onClick={() => onContact?.("upgrade_whatsapp_clicked")}
            >
              Hubungi via WhatsApp
            </a>
          ) : null}
          {contacts.email ? (
            <a
              href={contacts.email}
              className={`${contactClass} border-border bg-surface text-text hover:bg-surface-muted`}
              onClick={() => onContact?.("upgrade_email_clicked")}
            >
              Kirim email
            </a>
          ) : null}
          {exhausted ? <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>Periksa status pembayaran</Button> : null}
        </div>
      ) : null}
    </section>
  );
}
