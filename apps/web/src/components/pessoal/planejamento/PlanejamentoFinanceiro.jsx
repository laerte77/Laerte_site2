import React,{useState}from'react';
import{motion}from'framer-motion';
import{PieChart,Loader2}from'lucide-react';
import PeriodFilter from'./PeriodFilter';
import EntradaCard from'./EntradaCard';
import DespesaCard from'./DespesaCard';
import SaldoCard from'./SaldoCard';
import DistribuicaoCard from'./DistribuicaoCard';
import{useFinancialData}from'@/hooks/useFinancialData';

export default function PlanejamentoFinanceiro(){
 const now=new Date();

 const[periodFilter,setPeriodFilter]=useState({
  periodType:'mes',
  month:now.getMonth(),
  year:now.getFullYear(),
  quinzena:1,
  dateRange:{from:null,to:null}
 });

 const{data,loading,error,refetch}=useFinancialData(periodFilter);

 if(error){
  return(
   <div className="dark-pessoal flex min-h-[300px] items-center justify-center p-6">
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-6 py-5 text-center">
     <p className="font-semibold text-red-400">
      Não foi possível carregar o planejamento.
     </p>
     <p className="mt-1 text-sm text-muted-foreground">
      {error}
     </p>
    </div>
   </div>
  );
 }

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-pessoal space-y-5"
  >

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    <div className="flex items-center gap-3">

     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-[hsl(var(--neon-pessoal))] shadow-[0_0_20px_hsl(var(--neon-pessoal)/.08)]">
      <PieChart className="h-5 w-5"/>
     </div>

     <div>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
       Finanças Pessoais
      </p>

      <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
       Planejamento Financeiro
      </h1>

      <p className="text-sm text-muted-foreground">
       Acompanhe, compare e planeje suas finanças.
      </p>
     </div>

    </div>

   </div>

   <PeriodFilter
    periodFilter={periodFilter}
    setPeriodFilter={setPeriodFilter}
   />

   {loading?(
    <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-border bg-card">

     <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <Loader2
       className="h-7 w-7 animate-spin"
       style={{color:'hsl(var(--neon-pessoal))'}}
      />
      <span className="text-sm">
       Carregando planejamento...
      </span>
     </div>

    </div>
   ):(
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

     <EntradaCard
      realValue={data.entradasReais}
      prevValue={data.entradasPrevistas}
      periodFilter={periodFilter}
      onUpdate={refetch}
     />

     <DespesaCard
      realValue={data.despesasReais}
      prevValue={data.despesasPrevistas}
     />

     <SaldoCard
      entradasPrev={data.entradasPrevistas}
      despesasPrev={data.despesasPrevistas}
      entradasReais={data.entradasReais}
      despesasReais={data.despesasReais}
     />

     <DistribuicaoCard
      saldoPrev={data.entradasPrevistas-data.despesasPrevistas}
      saldoReal={data.entradasReais-data.despesasReais}
      distribuicao={data.distribuicao}
      onUpdate={refetch}
     />

    </div>
   )}

  </motion.div>
 );
}
