import React from'react';
import{WalletCards,ArrowUpRight,ArrowDownRight}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{formatCurrency}from'@/lib/utils';

const saldoStyle=valor=>{
 if(valor>0){
  return{
   color:'text-green-400',
   bg:'bg-green-500/10',
   icon:ArrowUpRight
  };
 }

 if(valor<0){
  return{
   color:'text-red-500',
   bg:'bg-red-500/10',
   icon:ArrowDownRight
  };
 }

 return{
  color:'text-muted-foreground',
  bg:'bg-muted/30',
  icon:WalletCards
 };
};

export default function SaldoCard({
 entradasPrev,
 despesasPrev,
 entradasReais,
 despesasReais,
 aportesReais,
 dizimosReais
}){
 const saldoPrev=entradasPrev-despesasPrev;

 const saldoReal=
  entradasReais-
  despesasReais-
  aportesReais-
  dizimosReais;

 const previsto=saldoStyle(saldoPrev);
 const real=saldoStyle(saldoReal);

 const PrevIcon=previsto.icon;
 const RealIcon=real.icon;

 return(
  <Card className="border-border bg-card lg:col-span-2">

   <CardHeader className="border-b border-border/50 pb-3">

    <CardTitle className="flex items-center gap-2 text-lg">

     <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-[hsl(var(--neon-pessoal))]">
      <WalletCards className="h-4 w-4"/>
     </span>

     Resumo de Saldo

    </CardTitle>

   </CardHeader>

   <CardContent className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2">

    <div className="flex flex-col items-center justify-center space-y-3 text-center md:border-r md:border-border/50">

     <div className={`rounded-xl p-3 ${previsto.bg} ${previsto.color}`}>
      <PrevIcon className="h-5 w-5"/>
     </div>

     <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Saldo Previsto
     </span>

     <span className={`text-3xl font-black tabular-nums ${previsto.color}`}>
      {formatCurrency(saldoPrev)}
     </span>

    </div>

    <div className="flex flex-col items-center justify-center space-y-3 text-center">

     <div className={`rounded-xl p-3 ${real.bg} ${real.color}`}>
      <RealIcon className="h-5 w-5"/>
     </div>

     <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Saldo Real
     </span>

     <span className={`text-3xl font-black tabular-nums ${real.color}`}>
      {formatCurrency(saldoReal)}
     </span>

    </div>

   </CardContent>
  </Card>
 );
}
