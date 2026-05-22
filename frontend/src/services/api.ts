import axios, { AxiosResponse } from 'axios';
import {
  Tenant, User, Product, Supplier, PurchaseOrder, Order, StockMovement,
  DashboardStats, LowStockItem, TopSeller, ChartDataPoint,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────────

interface AuthResponse { token: string; user: User; tenant: Tenant }
interface MeResponse { user: User; tenant: Tenant }

export const authAPI = {
  register: (data: { businessName: string; name: string; email: string; password: string }): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string; tenantSlug?: string }): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', data),
  me: (): Promise<AxiosResponse<MeResponse>> =>
    api.get('/auth/me'),
  invite: (data: { name: string; email: string; password: string; role: string }): Promise<AxiosResponse<User>> =>
    api.post('/auth/invite', data),
  getUsers: (): Promise<AxiosResponse<User[]>> =>
    api.get('/auth/users'),
};

// ─── Products ─────────────────────────────────────────────────────────────────

interface ProductListResponse { products: Product[]; total: number; page: number; pages: number }
interface MovementsResponse { movements: StockMovement[]; total: number }

export const productsAPI = {
  list: (params?: Record<string, unknown>): Promise<AxiosResponse<ProductListResponse>> =>
    api.get('/products', { params }),
  get: (id: string): Promise<AxiosResponse<Product>> =>
    api.get(`/products/${id}`),
  create: (data: unknown): Promise<AxiosResponse<Product>> =>
    api.post('/products', data),
  update: (id: string, data: unknown): Promise<AxiosResponse<Product>> =>
    api.put(`/products/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/products/${id}`),
  adjust: (id: string, data: { variantSku: string; quantity: string | number; note?: string }): Promise<AxiosResponse<Product>> =>
    api.post(`/products/${id}/adjust`, data),
  movements: (id: string, params?: Record<string, unknown>): Promise<AxiosResponse<MovementsResponse>> =>
    api.get(`/products/${id}/movements`, { params }),
  categories: (): Promise<AxiosResponse<string[]>> =>
    api.get('/products/categories'),
};

// ─── Suppliers ────────────────────────────────────────────────────────────────

export const suppliersAPI = {
  list: (): Promise<AxiosResponse<Supplier[]>> =>
    api.get('/suppliers'),
  get: (id: string): Promise<AxiosResponse<Supplier>> =>
    api.get(`/suppliers/${id}`),
  create: (data: unknown): Promise<AxiosResponse<Supplier>> =>
    api.post('/suppliers', data),
  update: (id: string, data: unknown): Promise<AxiosResponse<Supplier>> =>
    api.put(`/suppliers/${id}`, data),
  delete: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/suppliers/${id}`),
};

// ─── Purchase Orders ──────────────────────────────────────────────────────────

interface POListResponse { purchaseOrders: PurchaseOrder[]; total: number; page: number }

export const purchaseOrdersAPI = {
  list: (params?: Record<string, unknown>): Promise<AxiosResponse<POListResponse>> =>
    api.get('/purchase-orders', { params }),
  get: (id: string): Promise<AxiosResponse<PurchaseOrder>> =>
    api.get(`/purchase-orders/${id}`),
  create: (data: unknown): Promise<AxiosResponse<PurchaseOrder>> =>
    api.post('/purchase-orders', data),
  update: (id: string, data: unknown): Promise<AxiosResponse<PurchaseOrder>> =>
    api.put(`/purchase-orders/${id}`, data),
  updateStatus: (id: string, status: string): Promise<AxiosResponse<PurchaseOrder>> =>
    api.patch(`/purchase-orders/${id}/status`, { status }),
  receive: (id: string, data: unknown): Promise<AxiosResponse<PurchaseOrder>> =>
    api.post(`/purchase-orders/${id}/receive`, data),
};

// ─── Orders ───────────────────────────────────────────────────────────────────

interface OrderListResponse { orders: Order[]; total: number; page: number }

export const ordersAPI = {
  list: (params?: Record<string, unknown>): Promise<AxiosResponse<OrderListResponse>> =>
    api.get('/orders', { params }),
  get: (id: string): Promise<AxiosResponse<Order>> =>
    api.get(`/orders/${id}`),
  create: (data: unknown): Promise<AxiosResponse<Order>> =>
    api.post('/orders', data),
  cancel: (id: string): Promise<AxiosResponse<Order>> =>
    api.post(`/orders/${id}/cancel`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const dashboardAPI = {
  stats: (): Promise<AxiosResponse<DashboardStats>> =>
    api.get('/dashboard/stats'),
  lowStock: (): Promise<AxiosResponse<LowStockItem[]>> =>
    api.get('/dashboard/low-stock'),
  topSellers: (): Promise<AxiosResponse<TopSeller[]>> =>
    api.get('/dashboard/top-sellers'),
  stockMovements: (): Promise<AxiosResponse<ChartDataPoint[]>> =>
    api.get('/dashboard/stock-movements'),
};
