import React from "react";
import { Button, Input, SelectField } from "../primitives.jsx";
import { activeMasterOptions } from "../../pos/master-data.js";

export default function MasterDataSelectField({
  entityLabel,
  value,
  items = [],
  error = "",
  disabled = false,
  onChange,
  onCreate,
  onRestore,
}) {
  const [draft, setDraft] = React.useState("");
  const [inlineError, setInlineError] = React.useState("");
  const options = activeMasterOptions(items, value);

  async function createInline() {
    setInlineError("");
    try {
      const saved = await onCreate?.({ name: draft });
      if (saved?.id) {
        onChange?.(saved.id);
        setDraft("");
      }
    } catch (createError) {
      if (createError?.code?.includes("ARCHIVED_NAME_CONFLICT") && createError?.details?.id) {
        setInlineError("Nama ini sudah diarsipkan. Pulihkan item yang lama.");
      } else {
        setInlineError(createError?.message || `Gagal menambah ${entityLabel.toLowerCase()}`);
      }
    }
  }

  return (
    <div className="grid gap-3">
      <SelectField
        label={entityLabel}
        value={value}
        options={options}
        onChange={onChange}
        error={error}
        disabled={disabled}
      />
      <div className="grid gap-3 rounded-card border border-border bg-surface-muted/50 p-3">
        <Input
          label={`Tambah ${entityLabel.toLowerCase()} baru`}
          error={inlineError}
          inputProps={{ value: draft, onChange: (event) => setDraft(event.target.value), disabled }}
        />
        <div className="flex flex-wrap justify-end gap-2">
          {inlineError ? (
            <Button type="button" size="sm" onClick={() => {
              const archived = items.find((item) => !item.active && item.name.toLowerCase() === draft.trim().toLowerCase());
              if (archived?.id) onRestore?.(archived.id);
            }}>
              Pulihkan
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="primary" disabled={!draft.trim() || disabled} onClick={createInline}>
            Tambah
          </Button>
        </div>
      </div>
    </div>
  );
}
