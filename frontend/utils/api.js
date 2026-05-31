async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? "API request failed");
  }

  return response.json();
}

export const api = {
  getHoldings: () => request("/api/holdings"),
  createHolding: (data) =>
    request("/api/holdings", {
      method: "POST",
      body: JSON.stringify(data)
    }),
  updateHolding: (id, data) =>
    request(`/api/holdings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    }),
  deleteHolding: (id) =>
    request(`/api/holdings/${id}`, {
      method: "DELETE"
    }),
  getTransactions: () => request("/api/transactions"),
  createTransaction: (data) =>
    request("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data)
    }),
  getQuote: (symbols) => request(`/api/quotes?symbol=${encodeURIComponent([].concat(symbols).join(","))}`),
  searchSymbols: (query) => request(`/api/symbol-search?q=${encodeURIComponent(query)}`)
};
