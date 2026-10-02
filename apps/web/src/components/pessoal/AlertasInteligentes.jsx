import React,{useState,useEffect,useCallback}from'react';
import{
 AlertTriangle,PiggyBank,Target,Lightbulb,ArrowRight,
 Wallet,CheckCircle2,ChevronDown,RefreshCw
}from'lucide-react';
import{motion}from'framer-motion';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Badge}from'@/components/ui/badge';
import{Button}from'@/components/ui/button';
import{Collapsible,CollapsibleContent,CollapsibleTrigger}from'@/components/ui/collapsible';
import{useToast}from'@/components/ui/use-toast';

const BLUE='hsl(var(--neon-pessoal))';
const RED='hsl(0 84% 60%)';
const GREEN='hsl(142 70% 45%)';

const AlertasInteligentes=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[loading,setLoading]=useState(true);
 const[analysis,setAnalysis]=useState([]);
 const[summary,setSummary]=useState({
  totalSavingsPotential:0,
  investmentGoal:0,
  monthlyExcess:0,
  totalCurrent:0,
  totalPrev:0
 });

 const formatCurrency=value=>
  new Intl.NumberFormat('pt-BR',{
   style:'currency',
   currency:'BRL'
  }).format(value);

 const getRecommendation=(category,diff)=>{
  const name=(category||'').toLowerCase();

  if(diff<=0)return'Ótimo trabalho! Manutenção ou redução de gastos.';
  if(name.includes('alimentação')||name.includes('mercado'))
   return'Revise itens supérfluos na lista de compras.';
  if(name.includes('transporte')||name.includes('combustível'))
   return'Avalie rotas alternativas ou transporte compartilhado.';
  if(name.includes('lazer'))
   return'Defina um teto máximo para saídas no fim de semana.';
  if(name.includes('fixa')||name.includes('casa'))
   return'Verifique consumo de luz/água ou renegocie contratos.';
  if(name.includes('cartão')||name.includes('crédito'))
   return'Atenção ao acúmulo de parcelas e juros.';

  return'Identifique gastos não essenciais nesta categoria.';
 };

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const now=new Date();
  const year=now.getFullYear();
  const month=now.getMonth();

  const currentStart=new Date(year,month,1).toISOString();
  const currentEnd=new Date(year,month+1,0,23,59,59).toISOString();
  const prevStart=new Date(year,month-1,1).toISOString();
  const prevEnd=new Date(year,month,0,23,59,59).toISOString();

  try{
   const{data:tipos,error:tiposError}=await supabase
    .from('tipos_despesa')
    .select('nome_despesa,categoria')
    .eq('user_id',user.id);

   if(tiposError)throw tiposError;

   const tipoMap={};
   const categories=new Set();
   const tiposSet=new Set();

   tipos?.forEach(item=>{
    if(!item.nome_despesa)return;

    tipoMap[item.nome_despesa]=item.categoria||'Sem Categoria';
    categories.add(item.categoria||'Sem Categoria');
    tiposSet.add(item.nome_despesa);
   });

   const fetchExpenses=async(start,end)=>{
    const{data,error}=await supabase
     .from('despesas')
     .select('valor,despesa,categoria')
     .eq('user_id',user.id)
     .gte('data',start)
     .lte('data',end);

    if(error)throw error;
    return data||[];
   };

   const[currentData,prevData]=await Promise.all([
    fetchExpenses(currentStart,currentEnd),
    fetchExpenses(prevStart,prevEnd)
   ]);

   const sumByTipo=data=>{
    const sums={};

    data.forEach(item=>{
     const name=item.despesa||'Outros';

     sums[name]=(sums[name]||0)+Number(item.valor||0);

     if(!tipoMap[name]){
      tipoMap[name]=item.categoria||'Sem Categoria';
      categories.add(item.categoria||'Sem Categoria');
      tiposSet.add(name);
     }
    });

    return sums;
   };

   const currentSums=sumByTipo(currentData);
   const prevSums=sumByTipo(prevData);

   let totalCurrent=0;
   let totalPrev=0;
   let totalExcess=0;
   const grouped=[];

   Array.from(categories).forEach(category=>{
    const types=Array.from(tiposSet).filter(
     name=>tipoMap[name]===category
    );

    const items=types
     .map(name=>{
      const current=currentSums[name]||0;
      const previous=prevSums[name]||0;

      return{
       name,
       current,
       previous,
       diff:current-previous
      };
     })
     .filter(item=>item.previous>0)
     .sort((a,b)=>b.current-a.current);

    if(!items.length)return;

    const current=items.reduce((sum,item)=>sum+item.current,0);
    const previous=items.reduce((sum,item)=>sum+item.previous,0);
    const diff=current-previous;

    totalCurrent+=current;
    totalPrev+=previous;
    if(diff>0)totalExcess+=diff;

    grouped.push({
     category,
     current,
     previous,
     diff,
     items,
     recommendation:getRecommendation(category,diff)
    });
   });

   grouped.sort((a,b)=>b.current-a.current);

   setAnalysis(grouped);
   setSummary({
    totalSavingsPotential:totalExcess,
    investmentGoal:totalExcess*.8,
    monthlyExcess:totalExcess,
    totalCurrent,
    totalPrev
   });
  }catch(error){
   console.error(error);
   toast({
    title:'Erro na análise',
    description:'Não foi possível carregar os dados.',
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 if(loading){
  return(
   <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-[hsl(var(--neon-pessoal))]"/>
    <p className="text-sm text-muted-foreground">
     Analisando seus padrões de consumo...
    </p>
   </div>
  );
 }

 return(
  <div className="dark-pessoal space-y-4 pb-20 md:pb-0">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10">
      <Lightbulb className="h-5 w-5 text-amber-400"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-amber-400">
       Inteligência
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Alertas Inteligentes
      </h1>

      <p className="text-sm text-muted-foreground">
       Comparativo detalhado entre o mês anterior e o atual.
      </p>
     </div>
    </div>

    <Button variant="outline" onClick={fetchData}>
     <RefreshCw className="mr-2 h-4 w-4"/>
     Atualizar Análise
    </Button>
   </div>

   <div className="grid gap-4 md:grid-cols-3">

    <Card className="border-red-500/20 bg-red-500/5">
     <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-400">
       <AlertTriangle className="h-4 w-4"/>
       Aumento Total
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p className="text-2xl font-bold text-red-400">
       {formatCurrency(summary.monthlyExcess)}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
       Soma dos aumentos em relação ao mês anterior.
      </p>
     </CardContent>
    </Card>

    <Card
     className="border-border bg-card"
     style={{boxShadow:`0 0 20px ${BLUE.replace(')','/.05)')}`}}
    >
     <CardHeader className="pb-2">
      <CardTitle
       className="flex items-center gap-2 text-sm font-medium"
       style={{color:BLUE}}
      >
       <Target className="h-4 w-4"/>
       Total Gasto Atual
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p
       className="text-2xl font-bold"
       style={{color:BLUE}}
      >
       {formatCurrency(summary.totalCurrent)}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
       Mês anterior: {formatCurrency(summary.totalPrev)}
      </p>
     </CardContent>
    </Card>

    <Card className="border-emerald-500/20 bg-emerald-500/5">
     <CardHeader className="pb-2">
      <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-400">
       <PiggyBank className="h-4 w-4"/>
       Sugestão de Investimento
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p className="text-2xl font-bold text-emerald-400">
       {formatCurrency(summary.investmentGoal)}
      </p>

      <p className="mt-1 text-xs text-muted-foreground">
       Considerando 80% dos aumentos identificados.
      </p>
     </CardContent>
    </Card>

   </div>

   <div className="rounded-xl border border-border bg-card/70 p-5">
    <div className="mb-4 flex items-center gap-2">
     <Lightbulb className="h-5 w-5 text-amber-400"/>
     <h2 className="text-lg font-semibold">
      Detalhamento por Categoria e Tipo
     </h2>
    </div>

    {!analysis.length?(
     <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
      Nenhuma despesa encontrada no mês anterior para comparação.
     </div>
    ):(
     <div className="space-y-3">
      {analysis.map((group,index)=>(
       <motion.div
        key={group.category}
        initial={{opacity:0,y:12}}
        animate={{opacity:1,y:0}}
        transition={{delay:index*.05}}
       >
        <Card className={`border-l-4 ${group.diff>0?'border-l-red-500':'border-l-emerald-500'} bg-card`}>
         <CardContent className="p-0">
          <Collapsible className="group">

           <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
             <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="font-semibold capitalize">
               {group.category}
              </h3>

              <Badge
               variant={group.diff>0?'destructive':'secondary'}
               className="text-[10px]"
              >
               {group.diff>0?'Aumentou':'Reduziu/Manteve'}
              </Badge>
             </div>

             <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
               Anterior: <strong>{formatCurrency(group.previous)}</strong>
              </span>

              <ArrowRight className="h-3 w-3"/>

              <span>
               Atual:{' '}
               <strong style={{color:group.diff>0?RED:GREEN}}>
                {formatCurrency(group.current)}
               </strong>
              </span>
             </div>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
             <div className="text-right">
              <p
               className="text-sm font-bold"
               style={{color:group.diff>0?RED:GREEN}}
              >
               {group.diff>0?'+':''}
               {formatCurrency(group.diff)}
              </p>

              <p className="text-[10px] text-muted-foreground">
               Diferença
              </p>
             </div>

             <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon">
               <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"/>
              </Button>
             </CollapsibleTrigger>
            </div>
           </div>

           <CollapsibleContent>
            <div className="border-t border-border p-4">
             <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Detalhamento dos Tipos
             </p>

             <div className="space-y-2">
              {group.items.map(item=>(
               <div
                key={item.name}
                className="flex flex-col gap-1 rounded-lg border border-transparent p-2 hover:border-border hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
               >
                <div className="flex items-center gap-2 text-sm font-medium">
                 <span
                  className={`h-2 w-2 rounded-full ${item.diff>0?'bg-red-400':'bg-emerald-400'}`}
                 />
                 {item.name}
                </div>

                <div className="flex items-center gap-2 pl-4 text-xs text-muted-foreground sm:pl-0">
                 <span>Ant: {formatCurrency(item.previous)}</span>
                 <ArrowRight className="h-3 w-3"/>
                 <strong style={{color:item.diff>0?RED:GREEN}}>
                  {formatCurrency(item.current)}
                 </strong>
                </div>
               </div>
              ))}
             </div>

             <div
              className={`mt-4 rounded-lg border p-3 ${
               group.diff>0
                ?'border-red-500/20 bg-red-500/10'
                :'border-emerald-500/20 bg-emerald-500/10'
              }`}
             >
              <p className="flex gap-2 text-sm">
               {group.diff>0?(
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400"/>
               ):(
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"/>
               )}

               <span>
                <strong>Dica:</strong> {group.recommendation}
               </span>
              </p>
             </div>
            </div>
           </CollapsibleContent>

          </Collapsible>
         </CardContent>
        </Card>
       </motion.div>
      ))}
     </div>
    )}
   </div>

   <Card className="overflow-hidden border-border bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
    <CardContent className="relative p-6">
     <Wallet className="mb-3 h-6 w-6"/>

     <h2 className="text-2xl font-bold">
      Planejamento Futuro
     </h2>

     <p className="mt-2 max-w-2xl text-sm text-blue-100">
      Mantendo esses cortes de gastos e investindo a diferença,
      a projeção acumulada pode chegar a:
     </p>

     <div className="mt-6 grid gap-6 sm:grid-cols-2">
      <div>
       <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
        Em 1 Ano
       </p>

       <p className="mt-1 text-3xl font-black">
        {formatCurrency(summary.monthlyExcess*12)}
       </p>
      </div>

      <div>
       <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
        Em 5 Anos
       </p>

       <p className="mt-1 text-3xl font-black">
        {formatCurrency(summary.monthlyExcess*12*5*1.15)}
       </p>

       <p className="mt-1 text-[10px] text-blue-300">
        *Estimativa mantida conforme a lógica atual do sistema.
       </p>
      </div>
     </div>
    </CardContent>
   </Card>

  </div>
 );
};

export default AlertasInteligentes;
