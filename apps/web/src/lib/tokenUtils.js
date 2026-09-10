export const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Add a 5 minute buffer to consider it expired a bit early
    const isExpired = payload.exp < (Date.now() / 1000) + 300; 
    return isExpired;
  } catch (e) {
    console.error("Erro ao decodificar token:", e);
    return true; // Se falhar a leitura, consideramos expirado/corrompido
  }
};

export const getStoredSessionKey = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return key;
      }
    }
  } catch (e) {
    console.error("Erro ao acessar localStorage:", e);
  }
  return null;
};

export const clearAuthTokens = () => {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`[Token Cleanup] Removido token corrompido ou expirado: ${key}`);
    });
  } catch (e) {
    console.error("Erro ao limpar tokens:", e);
  }
};

export const getStoredSession = () => {
  try {
    const key = getStoredSessionKey();
    if (!key) return null;
    
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const sessionData = JSON.parse(stored);
    return sessionData;
  } catch (e) {
    console.error("Erro ao ler sessão armazenada:", e);
    return null;
  }
};

export const validateStoredTokens = () => {
  console.log("[Token Validation] Iniciando validação de tokens...");
  try {
    const sessionData = getStoredSession();
    
    // Se não há dados, limpamos qualquer lixo residual apenas por precaução
    if (!sessionData) {
      const key = getStoredSessionKey();
      if (key) clearAuthTokens();
      return false;
    }
    
    // Validar formato básico
    if (!sessionData.access_token || !sessionData.refresh_token) {
      console.warn("[Token Validation] Sessão armazenada está incompleta. Limpando...");
      clearAuthTokens();
      return false;
    }
    
    // Validar expiração (com buffer de 5 minutos)
    if (isTokenExpired(sessionData.access_token)) {
      console.warn("[Token Validation] Access token expirado localmente.");
      // Não limpamos imediatamente aqui pois o Supabase pode usar o refresh_token para renovar.
      // Porém, se o refresh_token também não existir (o que é raro) a gente limpa.
    }
    
    console.log("[Token Validation] Tokens parecem válidos estruturalmente.");
    return true;
  } catch (e) {
    console.error("[Token Validation] Falha catastrófica ao validar tokens:", e);
    clearAuthTokens();
    return false;
  }
};