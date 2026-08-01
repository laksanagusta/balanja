import React from "react";
import { Button, Icon } from "../primitives.jsx";
import { formatVariantAttributes } from "../../pos/domain.js";

export function VariantSelector({ product, onChoose, onClose }) {
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
  const canAdd = Boolean(matchedVariant) && isComplete && matchedVariant.active && matchedVariant.stock > 0;

  return (
    <div className="variant-selector grid gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text">{product.name}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Tutup"><Icon name="x" className="size-4" /></Button>
      </div>
      {config.map((attr) => (
        <div key={attr.name} className="grid gap-1.5">
          <p className="text-xs font-medium text-text-muted">{attr.name}</p>
          <div className="flex flex-wrap gap-1.5">
            {attr.options.map((option) => {
              const selected = selection[attr.name] === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelection((s) => ({ ...s, [attr.name]: option }))}
                  className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${selected ? "border-accent bg-accent-soft text-accent" : "border-border bg-surface text-text hover:bg-surface-muted"}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {isComplete && matchedVariant && (
        <p className="text-xs text-text-muted">
          {formatVariantAttributes(matchedVariant.attributes)} · stok {matchedVariant.stock} {product.unit || "pcs"}
        </p>
      )}
      <Button variant="primary" disabled={!canAdd} onClick={() => onChoose(matchedVariant)}>
        Tambah ke keranjang
      </Button>
    </div>
  );
}
