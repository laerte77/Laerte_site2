import React from'react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{formatCurrency}from'@/lib/utils';

export default function DespesaCard({realValue,prevValue}){
 const diff=prevValue-realValue;

 return(
  <Card className="border-border bg-card">
   <CardHeader className="border-b border-border/50 pb-2">
    <CardTitle className="text-lg text-orange-500">Despesas</CardTitle>
   </CardHeader>
   <CardContent className="space-y-4 pt-4">
    <div className="flex items-center justify-between">
     <span className="text-sm font-medium text-muted-foreground">Previsto</span>
     <span className="text-xl font-bold">{formatCurrency(prevValue)}</span>
    </div>

    <div className="flex items-center justify-between">
     <span className="text-sm font-medium text-muted-foreground">Realizado</span>
     <span className="text-xl font-bold">{formatCurrency(realValue)}</span>
    </div>

    <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
     <span className="text-sm font-semibold">Economia / Excesso</span>
     <span className={`text-lg font-bold ${diff>0?'text-positive':diff<0?'text-negative':'text-foreground'}`}>
      {formatCurrency(diff)}
     </span>
    </div>
   </CardContent>
  </Card>
 );
}
