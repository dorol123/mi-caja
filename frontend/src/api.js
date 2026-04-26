const getToken = () => localStorage.getItem('token');

async function req(method, path, body, isForm = false) {
  const headers = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm && body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

export const api = {
  auth: {
    login: (b) => req('POST', '/auth/login', b),
    register: (b) => req('POST', '/auth/register', b),
    updateMe: (b) => req('PUT', '/auth/me', b),
  },
  orgs: {
    list: () => req('GET', '/orgs'),
    create: (b) => req('POST', '/orgs', b),
    get: (id) => req('GET', `/orgs/${id}`),
    update: (id, b) => req('PUT', `/orgs/${id}`, b),
    join: (code, displayName) => req('POST', '/orgs/join', { code, displayName }),
    settle: (id, b) => req('POST', `/orgs/${id}/settle`, b),
  },
  expenses: {
    list: (orgId) => req('GET', `/orgs/${orgId}/expenses`),
    create: (orgId, fd) => req('POST', `/orgs/${orgId}/expenses`, fd, true),
    update: (orgId, expId, fd) => req('PUT', `/orgs/${orgId}/expenses/${expId}`, fd, true),
  },
  members: {
    list: (orgId) => req('GET', `/orgs/${orgId}/members`),
    pending: (orgId) => req('GET', `/orgs/${orgId}/members/pending`),
    action: (orgId, userId, action, amount, displayName) =>
      req('PUT', `/orgs/${orgId}/members/${userId}`, { action, amount, displayName }),
    movements: (orgId) => req('GET', `/orgs/${orgId}/members/movements`),
  }
};
