const STORAGE_KEY = "codeguardNotifications";
const EVENT_NAME = "codeguard-notifications-changed";
const MAX_ITEMS = 30;

export function getNotifications() {
  try {
    const value = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]",
    );

    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function store(items) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(items.slice(0, MAX_ITEMS)),
  );

  window.dispatchEvent(
    new CustomEvent(EVENT_NAME),
  );
}

export function addNotification({
  type = "info",
  title,
  message,
}) {
  const item = {
    id:
      globalThis.crypto?.randomUUID?.() ||
      `${Date.now()}-${Math.random()}`,
    type,
    title,
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };

  store([item, ...getNotifications()]);
  return item;
}

export function markNotificationsRead() {
  store(
    getNotifications().map((item) => ({
      ...item,
      read: true,
    })),
  );
}

export function clearNotifications() {
  store([]);
}

export const NOTIFICATION_EVENT = EVENT_NAME;
