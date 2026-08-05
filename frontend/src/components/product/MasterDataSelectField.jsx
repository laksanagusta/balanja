import React from "react";
import { FieldError, FloatingPopover, Icon } from "../primitives.jsx";
import { activeMasterOptions } from "../../pos/master-data.js";

export default function MasterDataSelectField({
  entityLabel,
  value,
  items = [],
  error = "",
  disabled = false,
  onChange,
  onBlur,
  onCreate,
  onRestore,
}) {
  const [open, setOpen] = React.useState(false);
  const [createMode, setCreateMode] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [inlineError, setInlineError] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const generatedId = React.useId().replaceAll(":", "");
  const containerRef = React.useRef(null);
  const popoverRef = React.useRef(null);
  const searchRef = React.useRef(null);
  const options = activeMasterOptions(items, value);
  const selected = options.find((option) => option.value === value);
  const normalizedDraft = draft.trim().toLocaleLowerCase("id-ID");
  const filteredOptions = options.filter((option) => option.label.toLocaleLowerCase("id-ID").includes(normalizedDraft));
  const archivedMatch = items.find((item) => !item.active && item.name.trim().toLocaleLowerCase("id-ID") === normalizedDraft);
  const labelId = `${generatedId}-label`;
  const listboxId = `${generatedId}-listbox`;
  const errorId = `${generatedId}-error`;
  const inlineErrorId = `${generatedId}-inline-error`;

  React.useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePress = (event) => {
      if (!containerRef.current?.contains(event.target) && !popoverRef.current?.contains(event.target)) closePopover();
    };
    document.addEventListener("pointerdown", closeOnOutsidePress);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
  }, [open]);

  function closePopover() {
    setOpen(false);
    setCreateMode(false);
    setDraft("");
    setInlineError("");
  }

  function beginCreate() {
    setCreateMode(true);
    setDraft("");
    setInlineError("");
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function selectOption(optionValue) {
    onChange?.(optionValue);
    closePopover();
  }

  async function createInline() {
    if (!draft.trim() || pending) return;
    setPending(true);
    setInlineError("");
    try {
      const saved = await onCreate?.({ name: draft.trim() });
      if (saved?.id) {
        onChange?.(saved.id);
        closePopover();
      }
    } catch (createError) {
      if (createError?.code?.includes("ARCHIVED_NAME_CONFLICT") && createError?.details?.id) {
        setInlineError("Nama ini sudah diarsipkan. Pulihkan item yang lama.");
      } else {
        setInlineError(createError?.message || `Gagal menambah ${entityLabel.toLowerCase()}`);
      }
    } finally {
      setPending(false);
    }
  }

  async function restoreInline() {
    if (!archivedMatch?.id || pending) return;
    setPending(true);
    setInlineError("");
    try {
      await onRestore?.(archivedMatch.id);
      onChange?.(archivedMatch.id);
      closePopover();
    } catch (restoreError) {
      setInlineError(restoreError?.message || `Gagal memulihkan ${entityLabel.toLowerCase()}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={containerRef} className="relative grid gap-2 text-sm font-semibold text-text">
      <span id={labelId}>{entityLabel}</span>
      <button
        type="button"
        aria-labelledby={labelId}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        disabled={disabled}
        onClick={() => (open ? closePopover() : setOpen(true))}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === "Escape") closePopover();
          if (!open && ["ArrowDown", "Enter", " "].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`mobile-input-control flex h-11 items-center justify-between rounded-control border bg-surface px-3.5 text-left text-sm font-medium shadow-inner-soft transition-[border-color,box-shadow] duration-fast ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45 md:h-9 ${
          error ? "border-danger" : open ? "border-border-strong ring-4 ring-accent-soft" : "border-border"
        }`}
      >
        <span className={selected ? "text-text" : "text-text-subtle"}>{selected?.label || `Pilih ${entityLabel.toLowerCase()}`}</span>
        <Icon name="chevron" className={`size-4 text-text-muted transition-transform duration-base ease-standard motion-reduce:transition-none ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <FloatingPopover
          ref={popoverRef}
          anchorRef={containerRef}
          open
          className="overflow-hidden rounded-card border border-border bg-surface shadow-panel"
        >
          <div className="p-2">
            <div className="mobile-search-control flex h-9 items-center gap-2 rounded-control bg-surface-muted px-3">
              <Icon name={createMode ? "plus" : "search"} className="size-4 shrink-0 text-text-subtle" />
              <input
                ref={searchRef}
                autoFocus
                aria-label={createMode ? `Nama ${entityLabel.toLowerCase()} baru` : `Cari ${entityLabel.toLowerCase()}`}
                placeholder={createMode ? `Nama ${entityLabel.toLowerCase()} baru` : `Cari ${entityLabel.toLowerCase()}`}
                value={draft}
                disabled={pending}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setInlineError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    if (createMode) {
                      setCreateMode(false);
                      setDraft("");
                      setInlineError("");
                    } else {
                      closePopover();
                    }
                  }
                  if (event.key === "Enter" && createMode) {
                    event.preventDefault();
                    archivedMatch ? restoreInline() : createInline();
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text outline-none placeholder:text-text-subtle"
              />
            </div>
          </div>

          {!createMode ? (
            <div id={listboxId} role="listbox" aria-labelledby={labelId} className="max-h-56 overflow-y-auto p-1">
              {filteredOptions.length ? filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => selectOption(option.value)}
                  className={`mobile-standard-control flex h-10 w-full items-center justify-between rounded-control px-3 text-left text-sm font-medium transition-colors duration-fast ease-standard hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-focus ${option.value === value ? "bg-surface-muted text-text" : "text-text-muted"}`}
                >
                  <span>{option.label}</span>
                  {option.value === value ? <Icon name="check" className="size-4 text-accent" /> : null}
                </button>
              )) : (
                <p className="px-3 py-4 text-center text-xs font-medium text-text-subtle">Tidak ada {entityLabel.toLowerCase()} yang cocok.</p>
              )}
            </div>
          ) : null}

          <div className="p-1">
            {createMode ? (
              <div className="grid gap-1 p-1">
                {inlineError ? <p id={inlineErrorId} aria-live="polite" className="px-2 text-xs font-medium text-danger">{inlineError}</p> : null}
                <div className="flex items-center justify-end gap-1">
                  <button type="button" disabled={pending} onClick={() => { setCreateMode(false); setDraft(""); setInlineError(""); }} className="mobile-compact-control h-9 rounded-control px-3 text-xs font-semibold text-text-muted hover:bg-surface-muted hover:text-text">
                    Batal
                  </button>
                  <button type="button" disabled={!draft.trim() || pending} onClick={archivedMatch ? restoreInline : createInline} className="mobile-compact-control h-9 rounded-control px-3 text-xs font-semibold text-accent transition-colors duration-fast ease-standard hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-40">
                    {pending ? "Menyimpan…" : archivedMatch ? `Pulihkan “${archivedMatch.name}”` : "Tambah"}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={beginCreate} className="mobile-standard-control flex h-10 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-semibold text-accent transition-colors duration-fast ease-standard hover:bg-accent-soft focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-focus">
                <Icon name="plus" className="size-4" />
                Tambah {entityLabel.toLowerCase()} baru…
              </button>
            )}
          </div>
        </FloatingPopover>
      ) : null}

      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
