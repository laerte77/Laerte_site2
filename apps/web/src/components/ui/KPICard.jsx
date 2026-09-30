import React from'react';
import NeonCard from'./NeonCard';
import DividerLine from'./DividerLine';
import{motion}from'framer-motion';
import AnimatedCounter from'./AnimatedCounter';

export default function KPICard({icon:Icon,label,value,trend,colorScheme='pessoal',iconColor,isCurrency=false}){
 const defaultIconColor={
  pessoal:'pessoal',
  entretenimento:'entretenimento',
  lm_impressoes:'lanhouse',
  igreja:'igreja',
  barbearia:'barbearia'
 }[colorScheme]||'pessoal';

 const finalIconColor=iconColor||defaultIconColor;

 const numericValue=typeof value==='string'
  ?parseFloat(value.replace(/[^0-9.-]+/g,''))
  :value;

 return <NeonCard colorScheme={colorScheme} className="flex flex-col gap-4">
  <div className="flex items-center gap-4">
   <motion.div
    whileHover={{rotate:2,scale:1.04}}
    transition={{duration:.2,ease:'easeOut'}}
    className="rounded-lg bg-background/80 p-3 shadow-[0_0_15px_hsl(var(--primary)/.5)] transition-[box-shadow,transform] duration-300 hover:shadow-[0_0_20px_hsl(var(--primary)/.8)] motion-reduce:transition-none"
    style={{color:`hsl(var(--neon-${finalIconColor}))`,'--primary':`var(--neon-${finalIconColor})`}}
    aria-hidden="true"
   >
    <Icon size={28}/>
   </motion.div>

   <div className="min-w-0 flex-1">
    <p className="truncate text-sm font-medium uppercase tracking-wider text-muted-foreground">{label}</p>

    <h3 className="mt-1 text-2xl font-bold text-foreground">
     {typeof numericValue==='number'&&!isNaN(numericValue)
      ?<AnimatedCounter value={numericValue} format={v=>isCurrency?`R$ ${v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}`:Math.round(v).toString()}/>
      :value}
    </h3>
   </div>
  </div>

  {trend&&<>
   <DividerLine moduleName={colorScheme} className="mt-2 opacity-50" thickness={1}/>
   <div className="mt-2 text-xs font-medium text-muted-foreground">{trend}</div>
  </>}
 </NeonCard>;
}
