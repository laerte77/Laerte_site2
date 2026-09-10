import { useCallback } from 'react';
import { isBefore, startOfDay, parseISO, isValid } from 'date-fns';

export const useStatusCalculation = () => {
  const calculateStatus = useCallback((vencimentoString, gastoRealValue, valorPrevistoValue) => {
    if (!vencimentoString) return 'Pendente';

    const today = startOfDay(new Date());
    
    let vencimento;
    try {
      if (vencimentoString instanceof Date) {
          vencimento = startOfDay(vencimentoString);
      } else if (typeof vencimentoString === 'string') {
          vencimento = startOfDay(parseISO(vencimentoString));
      } else {
          return 'Pendente'; 
      }
    } catch (e) {
      return 'Pendente';
    }

    if (!isValid(vencimento)) return 'Pendente';

    const gastoReal = parseFloat(gastoRealValue || 0);
    const valorPrevisto = parseFloat(valorPrevistoValue || 0);

    const tolerance = 0.05;

    if (gastoReal >= (valorPrevisto - tolerance) && valorPrevisto > 0) {
      return 'Paga';
    } else if (gastoReal > 0) {
      return 'Parcialmente Paga';
    } else if (isBefore(vencimento, today)) {
      return 'Atrasada';
    } else {
      return 'Pendente';
    }
  }, []);

  return { calculateStatus };
};