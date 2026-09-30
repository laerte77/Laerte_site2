import React,{useEffect,useState}from'react';
import{Card,CardContent}from'@/components/ui/card';
import{Package,ArrowDownRight,ArrowUpRight,Archive}from'lucide-react';
import{cn}from'@/lib/utils';

const EstoqueAtualCard=({item})=>{
 const{tipo_folha,baseline,reposicoes,folhasGastas,estoqueAtual}=item;
 const[flash,setFlash]=useState(false);

 useEffect(()=>{
  setFlash(true);
  const timer=setTimeout(()=>setFlash(false),1500);
  return()=>clearTimeout(timer);
 },[estoqueAtual,reposicoes,folhasGastas]);

 let statusColor='text-stock-positive',statusBg='bg-stock-positive/10',statusBorder='border-stock-positive/30';
 if(estoqueAtual<0){statusColor='text-stock-negative';statusBg='bg-stock-negative/10';statusBorder='border-stock-negative/30'}
 else if(estoqueAtual<50){statusColor='text-stock-low';statusBg='bg-stock-low/10';statusBorder='border-stock-low/30'}

 return <Card className={cn('relative overflow-hidden border bg-card/80 backdrop-blur-sm transition-[border-color,box-shadow,background-color,transform] duration-200 motion-reduce:transition-none',statusBorder,flash&&'stock-update-flash')}>
  <div className={cn('absolute left-0 top-0 h-full w-1',statusBg.replace('/10',''))}/>
  <CardContent className="p-4 sm:p-5">
   <div className="mb-4 flex items-start justify-between gap-3">
    <div className="flex min-w-0 items-center gap-2">
     <div className={cn('shrink-0 rounded-lg p-2',statusBg)}><Package className={cn('h-5 w-5',statusColor)} aria-hidden="true"/></div>
     <h3 className="max-w-[150px] truncate text-base font-bold tracking-tight text-foreground sm:text-lg" title={tipo_folha}>{tipo_folha}</h3>
    </div>
    <div className="shrink-0 text-right">
     <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atual</span>
     <span className={cn('mt-1 block text-2xl font-black leading-none',statusColor)}>{estoqueAtual}</span>
    </div>
   </div>

   <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-4 text-sm">
    <div className="flex min-w-0 flex-col"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Archive className="h-3 w-3" aria-hidden="true"/>Base</span><span className="font-semibold text-foreground">{baseline}</span></div>
    <div className="flex min-w-0 flex-col"><span className="flex items-center gap-1 text-xs text-emerald-400"><ArrowUpRight className="h-3 w-3" aria-hidden="true"/>Entrada</span><span className="font-semibold text-emerald-400">+{reposicoes}</span></div>
    <div className="flex min-w-0 flex-col"><span className="flex items-center gap-1 text-xs text-rose-400"><ArrowDownRight className="h-3 w-3" aria-hidden="true"/>Saída</span><span className="font-semibold text-rose-400">-{folhasGastas}</span></div>
   </div>
  </CardContent>
 </Card>
};

export default EstoqueAtualCard;
