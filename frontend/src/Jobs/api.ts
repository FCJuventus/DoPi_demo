const API_URL = "https://dopi-demo.onrender.com"; // твой бэкенд

export async function apiGet(path: string) {
  const res = await fetch(API_URL + path, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path: string, body?: any) {
  const res = await fetch(API_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body || {})
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const JobsAPI = {
  list: (query = "") => apiGet(`/jobs${query}`),
  get: (id: string) => apiGet(`/jobs/${id}`),
  create: (payload: any) => apiPost(`/jobs`, payload),
  award: (id: string, freelancerUid: string) =>
    apiPost(`/jobs/${id}/award`, { freelancerUid }),
  payStart: (id: string) =>
    apiPost(`/jobs/${id}/pay/start`),
  paid: (id: string, paymentId: string, txid?: string) =>
    apiPost(`/jobs/${id}/paid`, { paymentId, txid }),
  complete: (id: string) => apiPost(`/jobs/${id}/complete`),
  cancel: (id: string) => apiPost(`/jobs/${id}/cancel`)
};

export const AuthAPI = {
  signin: (authResult: any) => apiPost(`/user/signin`, { authResult }),
  signout: () => apiGet(`/user/signout`)
};

export const PaymentsAPI = {
  approve: (paymentId: string) => apiPost(`/payments/approve`, { paymentId }),
  complete: (paymentId: string, txid: string) =>
    apiPost(`/payments/complete`, { paymentId, txid })
};
