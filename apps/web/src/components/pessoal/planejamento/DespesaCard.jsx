import React from'react';
import{ArrowDownRight}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{formatCurrency}from'@/lib/utils';

export default function DespesaCard({realValue,prevValue}){
 const diff=prevValue-realValue;

 return(
  <Card className="border-border bg-card">

   <CardHeader className="border-b border-border/50 pb-3">
    <div className="flex items-center justify-between">

     <CardTitle className="flex items-center gap-2 text-lg text-red-500">

      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
       <ArrowDownRight className="h-4 w-4"/>
      </span>

      Despesas

     </CardTitle>

     <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-400">
      Saída
     </span>

    </div>
   </CardHeader>

   <CardContent className="space-y-4 pt-4">

    <div className="flex items-center justify-between">

     <span className="text-sm font-medium text-muted-foreground">
      Previsto
     </span>

     <span className="text-xl font-bold text-red-500 tabular-nums">
      {formatCurrency(prevValue)}
     </span>

    </div>

    <div className="flex items-center justify-between">

     <span className="text-sm font-medium text-muted-foreground">
      Realizado
     </span>

     <span className="text-xl font-bold text-red-500 tabular-nums">
      {formatCurrency(realValue)}
     </span>

    </div>

    <div className="flex items-center justify-between border-t border-border/50 pt-3">

     <span className="text-sm font-semibold">
      Economia / Excesso
     </span>

     <span
      className={`text-lg font-bold tabular-nums ${
       diff>0
        ?'text-green-400'
        :diff<0
        ?'text-red-400'
        :'text-muted-foreground'
      }`}
     >
      {diff>0?'+':''}{formatCurrency(diff)}
     </span>

    </div>

   </CardContent>
  </Card>
 );
}
