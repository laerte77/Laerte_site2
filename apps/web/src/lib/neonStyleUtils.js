export const NEON_COLORS = {
  pessoal: '204 100% 50%',       // #0099FF
  lanhouse: '190 100% 50%',      // #00D9FF
  igreja: '51 100% 50%',         // #FFD700
  entretenimento: '16 100% 60%', // #FF6B35
  barbearia: '51 100% 50%'       // #FFD700
};

export const getNeonColor = (moduleName) => {
  return NEON_COLORS[moduleName] || NEON_COLORS.pessoal;
};

export const getNeonGlowStyle = (moduleName, opacity = 0.5) => {
  const color = getNeonColor(moduleName);
  return {
    boxShadow: `0 0 15px hsl(${color} / ${opacity})`,
    borderColor: `hsl(${color} / 0.5)`
  };
};

export const getNeonHoverStyle = (moduleName) => {
  const color = getNeonColor(moduleName);
  return {
    boxShadow: `0 8px 24px hsl(${color} / 0.4), inset 0 0 10px hsl(${color} / 0.2)`,
    borderColor: `hsl(${color})`,
    transform: 'scale(1.02)'
  };
};

export const applyNeonHoverEffect = (element, moduleName) => {
  if (!element) return;
  const hoverStyle = getNeonHoverStyle(moduleName);
  element.addEventListener('mouseenter', () => {
    Object.assign(element.style, hoverStyle);
  });
  element.addEventListener('mouseleave', () => {
    element.style.transform = 'scale(1)';
    element.style.boxShadow = getNeonGlowStyle(moduleName).boxShadow;
    element.style.borderColor = getNeonGlowStyle(moduleName).borderColor;
  });
};