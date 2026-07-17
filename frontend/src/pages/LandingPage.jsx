import React from "react";
import { Button, Icon } from "../components/primitives.jsx";
import { Logo, routes } from "../shared.jsx";
import FaqSection from "../landing/FaqSection.jsx";
import PosProductMockup from "../landing/PosProductMockup.jsx";
import { features, navItems, workflowPoints } from "../landing/content.js";
import { scrollIntoViewRespectingMotion, scrollToTopRespectingMotion } from "../landing/motion.js";

function FeatureVisual({ type }) {
  if (type === "barcode") {
    return (
      <div className="grid h-full content-center gap-3 p-5">
        <div className="flex h-11 items-center gap-3 rounded-card border border-border bg-surface px-3 text-xs text-text-muted shadow-low">
          <Icon name="barcode" className="size-5 text-text" />
          <span className="flex-1">Scan barcode produk</span>
          <span className="rounded-control bg-accent px-2 py-1 font-semibold text-white">Pindai</span>
        </div>
        <p className="text-center font-mono text-[10px] tracking-[0.16em] text-text-subtle">8996001600124</p>
      </div>
    );
  }

  if (type === "dashboard") {
    return (
      <div className="grid h-full content-center gap-3 p-4">
        <div className="grid grid-cols-3 gap-2">
          {["Rp4,8jt", "42", "117"].map((value) => <div key={value} className="rounded-control bg-surface p-2 font-mono text-xs font-semibold text-text shadow-low">{value}</div>)}
        </div>
        <svg viewBox="0 0 240 80" className="w-full overflow-visible text-success" fill="none" aria-hidden="true">
          <path d="M2 68C23 60 32 44 50 49s26 17 43 4 26-30 45-25 22 28 42 21 29-31 58-34" stroke="currentColor" strokeWidth="2" />
          <path d="M2 76H238" stroke="var(--color-border)" />
        </svg>
      </div>
    );
  }

  const rows = type === "transactions"
    ? [["TRX-0814", "Rp62.000"], ["TRX-0813", "Rp148.000"], ["TRX-0812", "Rp37.500"]]
    : type === "stock"
      ? [["Kopi Susu", "+24"], ["Matcha Botol", "18"], ["Roti Bawang", "31"]]
      : [["Kopi Susu", "Rp18.000"], ["Matcha Botol", "Rp22.000"], ["Roti Bawang", "Rp16.000"]];

  return (
    <div className="grid h-full content-center p-4">
      <div className="overflow-hidden rounded-card border border-border bg-surface shadow-low">
        <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-3 py-2 text-[10px] text-text-muted">
          <Icon name="search" className="size-3" />
          Cari {type === "transactions" ? "transaksi" : "produk"}
        </div>
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-border px-3 py-2.5 text-[10px] last:border-b-0">
            <span className="font-semibold text-text">{label}</span>
            <span className={type === "stock" && value.startsWith("+") ? "text-success" : "text-text-muted"}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const eyebrowLabelClassName = "text-xs font-mono font-medium uppercase tracking-[0.14em] text-text-subtle";

function PublicHeader({ isSignedIn, onNavigate }) {
  return (
    <header className="public-header sticky top-0 z-30 border-b border-border/70 bg-surface/65 px-4 py-3 backdrop-blur-2xl backdrop-saturate-150 supports-[backdrop-filter]:bg-surface/45 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <button type="button" onClick={() => scrollToTopRespectingMotion(window)} aria-label="Kembali ke bagian atas" className="press-feedback inline-flex min-h-11 min-w-11 items-center rounded-control focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">
          <Logo />
        </button>
        <nav aria-label="Navigasi utama" className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => <a key={item.href} href={item.href} className="press-feedback inline-flex min-h-11 items-center text-sm font-medium text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus">{item.label}</a>)}
        </nav>
        <Button type="button" variant="primary" size="sm" compactVisual className="header-compact-action" onClick={() => onNavigate(isSignedIn ? routes.dashboard : routes.login)}>
          {isSignedIn ? "Buka dashboard" : "Masuk"}
        </Button>
      </div>
    </header>
  );
}

export default function LandingPage({ isSignedIn, onNavigate }) {
  const openApp = () => onNavigate(isSignedIn ? routes.dashboard : routes.login);

  return (
    <div className="min-h-screen scroll-smooth bg-surface text-text antialiased motion-reduce:scroll-auto">
      <PublicHeader isSignedIn={isSignedIn} onNavigate={onNavigate} />
      <main>
        <section className="px-4 pb-12 pt-16 text-center sm:px-6 sm:pb-16 sm:pt-24 lg:pt-28">
          <div className="mx-auto max-w-5xl">
            <p className="marketing-reveal mx-auto inline-flex rounded-full border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-text-muted">Baru — mendukung pemindaian barcode</p>
            <h1 className="marketing-reveal mx-auto mt-6 max-w-4xl text-[42px] font-semibold leading-[0.98] tracking-[-0.055em] text-text sm:text-[58px] lg:text-[72px]" style={{ "--reveal-delay": "60ms" }}>
              Satu tempat untuk jualan, <span className="text-text-subtle">stok, dan transaksi.</span>
            </h1>
            <p className="marketing-reveal mx-auto mt-6 max-w-2xl text-base leading-7 text-text-muted" style={{ "--reveal-delay": "110ms" }}>
              Balanja membantu pemilik dan kasir mengelola penjualan harian tanpa alur yang rumit—cepat dipakai, mudah dipantau.
            </p>
            <div className="marketing-reveal mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row" style={{ "--reveal-delay": "150ms" }}>
              <Button type="button" variant="primary" size="lg" onClick={openApp}>Mulai dengan Balanja</Button>
              <Button type="button" size="lg" onClick={() => scrollIntoViewRespectingMotion(document.querySelector("#fitur"))}>Lihat fiturnya</Button>
            </div>
          </div>
        </section>

        <section className="marketing-reveal mx-auto w-full max-w-[1320px] overflow-hidden rounded-panel px-4 sm:px-6" style={{ "--reveal-delay": "180ms" }}>
          <div className="relative overflow-hidden rounded-panel pt-12 sm:pt-16">
            <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/images/landing/hero-ascii-magic-5.png')" }} />
            <div aria-hidden="true" className="absolute inset-0 bg-accent/20" />
            <div className="relative px-3 pt-3 sm:px-10 lg:px-20">
              <div className="rounded-t-panel bg-white/25 px-2 pt-2 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                <PosProductMockup priority />
              </div>
            </div>
          </div>
        </section>

        <section id="fitur" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-6xl">
            <p className={eyebrowLabelClassName}>Semua yang toko Anda butuhkan</p>
            <h2 className="mt-4 max-w-3xl text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] text-text sm:text-[52px]">Lebih tenang menjalankan operasional harian.</h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-text-muted">Dari transaksi pertama hingga stok terakhir, setiap alat dirancang untuk alur kerja retail yang cepat dan jelas.</p>

            <div className="mt-12 grid gap-4">
              <div className="grid gap-4 lg:grid-cols-12">
                {features.slice(0, 2).map((feature, index) => (
                  <article
                    key={feature.title}
                    className={`grid overflow-hidden rounded-panel border border-border bg-surface shadow-low ${index === 0 ? "lg:col-span-7" : "lg:col-span-5"}`}
                  >
                    <div className="min-h-48 bg-surface-muted">{feature.visual === "pos" ? <div className="p-4"><PosProductMockup compact /></div> : <FeatureVisual type={feature.visual} />}</div>
                    <div className="border-t border-border p-4">
                      <h3 className="text-base font-semibold text-text">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-text-muted">{feature.description}</p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {features.slice(2).map((feature) => (
                  <article key={feature.title} className="grid overflow-hidden rounded-panel border border-border bg-surface shadow-low">
                    <div className="min-h-48 bg-surface-muted">{feature.visual === "pos" ? <div className="p-4"><PosProductMockup compact /></div> : <FeatureVisual type={feature.visual} />}</div>
                    <div className="border-t border-border p-4">
                      <h3 className="text-base font-semibold text-text">{feature.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-text-muted">{feature.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="cara-kerja" className="scroll-mt-24 bg-app-bg px-4 py-20 sm:px-6 sm:py-28 lg:py-36">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16">
            <div>
              <p className={eyebrowLabelClassName}>Satu alur operasional</p>
              <h2 className="mt-4 text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] text-text sm:text-[52px]">Penjualan, stok, dan riwayat tetap terhubung.</h2>
              <p className="mt-5 text-base leading-7 text-text-muted">Setiap transaksi yang selesai menjadi bagian dari operasional toko yang dapat dicari dan dipantau kembali.</p>
              <ul className="mt-8 grid gap-4">
                {workflowPoints.map((point) => <li key={point} className="flex items-start gap-3 text-sm leading-6 text-text-muted"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-white"><Icon name="check" className="size-3" /></span>{point}</li>)}
              </ul>
            </div>
            <div className="overflow-hidden rounded-panel border border-border bg-surface p-3 shadow-panel">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["Penjualan", "Transaksi", "Produk terjual", "Stok menipis"].map((label, index) => <div key={label} className="rounded-card bg-surface-muted p-3"><p className="text-[10px] text-text-muted">{label}</p><p className="mt-2 font-mono text-lg font-semibold text-text">{["Rp4,8jt", "42", "117", "6"][index]}</p></div>)}
              </div>
              <div className="mt-3 rounded-card border border-border p-4">
                <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-text">Tren penjualan</p><p className="mt-1 text-[10px] text-text-muted">7 hari terakhir</p></div><span className="rounded-full bg-success-soft px-2 py-1 text-[10px] font-semibold text-success">Selesai</span></div>
                <svg viewBox="0 0 540 200" className="mt-4 h-[200px] w-full overflow-visible text-accent" fill="none" aria-hidden="true"><path d="M0 188H540M0 136H540M0 84H540M0 32H540" stroke="var(--color-border)"/><path d="M0 158C48 145 57 93 105 109s65 36 105 3 63-79 111-55 55 81 100 58 64-81 119-96" stroke="currentColor" strokeWidth="3"/></svg>
              </div>
            </div>
          </div>
        </section>

        <FaqSection />

        <section className="px-4 py-24 text-center sm:px-6 sm:py-32 lg:py-40">
          <h2 className="mx-auto max-w-3xl text-[42px] font-semibold leading-[1] tracking-[-0.045em] text-text sm:text-[60px]">Operasional toko, tanpa kerumitan.</h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-text-muted">Mulai dari katalog, layani transaksi, lalu pantau toko dari satu sistem yang konsisten.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 min-[420px]:flex-row"><Button type="button" variant="primary" size="lg" onClick={openApp}>Mulai dengan Balanja</Button><Button type="button" size="lg" onClick={() => scrollIntoViewRespectingMotion(document.querySelector("#fitur"))}>Lihat fitur</Button></div>
        </section>
      </main>

      <footer className="px-4 pb-8 sm:px-6">
        <div className="mx-auto max-w-6xl border-t border-border pt-12">
          <div className="grid gap-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
            <div><Logo /><p className="mt-4 max-w-sm text-sm leading-6 text-text-muted">POS sederhana untuk membantu UMKM retail mengelola penjualan, produk, stok, dan transaksi.</p></div>
            <div><p className={eyebrowLabelClassName}>Produk</p><div className="mt-2 grid">{navItems.map((item) => <a key={item.href} href={item.href} className="press-feedback inline-flex min-h-11 items-center text-sm text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">{item.label}</a>)}</div></div>
            <div><p className={eyebrowLabelClassName}>Akses</p><button type="button" onClick={openApp} className="press-feedback mt-2 inline-flex min-h-11 items-center text-sm text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">{isSignedIn ? "Dashboard" : "Masuk"}</button></div>
          </div>
          <div className="mt-12 flex flex-col gap-2 border-t border-border pt-5 text-xs text-text-subtle sm:flex-row sm:items-center sm:justify-between"><span>© balanja · v0.1.4</span><span>Balanja POS</span></div>
        </div>
      </footer>
    </div>
  );
}
