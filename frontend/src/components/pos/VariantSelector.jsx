import React from "react";
import { Button } from "../primitives.jsx";
import { formatVariantAttributes } from "../../pos/domain.js";
import { formatPrice } from "../../shared.jsx";

export function VariantSelector({ product, onChoose }) {
  const config = Array.isArray(product.attributesConfig) ? product.attributesConfig : [];
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const [selection, setSelection] = React.useState(() => {
    const initial = {};
    config.forEach((attr) => { if (attr.options.length === 1) initial[attr.name] = attr.options[0]; });
    return initial;
  });

  const matchedVariant = React.useMemo(() => (
    variants.find((v) => config.every((attr) => selection[attr.name] && v.attributes?.[attr.name] === selection[attr.name])) || null
  ), [variants, config, selection]);

  const isComplete = config.length > 0 && config.every((attr) => selection[attr.name]);
  const matchedStock = Number(matchedVariant?.availableStock ?? matchedVariant?.stock) || 0;
  const canAdd = Boolean(matchedVariant) && isComplete && matchedVariant.active !== false && matchedStock > 0;

  const optionAvailable = (attributeName, option) => {
    const candidate = { ...selection, [attributeName]: option };
    return variants.some((variant) => (
      variant.active !== false
      && Number(variant.availableStock ?? variant.stock) > 0
      && config.every((attribute) => !candidate[attribute.name] || variant.attributes?.[attribute.name] === candidate[attribute.name])
    ));
  };

  return (
    <div className="variant-selector grid gap-5 pb-6">
      <p className="text-sm font-semibold text-text">{product.name}</p>
      {config.map((attr) => (
        <fieldset key={attr.name} className="grid gap-2">
          <legend className="text-xs font-semibold text-text-muted">{attr.name}</legend>
          <div className="flex flex-wrap gap-2">
            {attr.options.map((option) => {
              const selected = selection[attr.name] === option;
              const available = optionAvailable(attr.name, option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  disabled={!available}
                  onClick={() => setSelection((s) => ({ ...s, [attr.name]: option }))}
                  className={`min-h-11 rounded-control border px-3.5 text-sm font-semibold transition-[transform,background-color,border-color,color] duration-fast ease-standard active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45 ${selected ? "border-border-strong bg-surface-muted text-text" : "border-border bg-surface text-text hover:bg-surface-muted"}`}
                >
                  {option}{!available ? " · Habis" : ""}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="min-h-12 rounded-card bg-surface-muted p-3" role="status" aria-live="polite">
        {isComplete && matchedVariant ? (
          <div className="flex items-start justify-between gap-4">
            <p className="text-xs leading-5 text-text-muted">
              {formatVariantAttributes(matchedVariant.attributes)}<br />
              {matchedVariant.active === false ? "Tidak aktif" : matchedStock > 0 ? `Stok ${matchedStock} ${product.unit || "pcs"}` : "Stok habis"}
            </p>
            <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-text">{formatPrice(matchedVariant.price)}</p>
          </div>
        ) : (
          <p className="text-xs leading-5 text-text-muted">Pilih semua atribut untuk melihat harga dan stok.</p>
        )}
      </div>
      <Button variant="primary" disabled={!canAdd} onClick={() => onChoose(matchedVariant)}>
        Tambah ke keranjang
      </Button>
    </div>
  );
}
