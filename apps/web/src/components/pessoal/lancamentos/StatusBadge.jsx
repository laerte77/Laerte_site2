import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, AlertTriangle } from 'lucide-react';

export default function StatusBadge({ status, onClick, expenseId, className = '' }) {
  let badgeColor = '';
  let Icon = Clock;
  let label = status;

  switch (status) {
    case 'PAGO':
      badgeColor = 'bg-[hsl(var(--status-pago))] text-white hover:bg-[hsl(var(--status-pago))]/80';
      Icon = CheckCircle2;
      label = 'Pago';
      break;
    case 'PAGO_PARCIALMENTE':
      badgeColor = 'bg-[hsl(var(--status-parcial))] text-white hover:bg-[hsl(var(--status-parcial))]/80';
      Icon = AlertTriangle;
      label = 'Pago Parcialmente';
      break;
    case 'ATRASADO':
      badgeColor = 'bg-[hsl(var(--status-atrasado))] text-white hover:bg-[hsl(var(--status-atrasado))]/80';
      Icon = AlertCircle;
      label = 'Atrasado';
      break;
    case 'PENDENTE':
    default:
      badgeColor = 'bg-[hsl(var(--status-pendente))] text-white hover:bg-[hsl(var(--status-pendente))]/80';
      Icon = Clock;
      label = 'Pendente';
      break;
  }

  const handleClick = (e) => {
    if (onClick) {
      e.stopPropagation();
      onClick(expenseId, status);
    }
  };

  return (
    <Badge 
      variant="outline" 
      className={`font-medium border-0 cursor-pointer ${badgeColor} ${className}`}
      onClick={handleClick}
    >
      <Icon className="w-3 h-3 mr-1.5" />
      {label}
    </Badge>
  );
}