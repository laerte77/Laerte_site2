import{Box,Briefcase,Bus,Car,Clapperboard,Cloud,Coins,CreditCard,Gift,GraduationCap,Heart,Home,Key,MapPin,Plane,ShoppingBag,ShoppingCart,Smartphone,Utensils,Wallet,Wrench}from'lucide-react';

export default function CategoryIcon({category,className='w-4 h-4'}){
 const normalizedCat=(category||'').toLowerCase().trim();

 const icons={
  alimentação:Utensils,alimentacao:Utensils,
  compras:ShoppingCart,supermercado:ShoppingCart,
  transporte:Bus,viagem:Plane,
  combustível:Car,combustivel:Car,carro:Car,
  moradia:Home,casa:Home,aluguel:Key,
  saúde:Heart,saude:Heart,
  educação:GraduationCap,educacao:GraduationCap,
  trabalho:Briefcase,lazer:Clapperboard,
  presentes:Gift,presente:Gift,
  celular:Smartphone,tecnologia:Smartphone,
  cartão:CreditCard,cartao:CreditCard,
  dinheiro:Coins,banco:Wallet,
  compras_online:ShoppingBag,
  manutenção:Wrench,manutencao:Wrench,
  localização:MapPin,localizacao:MapPin,
  nuvem:Cloud
 };

 const Icon=icons[normalizedCat]||Box;
 return <Icon className={className}/>;
}
