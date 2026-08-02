import React from "react";
import { Button, FieldError, Icon, Input, Switch } from "../primitives.jsx";
import { parseNumberInput } from "../../pos/domain.js";
import {
  attributesKey,
  commitVariantOption,
  countVariantCombinations,
  firstVariantErrorKey,
  variantRowKey,
} from "../../product/product-variant-form.js";

function formatNumberInput(value) {
  if (value === "" || value === null || value === undefined) return "";
  const parsed = parseNumberInput(value);
  if (!Number.isFinite(parsed)) return String(value);
  return new Intl.NumberFormat("id-ID").format(parsed);
}

function normalizeNumberField(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? formatNumberInput(digits) : "";
}

function variantLabel(attributes) {
  return Object.entries(attributes || {}).map(([name, value]) => `${name}: ${value}`).join(" · ");
}

function attributeRowKey(attribute) {
  return attribute.clientId || `attribute-${attribute.name.toLocaleLowerCase("id-ID").replace(/\s+/g, "-")}`;
}

function AttributeTokenField({ attributeId, options, disabled, error, onCommit }) {
  const [draft, setDraft] = React.useState("");
  const [editingIndex, setEditingIndex] = React.useState(-1);
  const [localError, setLocalError] = React.useState("");
  const [ghosts, setGhosts] = React.useState([]);
  const ghostIdRef = React.useRef(0);
  const inputRef = React.useRef(null);
  const tokenRefs = React.useRef([]);
  const fieldId = `${attributeId}-options`;
  const errorId = `${fieldId}-error`;

  const focusToken = (index) => {
    const safeIndex = Math.max(0, Math.min(index, options.length - 1));
    window.requestAnimationFrame(() => tokenRefs.current[safeIndex]?.focus());
  };

  const resetDraft = () => {
    setDraft("");
    setEditingIndex(-1);
    setLocalError("");
  };

  const commitValue = (value = draft, editAt = editingIndex) => {
    const result = commitVariantOption(options, value, editAt);
    if (!result.committed) {
      if (String(value).trim()) setLocalError(result.error);
      return false;
    }
    onCommit(result.options);
    resetDraft();
    window.requestAnimationFrame(() => inputRef.current?.focus());
    return true;
  };

  const commitDraft = () => commitValue();

  const editToken = (index) => {
    setEditingIndex(index);
    setDraft(options[index]);
    setLocalError("");
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  };

  const removeToken = (index) => {
    const nextOptions = options.filter((_, optionIndex) => optionIndex !== index);
    const ghostId = ++ghostIdRef.current;
    setGhosts((current) => [...current, { id: ghostId, label: options[index] }]);
    window.setTimeout(() => {
      setGhosts((current) => current.filter((ghost) => ghost.id !== ghostId));
    }, 160);
    onCommit(nextOptions);
    resetDraft();
    if (nextOptions.length) focusToken(Math.min(index, nextOptions.length - 1));
    else window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitDraft();
      return;
    }
    if (event.key === "Escape" && editingIndex >= 0) {
      event.stopPropagation();
      resetDraft();
      return;
    }
    if ((event.key === "Backspace" || event.key === "ArrowLeft") && !draft && options.length) {
      event.preventDefault();
      focusToken(options.length - 1);
    }
  };

  const handleTokenKeyDown = (event, index) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (index > 0) focusToken(index - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (index < options.length - 1) focusToken(index + 1);
      else inputRef.current?.focus();
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      focusToken(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      inputRef.current?.focus();
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeToken(index);
    }
  };

  return (
    <div className="grid min-w-0 gap-2 text-sm font-semibold text-text">
      <label htmlFor={fieldId}>Pilihan</label>
      <div className="ui-input-hitbox flex min-h-11 min-w-0 items-center md:min-h-9">
        <div
          className={`ui-input-surface flex min-h-9 w-full min-w-0 flex-wrap items-center gap-1.5 rounded-control border bg-surface px-1.5 shadow-inner-soft transition-colors duration-base ease-standard focus-within:outline-1 focus-within:outline-focus/30 motion-reduce:transition-none ${
            error || localError ? "border-danger" : "border-border focus-within:border-border-strong"
          }`}
        >
          {options.map((option, index) => (
            <span
              key={`${attributeId}-${option.toLocaleLowerCase("id-ID")}`}
              className="variant-token-in inline-flex h-7 max-w-full items-center rounded-full border border-border bg-surface-muted text-text transition-[opacity,transform] duration-fast ease-standard motion-reduce:transition-none"
            >
              <button
                ref={(node) => { tokenRefs.current[index] = node; }}
                type="button"
                disabled={disabled}
                aria-label={`Ubah pilihan ${option}`}
                onClick={() => editToken(index)}
                onKeyDown={(event) => handleTokenKeyDown(event, index)}
                className="h-7 min-w-0 whitespace-normal break-words px-2.5 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {option}
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Hapus pilihan ${option}`}
                title={`Hapus pilihan ${option}`}
                onClick={() => removeToken(index)}
                className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-muted after:absolute after:-inset-2 transition-[background-color,color,transform] duration-fast ease-standard hover:bg-danger-soft hover:text-danger active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <Icon name="x" className="size-3.5" />
              </button>
            </span>
          ))}
          <div className="flex min-w-[10rem] flex-1 items-center">
            <input
              ref={inputRef}
              id={fieldId}
              value={draft}
              disabled={disabled}
              aria-invalid={Boolean(error || localError)}
              aria-describedby={error || localError ? errorId : undefined}
              placeholder={options.length ? "Tambah pilihan" : "Ketik pilihan"}
              onChange={(event) => {
                const value = event.target.value;
                if (value.endsWith(",")) {
                  const candidate = value.slice(0, -1);
                  setDraft(candidate);
                  commitValue(candidate, editingIndex);
                } else {
                  setDraft(value);
                  setLocalError("");
                }
              }}
              onKeyDown={handleInputKeyDown}
              onBlur={() => {
                if (draft.trim()) commitDraft();
              }}
              className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm font-medium text-text outline-none placeholder:text-text-subtle"
            />
            <button
              type="button"
              aria-label="Tambahkan pilihan"
              title="Tekan Enter untuk menambahkan pilihan"
              disabled={disabled || !draft.trim()}
              onPointerDown={(event) => event.preventDefault()}
              onClick={commitDraft}
              className="relative grid size-9 shrink-0 place-items-center rounded-control text-text-muted after:absolute after:-inset-1 transition-[background-color,color,transform] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.96] motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-45"
            >
              <Icon name="enter" className="size-4" />
            </button>
          </div>
          {ghosts.map((ghost) => (
            <span
              key={ghost.id}
              aria-hidden="true"
              className="variant-token-out pointer-events-none inline-flex h-7 max-w-full items-center rounded-full border border-border bg-surface-muted px-2.5 text-sm font-medium text-text-muted"
            >
              {ghost.label}
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs font-normal leading-5 text-text-muted">Enter atau koma untuk menambahkan. Pilih token untuk mengubahnya.</p>
      <FieldError id={errorId}>{localError || error}</FieldError>
    </div>
  );
}

function VariantSwitch({ label, checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={`Tersedia untuk dijual, variasi ${label}`}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-text-muted transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
    >
      <Switch checked={checked} tone="success" decorative />
    </button>
  );
}

function PriceField({ id, label, accessibleLabel = label, value, error, disabled, onChange, hideLabel = false }) {
  return (
    <Input
      label={label}
      error={error}
      leftSlot={<span className="text-sm font-medium text-text-muted">Rp</span>}
      className={hideLabel ? "gap-1 [&>label]:sr-only" : ""}
      inputClassName="tabular-nums"
      inputProps={{
        id,
        "aria-label": accessibleLabel,
        value: formatNumberInput(value),
        inputMode: "numeric",
        autoComplete: "off",
        min: 0,
        disabled,
        onChange: (event) => onChange(normalizeNumberField(event.target.value)),
      }}
    />
  );
}

function StockField({ id, label, accessibleLabel = label, value, error, disabled, onChange, hideLabel = false }) {
  return (
    <Input
      label={label}
      error={error}
      className={hideLabel ? "gap-1 [&>label]:sr-only" : ""}
      inputClassName="tabular-nums"
      inputProps={{
        id,
        "aria-label": accessibleLabel,
        value: value === "" || value === null || value === undefined ? "" : String(value),
        inputMode: "numeric",
        autoComplete: "off",
        min: 0,
        step: 1,
        disabled,
        onChange: (event) => onChange(event.target.value.replace(/[^\d]/g, "")),
      }}
    />
  );
}

function BarcodeField({ id, label, value, error, disabled, onChange, onScan, hideLabel = false }) {
  return (
    <div className="grid min-w-0 gap-2 text-sm font-semibold text-text">
      <label htmlFor={id} className={hideLabel ? "sr-only" : ""}>Barcode (opsional)</label>
      <div className="flex min-w-0 items-start gap-2">
        <Input
          placeholder="8991001000011"
          error={error}
          className="min-w-0 flex-1"
          inputClassName="tabular-nums"
          inputProps={{
            id,
            "aria-label": `Barcode (opsional), variasi ${label}`,
            value: value || "",
            autoComplete: "off",
            disabled,
            onChange: (event) => onChange(event.target.value),
          }}
        />
        <button
          type="button"
          aria-label={`Pindai barcode untuk variasi ${label}`}
          title="Pindai barcode"
          disabled={disabled}
          onClick={onScan}
          className="grid size-11 shrink-0 place-items-center rounded-control text-text-muted transition-[background-color,color,transform] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
        >
          <Icon name="scan" className="size-5" />
        </button>
      </div>
    </div>
  );
}

function VariationFields({ variant, rowErrors, disabled, onUpdateVariant, onScanBarcode, stacked = false }) {
  const dataKey = attributesKey(variant.attributes);
  const stableKey = variantRowKey(variant).replace(/[^a-zA-Z0-9_-]/g, "-");
  const label = variantLabel(variant.attributes);
  return (
    <div className={stacked ? "grid gap-4" : "contents"}>
      <PriceField
        id={`variant-${stableKey}-price`}
        label="Harga"
        accessibleLabel={`Harga, variasi ${label}`}
        value={variant.price}
        error={rowErrors.price}
        disabled={disabled}
        hideLabel={!stacked}
        onChange={(value) => onUpdateVariant?.(dataKey, "price", value)}
      />
      <StockField
        id={`variant-${stableKey}-stock`}
        label="Stok"
        accessibleLabel={`Stok, variasi ${label}`}
        value={variant.stock}
        error={rowErrors.stock}
        disabled={disabled}
        hideLabel={!stacked}
        onChange={(value) => onUpdateVariant?.(dataKey, "stock", value)}
      />
      <BarcodeField
        id={`variant-${stableKey}-barcode`}
        label={label}
        value={variant.barcode}
        error={rowErrors.barcode}
        disabled={disabled}
        hideLabel={!stacked}
        onChange={(value) => onUpdateVariant?.(dataKey, "barcode", value)}
        onScan={() => onScanBarcode?.(dataKey)}
      />
      <div className={stacked ? "flex items-center justify-between gap-3" : "flex justify-center"}>
        {stacked && <span className="text-sm font-semibold text-text">Dijual</span>}
        <VariantSwitch
          label={label}
          checked={variant.active !== false}
          disabled={disabled}
          onChange={(value) => onUpdateVariant?.(dataKey, "active", value)}
        />
      </div>
    </div>
  );
}

function BulkActions({ count, disabled, onApplyBulk, onSetAllActive }) {
  const [mode, setMode] = React.useState("");
  const [value, setValue] = React.useState("");
  const triggerRefs = React.useRef({});
  const panelRef = React.useRef(null);

  const close = (restoreFocus = false) => {
    const previousMode = mode;
    setMode("");
    setValue("");
    if (restoreFocus) window.requestAnimationFrame(() => triggerRefs.current[previousMode]?.focus());
  };

  React.useEffect(() => {
    if (!mode) return undefined;
    const focusFrame = window.requestAnimationFrame(() => panelRef.current?.querySelector("input, button")?.focus());
    const handlePointer = (event) => {
      if (!panelRef.current?.contains(event.target) && !triggerRefs.current[mode]?.contains(event.target)) close(false);
    };
    document.addEventListener("pointerdown", handlePointer);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointer);
    };
  }, [mode]);

  const open = (nextMode) => {
    setValue("");
    setMode((current) => (current === nextMode ? "" : nextMode));
  };

  const applyValue = () => {
    if (!value) return;
    const field = mode === "price" ? "price" : "stock";
    onApplyBulk?.({ [field]: value }, `${count} variasi diperbarui.`);
    close(true);
  };

  return (
    <section aria-labelledby="variant-bulk-title" className="relative border-b border-border bg-surface/95 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/80 motion-reduce:transition-none">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="variant-bulk-title" className="mr-auto text-sm font-semibold text-text">Edit massal</h3>
        {[
          ["price", "Atur harga"],
          ["stock", "Atur stok"],
          ["status", "Ubah status"],
        ].map(([key, label]) => (
          <Button
            key={key}
            ref={(node) => { triggerRefs.current[key] = node; }}
            type="button"
            size="sm"
            variant="secondary"
            radius="rounded-full"
            aria-haspopup="dialog"
            aria-expanded={mode === key}
            disabled={disabled || count === 0}
            onClick={() => open(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {mode && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={mode === "price" ? "Atur harga massal" : mode === "stock" ? "Atur stok massal" : "Ubah status semua"}
          className="variant-popover-enter absolute right-0 top-[calc(100%+0.5rem)] z-30 grid w-[min(22rem,calc(100vw-3rem))] gap-3 rounded-panel border border-border bg-surface p-4 shadow-panel"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close(true);
            }
          }}
        >
          <div>
            <p className="text-sm font-semibold text-text">
              {mode === "price" ? "Atur harga" : mode === "stock" ? "Atur stok" : "Ubah status semua"}
            </p>
            <p className="mt-1 text-xs leading-5 text-text-muted">Perubahan akan diterapkan ke {count} variasi dan dapat diurungkan.</p>
          </div>
          {mode === "price" && (
            <PriceField id="bulk-variant-price" label="Harga semua" value={value} disabled={disabled} onChange={setValue} />
          )}
          {mode === "stock" && (
            <StockField id="bulk-variant-stock" label="Stok semua" value={value} disabled={disabled} onChange={setValue} />
          )}
          {mode === "status" ? (
            <div className="grid gap-2">
              <Button type="button" onClick={() => { onSetAllActive?.(true, "Semua variasi diaktifkan."); close(true); }}>Aktifkan semua</Button>
              <Button type="button" onClick={() => { onSetAllActive?.(false, "Semua variasi dinonaktifkan."); close(true); }}>Nonaktifkan semua</Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => close(true)}>Batal</Button>
              <Button type="button" variant="primary" disabled={!value} onClick={applyValue}>
                {mode === "price" ? "Terapkan harga" : "Terapkan stok"}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function VariantUndoToast({ message, disabled, onUndo }) {
  const [state, setState] = React.useState("hidden");
  const [displayMessage, setDisplayMessage] = React.useState("");

  React.useEffect(() => {
    if (message) {
      setDisplayMessage(message);
      setState("entering");
      return undefined;
    }
    if (state === "shown") setState("leaving");
    return undefined;
  }, [message, state]);

  React.useEffect(() => {
    if (state !== "entering") return undefined;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setState("shown"));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [state]);

  React.useEffect(() => {
    if (state !== "leaving") return undefined;
    const timeout = window.setTimeout(() => setState("hidden"), 320);
    return () => window.clearTimeout(timeout);
  }, [state]);

  if (state === "hidden") return null;

  return (
    <div
      className={`fixed bottom-24 left-1/2 z-[60] flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-panel border border-border bg-surface/95 px-4 py-3 text-text shadow-panel backdrop-blur-xl transition-[opacity,translate] duration-slow ease-standard motion-reduce:transition-none ${
        state === "entering" || state === "leaving" ? "translate-y-[calc(100%+5rem)] opacity-0" : ""
      }`}
      role="status"
      aria-live="polite"
    >
      <p className="min-w-0 flex-1 text-sm font-medium">{displayMessage}</p>
      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onUndo}>Urungkan</Button>
    </div>
  );
}

export default function ProductVariantEditor({
  product,
  errors = {},
  disabled = false,
  undoMessage = "",
  onUndo,
  onAddAttribute,
  onRenameAttribute,
  onCommitOptions,
  onDuplicateAttribute,
  onMoveAttribute,
  onRemoveAttribute,
  onUpdateVariant,
  onApplyBulk,
  onSetAllActive,
  onScanBarcode,
}) {
  const [attributeMenu, setAttributeMenu] = React.useState(-1);
  const [orderMenu, setOrderMenu] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const [mobileVariantKey, setMobileVariantKey] = React.useState("");
  const [enteringKey, setEnteringKey] = React.useState(null);
  const [leavingKey, setLeavingKey] = React.useState(null);
  const knownAttributeKeysRef = React.useRef(null);
  const attributeNameRefs = React.useRef([]);
  const attributeMenuRefs = React.useRef([]);
  const attributePopupRefs = React.useRef([]);
  const editorRef = React.useRef(null);
  const attributes = product.attributesConfig || [];
  const variants = product.variants || [];
  const combinationCount = countVariantCombinations(attributes);
  const activeCount = variants.filter((variant) => variant.active !== false).length;
  const hasCompleteMatrix = combinationCount > 0 && variants.length > 0;
  const selectedMobileVariant = variants.find((variant) => attributesKey(variant.attributes) === mobileVariantKey);

  if (knownAttributeKeysRef.current === null) {
    knownAttributeKeysRef.current = new Set(attributes.map(attributeRowKey));
  } else {
    const fresh = attributes.find((attribute) => !knownAttributeKeysRef.current.has(attributeRowKey(attribute)));
    if (fresh) setEnteringKey(attributeRowKey(fresh));
    knownAttributeKeysRef.current = new Set(attributes.map(attributeRowKey));
  }

  React.useEffect(() => {
    if (!enteringKey) return undefined;
    const timeout = window.setTimeout(() => setEnteringKey(null), 320);
    return () => window.clearTimeout(timeout);
  }, [enteringKey]);

  React.useEffect(() => {
    if (mobileVariantKey && !selectedMobileVariant) setMobileVariantKey("");
  }, [mobileVariantKey, selectedMobileVariant]);

  React.useEffect(() => {
    if (attributeMenu < 0) return undefined;
    const handlePointer = (event) => {
      if (!event.target.closest?.("[data-attribute-menu]")) {
        setAttributeMenu(-1);
        setOrderMenu(false);
      }
    };
    document.addEventListener("pointerdown", handlePointer);
    return () => document.removeEventListener("pointerdown", handlePointer);
  }, [attributeMenu]);

  React.useEffect(() => {
    const firstErrorKey = firstVariantErrorKey(errors.variantRows);
    if (!firstErrorKey || !window.matchMedia("(max-width: 767px)").matches) return;
    setMobileVariantKey(firstErrorKey);
  }, [errors.variantFocusRequest]);

  React.useEffect(() => {
    if (!errors.variantFocusRequest || mobileVariantKey !== firstVariantErrorKey(errors.variantRows)) return undefined;
    const frame = window.requestAnimationFrame(() => {
      editorRef.current?.querySelector('.md\\:hidden [aria-invalid="true"]')?.focus?.();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [errors.variantFocusRequest, mobileVariantKey]);

  const closeAttributeMenu = (restoreFocus = false) => {
    const index = attributeMenu;
    setAttributeMenu(-1);
    setOrderMenu(false);
    if (restoreFocus) window.requestAnimationFrame(() => attributeMenuRefs.current[index]?.focus());
  };

  const focusAttributeMenuItem = (index, edge = "first") => {
    window.requestAnimationFrame(() => {
      const items = attributePopupRefs.current[index]?.querySelectorAll('[role="menuitem"]:not([disabled])');
      const target = edge === "last" ? items?.[items.length - 1] : items?.[0];
      target?.focus();
    });
  };

  const cancelPendingDelete = () => {
    const triggerIndex = pendingDelete?.index;
    setPendingDelete(null);
    if (triggerIndex == null) return;
    window.requestAnimationFrame(() => attributeMenuRefs.current[triggerIndex]?.focus());
  };

  const confirmRemoveAttribute = () => {
    const index = pendingDelete?.index;
    if (index == null) return;
    const key = attributeRowKey(attributes[index]);
    setPendingDelete(null);
    setLeavingKey(key);
    window.setTimeout(() => {
      onRemoveAttribute?.(index);
      setLeavingKey(null);
      window.requestAnimationFrame(() => attributeMenuRefs.current[Math.max(0, index - 1)]?.focus());
    }, 320);
  };

  const handleAttributeMenuKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeAttributeMenu(true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = [...event.currentTarget.querySelectorAll('[role="menuitem"]:not([disabled])')];
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1 + items.length) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex].focus();
  };

  const formula = attributes.every((attribute) => attribute.options?.length)
    ? attributes.map((attribute) => `${attribute.options.length} ${attribute.name.toLocaleLowerCase("id-ID")}`).join(" × ")
    : "";

  return (
    <section
      ref={editorRef}
      className="relative grid gap-6 pb-4 text-text"
      aria-labelledby="product-variant-editor-title"
      onKeyDownCapture={(event) => {
        if (event.key === "Escape" && (attributeMenu >= 0 || pendingDelete || mobileVariantKey)) {
          event.stopPropagation();
          if (pendingDelete) cancelPendingDelete();
          else if (mobileVariantKey) setMobileVariantKey("");
          else closeAttributeMenu(true);
        }
        const target = event.target;
        const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
        if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase("id-ID") === "z" && !isTyping) {
          event.preventDefault();
          onUndo?.();
        }
      }}
    >
      <h2 id="product-variant-editor-title" className="sr-only">Matriks variasi produk</h2>

      <section aria-labelledby="variant-attributes-title" className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="variant-attributes-title" className="text-sm font-semibold text-text">Atribut</h3>
            <p className="mt-1 text-xs leading-5 text-text-muted">Susun pilihan yang membentuk kombinasi variasi.</p>
          </div>
          <Button type="button" variant="secondary" aria-label="Tambah atribut" radius="rounded-full" disabled={disabled} onClick={onAddAttribute}>
            <Icon name="plus" className="size-4" />
            Tambah atribut
          </Button>
        </div>

        {pendingDelete && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-danger/20 bg-danger-soft/50 px-4 py-3" role="group" aria-labelledby="remove-attribute-title">
            <p id="remove-attribute-title" className="text-sm font-semibold text-text">Hapus atribut ‘{pendingDelete.name}’?</p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" onClick={cancelPendingDelete}>Batal</Button>
              <Button
                type="button"
                variant="danger"
                onClick={confirmRemoveAttribute}
              >
                Hapus atribut
              </Button>
            </div>
          </div>
        )}

        <div className="divide-y divide-border border-y border-border">
          {attributes.map((attribute, index) => {
            const attributeId = attributeRowKey(attribute);
            return (
              <div
                key={attributeId}
                className={`grid gap-4 py-5 first:pt-4 last:pb-4 ${enteringKey === attributeId ? "attribute-row-enter" : ""} ${leavingKey === attributeId ? "attribute-row-exit" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-subtle">Atribut {index + 1}</p>
                  <div className="relative" data-attribute-menu>
                    <button
                      ref={(node) => { attributeMenuRefs.current[index] = node; }}
                      type="button"
                      aria-label={`Tindakan atribut ${attribute.name || index + 1}`}
                      title={`Tindakan atribut ${attribute.name || index + 1}`}
                      aria-haspopup="menu"
                      aria-expanded={attributeMenu === index}
                      disabled={disabled}
                      onClick={() => {
                        setOrderMenu(false);
                        setAttributeMenu((current) => (current === index ? -1 : index));
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                          event.preventDefault();
                          setOrderMenu(false);
                          setAttributeMenu(index);
                          focusAttributeMenuItem(index, event.key === "ArrowUp" ? "last" : "first");
                        }
                      }}
                      className="grid size-11 place-items-center rounded-control text-text-muted transition-[background-color,color,transform] duration-fast ease-standard hover:bg-surface-muted hover:text-text active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
                    >
                      <Icon name="more" className="size-5" />
                    </button>
                    {attributeMenu === index && (
                      <div
                        ref={(node) => { attributePopupRefs.current[index] = node; }}
                        role="menu"
                        aria-label={`Tindakan atribut ${attribute.name || index + 1}`}
                        className="variant-popover-enter absolute right-0 top-[calc(100%+0.25rem)] z-30 grid w-52 rounded-panel border border-border bg-surface p-1.5 shadow-panel"
                        onKeyDown={handleAttributeMenuKeyDown}
                      >
                        <button role="menuitem" type="button" className="min-h-11 rounded-control px-3 text-left text-sm font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus" onClick={() => { closeAttributeMenu(false); attributeNameRefs.current[index]?.focus(); }}>Ubah nama</button>
                        <button role="menuitem" type="button" className="min-h-11 rounded-control px-3 text-left text-sm font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus" onClick={() => { onDuplicateAttribute?.(index); closeAttributeMenu(true); }}>Duplikat atribut</button>
                        <button role="menuitem" type="button" aria-expanded={orderMenu} className="min-h-11 rounded-control px-3 text-left text-sm font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus" onClick={() => setOrderMenu((current) => !current)}>Ubah urutan</button>
                        {orderMenu && (
                          <div className="grid border-l border-border pl-2">
                            <button role="menuitem" type="button" disabled={index === 0} className="min-h-11 rounded-control px-3 text-left text-sm text-text-muted hover:bg-surface-muted disabled:opacity-40" onClick={() => { onMoveAttribute?.(index, index - 1); closeAttributeMenu(true); }}>Pindah ke atas</button>
                            <button role="menuitem" type="button" disabled={index === attributes.length - 1} className="min-h-11 rounded-control px-3 text-left text-sm text-text-muted hover:bg-surface-muted disabled:opacity-40" onClick={() => { onMoveAttribute?.(index, index + 1); closeAttributeMenu(true); }}>Pindah ke bawah</button>
                          </div>
                        )}
                        <button role="menuitem" type="button" className="min-h-11 rounded-control px-3 text-left text-sm font-semibold text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-danger" onClick={() => { setPendingDelete({ index, name: attribute.name || `Atribut ${index + 1}` }); closeAttributeMenu(false); }}>Hapus atribut</button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(12rem,0.7fr)_minmax(0,1.3fr)] lg:items-start">
                  <Input
                    label="Nama atribut"
                    placeholder="Ukuran"
                    error={errors.attributeRows?.[index]?.name}
                    inputProps={{
                      ref: (node) => { attributeNameRefs.current[index] = node; },
                      value: attribute.name,
                      disabled,
                      onChange: (event) => onRenameAttribute?.(index, event.target.value),
                    }}
                  />
                  <AttributeTokenField
                    attributeId={attributeId}
                    options={attribute.options || []}
                    disabled={disabled}
                    error={errors.attributeRows?.[index]?.options}
                    onCommit={(options) => onCommitOptions?.(index, options)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="sticky top-0 z-20 -mx-1 px-1">
        <BulkActions count={variants.length} disabled={disabled} onApplyBulk={onApplyBulk} onSetAllActive={onSetAllActive} />
      </div>

      <section aria-labelledby="variant-table-title" className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3" aria-live="polite">
          <div>
            <h3 id="variant-table-title" className="text-sm font-semibold text-text">
              {combinationCount ? `${combinationCount} variasi · ${activeCount} dijual` : "Variasi"}
            </h3>
            {formula && attributes.length > 1 && <p className="mt-1 text-xs text-text-muted">{formula} = {combinationCount} variasi</p>}
          </div>
          <p className="text-xs leading-5 text-text-muted">Perubahan kombinasi mempertahankan data yang masih cocok.</p>
        </div>

        {errors.variantSummary?.length > 1 && (
          <div className="border-l-2 border-danger bg-danger-soft/40 px-4 py-3" role="alert">
            <p className="text-sm font-semibold text-text">Periksa {errors.variantSummary.length} masalah sebelum menyimpan.</p>
            <p className="mt-1 text-xs text-text-muted">Masalah pertama ditandai pada kolom yang perlu diperbaiki.</p>
          </div>
        )}

        {hasCompleteMatrix ? (
          <>
            <div className="hidden border-b border-border md:block">
              <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
                <caption className="sr-only">Harga, stok, barcode, dan status jual setiap variasi produk.</caption>
                <thead className="sticky top-[4.25rem] z-10 bg-surface/95 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/85">
                  <tr className="text-xs font-semibold text-text-subtle">
                    <th scope="col" className="w-[18%] border-b border-border px-3 py-3">Variasi</th>
                    <th scope="col" className="w-[18%] border-b border-border px-3 py-3">Harga</th>
                    <th scope="col" className="w-[12%] border-b border-border px-3 py-3">Stok</th>
                    <th scope="col" className="w-[38%] border-b border-border px-3 py-3">Barcode (opsional)</th>
                    <th scope="col" className="w-[14%] border-b border-border px-3 py-3 text-center">Dijual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {variants.map((variant) => {
                    const key = attributesKey(variant.attributes);
                    const label = variantLabel(variant.attributes);
                    const rowErrors = errors.variantRows?.[key] || {};
                    return (
                      <tr key={variantRowKey(variant)} className="align-top transition-[background-color,opacity,transform] duration-fast ease-standard hover:bg-surface-muted/40 motion-reduce:transition-none">
                        <th scope="row" className="px-3 py-3 text-sm font-semibold leading-5 text-text">{label}</th>
                        <td className="px-3 py-3">
                          <PriceField
                            id={`variant-${variantRowKey(variant).replace(/[^a-zA-Z0-9_-]/g, "-")}-price`}
                            label="Harga"
                            accessibleLabel={`Harga, variasi ${label}`}
                            value={variant.price}
                            error={rowErrors.price}
                            disabled={disabled}
                            hideLabel
                            onChange={(value) => onUpdateVariant?.(key, "price", value)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <StockField
                            id={`variant-${variantRowKey(variant).replace(/[^a-zA-Z0-9_-]/g, "-")}-stock`}
                            label="Stok"
                            accessibleLabel={`Stok, variasi ${label}`}
                            value={variant.stock}
                            error={rowErrors.stock}
                            disabled={disabled}
                            hideLabel
                            onChange={(value) => onUpdateVariant?.(key, "stock", value)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <BarcodeField
                            id={`variant-${variantRowKey(variant).replace(/[^a-zA-Z0-9_-]/g, "-")}-barcode`}
                            label={label}
                            value={variant.barcode}
                            error={rowErrors.barcode}
                            disabled={disabled}
                            hideLabel
                            onChange={(value) => onUpdateVariant?.(key, "barcode", value)}
                            onScan={() => onScanBarcode?.(key)}
                          />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <VariantSwitch
                            label={label}
                            checked={variant.active !== false}
                            disabled={disabled}
                            onChange={(value) => onUpdateVariant?.(key, "active", value)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden">
              <div className="divide-y divide-border border-b border-border">
                {variants.map((variant) => {
                  const key = attributesKey(variant.attributes);
                  const label = variantLabel(variant.attributes);
                  const expanded = mobileVariantKey === key;
                  const panelId = `mobile-variant-${variantRowKey(variant).replace(/[^a-zA-Z0-9_-]/g, "-")}-fields`;
                  return (
                    <div key={variantRowKey(variant)}>
                      <button
                        type="button"
                        aria-label={`Buka detail variasi ${label}`}
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={() => setMobileVariantKey((current) => (current === key ? "" : key))}
                        className="flex min-h-[4.75rem] w-full items-center gap-3 py-3 text-left transition-[background-color,transform] duration-fast ease-standard hover:bg-surface-muted/50 active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-semibold text-text">{label}</span>
                          <span className="mt-1 block text-xs tabular-nums text-text-muted">Rp{formatNumberInput(variant.price) || "—"} · Stok {variant.stock === "" ? "—" : variant.stock}</span>
                        </span>
                        <span className="text-xs font-medium text-text-muted">{variant.active !== false ? "Dijual" : "Tidak dijual"}</span>
                        <Icon name="chevron" className={`size-4 text-text-subtle transition-transform duration-base ease-standard motion-reduce:transition-none ${expanded ? "" : "-rotate-90"}`} />
                      </button>
                      <div
                        id={panelId}
                        role="region"
                        aria-label={`Detail variasi ${label}`}
                        className={`variant-panel ${expanded ? "is-open" : ""}`}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="grid gap-4 pb-4">
                            <VariationFields
                              variant={variant}
                              rowErrors={errors.variantRows?.[key] || {}}
                              disabled={disabled}
                              onUpdateVariant={onUpdateVariant}
                              onScanBarcode={onScanBarcode}
                              stacked
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <p className="border-b border-dashed border-border py-8 text-center text-sm leading-6 text-text-muted">
            Tambahkan minimal satu pilihan pada setiap atribut untuk membuat variasi.
          </p>
        )}
      </section>

      {errors.variants && <p className="text-xs font-medium text-danger" role="alert">{errors.variants}</p>}

      <VariantUndoToast message={undoMessage} disabled={disabled} onUndo={onUndo} />
    </section>
  );
}
