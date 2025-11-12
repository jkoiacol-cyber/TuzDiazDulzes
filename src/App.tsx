import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { api } from './services/api';

interface User {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  approved: boolean;
  createdAt: string;
  status?: 'pending' | 'approved' | 'rejected';
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  description?: string;
}

interface Order {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userAddress: string;
  items: OrderItem[];
  totalPrice: number;
  status: "pending" | "processing" | "completed" | "archived";
  createdAt: string;
}

interface Statistics {
  month: number;
  year: number;
  totalOrders: number;
  totalUnits: number;
  totalPrice: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    userId?: string;
    userName?: string;
  }>;
}

// Helper function to format currency consistently
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Helper functions para formatear fechas en zona horaria de Chile
const formatChileDateTime = (dateString: string) => {
  const date = new Date(dateString);
  
  const dateFormatted = date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Santiago'
  });
  
  const timeFormatted = date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santiago'
  });
  
  return { dateFormatted, timeFormatted };
};

const formatChileDateTimeFull = (dateString: string) => {
  const date = new Date(dateString);
  
  const dateFormatted = date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santiago'
  });
  
  const timeFormatted = date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'America/Santiago'
  });
  
  return { dateFormatted, timeFormatted };
};

// 🆕 Helper para calcular días hábiles (FUERA de formatChileDateTimeFull)
const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // No es domingo ni sábado
};

const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    if (isWeekday(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

const addBusinessDays = (date: Date, days: number): Date => {
  let count = 0;
  const result = new Date(date);
  
  while (count < days) {
    result.setDate(result.getDate() + 1);
    if (isWeekday(result)) {
      count++;
    }
  }
  
  return result;
};

export default function TuzDiazDulcez() {
  const [isClient, setIsClient] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminLoginAttempt, setAdminLoginAttempt] = useState(false);
  const [currentTab, setCurrentTab] = useState<"cart" | "register" | "orders">(
    "cart"
  );
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statistics, setStatistics] = useState<Statistics[]>([]);

  // User Registration State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [registrationMessage, setRegistrationMessage] = useState("");
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Cart State
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [validationPhone, setValidationPhone] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [animatedProductId, setAnimatedProductId] = useState<string | null>(
    null
  );
  const [lastAddedItem, setLastAddedItem] = useState<OrderItem | null>(null);
  const [showCartBanner, setShowCartBanner] = useState(false);

  // Order Tracking State
  const [userOrdersPhone, setUserOrdersPhone] = useState("");
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [showOrderTracking, setShowOrderTracking] = useState(false);

  // Admin State
  const [adminTab, setAdminTab] = useState<"users" | "orders" | "statistics">(
    "users"
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [statisticsView, setStatisticsView] = useState<"total" | "byUser">(
    "total"
  );
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminTokenExpiry, setAdminTokenExpiry] = useState<number | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showArchivedOrders, setShowArchivedOrders] = useState(false);

  // Available products con imágenes
  const products = [
    {
      id: "1",
      name: "Cheesecake de Frambuesa",
      price: 25000,
      image: "/images/productos/Cheesecake_de_Frambuesa.png",
      description: "Clasico chesscake con deliciosa cubierta de frambuesa",
    },
    {
      id: "2",
      name: "Cheesecake de Maracuyá",
      price: 18000,
      image: "/images/productos/Cheesecake_de_Maracuyá.png",
      description:
        "Chesscake de Maracuyá con glase vibrante de fruta y semillas",
    },

    {
      id: "3",
      name: "Kuchen de Manzana",
      price: 15000,
      image: "/images/productos/Kuchen_de_Manzana.png",
      description: "Deliciosa tarta rellena de manzana",
    },
    {
      id: "4",
      name: "Manjar con Nuez",
      price: 30000,
      image: "/images/productos/Manjar_con_Nuez.png",
      description: "Relleno de nueces con borde en dulce de leche",
    },
    {
      id: "5",
      name: "Mix de Frutos Rojos",
      price: 20000,
      image: "/images/productos/Mix_de_Frutos_Rojos.jpg",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "6",
      name: "Mousse de Fresa",
      price: 20000,
      image: "/images/productos/Mousse_de_Fresa.png",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "7",
      name: "Mousse maracuyá",
      price: 20000,
      image: "/images/productos/Mousse_maracuyá.png",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "8",
      name: "Pankeke de chocolate frambuesa",
      price: 20000,
      image: "/images/productos/Pankeke_de_chocolate_frambuesa.jpg",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "9",
      name: "Pankeke de Maracuyá",
      price: 20000,
      image: "/images/productos/Pankeke_de_maracuyá.jpg",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "10",
      name: "Pankeke de chocolate frambuesa",
      price: 20000,
      image: "/images/productos/Pankeke_de_chocolate_frambuesa.jpg",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "11",
      name: "Pastel Frutos del bosque.png",
      price: 20000,
      image: "/images/productos/Pastel_Frutos_del_bosque.png",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "12",
      name: "Pie de Limón",
      price: 20000,
      image: "/images/productos/Pie_de_Limón.png",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "13",
      name: "Tarta Arandanos",
      price: 20000,
      image: "/images/productos/Tarta_Arandanos.jpg",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "14",
      name: "Tarta Duraznos",
      price: 20000,
      image: "/images/productos/Tarta_Duraznos.jpg",
      description: "Galletas decoradas con glaseado real",
    },
    {
      id: "15",
      name: "Galleta Vienesa",
      price: 20000,
      image: "/images/productos/Galleta_Vienesa.png",
      description: "Galletas decoradas con glaseado real",
    },
  ];

  // Ensure client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load data from API or localStorage (fallback)
  useEffect(() => {
    if (!isClient) return;

    const loadData = async () => {
      try {
        // Intentar cargar desde API
        const [usersData, ordersData] = await Promise.all([
          api.getUsers().catch(() => null),
          api.getOrders().catch(() => null)
        ]);
        
        // Cargar estadísticas por separado, enviando mes y año
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const statsData = await api.getStatistics(currentMonth, currentYear).catch(() => null);

        // Si la API funciona, usar esos datos
        if (usersData) {
          setUsers(usersData);
        } else {
          // Fallback a localStorage si la API falla
          const savedUsers = localStorage.getItem("users");
          if (savedUsers) setUsers(JSON.parse(savedUsers));
        }

        if (ordersData) {
          setOrders(ordersData);
        } else {
          const savedOrders = localStorage.getItem("orders");
          if (savedOrders) setOrders(JSON.parse(savedOrders));
        }

        if (statsData) {
          setStatistics(statsData);
        } else {
          const savedStats = localStorage.getItem("statistics");
          if (savedStats) setStatistics(JSON.parse(savedStats));
        }

      } catch (error) {
        console.error('Error loading data:', error);
        // Si hay error, cargar desde localStorage
        const savedUsers = localStorage.getItem("users");
        const savedOrders = localStorage.getItem("orders");
        const savedStats = localStorage.getItem("statistics");
        
        if (savedUsers) setUsers(JSON.parse(savedUsers));
        if (savedOrders) setOrders(JSON.parse(savedOrders));
        if (savedStats) setStatistics(JSON.parse(savedStats));
      }
    };

    loadData();

    // Admin password siempre local por seguridad
    const savedAdminPassword = localStorage.getItem("adminPassword");
    if (savedAdminPassword) {
      setAdminPassword(savedAdminPassword);
    } else {
      const defaultPassword = "admin123";
      localStorage.setItem("adminPassword", defaultPassword);
      setAdminPassword(defaultPassword);
    }
  }, [isClient]);

  // Save users to API and localStorage (backup)
  useEffect(() => {
    if (!isClient || users.length === 0) return;
    
    // Guardar en localStorage como backup
    localStorage.setItem("users", JSON.stringify(users));
    
    // No sincronizar automáticamente con API para evitar conflictos
    // Los cambios se envían a la API cuando se hacen las acciones (crear, aprobar, etc.)
  }, [users, isClient]);

  // Save orders to API and localStorage (backup)
  useEffect(() => {
    if (!isClient || orders.length === 0) return;
    
    // Guardar en localStorage como backup
    localStorage.setItem("orders", JSON.stringify(orders));
    
    // No sincronizar automáticamente con API
  }, [orders, isClient]);

  // Save statistics to localStorage (backup)
  useEffect(() => {
    if (!isClient || statistics.length === 0) return;
    
    // Guardar en localStorage como backup
    localStorage.setItem("statistics", JSON.stringify(statistics));
  }, [statistics, isClient]);


  // Verificar si el token es válido
  useEffect(() => {
    if (adminToken && adminTokenExpiry) {
      if (Date.now() > adminTokenExpiry) {
        // Token expirado
        setAdminToken(null);
        setAdminTokenExpiry(null);
        setIsAdmin(false);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminTokenExpiry');
      }
    }
  }, [adminToken, adminTokenExpiry]);

  // Cargar token al iniciar
  useEffect(() => {
    if (!isClient) return;
    
    const savedToken = localStorage.getItem('adminToken');
    const savedExpiry = localStorage.getItem('adminTokenExpiry');
    
    if (savedToken && savedExpiry) {
      const expiry = parseInt(savedExpiry);
      if (Date.now() < expiry) {
        setAdminToken(savedToken);
        setAdminTokenExpiry(expiry);
        setIsAdmin(true);
      } else {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminTokenExpiry');
      }
    }
  }, [isClient]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    if (!isAdmin) return;

    const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
      if (!target.closest('[id^="delete-dropdown-"]') && !target.closest('button')) {
        const allDropdowns = document.querySelectorAll('[id^="delete-dropdown-"]');
        allDropdowns.forEach(d => d.classList.add('hidden'));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isAdmin]);

  // 🆕 Recargar estadísticas cuando cambia mes/año o cuando se actualiza un pedido
  useEffect(() => {
    if (!isClient || !isAdmin || adminTab !== 'statistics') return;
    
    const loadStatistics = async () => {
      try {
        console.log('📊 Recargando estadísticas...', { month: selectedMonth, year: selectedYear });
        const data = await api.getStatistics(selectedMonth, selectedYear);
        if (data) {
          setStatistics(data);
          console.log('✅ Estadísticas actualizadas:', data);
        }
      } catch (error) {
        console.error('Error loading statistics:', error);
      }
    };
  
  loadStatistics();
}, [isClient, isAdmin, adminTab, selectedMonth, selectedYear, orders]);


  // Modificar handleRegisterUser para usar API
  const handleRegisterUser = async () => {
    if (!fullName || !phone || !address) {
      setRegistrationMessage("Por favor completa todos los campos");
      return;
    }

    if (users.some((u) => u.phone === phone)) {
      setRegistrationMessage("Este teléfono ya está registrado");
      return;
    }

    const newUser: User = {
      id: Date.now().toString(),
      fullName,
      phone,
      address,
      approved: false,
      createdAt: new Date().toISOString(),
    };

      setIsRegistering(true); // ← AGREGAR

      try {
        // Intentar guardar en la API (si está disponible)
        await Promise.race([
          api.createUser(newUser),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
          )
        ]);
        const updatedUsers = await api.getUsers();
        setUsers(updatedUsers);
      } catch (error) {
        console.log('API no disponible, usando localStorage');
        // Si falla o tarda mucho, guardar localmente
        setUsers([...users, newUser]);
      } finally {
        setIsRegistering(false); // ← AGREGAR
      }

      setShowRegistrationPopup(true);
      setRegistrationMessage("");
      setFullName("");
      setPhone("");
      setAddress("");
  };    

  // Modificar approveUser para usar API
  const approveUser = async (userId: string) => {
    try {
      // Intentar actualizar en la API
      await api.approveUser(userId);
      // Recargar usuarios desde la API
      const updatedUsers = await api.getUsers();
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Error updating in API, using local storage:', error);
      // Si falla, actualizar localmente
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, approved: true } : u))
      );
    }
  };

  // Modificar handlePlaceOrder para usar API
  const handlePlaceOrder = async () => {
    if (!validationPhone) {
      setValidationMessage("Por favor ingresa tu teléfono");
      return;
    }

    const user = users.find(u =>
      u.phone === validationPhone &&
      ((u.status && u.status === 'approved') || (!u.status && u.approved))      
    );
    if (!user) {
      setValidationMessage("Usuario no encontrado o no aprobado");
      return;
    }

    if (cartItems.length === 0) {
      setValidationMessage("El carrito está vacío");
      return;
    }

    setIsPlacingOrder(true); // ← AGREGAR

    const totalPrice = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const newOrder: Order = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.fullName,
      userPhone: user.phone,
      userAddress: user.address,
      items: cartItems,
      totalPrice,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      await Promise.race([
        api.createOrder(newOrder),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);
      const updatedOrders = await api.getOrders();
      setOrders(updatedOrders);
      await updateStatisticsAPI(cartItems, totalPrice, user);
    } catch (error) {
      console.log('API no disponible, usando localStorage');
      setOrders([...orders, newOrder]);
      updateStatistics(cartItems, totalPrice, user);
    } finally {
      setIsPlacingOrder(false); // ← AGREGAR
    }

    setCartItems([]);
    setValidationPhone("");
    setValidationMessage("¡Pedido realizado exitosamente!");
    setShowCartBanner(false);
  };

  // Nueva función para actualizar estadísticas en la API
  const updateStatisticsAPI = async (items: OrderItem[], totalPrice: number, user: User) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

    const statsData = {
      month,
      year,
      totalOrders: 1,
      totalUnits,
      totalPrice,
      items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price * item.quantity,
        userId: user.id,
        userName: user.fullName,
      }))
    };

    try {
      await api.updateStatistics(statsData);
      const updatedStats = await api.getStatistics();
      setStatistics(updatedStats);
    } catch (error) {
      console.error('Error updating statistics in API:', error);
      // Fallback a actualización local
      updateStatistics(items, totalPrice, user);
    }
  };

  // Modificar updateOrderStatus para usar API
  const updateOrderStatus = async (orderId: string, status: Order["status"]) => {
    try {
      // Intentar actualizar en la API
      await api.updateOrderStatus(orderId, status);
      // Recargar pedidos desde la API
      const updatedOrders = await api.getOrders();
      setOrders(updatedOrders);
    } catch (error) {
      console.error('Error updating in API, using local storage:', error);
      // Si falla, actualizar localmente
      setOrders(
        orders.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    }
  };

  // Modificar trackUserOrders para usar API
  const trackUserOrders = async () => {
    if (!userOrdersPhone) {
      alert("Por favor ingresa tu número de teléfono");
      return;
    }

    try {
      // Intentar obtener desde la API
      const userOrdersList = await api.getOrders(userOrdersPhone);
      
      if (userOrdersList.length === 0) {
        alert("No se encontraron pedidos con este número");
        return;
      }

      setUserOrders(userOrdersList);
      setShowOrderTracking(true);
    } catch (error) {
      console.error('Error fetching from API, using local storage:', error);
      
      // Fallback a localStorage
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const userOrdersList = orders.filter((o) => {
        const orderDate = new Date(o.createdAt);
        return (
          o.userPhone === userOrdersPhone &&
          (o.status !== "archived" && o.status !== "archived_hidden" ||
            ((o.status === "archived" || o.status === "archived_hidden") && orderDate >= oneMonthAgo))
        );
      });

      if (userOrdersList.length === 0) {
        alert("No se encontraron pedidos con este número");
        return;
      }

      userOrdersList.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setUserOrders(userOrdersList);
      setShowOrderTracking(true);
    }
  };

  // Handle admin login
  const handleAdminLogin = async () => {
    if (!adminPasswordInput) {
      alert('Por favor ingresa la contraseña');
      return;
    }
  
    setIsLoggingIn(true);
  
    try {
      // Intentar autenticar con la API
      const result = await Promise.race([
        api.adminLogin(adminPasswordInput),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
      ]) as any;
    
      if (result.success && result.token) {
        // Guardar token
        const expiry = Date.now() + result.expiresIn;
        setAdminToken(result.token);
        setAdminTokenExpiry(expiry);
        setIsAdmin(true);
        
        localStorage.setItem('adminToken', result.token);
        localStorage.setItem('adminTokenExpiry', expiry.toString());
        
        setAdminLoginAttempt(false);
        setAdminPasswordInput('');
      } else {
        alert('Contraseña incorrecta');
      }
    } catch (error) {
      console.log('API no disponible, usando contraseña local (solo desarrollo)');
      
      // SOLO PARA DESARROLLO LOCAL
      if (process.env.NODE_ENV === 'development') {
        const localPassword = localStorage.getItem('adminPassword') || 'admin123';
        if (adminPasswordInput === localPassword) {
          setIsAdmin(true);
          setAdminLoginAttempt(false);
          setAdminPasswordInput('');
        } else {
          alert('Contraseña incorrecta');
        }
      } else {
        alert('Error de autenticación. Intenta de nuevo.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Add item to cart with animation
  const addToCart = (product: (typeof products)[0]) => {
    const existingItem = cartItems.find((item) => item.id === product.id);
    if (existingItem) {
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }

    // Trigger animation and banner
    setAnimatedProductId(product.id);
    setLastAddedItem({ ...product, quantity: 1 });
    setShowCartBanner(true);

    setTimeout(() => {
      setAnimatedProductId(null);
    }, 500);

    // Hide banner after 5 seconds
    setTimeout(() => {
      setShowCartBanner(false);
    }, 5000);
  };

  // Remove item from cart
  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter((item) => item.id !== productId));
    if (cartItems.length === 1) {
      setShowCartBanner(false);
    }
  };

  // Update cart quantity
  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(
        cartItems.map((item) =>
          item.id === productId ? { ...item, quantity } : item
        )
      );
    }
  };

  // Update user status (approved / rejected / pending)
  const updateUserStatusFrontend = async (
    userId: string,
    status: 'approved' | 'rejected' | 'pending'
  ) => {
    try {
      await api.updateUserStatus(userId, status);
      const refreshed = await api.getUsers();
      setUsers(refreshed);
    } catch (e) {
      console.error('Error updating user status:', e);
      alert('No se pudo actualizar el estado del usuario');
    }
  };

  // Delete user (only user or user + all orders)
  const deleteUserFrontend = async (userId: string, cascade: boolean) => {
    const ok = confirm(
      cascade
        ? '¿Borrar usuario y TODOS sus pedidos? Esta acción no se puede deshacer.'
        : '¿Borrar solo el usuario? Se borrarán sus pedidos pendientes/en preparación. Los completados quedarán como "huérfanos".'
    );
    if (!ok) return;

      try {
      await api.deleteUser(userId, cascade);

      // Recargar usuarios
      const refreshedUsers = await api.getUsers();
      setUsers(refreshedUsers);

      // 🆕 Si se borraron pedidos (cascade), recargar la lista de pedidos también
      if (cascade) {
        const refreshedOrders = await api.getOrders();
        setOrders(refreshedOrders);
      }

      // Cerrar el dropdown después de borrar
      const dropdown = document.getElementById(`delete-dropdown-${userId}`);
      dropdown?.classList.add('hidden');

      alert('Usuario borrado exitosamente');
    } catch (e: any) {
      console.error('Error deleting user:', e);

      // 🆕 Mensaje más específico según el error
      if (e.message?.includes('foreign key') || e.message?.includes('violates')) {
        alert('No se puede borrar este usuario porque tiene pedidos asociados. Usa la opción "Borrar usuario y sus pedidos" en su lugar.');
      } else {
        alert('No se pudo borrar el usuario: ' + e.message);
      }
    }
  };

  // Update statistics with user info
  const updateStatistics = (
    items: OrderItem[],
    totalPrice: number,
    user: User
  ) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const existingStat = statistics.find(
      (s) => s.month === month && s.year === year
    );
    const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

    if (existingStat) {
      const updatedStats = statistics.map((s) =>
        s.month === month && s.year === year
          ? {
              ...s,
              totalOrders: s.totalOrders + 1,
              totalUnits: s.totalUnits + totalUnits,
              totalPrice: s.totalPrice + totalPrice,
              items: [
                ...s.items,
                ...items.map((item) => ({
                  name: item.name,
                  quantity: item.quantity,
                  price: item.price * item.quantity,
                  userId: user.id,
                  userName: user.fullName,
                })),
              ],
            }
          : s
      );
      setStatistics(updatedStats);
    } else {
      const newStat: Statistics = {
        month,
        year,
        totalOrders: 1,
        totalUnits,
        totalPrice,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price * item.quantity,
          userId: user.id,
          userName: user.fullName,
        })),
      };
      setStatistics([...statistics, newStat]);
    }
  };

  // Export statistics to Excel
  const exportToExcel = () => {
    const stat = statistics.find(
      (s) => s.month === selectedMonth && s.year === selectedYear
    );
    if (!stat) {
      alert("No hay datos para este período");
      return;
    }

    let data: any[] = [];

    if (statisticsView === "total") {
      // 🆕 Vista Total con fecha y hora
      data = stat.items.map((item) => {
        const { dateFormatted, timeFormatted } = item.orderDate 
          ? formatChileDateTime(item.orderDate)
          : { dateFormatted: 'N/A', timeFormatted: 'N/A' };

        return {
          Artículo: item.name,
          Cantidad: item.quantity,
          Precio: item.price,
          Cliente: item.userName || "N/A",
          Fecha: dateFormatted,
          Hora: timeFormatted,
        };
      });
    } else {
      // 🆕 Vista Por Usuario con fecha y hora
      const userGroups = stat.items.reduce((acc: any, item) => {
        const key = item.userName || "Sin usuario";
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {});

      Object.entries(userGroups).forEach(([userName, items]: [string, any]) => {
        data.push({
          Artículo: `CLIENTE: ${userName}`,
          Cantidad: "",
          Precio: "",
          Fecha: "",
          Hora: "",
        });

        items.forEach((item: any) => {
          const { dateFormatted, timeFormatted } = item.orderDate 
            ? formatChileDateTime(item.orderDate)
            : { dateFormatted: 'N/A', timeFormatted: 'N/A' };

          data.push({
            Artículo: `  ${item.name}`,
            Cantidad: item.quantity,
            Precio: item.price,
            Fecha: dateFormatted,
            Hora: timeFormatted,
          });
        });

        const userTotal = items.reduce(
          (sum: number, item: any) => sum + item.price,
          0
        );
        data.push({ 
          Artículo: `  Subtotal`, 
          Cantidad: "", 
          Precio: userTotal,
          Fecha: "",
          Hora: "",
        });
        data.push({ 
          Artículo: "", 
          Cantidad: "", 
          Precio: "",
          Fecha: "",
          Hora: "",
        });
      });
    }

    data.push({
      Artículo: "TOTAL GENERAL",
      Cantidad: stat.totalUnits,
      Precio: stat.totalPrice,
      Fecha: "",
      Hora: "",
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estadísticas");
    XLSX.writeFile(
      workbook,
      `estadisticas-${selectedMonth}-${selectedYear}.xlsx`
    );
  };

  // Calculate total cart price
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50" />
    );
  }

  // Render User Interface
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white p-4 shadow-lg">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl md:text-3xl font-bold">
              🧁 Tuz Diaz Dulzes
            </h1>
            <button
              onClick={() => setAdminLoginAttempt(true)}
              className="text-xs md:text-sm bg-white text-purple-600 px-3 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Admin Login Modal */}
        {adminLoginAttempt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 md:p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Acceso Administrativo</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={e => setAdminPasswordInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleAdminLogin()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAdminLogin}
                    disabled={isLoggingIn}
                    className={`flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg        transition active:scale-95 ${
                      isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isLoggingIn ? 'Ingresando...' : 'Ingresar'}
                  </button>
                  <button
                    onClick={() => {
                      setAdminLoginAttempt(false);
                      setAdminPasswordInput('');
                    }}
                    className="flex-1 bg-gray-300 text-gray-800 font-bold py-3 rounded-lg hover:bg-gray-400 transition active:scale-95"
                  >
                    Cancelar
                  </button>
                </div>

                {/* 🆕 BOTÓN DE RECUPERACIÓN */}
                <div className="border-t pt-4">
                  <button
                    onClick={async () => {
                      const confirm = window.confirm(
                        '¿Resetear contraseña de administrador?\n\n' +
                        'Se generará una nueva contraseña y se enviará por email al administrador y desarrollador.\n\n' +
                        '⚠️ La contraseña actual dejará de funcionar.'
                      );

                      if (!confirm) return;

                      try {
                        const result = await api.resetAdminPassword();

                        if (result.success) {
                          alert(
                            '✅ Nueva contraseña generada exitosamente.\n\n' +
                            result.message + '\n\n' +
                            'Revisa tu correo electrónico.'
                          );
                          setAdminPasswordInput('');
                        } else {
                          alert('❌ Error: ' + (result.error || 'No se pudo resetear la contraseña'));
                        }
                      } catch (error: any) {
                        console.error('Error resetting password:', error);
                        alert('❌ Error al resetear contraseña: ' + error.message);
                      }
                    }}
                    className="w-full text-sm text-purple-600 hover:text-purple-800 hover:underline transition"
                  >
                    🔑 ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Cart Banner */}
        {showCartBanner && lastAddedItem && cartItems.length > 0 && (
          <div 
                  className="fixed bottom-4 right-4 left-4 md:left-auto bg-white rounded-lg shadow-2xl p-3 z-40 max-w-sm cursor-pointer transform transition-all hover:scale-105 active:scale-95"
                  onClick={() => {
                    setCurrentTab('cart');
                    setShowCartBanner(false);
                    // Esperar un momento para que se renderice el tab
                    setTimeout(() => {
                      const cartElement = document.getElementById('cart-summary');
                      if (cartElement) {
                        // En móvil, hacer scroll al carrito
                       if (window.innerWidth < 1024) {
                        cartElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } else {
                        // En desktop, scroll arriba porque el carrito es sticky
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }
              }, 100);
            }}
            onTouchEnd={(e) => {
              e.preventDefault(); // Prevenir doble click en móvil
              setCurrentTab('cart');
              setShowCartBanner(false);
              setTimeout(() => {
                const cartElement = document.getElementById('cart-summary');
                if (cartElement) {
                  if (window.innerWidth < 1024) {
                    cartElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }
              }, 100);
            }}
        >
            <div className="flex items-center gap-2">
              {lastAddedItem.image && (
                <img
                  src={lastAddedItem.image}
                  alt={lastAddedItem.name}
                  className="w-12 h-12 md:w-16 md:h-16 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs md:text-sm text-gray-800 truncate">
                  Agregado al carrito
                </p>
                <p className="text-xs text-gray-600 truncate">
                  {lastAddedItem.name}
                </p>
                <p className="text-xs md:text-sm font-bold text-purple-600">
                  {cartItems.length}{" "}
                  {cartItems.length === 1 ? "producto" : "productos"} •{" "}
                  {formatCurrency(cartTotal)}
                </p>
              </div>
              <div className="bg-purple-600 text-white rounded-full p-1.5 md:p-2 flex-shrink-0">
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  ></path>
                </svg>
              </div>
            </div>
            <div className="mt-1 text-xs text-center text-gray-500">
              Toca para ver carrito completo
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex">
            <button
              onClick={() => setCurrentTab("cart")}
              className={`flex-1 py-4 px-4 text-center font-semibold transition ${
                currentTab === "cart"
                  ? "border-b-4 border-purple-600 text-purple-600"
                  : "text-gray-600 hover:text-purple-600"
              }`}
            >
              🛒 Carrito
            </button>
            <button
              onClick={() => setCurrentTab("register")}
              className={`flex-1 py-4 px-4 text-center font-semibold transition ${
                currentTab === "register"
                  ? "border-b-4 border-purple-600 text-purple-600"
                  : "text-gray-600 hover:text-purple-600"
              }`}
            >
              📝 Registro
            </button>
            <button
              onClick={() => setCurrentTab("orders")}
              className={`flex-1 py-4 px-4 text-center font-semibold transition ${
                currentTab === "orders"
                  ? "border-b-4 border-purple-600 text-purple-600"
                  : "text-gray-600 hover:text-purple-600"
              }`}
            >
              📦 Mis Pedidos
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          {/* Cart Tab */}
          {currentTab === "cart" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Products */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                    Nuestros Productos
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className={`border border-gray-200 rounded-lg p-3 md:p-4 hover:shadow-lg transition ${
                          animatedProductId === product.id
                            ? "animate-pulse bg-green-50 border-green-400"
                            : ""
                        }`}
                      >
                        <div className="relative h-48 mb-4 overflow-hidden rounded-lg bg-gradient-to-br from-pink-100 to-purple-100 p-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300 rounded"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                                if (target.nextSibling) {
                                  (
                                    target.nextSibling as HTMLElement
                                  ).style.display = "flex";
                                }
                              }}
                            />
                          ) : null}
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{ display: product.image ? "none" : "flex" }}
                          >
                            <span className="text-4xl">🧁</span>
                          </div>
                        </div>
                        <h3 className="font-bold text-gray-800 mb-2">
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-gray-600 mb-3">
                            {product.description}
                          </p>
                        )}
                        <p className="text-lg font-bold text-purple-600 mb-4">
                          {formatCurrency(product.price)}
                        </p>
                        <button
                          onClick={() => addToCart(product)}
                          className="w-full bg-purple-600 text-white font-semibold py-2 rounded-lg hover:bg-purple-700 transition active:scale-95"
                        >
                          Agregar al Carrito
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cart Summary */}
              <div className="lg:col-span-1">
                <div id="cart-summary" className="bg-white rounded-xl shadow-lg p-4 md:p-6 sticky top-20 md:top-24">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
                    Resumen del Carrito
                  </h3>
                  <div className="space-y-2 md:space-y-3 mb-4 md:mb-6 max-h-48 md:max-h-64 overflow-y-auto">
                    {cartItems.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        Carrito vacío
                      </p>
                    ) : (
                      cartItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 border-b pb-2 md:pb-3"
                        >
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-10 h-10 md:w-12 md:h-12 object-cover rounded flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs md:text-sm text-gray-800 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {formatCurrency(item.price)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                            <button
                              onClick={() =>
                                updateCartQuantity(item.id, item.quantity - 1)
                              }
                              className="bg-gray-200 text-gray-800 w-7 h-7 md:w-6 md:h-6 rounded hover:bg-gray-300 text-sm font-bold flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-8 md:w-6 text-center font-semibold text-sm">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCartQuantity(item.id, item.quantity + 1)
                              }
                              className="bg-gray-200 text-gray-800 w-7 h-7 md:w-6 md:h-6 rounded hover:bg-gray-300 text-sm font-bold flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-1 text-red-600 hover:text-red-800 font-bold text-lg px-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between font-bold text-lg text-gray-800 mb-4">
                      <span>Total:</span>
                      <span className="text-purple-600">
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-gray-700">
                      Teléfono para Validar
                    </label>
                    <input
                      type="tel"
                      value={validationPhone}
                      onChange={(e) => setValidationPhone(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="+57 300 1234567"
                    />
                    <button
                      onClick={handlePlaceOrder}
                      disabled={cartItems.length === 0 || isPlacingOrder}
                      className={`w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 active:scale-95 ${
                        isPlacingOrder ? 'cursor-wait' : ''
                      }`}
                    >
                      {isPlacingOrder ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Procesando...
                        </span>
                      ) : (
                        'Realizar Pedido'
                      )}
                    </button>

                    {validationMessage && (
                      <div
                        className={`p-3 rounded-lg text-sm font-semibold text-center ${
                          validationMessage.includes("exitoso")
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {validationMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Register Tab */}
          {currentTab === "register" && (
            <>
              <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                  Registro de Usuario
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="+57 300 1234567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dirección
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Calle 123 #45-67"
                    />
                  </div>
                  <button
                    onClick={handleRegisterUser}
                    disabled={isRegistering}
                    className={`w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition mt-6 ${
                      isRegistering ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isRegistering ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Registrando...
                      </span>
                    ) : (
                      'Registrarse'
                    )}
                  </button>
                  {registrationMessage && (
                    <div
                      className={`p-4 rounded-lg text-sm font-semibold ${
                        registrationMessage.includes("exitoso")
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {registrationMessage}
                    </div>
                  )}
                </div>
              </div>

              {/* Registration Success Popup */}
              {showRegistrationPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all animate-popup">
                    <div className="flex justify-center mb-6">
                      <div className="bg-green-100 rounded-full p-4">
                        <svg
                          className="w-16 h-16 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          ></path>
                        </svg>
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
                      ¡Registro Exitoso!
                    </h2>

                    <div className="text-center mb-6">
                      <p className="text-gray-600 mb-3">
                        Tu solicitud ha sido enviada correctamente.
                      </p>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm font-semibold text-yellow-800 mb-2">
                          ⏳ Pendiente de Aprobación
                        </p>
                        <p className="text-xs text-yellow-700">
                          Un administrador revisará tu solicitud pronto. Una vez
                          aprobada, podrás realizar pedidos a través de la app.
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <p className="text-xs text-gray-600 text-center">
                        <span className="font-semibold">Tip:</span> Mientras
                        tanto, puedes explorar nuestro catálogo de productos.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setShowRegistrationPopup(false);
                        setCurrentTab("cart");
                      }}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Orders Tracking Tab */}
          {currentTab === "orders" && (
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Seguimiento de Pedidos</h2>
            <p className="text-sm text-gray-600 mb-4">
              Puedes consultar todos tus pedidos activos y los archivados del último mes.
            </p>

              {!showOrderTracking ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Ingresa tu teléfono para ver tus pedidos
                    </label>
                    <input
                      type="tel"
                      value={userOrdersPhone}
                      onChange={(e) => setUserOrdersPhone(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="+57 300 1234567"
                    />
                  </div>
                  <button
                    onClick={trackUserOrders}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition"
                  >
                    Ver Mis Pedidos
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      setShowOrderTracking(false);
                      setUserOrdersPhone("");
                      setUserOrders([]);
                    }}
                    className="mb-4 text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    ← Volver
                  </button>

                  {userOrders.map(order => {
                    const isArchived = order.status === 'archived';
                    return (
                      <div key={order.id} className={`border rounded-lg p-4 ${
                        isArchived ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
                      }`}>
                        {/* Si es archivado, mostrar cuánto tiempo hace */}
                        {isArchived && (
                          <div className="text-xs text-gray-500 mb-2 italic">
                            📦 Pedido archivado hace {
                              Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                            } días
                          </div>
                        )}
                        
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Pedido #{order.id}</p>
                          {(() => {
                            const { dateFormatted, timeFormatted } = formatChileDateTime(order.createdAt);
                            return (
                              <p className="text-xs text-gray-500">
                                📅 {dateFormatted} • 🕐 {timeFormatted}
                              </p>
                            );
                          })()}
                        </div>
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            order.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.status === "processing"
                              ? "bg-blue-100 text-blue-800"
                              : order.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : order.status === "archived" 
                              ? "bg-gray-100 text-gray-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.status === "pending" && "⏳ Pendiente"}
                          {order.status === "processing" && "🔄 En Preparación"}
                          {order.status === "completed" && "✅ Completado"}
                          {order.status === 'archived' && '📦 Archivado'}
                        </div>
                      </div>
                      
                      {/* Order Status Timeline */}  
                     <div className="mb-4">
                       <div className="flex items-center justify-between">
                        <div className={`flex flex-col items-center ${
                          ['pending', 'processing', 'completed', 'archived'].includes(order.status) ? 'text-purple-600' : 'text-gray-400'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            ['pending', 'processing', 'completed', 'archived'].includes(order.status) ? 'bg-purple-600 text-white' : 'bg-gray-300'
                          }`}>
                            ✓
                          </div>
                          <p className="text-xs mt-1">Recibido</p>
                        </div>
                        
                        <div className={`flex-1 h-1 mx-2 ${
                          ['processing', 'completed', 'archived'].includes(order.status) ? 'bg-purple-600' : 'bg-gray-300'
                        }`}></div>
                        
                        <div className={`flex flex-col items-center ${
                          ['processing', 'completed', 'archived'].includes(order.status) ? 'text-purple-600' : 'text-gray-400'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            ['processing', 'completed', 'archived'].includes(order.status) ? 'bg-purple-600 text-white' : 'bg-gray-300'
                          }`}>
                            ✓
                          </div>
                          <p className="text-xs mt-1">Preparando</p>
                        </div>
                        
                        <div className={`flex-1 h-1 mx-2 ${
                          ['completed', 'archived'].includes(order.status) ? 'bg-purple-600' : 'bg-gray-300'
                        }`}></div>
                        
                        <div className={`flex flex-col items-center ${
                          ['completed', 'archived'].includes(order.status) ? 'text-purple-600' : 'text-gray-400'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            ['completed', 'archived'].includes(order.status) ? 'bg-purple-600 text-white' : 'bg-gray-300'
                          }`}>
                            ✓
                          </div>
                          <p className="text-xs mt-1">Entregado</p>
                        </div> 
                        
                        {/* Nueva sección para Archivado */}
                        <div className={`flex-1 h-1 mx-2 ${
                          order.status === 'archived' ? 'bg-gray-600' : 'bg-gray-300'
                        }`}></div>
                        
                        <div className={`flex flex-col items-center ${
                          order.status === 'archived' ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            order.status === 'archived' ? 'bg-gray-600 text-white' : 'bg-gray-300'
                          }`}>
                            📦
                          </div>
                          <p className="text-xs mt-1">Archivado</p>
                        </div>
                      </div>
                    </div>
                      
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs font-semibold text-gray-600 mb-2">
                          PRODUCTOS:
                        </p>
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm"
                          >
                            <span>
                              {item.name} x{item.quantity}
                            </span>
                            <span>
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t mt-2 pt-2 flex justify-between font-bold">
                          <span>Total:</span>
                          <span className="text-purple-600">
                            {formatCurrency(order.totalPrice)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Admin Interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold">
            🔐 Panel Administrativo - Tuz Diaz Dulzes
          </h1>
          <button
            onClick={() => setIsAdmin(false)}
            className="text-xs md:text-sm bg-white text-blue-600 px-3 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-wrap">
          <button
            onClick={() => setAdminTab("users")}
            className={`flex-1 min-w-max py-4 px-4 text-center font-semibold transition ${
              adminTab === "users"
                ? "border-b-4 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            👥 Usuarios
          </button>
          <button
            onClick={() => setAdminTab("orders")}
            className={`flex-1 min-w-max py-4 px-4 text-center font-semibold transition ${
              adminTab === "orders"
                ? "border-b-4 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            📦 Pedidos
          </button>
          <button
            onClick={() => setAdminTab("statistics")}
            className={`flex-1 min-w-max py-4 px-4 text-center font-semibold transition ${
              adminTab === "statistics"
                ? "border-b-4 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            📊 Estadísticas
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Users Tab */}
        {adminTab === "users" && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                Gestión de Usuarios
              </h2>
        
              {/* Tabla de usuarios */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">
                        Nombre
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">
                        Teléfono
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">
                        Dirección
                      </th>
                      <th className="px-4 py-3 text-left font-bold text-gray-700">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-center font-bold text-gray-700">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No hay usuarios registrados
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b hover:bg-gray-50 transition"
                        >
                          {/* Nombre */}
                          <td className="px-4 py-4 font-semibold text-gray-800">
                            {user.fullName || (user as any).full_name || '—'}
                          </td>
        
                          {/* Teléfono */}
                          <td className="px-4 py-4 text-gray-700">
                            {user.phone}
                          </td>
        
                          {/* Dirección */}
                          <td className="px-4 py-4 text-gray-700">
                            {user.address}
                          </td>
        
                          {/* Estado (compatible con approved antiguo y status nuevo) */}
                          <td className="px-4 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                (user.status === 'approved' || user.approved)
                                  ? 'bg-green-100 text-green-800'
                                  : user.status === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {(user.status === 'approved' || user.approved)
                                ? '✓ Aprobado'
                                : user.status === 'rejected'
                                ? '✗ Rechazado'
                                : '⏳ Pendiente'}
                            </span>
                          </td>
        
                          {/* Acciones: Aprobar / Rechazar / Borrar */}
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Aprobar */}
                              {(user.status !== 'approved' && !user.approved) && (
                                <button
                                  onClick={() => updateUserStatusFrontend(user.id, 'approved')}
                                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                                >
                                  Aprobar
                                </button>
                              )}
        
                              {/* Rechazar */}
                              {user.status !== 'rejected' && (
                                <button
                                  onClick={() => updateUserStatusFrontend(user.id, 'rejected')}
                                  className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                                >
                                  Rechazar
                                </button>
                              )}
        
                              {/* Borrar */}
                              <div className="relative inline-block">
                                <button
                                  onClick={() => {
                                    const dropdown = document.getElementById(`delete-dropdown-${user.id}`);
                                    const allDropdowns = document.querySelectorAll('[id^="delete-dropdown-"]');
                                    allDropdowns.forEach(d => {
                                      if (d.id !== `delete-dropdown-${user.id}`) {
                                        d.classList.add('hidden');
                                      }
                                    });
                                    dropdown?.classList.toggle('hidden');
                                  }}
                                  className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition text-sm"
                                >
                                  Borrar ▼
                                </button>
                                <div
                                  id={`delete-dropdown-${user.id}`}
                                  className="hidden absolute right-0 mt-2 w-60 bg-white border rounded shadow text-left z-10"
                                >
                                  <button
                                    onClick={() => {
                                      deleteUserFrontend(user.id, false);
                                      document.getElementById(`delete-dropdown-${user.id}`)?.classList.add('hidden');
                                    }}
                                    className="block w-full px-4 py-2 hover:bg-gray-50 text-sm text-left"
                                  >
                                    Borrar solo usuario
                                  </button>
                                  <button
                                    onClick={() => {
                                      deleteUserFrontend(user.id, true);
                                      document.getElementById(`delete-dropdown-${user.id}`)?.classList.add('hidden');
                                    }}
                                    className="block w-full px-4 py-2 hover:bg-gray-50 text-sm text-red-600 text-left"
                                  >
                                    Borrar usuario y sus pedidos
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Seguridad: cambiar contraseña del administrador */}
              <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-bold text-lg mb-2">🔐 Cambiar Contraseña</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Cambia tu contraseña de administrador por una que recuerdes fácilmente.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Contraseña Actual
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      className="border rounded px-3 py-2 w-full"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nueva Contraseña (mínimo 8 caracteres)
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      className="border rounded px-3 py-2 w-full"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Confirmar Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      className="border rounded px-3 py-2 w-full"
                      placeholder="••••••••"
                    />
                  </div>
                  <button
                    onClick={async () => {
                      const current = (document.getElementById('currentPassword') as HTMLInputElement)?.value;
                      const newPass = (document.getElementById('newPassword') as HTMLInputElement)?.value;
                      const confirm = (document.getElementById('confirmPassword') as HTMLInputElement)?.value;
                    
                      if (!current || !newPass || !confirm) {
                        alert('Por favor completa todos los campos');
                        return;
                      }
                    
                      if (newPass !== confirm) {
                        alert('Las contraseñas nuevas no coinciden');
                        return;
                      }
                    
                      if (newPass.length < 8) {
                        alert('La nueva contraseña debe tener al menos 8 caracteres');
                        return;
                      }
                    
                      try {
                        const result = await api.changeAdminPassword(current, newPass);
                        
                        if (result.success) {
                          alert('✅ Contraseña actualizada exitosamente');
                          // Limpiar campos
                          (document.getElementById('currentPassword') as HTMLInputElement).value = '';
                          (document.getElementById('newPassword') as HTMLInputElement).value = '';
                          (document.getElementById('confirmPassword') as HTMLInputElement).value = '';
                        }
                      } catch (error: any) {
                        console.error('Error:', error);
                        alert('❌ Error: ' + error.message);
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition w-full"
                  >
                    Cambiar Contraseña
                  </button>
                </div>
              </div>
        
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {adminTab === 'orders' && (
          <div className="space-y-6">
            {/* Pedidos Pendientes */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-yellow-500">
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold">
                  ⏳ Pedidos Pendientes
                </h3>
              </div>
            
              <div className="p-4 md:p-6">
                {orders.filter((o) => o.status === 'pending').length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay pedidos pendientes</p>
                ) : (
                  <div className="space-y-4">
                    {orders
                      .filter((o) => o.status === 'pending')
                      .map((order) => (
                        <div
                          key={order.id}
                          className="border border-yellow-200 rounded-lg p-4 hover:shadow-lg transition bg-yellow-50"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">CLIENTE</p>
                              <p className="font-bold text-gray-800">{order.userName}</p>
                              <p className="text-sm text-gray-700">{order.userPhone}</p>
                              <p className="text-sm text-gray-700">{order.userAddress}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">DETALLES</p>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">Pedido ID:</span> {order.id}
                              </p>
                              {(() => {
                                const { dateFormatted, timeFormatted } = formatChileDateTimeFull(order.createdAt);
                                return (
                                  <>
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Fecha:</span> {dateFormatted}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Hora:</span> {timeFormatted}
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        
                          <div className="bg-white rounded-lg p-3 mb-4 border border-yellow-200">
                            <p className="text-xs text-gray-600 font-semibold mb-2">ARTÍCULOS</p>
                            <div className="space-y-1">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-sm text-gray-700"
                                >
                                  <span>
                                    {item.name} x{item.quantity}
                                  </span>
                                  <span className="font-semibold">
                                    {formatCurrency(item.price * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-yellow-300 mt-2 pt-2 flex justify-between font-bold text-gray-800">
                              <span>Total:</span>
                              <span className="text-yellow-600">
                                {formatCurrency(order.totalPrice)}
                              </span>
                            </div>
                          </div>
                        
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updateOrderStatus(order.id, 'processing')}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-semibold text-sm"
                            >
                              ▶ Preparar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          
            {/* Pedidos en Preparación */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-blue-500">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold">
                  🔄 En Preparación
                </h3>
              </div>
            
              <div className="p-4 md:p-6">
                {orders.filter((o) => o.status === 'processing').length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay pedidos en preparación</p>
                ) : (
                  <div className="space-y-4">
                    {orders
                      .filter((o) => o.status === 'processing')
                      .map((order) => (
                        <div
                          key={order.id}
                          className="border border-blue-200 rounded-lg p-4 hover:shadow-lg transition bg-blue-50"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">CLIENTE</p>
                              <p className="font-bold text-gray-800">{order.userName}</p>
                              <p className="text-sm text-gray-700">{order.userPhone}</p>
                              <p className="text-sm text-gray-700">{order.userAddress}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">DETALLES</p>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">Pedido ID:</span> {order.id}
                              </p>
                              {(() => {
                                const { dateFormatted, timeFormatted } = formatChileDateTimeFull(order.createdAt);
                                return (
                                  <>
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Fecha:</span> {dateFormatted}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Hora:</span> {timeFormatted}
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        
                          <div className="bg-white rounded-lg p-3 mb-4 border border-blue-200">
                            <p className="text-xs text-gray-600 font-semibold mb-2">ARTÍCULOS</p>
                            <div className="space-y-1">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-sm text-gray-700"
                                >
                                  <span>
                                    {item.name} x{item.quantity}
                                  </span>
                                  <span className="font-semibold">
                                    {formatCurrency(item.price * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-blue-300 mt-2 pt-2 flex justify-between font-bold text-gray-800">
                              <span>Total:</span>
                              <span className="text-blue-600">
                                {formatCurrency(order.totalPrice)}
                              </span>
                            </div>
                          </div>
                        
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updateOrderStatus(order.id, 'completed')}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-semibold text-sm"
                            >
                              ✓ Entregar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          
            {/* Pedidos Completados */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-green-500">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 md:p-6">
                <h3 className="text-lg md:text-xl font-bold">
                  ✅ Completados
                </h3>
              </div>
            
              <div className="p-4 md:p-6">
                {orders.filter((o) => o.status === 'completed').length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay pedidos completados</p>
                ) : (
                  <div className="space-y-4">
                    {orders
                      .filter((o) => o.status === 'completed')
                      .map((order) => (
                        <div
                          key={order.id}
                          className="border border-green-200 rounded-lg p-4 hover:shadow-lg transition bg-green-50"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">CLIENTE</p>
                              <p className="font-bold text-gray-800">{order.userName}</p>
                              <p className="text-sm text-gray-700">{order.userPhone}</p>
                              <p className="text-sm text-gray-700">{order.userAddress}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 font-semibold">DETALLES</p>
                              <p className="text-sm text-gray-700">
                                <span className="font-semibold">Pedido ID:</span> {order.id}
                              </p>
                              {(() => {
                                const { dateFormatted, timeFormatted } = formatChileDateTimeFull(order.createdAt);
                                return (
                                  <>
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Fecha:</span> {dateFormatted}
                                    </p>
                                    <p className="text-sm text-gray-700">
                                      <span className="font-semibold">Hora:</span> {timeFormatted}
                                    </p>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        
                          <div className="bg-white rounded-lg p-3 mb-4 border border-green-200">
                            <p className="text-xs text-gray-600 font-semibold mb-2">ARTÍCULOS</p>
                            <div className="space-y-1">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between text-sm text-gray-700"
                                >
                                  <span>
                                    {item.name} x{item.quantity}
                                  </span>
                                  <span className="font-semibold">
                                    {formatCurrency(item.price * item.quantity)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-green-300 mt-2 pt-2 flex justify-between font-bold text-gray-800">
                              <span>Total:</span>
                              <span className="text-green-600">
                                {formatCurrency(order.totalPrice)}
                              </span>
                            </div>
                          </div>
                        
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => updateOrderStatus(order.id, 'archived')}
                              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition font-semibold text-sm"
                            >
                              📦 Archivar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          
            {/* Pedidos Archivados con Toggle */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-gray-500">
              <div className="bg-gradient-to-r from-gray-500 to-gray-700 text-white p-4 md:p-6 flex justify-between items-center">
                <h3 className="text-lg md:text-xl font-bold">
                  📦 Archivados ({orders.filter((o) => o.status === 'archived').length})
                </h3>
                <button
                  onClick={() => setShowArchivedOrders(!showArchivedOrders)}
                  className="bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition font-semibold text-sm flex items-center gap-2"
                >
                  {showArchivedOrders ? (
                    <>
                      👁️‍🗨️ Ocultar
                    </>
                  ) : (
                    <>
                      👁️ Mostrar
                    </>
                  )}
                </button>
              </div>
            
              {showArchivedOrders && (
                <div className="p-4 md:p-6">
                  {orders.filter((o) => o.status === 'archived').length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay pedidos archivados</p>
                  ) : (
                    <div className="space-y-4">
                      {orders
                        .filter((o) => o.status === 'archived')
                        .map((order) => {
                          // 🆕 Calcular días hábiles restantes
                          const archivedDate = new Date(order.createdAt);
                          const now = new Date();
                          const businessDaysPassed = calculateBusinessDays(archivedDate, now);
                          const daysRemaining = Math.max(0, 3 - businessDaysPassed);
                          
                          return (
                            <div
                              key={order.id}
                              className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition bg-gray-50 opacity-75"
                            >
                              {/* 🆕 Badge con días hábiles restantes */}
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${
                                  daysRemaining === 0
                                    ? 'bg-red-100 text-red-800' 
                                    : daysRemaining === 1
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {daysRemaining === 0
                                    ? '🔥 Se ocultará pronto' 
                                    : `⏱️ ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} hábil${daysRemaining !== 1 ? 'es' : ''} restante${daysRemaining !== 1 ? 's' : ''}`
                                  }
                                </span>
                              </div>
                                
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-xs text-gray-600 font-semibold">CLIENTE</p>
                                  <p className="font-bold text-gray-800">{order.userName}</p>
                                  <p className="text-sm text-gray-700">{order.userPhone}</p>
                                  <p className="text-sm text-gray-700">{order.userAddress}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 font-semibold">DETALLES</p>
                                  <p className="text-sm text-gray-700">
                                    <span className="font-semibold">Pedido ID:</span> {order.id}
                                  </p>
                                  {(() => {
                                    const { dateFormatted, timeFormatted } = formatChileDateTimeFull(order.createdAt);
                                    return (
                                      <>
                                        <p className="text-sm text-gray-700">
                                          <span className="font-semibold">Fecha:</span> {dateFormatted}
                                        </p>
                                        <p className="text-sm text-gray-700">
                                          <span className="font-semibold">Hora:</span> {timeFormatted}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                                
                              <div className="bg-white rounded-lg p-3 mb-4 border border-gray-200">
                                <p className="text-xs text-gray-600 font-semibold mb-2">ARTÍCULOS</p>
                                <div className="space-y-1">
                                  {order.items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between text-sm text-gray-700"
                                    >
                                      <span>
                                        {item.name} x{item.quantity}
                                      </span>
                                      <span className="font-semibold">
                                        {formatCurrency(item.price * item.quantity)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between font-bold text-gray-800">
                                  <span>Total:</span>
                                  <span className="text-gray-600">
                                    {formatCurrency(order.totalPrice)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Statistics Tab */}
        {adminTab === "statistics" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                Estadísticas
              </h2>

              {/* View Mode Selector */}
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={() => setViewMode("month")}
                  className={`px-6 py-3 rounded-lg font-bold transition ${
                    viewMode === "month"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  Por Mes
                </button>
                <button
                  onClick={() => setViewMode("year")}
                  className={`px-6 py-3 rounded-lg font-bold transition ${
                    viewMode === "year"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  Por Año
                </button>
              </div>

              {/* Statistics View Type */}
              <div className="flex flex-wrap gap-4 mb-6">
                <button
                  onClick={() => setStatisticsView("total")}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    statisticsView === "total"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  Vista Total
                </button>
                <button
                  onClick={() => setStatisticsView("byUser")}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    statisticsView === "byUser"
                      ? "bg-purple-600 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  Por Usuario
                </button>
              </div>

              {/* Month/Year Selector */}
              {viewMode === "month" && (
                <div className="flex flex-wrap gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mes
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(parseInt(e.target.value));
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i).toLocaleString("es-CL", {
                            month: "long",
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Año
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(parseInt(e.target.value));
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={exportToExcel}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition font-bold"
                    >
                      📥 Exportar Excel
                    </button>
                  </div>
                </div>
              )}

              {/* Statistics Display */}
              {viewMode === "month" ? (
                (() => {
                  const stat = statistics.find(
                    (s) => s.month === selectedMonth && s.year === selectedYear
                  );
                  return (
                    <div className="space-y-6">
                      {stat ? (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg p-6">
                              <p className="text-gray-700 font-semibold text-sm">
                                Total Pedidos
                              </p>
                              <p className="text-3xl font-bold text-blue-600">
                                {stat.totalOrders}
                              </p>
                            </div>
                            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-lg p-6">
                              <p className="text-gray-700 font-semibold text-sm">
                                Unidades Vendidas
                              </p>
                              <p className="text-3xl font-bold text-green-600">
                                {stat.totalUnits}
                              </p>
                            </div>
                            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg p-6">
                              <p className="text-gray-700 font-semibold text-sm">
                                Ingresos Totales
                              </p>
                              <p className="text-3xl font-bold text-purple-600">
                                {formatCurrency(stat.totalPrice)}
                              </p>
                            </div>
                          </div>

                          {statisticsView === "byUser" ? (
                            <div className="space-y-4">
                              <h3 className="text-lg font-bold text-gray-800">
                                Ventas por Usuario
                              </h3>
                              {(() => {
                                const userGroups: { [key: string]: any[] } = {};
                                stat.items.forEach((item) => {
                                  const key = item.userName || "Sin usuario";
                                  if (!userGroups[key]) userGroups[key] = [];
                                  userGroups[key].push(item);
                                });

                                return Object.entries(userGroups).map(
                                  ([userName, items]) => {
                                    const userTotal = items.reduce(
                                      (sum, item) => sum + item.price,
                                      0
                                    );
                                    const userQuantity = items.reduce(
                                      (sum, item) => sum + item.quantity,
                                      0
                                    );

                                    return (
                                      <div
                                        key={userName}
                                        className="border border-gray-200 rounded-lg p-4"
                                      >
                                        <div className="flex justify-between items-center mb-3">
                                          <h4 className="font-bold text-gray-800">
                                            {userName}
                                          </h4>
                                          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                            {userQuantity} unidades -{" "}
                                            {formatCurrency(userTotal)}
                                          </span>
                                        </div>
                                        
                                        {/* 🆕 Tabla con fecha y hora */}
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">
                                                  Artículo
                                                </th>
                                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-600">
                                                  Cant.
                                                </th>
                                                <th className="px-2 py-2 text-right text-xs font-semibold text-gray-600">
                                                  Precio
                                                </th>
                                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">
                                                  Fecha
                                                </th>
                                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">
                                                  Hora
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {items.map((item: any, idx: number) => {
                                                const { dateFormatted, timeFormatted } = item.orderDate 
                                                  ? formatChileDateTime(item.orderDate)
                                                  : { dateFormatted: 'N/A', timeFormatted: 'N/A' };
                                                
                                                return (
                                                  <tr key={idx} className="border-b border-gray-100">
                                                    <td className="px-2 py-2 text-gray-700">
                                                      {item.name}
                                                    </td>
                                                    <td className="px-2 py-2 text-center text-gray-700">
                                                      {item.quantity}
                                                    </td>
                                                    <td className="px-2 py-2 text-right text-gray-700">
                                                      {formatCurrency(item.price)}
                                                    </td>
                                                    <td className="px-2 py-2 text-gray-600 text-xs">
                                                      {dateFormatted}
                                                    </td>
                                                    <td className="px-2 py-2 text-gray-600 text-xs">
                                                      {timeFormatted}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                        
                                        <div className="mt-2 pt-2 border-t flex justify-between font-semibold text-gray-800">
                                          <span>Subtotal</span>
                                          <span>{formatCurrency(userTotal)}</span>
                                        </div>
                                      </div>
                                    );
                                  }
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100 border-b-2 border-gray-300">
                                  <tr>
                                    <th className="px-4 py-3 text-left font-bold text-gray-700">
                                      Artículo
                                    </th>
                                    <th className="px-4 py-3 text-center font-bold text-gray-700">
                                      Cantidad
                                    </th>
                                    <th className="px-4 py-3 text-right font-bold text-gray-700">
                                      Precio Total
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-700">
                                      Cliente
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-700">
                                      Fecha
                                    </th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-700">
                                      Hora
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {stat.items.map((item, idx) => {
                                    const { dateFormatted, timeFormatted } = item.orderDate 
                                      ? formatChileDateTime(item.orderDate)
                                      : { dateFormatted: 'N/A', timeFormatted: 'N/A' };
                                    
                                    return (
                                      <tr
                                        key={idx}
                                        className="border-b hover:bg-gray-50 transition"
                                      >
                                        <td className="px-4 py-4 font-semibold text-gray-800">
                                          {item.name}
                                        </td>
                                        <td className="px-4 py-4 text-center text-gray-700">
                                          {item.quantity}
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-gray-800">
                                          {formatCurrency(item.price)}
                                        </td>
                                        <td className="px-4 py-4 text-gray-700">
                                          {item.userName || "N/A"}
                                        </td>
                                        <td className="px-4 py-4 text-gray-700 text-sm">
                                          {dateFormatted}
                                        </td>
                                        <td className="px-4 py-4 text-gray-700 text-sm">
                                          {timeFormatted}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No hay datos para este período
                        </p>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-6">
                  {statistics.filter((s) => s.year === selectedYear).length ===
                  0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No hay datos para este año
                    </p>
                  ) : (
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {statistics
                        .filter((s) => s.year === selectedYear)
                        .sort((a, b) => a.month - b.month)
                        .map((stat) => (
                          <div
                            key={`${stat.month}-${stat.year}`}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition"
                          >
                            <h4 className="font-bold text-lg text-gray-800 mb-4">
                              {new Date(2024, stat.month - 1).toLocaleString(
                                "es-CO",
                                { month: "long" }
                              )}
                            </h4>
                            <div className="space-y-2 mb-4">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Pedidos:</span>
                                <span className="font-bold text-gray-800">
                                  {stat.totalOrders}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Unidades:</span>
                                <span className="font-bold text-gray-800">
                                  {stat.totalUnits}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-700">Ingresos:</span>
                                <span className="font-bold text-blue-600">
                                  {formatCurrency(stat.totalPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
