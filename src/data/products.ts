import { Product } from '../types';

export const products: Product[] = [
  { 
    id: '1', 
    name: 'Torta de Chocolate', 
    price: 25000,
    image: '/images/productos/torta-chocolate.jpg',
    description: 'Deliciosa torta de chocolate con cobertura'
  },
  { 
    id: '2', 
    name: 'Cupcakes (6 unidades)', 
    price: 18000,
    image: '/images/productos/cupcakes.jpg',
    description: 'Cupcakes decorados, 6 unidades'
  },
  { 
    id: '3', 
    name: 'Brownies (4 unidades)', 
    price: 15000,
    image: '/images/productos/brownies.jpg',
    description: 'Brownies de chocolate con nueces'
  },
  { 
    id: '4', 
    name: 'Cheesecake', 
    price: 30000,
    image: '/images/productos/cheesecake.jpg',
    description: 'Cheesecake con frutos rojos'
  },
  { 
    id: '5', 
    name: 'Galletas Decoradas (12)', 
    price: 20000,
    image: '/images/productos/galletas-decoradas.jpg',
    description: 'Galletas decoradas temáticas'
  },
];