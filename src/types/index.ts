export interface User {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  approved: boolean;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userAddress: string;
  items: OrderItem[];
  totalPrice: number;
  status: 'pending' | 'processing' | 'completed' | 'archived';
  createdAt: string;
}

export interface Statistics {
  month: number;
  year: number;
  totalOrders: number;
  totalUnits: number;
  totalPrice: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  description?: string;
}