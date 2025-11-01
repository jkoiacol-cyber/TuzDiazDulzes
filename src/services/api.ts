const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:8888/api';

export const api = {
  // Users
  async getUsers() {
    const response = await fetch(`${API_URL}/users`);
    return response.json();
  },

  async createUser(user: any) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return response.json();
  },

  // Actualizar estado de usuario
  async updateUserStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
    const response = await fetch(`${API_URL}/users`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    return response.json();
  },

  // Borrar usuario (cascade = borrar pedidos también)
  async deleteUser(id: string, cascade: boolean) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, cascade }),
    });
    return response.json();
  },

  // Rotar contraseña admin (servidor genera y envía por email)
  async rotateAdminPassword(currentPassword: string) {
    const response = await fetch(`${API_URL}/admin-rotate-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword }),
    });
    return response.json();
  },

  // (Compat) Aprobar usuario usando el nuevo endpoint (envía status)
  async approveUser(id: string) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'approved' }),
    });
    return response.json();
  },

  // Orders
  async getOrders(phone?: string) {
    const url = phone 
      ? `${API_URL}/orders?phone=${phone}`
      : `${API_URL}/orders`;
    const response = await fetch(url);
    return response.json();
  },

  async createOrder(order: any) {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    return response.json();
  },

  async updateOrderStatus(id: string, status: string) {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    return response.json();
  },

  // Statistics
  async getStatistics(month: number, year: number) {
    const response = await fetch(`${API_URL}/statistics?month=${month}&year=${year}`);
    return response.json();
  },

  async adminLogin(password: string) {
    const response = await fetch(`${API_URL}/admin-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return response.json();
  },

  async updateStatistics(data: any) {
    const response = await fetch(`${API_URL}/statistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};