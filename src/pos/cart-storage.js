const CART_KEY = "balanja-retail-cart-v1";

export function loadCart(storage = window.localStorage) {
  try {
    const raw = storage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart, storage = window.localStorage) {
  storage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCartStorage(storage = window.localStorage) {
  storage.removeItem(CART_KEY);
}
