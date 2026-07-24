import React from "react";

export default function SettingsNavigation({ items, activeId, onChange }) {
  const navigationRef = React.useRef(null);
  const itemRefs = React.useRef(new Map());

  React.useEffect(() => {
    const navigation = navigationRef.current;
    const activeItem = itemRefs.current.get(activeId);
    if (navigation && activeItem && navigation.scrollWidth > navigation.clientWidth) {
      activeItem.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [activeId]);

  return (
    <nav ref={navigationRef} aria-label="Navigasi pengaturan" className="settings-navigation">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <button
            key={item.id}
            ref={(node) => {
              if (node) itemRefs.current.set(item.id, node);
              else itemRefs.current.delete(item.id);
            }}
            type="button"
            onClick={() => onChange(item.id)}
            data-href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`settings-navigation-item rounded-control border px-3 text-left text-sm font-semibold transition-[background-color,border-color,color] duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              isActive
                ? "border-border bg-surface-muted text-text"
                : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
