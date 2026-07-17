import React from "react";
import { Badge, Button, Icon, Input, Panel } from "../primitives.jsx";

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
  const [archiveId, setArchiveId] = React.useState("");
  const [error, setError] = React.useState("");
  const [pendingId, setPendingId] = React.useState("");

  const activeItems = items.filter((item) => item.active);
  const archivedItems = items.filter((item) => !item.active);

  async function run(action, id = "") {
    setPendingId(id || "__create__");
    setError("");
    try {
      await action();
    } catch (actionError) {
      setError(actionError?.message || `Gagal menyimpan ${singularLabel.toLowerCase()}`);
    } finally {
      setPendingId("");
    }
  }

  return (
    <Panel className="grid gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text">{pluralLabel}</p>
          <p className="text-xs text-text-muted">Urutan alfabetis. Arsip bersifat reversible dan tidak menghapus data produk.</p>
        </div>
        {loading ? <Badge tone="accent">Memperbarui</Badge> : null}
      </div>

      <div className="grid gap-3 rounded-card border border-border bg-surface-muted/50 p-3">
        <Input
          label={`Tambah ${singularLabel.toLowerCase()}`}
          placeholder={`Nama ${singularLabel.toLowerCase()}`}
          error={error}
          inputProps={{
            value: draft,
            onChange: (event) => setDraft(event.target.value),
            disabled: pendingId === "__create__",
          }}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="primary"
            disabled={!draft.trim() || pendingId === "__create__"}
            onClick={() => run(async () => {
              await onCreate?.({ name: draft });
              setDraft("");
            })}
          >
            <Icon name="plus" className="size-4" />
            Tambah
          </Button>
        </div>
      </div>

      <div className={`grid gap-3 ${loading ? "opacity-70" : ""}`}>
        {activeItems.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-card border border-border bg-surface p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text">{item.name}</p>
                <Badge tone="success">Aktif</Badge>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => { setRenamingId(item.id); setRenameValue(item.name); }}>
                  Ubah nama
                </Button>
                <Button type="button" size="sm" variant="danger" onClick={() => setArchiveId(item.id)}>
                  Arsipkan
                </Button>
              </div>
            </div>
            {renamingId === item.id ? (
              <div className="grid gap-3 rounded-card border border-border bg-surface-muted/50 p-3">
                <Input
                  label={`Ubah nama ${singularLabel.toLowerCase()}`}
                  inputProps={{ value: renameValue, onChange: (event) => setRenameValue(event.target.value), disabled: pendingId === item.id }}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" onClick={() => setRenamingId("")}>Batal</Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={!renameValue.trim() || pendingId === item.id}
                    onClick={() => run(async () => {
                      await onRename?.(item.id, { name: renameValue });
                      setRenamingId("");
                    }, item.id)}
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            ) : null}
            {archiveId === item.id ? (
              <div className="grid gap-3 rounded-card border border-danger/20 bg-danger-soft/40 p-3">
                <p className="text-sm text-text">Arsipkan {singularLabel.toLowerCase()} ini? Produk yang sudah terhubung tetap menyimpan referensinya.</p>
                <div className="flex justify-end gap-2">
                  <Button type="button" size="sm" onClick={() => setArchiveId("")}>Batal</Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={pendingId === item.id}
                    onClick={() => run(async () => {
                      await onArchive?.(item.id);
                      setArchiveId("");
                    }, item.id)}
                  >
                    Arsipkan
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <details className="rounded-card border border-border bg-surface p-3">
        <summary className="cursor-pointer text-sm font-semibold text-text">Diarsipkan ({archivedItems.length})</summary>
        <div className="mt-3 grid gap-3">
          {archivedItems.length === 0 ? <p className="text-sm text-text-muted">Belum ada item diarsipkan.</p> : null}
          {archivedItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface-muted/50 p-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text">{item.name}</p>
                <Badge>Diarsipkan</Badge>
              </div>
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={pendingId === item.id}
                onClick={() => run(async () => onRestore?.(item.id), item.id)}
              >
                Pulihkan
              </Button>
            </div>
          ))}
        </div>
      </details>
    </Panel>
  );
}
