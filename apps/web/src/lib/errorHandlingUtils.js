import { useRef, useEffect } from 'react';

/**
 * Parses Supabase errors into user-friendly messages.
 * @param {Object} error - The error object returned by Supabase
 * @returns {string} User-friendly error message
 */
export const handleSupabaseError = (error) => {
  if (!error) return "Ocorreu um erro desconhecido.";
  
  // Handling standard PostgREST and common Supabase errors
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return "Tabela não encontrada. Por favor, verifique se as migrações do banco de dados foram executadas.";
  }
  if (error.code === '42501') {
    return "Relação/Tabela não existe. Execute o setup do banco de dados.";
  }
  if (error.code === 'PGRST116' || error.message?.includes('RLS')) {
    return "Erro de permissão. Você não tem acesso a este recurso (violação de RLS).";
  }
  if (error.code === '23505') {
    return "Registro duplicado. Este item já existe no sistema.";
  }
  if (error.name === 'AbortError') {
    return "A requisição foi cancelada.";
  }
  if (error.message === 'Failed to fetch') {
    return "Erro de conexão de rede. Verifique sua internet ou a URL do Supabase.";
  }

  return error.message || "Erro interno ao processar a requisição.";
};

/**
 * Custom hook to safely track component mount status to prevent memory leaks and state updates on unmounted components.
 * @returns {React.MutableRefObject<boolean>} A ref that is true while mounted and false when unmounted.
 */
export const useIsMounted = () => {
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return isMountedRef;
};

/**
 * Helper to wrap setState functions ensuring the component is still mounted.
 * @param {Function} callback - The function to execute if mounted
 * @param {React.MutableRefObject<boolean>} isMountedRef - The ref indicating mount status
 */
export const withIsMountedCheck = (callback, isMountedRef) => {
  if (isMountedRef && isMountedRef.current) {
    callback();
  }
};