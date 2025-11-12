// src/services/api.ts
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:8888/api';

export const api = {
  // ========== USERS ==========
  async getUsers() {
    const response = await fetch(`${API_URL}/users`);
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  },

  async createUser(user: any) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!response.ok) throw new Error('Failed to create user');
    return response.json();
  },

  async approveUser(id: string) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    if (!response.ok) throw new Error('Failed to approve user');
    return response.json();
  },

  // 🆕 NUEVO: Actualizar status del usuario
  async updateUserStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
    const response = await fetch(`${API_URL}/users`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    if (!response.ok) throw new Error('Failed to update user status');
    return response.json();
  },

  // 🆕 NUEVO: Borrar usuario
  async deleteUser(id: string, cascade: boolean = false) {
    const response = await fetch(`${API_URL}/users`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, cascade })
    });
    if (!response.ok) throw new Error('Failed to delete user');
    return response.json();
  },

  // ========== ORDERS ==========
  async getOrders(phone?: string) {
    const url = phone 
      ? `${API_URL}/orders?phone=${encodeURIComponent(phone)}`
      : `${API_URL}/orders`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch orders');
    return response.json();
  },

  async createOrder(order: any) {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order)
    });
    if (!response.ok) throw new Error('Failed to create order');
    return response.json();
  },

  async updateOrderStatus(id: string, status: string) {
    const response = await fetch(`${API_URL}/orders`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    if (!response.ok) throw new Error('Failed to update order status');
    return response.json();
  },

  // ========== STATISTICS ==========
  async getStatistics(month?: number, year?: number) {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    
    const response = await fetch(`${API_URL}/statistics?${params}`);
    if (!response.ok) throw new Error('Failed to fetch statistics');
    return response.json();
  },

  async updateStatistics(data: any) {
    const response = await fetch(`${API_URL}/statistics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Failed to update statistics');
    return response.json();
  },

  // ========== ADMIN ==========
  async adminLogin(password: string) {
    const response = await fetch(`${API_URL}/admin-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!response.ok) throw new Error('Failed to login');
    return response.json();
  },

  async resetAdminPassword() {
    const response = await fetch(`${API_URL}/admin-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Failed to reset admin password');
    return response.json();
  },

  // 🆕 NUEVO: Cambiar contraseña admin
  async changeAdminPassword(currentPassword: string, newPassword: string) {
    const response = await fetch(`${API_URL}/admin-change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!response.ok) throw new Error('Failed to change admin password');
    return response.json();
  }

}  