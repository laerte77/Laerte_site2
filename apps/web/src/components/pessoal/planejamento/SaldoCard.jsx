import React from'react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{formatCurrency}from'@/lib/utils';

export default function SaldoCard({entradasPrev,despesasPrev,entradasReais,despesasReais}){
 const saldoPrev=entradasPrev-despesasPrev;
 const saldoReal=entradasReais-despesasReais;

 return(
  <Card className="border-border bg-card lg:col-span-2">
   <CardHeader className="border-b border-border/50 pb-2">
    <CardTitle className="text-lg">Resumo de Saldo</CardTitle>
   </CardHeader>

   <CardContent className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2 md:divide-x md:divide-y-0 divide-y divide-border/50">
    <div className="flex flex-col items-center justify-center space-y-2 text-center">
     <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Saldo Previsto</span>
     <span className={`text-4xl font-black ${saldoPrev>=0?'text-positive':'text-negative'}`}>
      {formatCurrency(saldoPrev)}
     </span>
    </div>

    <div className="flex flex-col items-center justify-center space-y-2 pt-6 text-center md:pt-0">
     <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Saldo Real</span>
     <span className={`text-4xl font-black ${saldoReal>=0?'text-positive':'text-negative'}`}>
      {formatCurrency(saldoReal)}
     </span>
    </div>
   </CardContent>
  </Card>
 );
}
