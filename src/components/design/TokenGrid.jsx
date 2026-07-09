import React from "react";
import { tokenGroups } from "../../data.js";

function TokenList({ group }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.12em] text-accent">{group.name}</h3>
      <div className="overflow-hidden rounded-panel border border-border">
        {group.tokens.map((token, i) => {
          const [label, name, value] = token;
          const isColor = value.startsWith("#");
          return (
            <div
              key={name}
              className={`flex items-center gap-3 px-4 py-2.5 ${
                i < group.tokens.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {isColor ? (
                <span className="size-5 shrink-0 rounded border border-border" style={{ background: value }} />
              ) : (
                <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-surface-muted text-[10px] font-bold text-text-muted">
                  Aa
                </span>
              )}
              <span className="min-w-0 flex-1 text-sm font-medium text-text">{label}</span>
              <span className="hidden font-mono text-xs text-text-muted sm:block">{name}</span>
              <span className="shrink-0 font-mono text-xs text-text-subtle">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TokenGrid() {
  return (
    <div className="grid gap-6">
      {tokenGroups.map((group) => (
        <TokenList key={group.name} group={group} />
      ))}
    </div>
  );
}
