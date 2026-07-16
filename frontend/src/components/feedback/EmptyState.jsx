import React from "react";
import { Icon } from "../primitives.jsx";

export function EmptyState({
  icon = "bag",
  title,
  description,
  action,
  className = "",
  titleClassName = "text-base",
  descriptionClassName = "text-sm",
  borderClassName = "border-2",
}) {
  return (
    <div className={`grid place-items-center gap-3 rounded-card ${borderClassName} border-dashed border-border bg-surface-muted p-8 text-center ${className}`}>
      {icon && (
        <span className="flex size-14 items-center justify-center rounded-full bg-surface text-text-subtle">
          <Icon name={icon} className="size-7" />
        </span>
      )}
      <div>
        <p className={`${titleClassName} font-semibold text-text`}>{title}</p>
        {description && <p className={`mt-0.5 ${descriptionClassName} text-text-muted`}>{description}</p>}
      </div>
      {action}
    </div>
  );
}
