import React from 'react';
import { 
  ShoppingCart, 
  Bus, 
  Activity, 
  BookOpen, 
  Home, 
  Smile, 
  Zap, 
  Box, 
  Shirt,
  Sparkles,
  Wrench,
  Utensils,
  CreditCard
} from 'lucide-react';

export default function CategoryIcon({ category, className = "w-4 h-4" }) {
  const normalizedCat = (category || '').toLowerCase().trim();

  let Icon = Box; // Default icon

  if (normalizedCat.includes('alimentação') || normalizedCat.includes('comida') || normalizedCat.includes('supermercado')) {
    Icon = ShoppingCart;
  } else if (normalizedCat.includes('transporte') || normalizedCat.includes('combustível') || normalizedCat.includes('carro')) {
    Icon = Bus;
  } else if (normalizedCat.includes('saúde') || normalizedCat.includes('farmácia') || normalizedCat.includes('médico')) {
    Icon = Activity;
  } else if (normalizedCat.includes('educação') || normalizedCat.includes('escola') || normalizedCat.includes('curso')) {
    Icon = BookOpen;
  } else if (normalizedCat.includes('moradia') || normalizedCat.includes('casa') || normalizedCat.includes('aluguel')) {
    Icon = Home;
  } else if (normalizedCat.includes('lazer') || normalizedCat.includes('entretenimento')) {
    Icon = Smile;
  } else if (normalizedCat.includes('utilidades') || normalizedCat.includes('energia') || normalizedCat.includes('água') || normalizedCat.includes('internet')) {
    Icon = Zap;
  } else if (normalizedCat.includes('roupa') || normalizedCat.includes('vestuário')) {
    Icon = Shirt;
  } else if (normalizedCat.includes('perfumaria') || normalizedCat.includes('beleza')) {
    Icon = Sparkles;
  } else if (normalizedCat.includes('serviço') || normalizedCat.includes('manutenção')) {
    Icon = Wrench;
  } else if (normalizedCat.includes('restaurante') || normalizedCat.includes('lanchonete')) {
    Icon = Utensils;
  } else if (normalizedCat.includes('cartão') || normalizedCat.includes('crédito')) {
    Icon = CreditCard;
  }

  return <Icon className={className} />;
}