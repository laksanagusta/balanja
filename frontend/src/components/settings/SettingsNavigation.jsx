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
          <a
            key={item.id}
            ref={(node) => {
              if (node) itemRefs.current.set(item.id, node);
              else itemRefs.current.delete(item.id);
            }}
            href={item.href}
            onClick={(event) => {
              if (
                !onChange
                || event.defaultPrevented
                || event.button !== 0
                || event.metaKey
                || event.ctrlKey
                || event.shiftKey
                || event.altKey
              ) return;
              event.preventDefault();
              onChange(item.id);
            }}
            aria-current={isActive ? "page" : undefined}
            className={`settings-navigation-item inline-flex items-center rounded-control border px-3 text-left text-sm font-semibold no-underline transition-[background-color,border-color,color] duration-base ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              isActive
                ? "border-border bg-surface-muted text-text"
                : "border-transparent text-text-muted hover:bg-surface-muted hover:text-text"
            }`}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
