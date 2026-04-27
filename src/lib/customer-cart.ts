export type CustomerCartEntry = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  note: string;
};

export type CustomerCheckoutDraft = {
  customerName: string;
  notes: string;
};

function getCartStorageKey(tableCode: string) {
  return `qr-resto-cart:${tableCode.toUpperCase()}`;
}

function getCheckoutDraftStorageKey(tableCode: string) {
  return `qr-resto-checkout:${tableCode.toUpperCase()}`;
}

export function loadCustomerCart(tableCode: string) {
  if (typeof window === "undefined") {
    return [] as CustomerCartEntry[];
  }

  try {
    const raw = window.sessionStorage.getItem(getCartStorageKey(tableCode));
    if (!raw) {
      return [] as CustomerCartEntry[];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerCartEntry[]) : [];
  } catch {
    return [] as CustomerCartEntry[];
  }
}

export function saveCustomerCart(tableCode: string, cart: CustomerCartEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(getCartStorageKey(tableCode), JSON.stringify(cart));
}

export function clearCustomerCart(tableCode: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getCartStorageKey(tableCode));
}

export function loadCustomerCheckoutDraft(tableCode: string): CustomerCheckoutDraft {
  if (typeof window === "undefined") {
    return { customerName: "", notes: "" };
  }

  try {
    const raw = window.sessionStorage.getItem(getCheckoutDraftStorageKey(tableCode));
    if (!raw) {
      return { customerName: "", notes: "" };
    }

    const parsed = JSON.parse(raw) as Partial<CustomerCheckoutDraft>;
    return {
      customerName: typeof parsed.customerName === "string" ? parsed.customerName : "",
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return { customerName: "", notes: "" };
  }
}

export function saveCustomerCheckoutDraft(tableCode: string, draft: CustomerCheckoutDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    getCheckoutDraftStorageKey(tableCode),
    JSON.stringify(draft),
  );
}

export function clearCustomerCheckoutDraft(tableCode: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getCheckoutDraftStorageKey(tableCode));
}
