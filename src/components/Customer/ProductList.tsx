import React from 'react';
import { Product, OrderItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ProductListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, onAddToCart }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">Nuestros Productos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map(product => (
          <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
            <div className="relative h-48 mb-4 overflow-hidden rounded-lg">
              <img 
                src={product.image} 
                alt={product.name}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5OTkiPvCfp4EgSW1hZ2VuPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
            </div>
            <h3 className="font-bold text-gray-800 mb-2">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-gray-600 mb-3">{product.description}</p>
            )}
            <p className="text-lg font-bold text-purple-600 mb-4">
              {formatCurrency(product.price)}
            </p>
            <button
              onClick={() => onAddToCart(product)}
              className="w-full bg-purple-600 text-white font-semibold py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Agregar al Carrito
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};