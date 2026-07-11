import React from "react";
import { Badge, Button, Icon, Input, Panel, SelectField, Switch } from "../components/primitives.jsx";
import { categories, menuItems } from "../data.js";
import { routes, navGroups, Logo, parsePrice, formatPrice } from "../shared.jsx";
import { CartRow } from "../components/design/CartItemShowcase.jsx";
import { PaymentSummary } from "../components/design/PaymentShowcase.jsx";

function AppSidebar({ collapsed, onNavigate, onNewOrder }) {
  const [openGroups, setOpenGroups] = React.useState(() =>
    Object.fromEntries(navGroups.map((group) => [group.label, true])),
  );

  const toggleGroup = (label) => {
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  };

  const itemPath = (label) => {
    if (label === "Point of Sale") return routes.pos;
    if (label === "Dashboard") return routes.login;
    return routes.designSystem;
  };

  const handleNavClick = (event, label) => {
    event.preventDefault();
    onNavigate(itemPath(label));
  };

  return (
    <aside
      className={`hidden h-full shrink-0 flex-col rounded-panel border border-border bg-surface shadow-panel transition-[width] duration-slow ease-standard md:flex ${
        collapsed ? "w-[68px]" : "w-[260px]"
      }`}
    >
      <div className="flex h-12 items-center px-3">
        <a
          href={routes.pos}
          onClick={(event) => handleNavClick(event, "Point of Sale")}
          className="flex min-w-0 items-center rounded-control px-1.5 py-1 transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span className={`truncate text-base font-semibold text-text ${collapsed ? "sr-only" : ""}`}>Balanja</span>
        </a>
      </div>

      <div className="mt-2 grid gap-2 px-2">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className={`h-9 min-w-9 justify-start px-3 ${collapsed ? "w-9 p-0" : "flex-1"}`}
            aria-label="Create new order"
            onClick={onNewOrder}
          >
            <Icon name="plus" className="size-4 shrink-0" />
            <span className={collapsed ? "sr-only" : "truncate"}>New Order</span>
          </Button>
          {!collapsed && (
            <Button variant="secondary" className="size-9 p-0" aria-label="Search orders" onClick={() => alert("Search opened")}>
              <Icon name="search" className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <nav className="mt-3 grid flex-1 content-start gap-3 overflow-y-auto px-2 pb-2">
        {navGroups.map((group) => (
          <div key={group.label} className="grid gap-1.5">
            <button
              type="button"
              aria-expanded={openGroups[group.label]}
              onClick={() => toggleGroup(group.label)}
              className={`group flex h-7 items-center justify-between rounded-md px-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-text-subtle transition duration-base ease-standard hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                collapsed ? "justify-center" : ""
              }`}
            >
              <span className={collapsed ? "sr-only" : ""}>{group.label}</span>
              <Icon
                name="chevron"
                className={`size-4 transition duration-base ease-standard motion-reduce:transition-none ${
                  collapsed ? "hidden" : ""
                } ${
                  openGroups[group.label] ? "rotate-0" : "-rotate-90"
                }`}
              />
            </button>
            <div
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-slow ease-standard motion-reduce:transition-none ${
                openGroups[group.label] ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div
                className={`grid min-h-0 gap-1 transition duration-slow ease-standard motion-reduce:transition-none ${
                  openGroups[group.label] ? "translate-y-0" : "-translate-y-1"
                }`}
              >
                {group.items.map(([label, icon, active]) => (
                  <a
                    href={itemPath(label)}
                    key={label}
                    onClick={(event) => handleNavClick(event, label)}
                    title={collapsed ? label : undefined}
                    className={`flex h-[42px] items-center gap-3 rounded-control px-3 text-sm font-medium transition ${
                      collapsed ? "justify-center" : ""
                    } ${
                      active
                        ? "bg-accent text-white"
                        : "text-text-muted hover:bg-surface-muted hover:text-text"
                    }`}
                  >
                    <Icon name={icon} className="size-5 shrink-0" />
                    <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </nav>

      <div className="grid gap-1.5 border-t border-border p-2">
        {!collapsed && (
          <div className="rounded-card border border-border bg-surface-muted p-2.5">
            <p className="font-mono text-[10px] font-semibold text-text-subtle">NEW</p>
            <p className="mt-1 text-xs font-semibold text-text">Shift overview</p>
            <p className="mt-1 text-[11px] text-text-muted">Kitchen queue and open tables.</p>
            <button
              type="button"
              onClick={() => onNavigate(routes.designSystem)}
              className="mt-2 text-xs font-semibold text-text transition hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Design notes
            </button>
          </div>
        )}
        <a
          href={routes.designSystem}
          onClick={(event) => {
            event.preventDefault();
            onNavigate(routes.designSystem);
          }}
          className={`sidebar-utility h-9 text-sm ${collapsed ? "justify-center px-0" : ""}`}
          title={collapsed ? "Store Settings" : undefined}
        >
          <Icon name="settings" className="size-5" />
          <span className={collapsed ? "sr-only" : ""}>Store Settings</span>
        </a>
        <button
          type="button"
          className={`sidebar-utility h-9 text-sm ${collapsed ? "justify-center px-0" : ""}`}
          title={collapsed ? "Dark Mode" : undefined}
        >
          <Icon name="moon" className="size-5" />
          <span className={collapsed ? "sr-only" : ""}>Dark Mode</span>
          {!collapsed && (
            <span className="ml-auto">
              <Switch />
            </span>
          )}
        </button>
        <a
          href={routes.designSystem}
          onClick={(event) => {
            event.preventDefault();
            onNavigate(routes.designSystem);
          }}
          className={`sidebar-utility h-9 text-sm ${collapsed ? "justify-center px-0" : ""}`}
          title={collapsed ? "Help Center" : undefined}
        >
          <Icon name="help" className="size-5" />
          <span className={collapsed ? "sr-only" : ""}>Help Center</span>
        </a>
        <div className={`mt-2 flex items-center gap-3 rounded-control border border-border bg-surface p-2 shadow-low ${collapsed ? "justify-center" : ""}`}>
          <img
            src="/images/user-avatar.png"
            alt="Achmad Hakim"
            className="size-9 rounded-lg object-cover"
          />
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-text">Achmad Hakim</p>
                <p className="truncate text-xs font-medium text-text-subtle">Shift manager</p>
              </div>
              <Button variant="ghost" className="size-8 p-0" aria-label="Account menu" onClick={() => alert("Account menu opened")}>
                <Icon name="chevron" className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function AppShell({ children, onNavigate, onNewOrder }) {
  return (
    <div className="h-svh overflow-hidden bg-app-bg p-2">
      <div className="flex h-full gap-2 overflow-hidden">
        <AppSidebar collapsed={false} onNavigate={onNavigate} onNewOrder={onNewOrder} />
        <section className="min-w-0 flex-1 overflow-hidden">
          {children}
        </section>
      </div>
    </div>
  );
}

function MenuCard({ item, onAddToCart }) {
  const [quantity, setQuantity] = React.useState(0);

  const updateQuantity = (direction) => {
    setQuantity((current) => Math.max(0, current + direction));
  };

  const handleAddToCart = () => {
    if (quantity > 0) {
      onAddToCart(item, quantity);
      setQuantity(0);
    }
  };

  return (
    <article className="menu-card-enter flex min-h-[344px] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-low">
      <div className="p-2 pb-0">
        <img
          src={item.image}
          alt=""
          className="aspect-[4/3] w-full rounded-md object-cover"
        />
      </div>
      <div className="grid min-h-[118px] gap-3 p-4 pt-3">
        <Badge>{item.category}</Badge>
        <div className="grid content-start gap-1">
          <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-tight text-text">{item.name}</h3>
          <p className="text-sm font-medium text-text-muted"><span className="font-mono tabular-nums">{item.price}</span> / serving</p>
        </div>
      </div>
      <div className="mt-auto grid gap-2 border-t border-border p-2 min-[1500px]:grid-cols-[minmax(64px,80px)_minmax(90px,1fr)]">
        <div className="grid h-10 min-w-0 grid-cols-3 items-center rounded-md border border-border bg-surface text-center text-base font-semibold text-text">
          <button
            aria-label={`Decrease ${item.name}`}
            className="grid h-full place-items-center transition duration-fast ease-standard hover:bg-surface-muted active:scale-95"
            onClick={() => updateQuantity(-1)}
          >
            <Icon name="minus" className="size-4" />
          </button>
          <span className="number-ticker" key={quantity}>
            {quantity}
          </span>
          <button
            aria-label={`Increase ${item.name}`}
            className="grid h-full place-items-center transition duration-fast ease-standard hover:bg-surface-muted active:scale-95"
            onClick={() => updateQuantity(1)}
          >
            <Icon name="plus" className="size-4" />
          </button>
        </div>
        <Button className="h-10 min-w-0 whitespace-nowrap px-3 text-base leading-none tracking-normal" onClick={handleAddToCart}>
          Add to cart
        </Button>
      </div>
    </article>
  );
}

function MenuSection({ onAddToCart }) {
  const [activeCategory, setActiveCategory] = React.useState("All");
  const visibleItems =
    activeCategory === "All"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  return (
    <main className="flex min-h-0 flex-col border-border bg-surface xl:border-r">
      <div className="shrink-0 grid gap-5 border-b border-border px-6 py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <h1 className="text-2xl font-semibold text-text">Menu</h1>
          <div className="flex h-[42px] w-full max-w-[400px] items-center gap-3 rounded-card border border-border bg-surface px-4 shadow-inner-soft">
            <Icon name="search" className="size-5 text-text-muted" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-text-subtle"
              placeholder="Search foods..."
            />
            <kbd className="rounded-md border border-border bg-surface-muted px-2 py-1 text-xs font-semibold text-text-subtle">
              Cmd K
            </kbd>
          </div>
        </div>
        <div className="relative flex gap-2 overflow-x-auto rounded-control bg-surface-muted p-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`h-10 shrink-0 rounded-md px-5 text-sm font-medium transition ${
                category === activeCategory
                  ? "category-tab-active bg-surface text-text shadow-low"
                  : "text-text-muted hover:bg-surface/70 hover:text-text"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div key={activeCategory} className="menu-grid-transition grid flex-1 auto-rows-max grid-cols-1 content-start items-start gap-3 overflow-y-auto p-6 sm:grid-cols-2 xl:grid-cols-4">
        {visibleItems.length > 0 ? (
          visibleItems.map((item, index) => (
            <div
              key={item.name}
              className="self-start"
              style={{ animationDelay: `${index * 28}ms` }}
            >
              <MenuCard item={item} onAddToCart={onAddToCart} />
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-card border border-border bg-surface-muted p-8 text-center text-sm font-medium text-text-muted">
            No menu items in this category.
          </div>
        )}
      </div>
    </main>
  );
}

function OrderSummary({ cart, onClearCart, onUpdateQty, onRemoveItem }) {
  const [promoCode, setPromoCode] = React.useState("");
  const [discount, setDiscount] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState("cash");
  const [placed, setPlaced] = React.useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.qty * parsePrice(item.price), 0);
  const tax = subtotal * 0.1;
  const grandTotal = subtotal + tax - discount;

  const handleApplyPromo = () => {
    if (promoCode.trim().toUpperCase() === "BALANJA10") {
      setDiscount(subtotal * 0.1);
    } else if (promoCode.trim()) {
      alert("Invalid promo code");
    }
  };

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      alert("Cart is empty");
      return;
    }
    setPlaced(true);
    setTimeout(() => {
      setPlaced(false);
      onClearCart();
    }, 2000);
  };

  return (
    <aside className="flex w-full flex-col bg-surface overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border px-6 py-6">
        <h2 className="text-2xl font-semibold text-text">Order Summary</h2>
        <Icon name="eye" className="size-5 text-text-muted" />
      </div>

      <div className="grid gap-5 border-b border-border px-6 py-6">
        <Input label="Customer Name" placeholder="Enter Name" />
        <SelectField
          label="Table Location"
          value="Select Table"
          options={["Table A1", "Table A2", "Table B1", "Patio 03", "Takeaway Counter"]}
        />
        <SelectField label="Order Type" value="Dine In" options={["Dine In", "Take Away", "Delivery"]} />
      </div>

      <div className="grid gap-3 border-b border-border px-6 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text">Order Items</h2>
          <Button variant="danger" className="h-9 px-3" onClick={onClearCart}>
            <Icon name="trash" className="size-4" />
            Clear
          </Button>
        </div>
        {cart.length > 0 ? (
          cart.map((item) => (
            <CartRow
              key={item.name}
              item={item}
              subtotal={formatPrice(item.qty * parsePrice(item.price))}
              onUpdateQty={(q) => onUpdateQty(item.name, q)}
              onRemove={() => onRemoveItem(item.name)}
            />
          ))
        ) : (
          <p className="text-sm font-medium text-text-muted text-center py-8">
            No items in cart
          </p>
        )}
      </div>

      <div className="mt-auto px-6 py-6">
        <PaymentSummary
          subtotal={subtotal}
          tax={tax}
          discount={discount}
          grandTotal={grandTotal}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          promoCode={promoCode}
          onPromoCodeChange={setPromoCode}
          onApplyPromo={handleApplyPromo}
          onPlaceOrder={handlePlaceOrder}
          placed={placed}
          formatPrice={formatPrice}
        />
      </div>
    </aside>
  );
}

export default function PosPage({ onNavigate }) {
  const [cart, setCart] = React.useState([]);

  const addToCart = (item, qty) => {
    setCart((current) => {
      const existing = current.find((i) => i.name === item.name);
      if (existing) {
        return current.map((i) =>
          i.name === item.name ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [...current, { ...item, qty }];
    });
  };

  const updateQty = (name, qty) => {
    setCart((current) =>
      current.map((i) => (i.name === name ? { ...i, qty } : i)),
    );
  };

  const removeItem = (name) => {
    setCart((current) => current.filter((i) => i.name !== name));
  };

  const clearCart = () => setCart([]);

  return (
    <AppShell onNavigate={onNavigate} onNewOrder={clearCart}>
      <PosSurface
        cart={cart}
        onAddToCart={addToCart}
        onClearCart={clearCart}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
      />
    </AppShell>
  );
}

function PosSurface({ cart, onAddToCart, onClearCart, onUpdateQty, onRemoveItem }) {
  return (
    <Panel className="h-full overflow-hidden">
      <div className="grid h-full xl:grid-cols-[minmax(0,1fr)_400px] min-[1800px]:grid-cols-[minmax(0,1fr)_460px] min-[2200px]:grid-cols-[minmax(0,1fr)_500px]">
        <MenuSection onAddToCart={onAddToCart} />
        <OrderSummary cart={cart} onClearCart={onClearCart} onUpdateQty={onUpdateQty} onRemoveItem={onRemoveItem} />
      </div>
    </Panel>
  );
}
