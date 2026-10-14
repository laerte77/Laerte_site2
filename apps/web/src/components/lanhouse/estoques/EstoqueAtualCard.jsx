import React,{useEffect,useState}from'react';
import{Card,CardContent}from'@/components/ui/card';
import{Package,ArrowDownRight,ArrowUpRight,Archive,AlertTriangle,Plus}from'lucide-react';
import{cn}from'@/lib/utils';

const qty=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:3});

export default function EstoqueAtualCard({item}){
 const{tipo_folha,nomeInsumo,unidade,baseline,reposicoes,entradas,saidas,perdas,folhasGastas,estoqueAtual}=item;
 const[flash,setFlash]=useState(false);

 useEffect(()=>{
  setFlash(true);
  const timer=setTimeout(()=>setFlash(false),1200);
  return()=>clearTimeout(timer);
 },[estoqueAtual,reposicoes,entradas,saidas,perdas,folhasGastas]);

 const negative=Number(estoqueAtual)<0,zero=Number(estoqueAtual)===0;
 const color=negative?'text-red-400':zero?'text-amber-400':'text-emerald-400';
 const border=negative?'border-red-500/30':zero?'border-amber-500/30':'border-cyan-500/30';
 const Stat=({label,value,Icon,color='text-muted-foreground',prefix=''})=><div className="min-w-0"><span className={`flex items-center gap-1 text-[11px] ${color}`}><Icon className="h-3 w-3 shrink-0"/>{label}</span><span className={`mt-1 block break-words font-semibold tabular-nums ${color}`}>{prefix}{qty(value)}</span></div>;

 return <Card className={cn('relative overflow-hidden border bg-card/80 transition-all duration-200',border,flash&&'stock-update-flash')}>
  <div className={cn('absolute left-0 top-0 h-full w-1',negative?'bg-red-500':zero?'bg-amber-500':'bg-cyan-400')}/>
  <CardContent className="p-4 sm:p-5">
   <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
    <div className="flex min-w-0 flex-1 items-start gap-2"><div className="shrink-0 rounded-lg bg-muted p-2"><Package className={cn('h-5 w-5',color)}/></div><div className="min-w-0"><h3 className="break-words text-sm font-bold leading-snug sm:text-base" title={nomeInsumo||tipo_folha}>{nomeInsumo||tipo_folha}</h3><p className="mt-1 text-xs text-muted-foreground">{unidade||'unidade'}</p></div></div>
    <div className="shrink-0 text-right"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Atual</span><span className={cn('mt-1 block text-2xl font-black leading-none',color)}>{qty(estoqueAtual)}</span></div>
   </div>

   <div className="grid grid-cols-3 gap-3 border-t border-border/50 pt-3">
    <Stat label="Base" value={baseline} Icon={Archive}/>
    <Stat label="Reposição" value={reposicoes} Icon={ArrowDownRight} color="text-emerald-400" prefix="+"/>
    <Stat label="Entrada manual" value={entradas} Icon={Plus} color="text-emerald-400" prefix="+"/>
    <Stat label="Consumo serviço" value={folhasGastas} Icon={ArrowUpRight} color="text-red-400" prefix="-"/>
    <Stat label="Saída manual" value={saidas} Icon={ArrowUpRight} color="text-red-400" prefix="-"/>
    <Stat label="Perdas" value={perdas} Icon={AlertTriangle} color="text-red-400" prefix="-"/>
   </div>
  </CardContent>
 </Card>;
}

