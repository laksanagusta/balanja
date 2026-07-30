import React from "react";
import { toast } from "sonner";
import { Button, Icon, Input, Panel } from "../primitives.jsx";
import BackgroundUpdateStatus from "../feedback/BackgroundUpdateStatus.jsx";

function ItemActionsMenu({ itemName, disabled, onRename, onArchive }) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const firstItemRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;

    firstItemRef.current?.focus();
    const closeOnOutsidePress = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(action) {
    setOpen(false);
    action();
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Tindakan untuk ${itemName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="settings-touch-target inline-flex size-11 items-center justify-center rounded-control text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-45"
      >
        <Icon name="more" className="size-5" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`Tindakan untuk ${itemName}`}
          className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded-card border border-border bg-surface p-1 shadow-panel"
        >
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => choose(onRename)}
            className="flex h-10 w-full items-center rounded-control px-3 text-left text-sm font-medium text-text transition-colors duration-fast ease-standard hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-focus"
          >
            Ubah nama
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onArchive)}
            className="flex h-10 w-full items-center rounded-control px-3 text-left text-sm font-medium text-danger transition-colors duration-fast ease-standard hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-focus"
          >
            Arsipkan
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function MasterDataManager({
  singularLabel,
  pluralLabel,
  items = [],
  loading = false,
  onCreate,
  onRename,
  onArchive,
  onRestore,
}) {
  const [draft, setDraft] = React.useState("");
  const [renamingId, setRenamingId] = React.useState("");
  const [renameValue, setRenameValue] = React.useState("");
  const [error, setError] = React.useState("");
  const [pendingId, setPendingId] = React.useState("");

  const activeItems = items.filter((item) => item.active);
  const archivedItems = items.filter((item) => !item.active);

  async function run(action, id = "") {
    setPendingId(id || "__create__");
    setError("");
    try {
      await action();
      return true;
    } catch (actionError) {
      setError(actionError?.message || `Gagal menyimpan ${singularLabel.toLowerCase()}`);
      return false;
    } finally {
      setPendingId("");
    }
  }

  async function archiveItem(item) {
    const archived = await run(() => onArchive?.(item.id), item.id);
    if (!archived) return;

    toast.success(`${singularLabel} diarsipkan`, {
      description: item.name,
      action: {
        label: "Urungkan",
        onClick: () => run(() => onRestore?.(item.id), item.id),
      },
    });
  }

  return (
    <Panel className="master-data-manager">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-text">{pluralLabel}</p>
          <p className="mt-0.5 text-xs leading-5 text-text-muted">Kelola pilihan yang digunakan pada data produk.</p>
        </div>
        <BackgroundUpdateStatus active={loading} label={`Memperbarui ${pluralLabel.toLowerCase()}`} />
      </div>

      <div className="master-data-create p-4">
        <Input
          label={`Tambah ${singularLabel.toLowerCase()}`}
          placeholder={`Nama ${singularLabel.toLowerCase()}`}
          density="compact"
          inputProps={{
            value: draft,
            onChange: (event) => {
              setDraft(event.target.value);
              setError("");
            },
            disabled: pendingId === "__create__",
          }}
        />
        <div className="master-data-actions-single">
          <Button
            className="header-compact-action master-data-field-action settings-touch-target"
            type="button"
            variant="primary"
            size="base"
            compactVisual
            disabled={!draft.trim() || pendingId === "__create__"}
            onClick={async () => {
              const created = await run(() => onCreate?.({ name: draft }), "");
              if (created) setDraft("");
            }}
          >
            <Icon name="plus" className="size-4" />
            Tambah
          </Button>
        </div>
        {error ? <p aria-live="polite" className="master-data-create-error text-xs font-medium text-danger">{error}</p> : null}
      </div>

      <div className={`master-data-list ${loading ? "opacity-70" : ""}`}>
        {activeItems.length === 0 ? (
          <p className="px-4 py-5 text-sm text-text-muted">Belum ada {pluralLabel.toLowerCase()}.</p>
        ) : activeItems.map((item) => (
          <div key={item.id} className="master-data-list-item">
            {renamingId === item.id ? (
              <div className="master-data-rename bg-surface-muted/50 p-4">
                <Input
                  label={`Ubah nama ${singularLabel.toLowerCase()}`}
                  density="compact"
                  inputProps={{
                    autoFocus: true,
                    value: renameValue,
                    onChange: (event) => setRenameValue(event.target.value),
                    disabled: pendingId === item.id,
                    onKeyDown: (event) => {
                      if (event.key === "Escape") setRenamingId("");
                    },
                  }}
                />
                <div className="master-data-actions">
                  <Button className="header-compact-action settings-touch-target" type="button" size="base" variant="ghost" compactVisual onClick={() => setRenamingId("")}>
                    Batal
                  </Button>
                  <Button
                    className="header-compact-action settings-touch-target"
                    type="button"
                    size="base"
                    variant="primary"
                    compactVisual
                    disabled={!renameValue.trim() || pendingId === item.id}
                    onClick={async () => {
                      const renamed = await run(() => onRename?.(item.id, { name: renameValue }), item.id);
                      if (renamed) setRenamingId("");
                    }}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="master-data-item-row min-h-13 items-center px-4 py-1">
                <p className="master-data-item-name text-sm font-medium text-text">{item.name}</p>
                <ItemActionsMenu
                  itemName={item.name}
                  disabled={pendingId === item.id}
                  onRename={() => {
                    setRenamingId(item.id);
                    setRenameValue(item.name);
                    setError("");
                  }}
                  onArchive={() => archiveItem(item)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {archivedItems.length > 0 ? (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-medium text-text-muted transition-colors duration-fast ease-standard hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
            <span>Diarsipkan · {archivedItems.length}</span>
            <Icon name="chevron" className="size-4 transition-transform duration-base ease-standard group-open:rotate-180 motion-reduce:transition-none" />
          </summary>
          <div>
            {archivedItems.map((item) => (
              <div key={item.id} className="master-data-archived-row min-h-13 items-center px-4 py-1">
                <p className="master-data-item-name text-sm font-medium text-text-muted">{item.name}</p>
                <div className="master-data-actions-single">
                  <Button
                    className="settings-touch-target w-full"
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pendingId === item.id}
                    onClick={() => run(() => onRestore?.(item.id), item.id)}
                  >
                    Pulihkan
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </Panel>
  );
}
