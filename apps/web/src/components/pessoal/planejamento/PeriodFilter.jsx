import React from'react';
import{startOfWeek,endOfWeek}from'date-fns';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent}from'@/components/ui/card';
import{Label}from'@/components/ui/label';
import{CalendarDays}from'lucide-react';

const meses=[
 'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const anoAtual=new Date().getFullYear();
const anos=[anoAtual-1,anoAtual,anoAtual+1];

export default function PeriodFilter({periodFilter,setPeriodFilter}){

 const update=(key,value)=>{
  setPeriodFilter(prev=>({...prev,[key]:value}));
 };

 const semanaInicio=startOfWeek(new Date());
 const semanaFim=endOfWeek(new Date());

 return(
  <Card className="border-border bg-card">
   <CardContent className="p-4">

    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">

     <div className="flex items-center gap-2 pb-2 lg:pb-0">
      <div className="rounded-lg bg-blue-500/10 p-2 text-[hsl(var(--neon-pessoal))]">
       <CalendarDays className="h-4 w-4"/>
      </div>

      <div>
       <p className="text-sm font-semibold text-foreground">
        Período de análise
       </p>
       <p className="text-xs text-muted-foreground">
        Defina o intervalo do planejamento.
       </p>
      </div>
     </div>

     <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">
       Período
      </Label>

      <Select
       value={periodFilter.periodType}
       onValueChange={v=>update('periodType',v)}
      >
       <SelectTrigger className="h-10 w-[150px] bg-input">
        <SelectValue placeholder="Selecione"/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal bg-card">
        <SelectItem value="mes">Mês</SelectItem>
        <SelectItem value="quinzena">Quinzena</SelectItem>
        <SelectItem value="semana">Semana</SelectItem>
       </SelectContent>
      </Select>
     </div>

     {(periodFilter.periodType==='mes'||periodFilter.periodType==='quinzena')&&(
      <div className="space-y-1.5">
       <Label className="text-xs text-muted-foreground">
        Mês
       </Label>

       <Select
        value={String(periodFilter.month)}
        onValueChange={v=>update('month',Number(v))}
       >
        <SelectTrigger className="h-10 w-[140px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal bg-card">
         {meses.map((mes,i)=>(
          <SelectItem key={i} value={String(i)}>
           {mes}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>
     )}

     {(periodFilter.periodType==='mes'||periodFilter.periodType==='quinzena')&&(
      <div className="space-y-1.5">
       <Label className="text-xs text-muted-foreground">
        Ano
       </Label>

       <Select
        value={String(periodFilter.year)}
        onValueChange={v=>update('year',Number(v))}
       >
        <SelectTrigger className="h-10 w-[110px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal bg-card">
         {anos.map(ano=>(
          <SelectItem key={ano} value={String(ano)}>
           {ano}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>
     )}

     {periodFilter.periodType==='quinzena'&&(
      <div className="space-y-1.5">
       <Label className="text-xs text-muted-foreground">
        Quinzena
       </Label>

       <Select
        value={String(periodFilter.quinzena)}
        onValueChange={v=>update('quinzena',Number(v))}
       >
        <SelectTrigger className="h-10 w-[135px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal bg-card">
         <SelectItem value="1">1ª Quinzena</SelectItem>
         <SelectItem value="2">2ª Quinzena</SelectItem>
        </SelectContent>
       </Select>
      </div>
     )}

     {periodFilter.periodType==='semana'&&(
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-2.5">

       <p className="text-xs font-medium text-muted-foreground">
        Semana atual
       </p>

       <p className="mt-0.5 text-sm font-semibold text-foreground">
        {semanaInicio.toLocaleDateString('pt-BR')}
        {' — '}
        {semanaFim.toLocaleDateString('pt-BR')}
       </p>

      </div>
     )}

    </div>

   </CardContent>
  </Card>
 );
}
