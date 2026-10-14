import React,{useState,useMemo,useEffect,useCallback}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Button}from'@/components/ui/button';
import{Badge}from'@/components/ui/badge';
import{formatCurrency}from'@/lib/utils';
import{AlertCircle,RefreshCw,CheckCircle2,Clock,AlertTriangle,FileText,Filter,Receipt,TrendingDown,TrendingUp,Minus}from'lucide-react';
import{format,parseISO,endOfMonth,startOfMonth}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import CategoryIcon from'@/components/CategoryIcon';
import StatusChangeModal from'@/components/StatusChangeModal';
import LoadingSkeleton from'@/components/ui/LoadingSkeleton';
import{calculateGastoReal}from'@/lib/gastoRealUtils.js';

const MONTHS=[
 {value:1,label:'Janeiro'},{value:2,label:'Fevereiro'},
 {value:3,label:'Março'},{value:4,label:'Abril'},
 {value:5,label:'Maio'},{value:6,label:'Junho'},
 {value:7,label:'Julho'},{value:8,label:'Agosto'},
 {value:9,label:'Setembro'},{value:10,label:'Outubro'},
 {value:11,label:'Novembro'},{value:12,label:'Dezembro'}
];

const brl=v=>formatCurrency(Number(v)||0);

export default function ContasMesLM(){
 const{user}=useAuth(),now=new Date();
 const[m,setM]=useState(now.getMonth()+1),
 [y,setY]=useState(now.getFullYear()),
 [cat,setCat]=useState('Todas'),
 [status,setStatus]=useState('Todos'),
 [data,setData]=useState([]),
 [loading,setLoading]=useState(true),
 [error,setError]=useState(null),
 [expense,setExpense]=useState(null),
 [modal,setModal]=useState(false),
 [comparison,setComparison]=useState({
  previstoAnterior:0,
  gastoRealAnterior:0,
  gastoRealAtual:0
 });

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);
  setError(null);

  try{
   const selectedDate=new Date(y,m-1,1);
   const previousDate=new Date(y,m-2,1);
   const start=format(startOfMonth(selectedDate),'yyyy-MM-dd');
   const end=format(endOfMonth(selectedDate),'yyyy-MM-dd');
   const previousStart=format(startOfMonth(previousDate),'yyyy-MM-dd');
   const previousEnd=format(endOfMonth(previousDate),'yyyy-MM-dd');

   const[pRes,rRes,prevRes,realCurrent,realPrevious]=await Promise.all([
    supabase.from('lm_despesas_previstas')
     .select('*')
     .eq('user_id',user.id)
     .gte('data_vencimento',start)
     .lte('data_vencimento',end),

    supabase.from('lm_lanc_despesas')
     .select('*, lm_despesas(despesa)')
     .eq('user_id',user.id)
     .gte('data',start)
     .lte('data',end),

    supabase.from('lm_despesas_previstas')
     .select('valor')
     .eq('user_id',user.id)
     .gte('data_vencimento',previousStart)
     .lte('data_vencimento',previousEnd),

    calculateGastoReal(user.id,selectedDate,'lanhouse'),
    calculateGastoReal(user.id,previousDate,'lanhouse')
   ]);

   if(pRes.error)throw pRes.error;
   if(rRes.error)throw rRes.error;
   if(prevRes.error)throw prevRes.error;

   const result=(pRes.data||[]).map(x=>{
    const previsto=Number(x.valor)||0;
    const desc=(x.descricao||'').toLowerCase().trim();

    const reais=(rRes.data||[]).filter(z=>
     (z.lm_despesas?.despesa||'').toLowerCase().trim()===desc
    );

    const real=reais.reduce((sum,z)=>sum+(Number(z.valor)||0),0);
    const dif=real-previsto;

    let st=real>=previsto&&previsto>0?'Pago':real>0?'Parcial':'Pendente';

    if(real===0&&x.status&&x.status!=='Pendente')st=x.status;

    return{
     id:x.id,
     data_vencimento:x.data_vencimento,
     descricao:x.descricao,
     categoria:x.categoria||'Outros',
     valor_previsto:previsto,
     valor_real:real,
     diferenca:dif,
     status:st
    };
   }).sort((a,b)=>new Date(a.data_vencimento)-new Date(b.data_vencimento));

   setData(result);

   setComparison({
    previstoAnterior:(prevRes.data||[]).reduce((sum,x)=>sum+(Number(x.valor)||0),0),
    gastoRealAnterior:Number(realPrevious)||0,
    gastoRealAtual:Number(realCurrent)||0
   });
  }catch(e){
   setError(e.message||'Não foi possível carregar as contas.');
  }finally{
   setLoading(false);
  }
 },[user,m,y]);

 useEffect(()=>{fetchData();},[fetchData]);

 const years=useMemo(()=>{
  const c=new Date().getFullYear();
  return[c-2,c-1,c,c+1,c+2];
 },[]);

 const cats=useMemo(()=>[
  'Todas',...new Set(data.map(x=>x.categoria).filter(Boolean))
 ],[data]);

 const filtered=useMemo(()=>data.filter(x=>
  (cat==='Todas'||x.categoria===cat)&&
  (status==='Todos'||x.status===status)
 ),[data,cat,status]);

 const totals=useMemo(()=>filtered.reduce((a,x)=>({
  previsto:a.previsto+x.valor_previsto,
  real:a.real+x.valor_real,
  dif:a.dif+x.diferenca
 }),{previsto:0,real:0,dif:0}),[filtered]);

 const clear=()=>{
  setM(now.getMonth()+1);
  setY(now.getFullYear());
  setCat('Todas');
  setStatus('Todos');
 };

 const change=e=>{
  setExpense(e);
  setModal(true);
 };

 const badge=(s,e)=>{
  const cfg={
   Pago:['bg-emerald-500',CheckCircle2,'Pago'],
   Parcial:['bg-orange-500',AlertTriangle,'Parcial'],
   'Pago Parcialmente':['bg-orange-500',AlertTriangle,'Parcial'],
   Atrasado:['bg-red-500',AlertCircle,'Atrasado'],
   Pendente:['bg-yellow-500',Clock,'Pendente']
  }[s]||['bg-yellow-500',Clock,'Pendente'];

  const Icon=cfg[1];

  return(
   <div className="flex flex-col items-center gap-1">
    <Badge className={`${cfg[0]} text-white`}>
     <Icon className="mr-1 h-3 w-3"/>
     {cfg[2]}
    </Badge>
    <Button
     variant="ghost"
     size="sm"
     className="h-6 text-xs text-cyan-500 hover:text-cyan-400"
     onClick={()=>change(e)}
    >
     Mudar Status
    </Button>
   </div>
  );
 };

 const diff=comparison.gastoRealAtual-comparison.gastoRealAnterior;
 const selectedLabel=`${MONTHS[m-1].label} de ${y}`;

 return(
  <div className="space-y-6">
   <Card className="border-cyan-500/20">
    <CardContent className="p-5">
     <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div className="flex items-center gap-3">
       <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
        <FileText className="h-7 w-7 text-cyan-400"/>
       </div>
       <div>
        <p className="text-xs uppercase tracking-wider text-cyan-400">Consultas • LM Impressões</p>
        <h1 className="text-2xl font-bold">Contas do Mês</h1>
        <p className="text-sm text-muted-foreground">Acompanhamento das despesas do mês selecionado.</p>
       </div>
      </div>
      <Button
       variant="outline"
       onClick={fetchData}
       disabled={loading}
       className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
      >
       <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>
       Atualizar
      </Button>
     </div>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card className="border-cyan-500/20">
     <CardContent className="flex items-center justify-between p-5">
      <div>
       <p className="text-xs uppercase text-muted-foreground">Contas</p>
       <p className="mt-1 text-xl font-bold">{filtered.length}</p>
      </div>
      <Receipt className="h-6 w-6 text-cyan-400"/>
     </CardContent>
    </Card>

    <Card className="border-cyan-500/20">
     <CardContent className="flex items-center justify-between p-5">
      <div>
       <p className="text-xs uppercase text-muted-foreground">Total Previsto</p>
       <p className="mt-1 text-xl font-bold">{brl(totals.previsto)}</p>
      </div>
      <Receipt className="h-6 w-6 text-blue-400"/>
     </CardContent>
    </Card>

    <Card className="border-cyan-500/20">
     <CardContent className="flex items-center justify-between p-5">
      <div>
       <p className="text-xs uppercase text-muted-foreground">Total Realizado</p>
       <p className="mt-1 text-xl font-bold text-emerald-500">{brl(totals.real)}</p>
      </div>
      <Receipt className="h-6 w-6 text-emerald-500"/>
     </CardContent>
    </Card>

    <Card className="border-cyan-500/20">
     <CardContent className="flex items-center justify-between p-5">
      <div>
       <p className="text-xs uppercase text-muted-foreground">Pendentes</p>
       <p className="mt-1 text-xl font-bold text-yellow-500">
        {filtered.filter(x=>x.status==='Pendente').length}
       </p>
      </div>
      <Clock className="h-6 w-6 text-yellow-500"/>
     </CardContent>
    </Card>
   </div>

   <Card className="border-cyan-500/20">
    <CardHeader>
     <CardTitle>Comparativo com o mês anterior</CardTitle>
     <p className="text-sm text-muted-foreground">
      Resumo financeiro de {selectedLabel}; este comparativo considera o mês inteiro e não muda com os filtros da tabela.
     </p>
    </CardHeader>
    <CardContent>
     <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4">
       <p className="text-sm text-muted-foreground">Previsto no mês anterior</p>
       <p className="mt-2 text-xl font-bold">{brl(comparison.previstoAnterior)}</p>
      </div>

      <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4">
       <p className="text-sm text-muted-foreground">Gasto real no mês anterior</p>
       <p className="mt-2 text-xl font-bold">{brl(comparison.gastoRealAnterior)}</p>
      </div>

      <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4">
       <p className="text-sm text-muted-foreground">Gasto real em {selectedLabel}</p>
       <p className="mt-2 text-xl font-bold">{brl(comparison.gastoRealAtual)}</p>
       <div className="mt-2 flex flex-wrap items-center gap-1 text-sm">
        {diff>0?(
         <>
          <TrendingUp className="h-4 w-4 text-red-400"/>
          <span className="text-red-400">Gastou {brl(diff)} a mais</span>
         </>
        ):diff<0?(
         <>
          <TrendingDown className="h-4 w-4 text-emerald-400"/>
          <span className="text-emerald-400">Economizou {brl(Math.abs(diff))}</span>
         </>
        ):(
         <>
          <Minus className="h-4 w-4 text-muted-foreground"/>
          <span className="text-muted-foreground">Mesmo valor</span>
         </>
        )}
        <span className="text-muted-foreground">vs. mês anterior</span>
       </div>
      </div>
     </div>
    </CardContent>
   </Card>

   <Card className="border-cyan-500/20">
    <CardHeader>
     <CardTitle className="flex items-center gap-2 text-base">
      <Filter className="h-4 w-4 text-cyan-400"/>
      Filtros
     </CardTitle>
    </CardHeader>
    <CardContent>
     <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Select value={String(m)} onValueChange={v=>setM(Number(v))}>
       <SelectTrigger><SelectValue placeholder="Mês"/></SelectTrigger>
       <SelectContent>
        {MONTHS.map(x=><SelectItem key={x.value} value={String(x.value)}>{x.label}</SelectItem>)}
       </SelectContent>
      </Select>

      <Select value={String(y)} onValueChange={v=>setY(Number(v))}>
       <SelectTrigger><SelectValue placeholder="Ano"/></SelectTrigger>
       <SelectContent>
        {years.map(x=><SelectItem key={x} value={String(x)}>{x}</SelectItem>)}
       </SelectContent>
      </Select>

      <Select value={cat} onValueChange={setCat}>
       <SelectTrigger><SelectValue placeholder="Categoria"/></SelectTrigger>
       <SelectContent>
        {cats.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}
       </SelectContent>
      </Select>

      <Select value={status} onValueChange={setStatus}>
       <SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger>
       <SelectContent>
        {['Todos','Pago','Pendente','Parcial','Atrasado'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}
       </SelectContent>
      </Select>

      <Button
       variant="outline"
       onClick={clear}
       className="border-cyan-500/30 hover:bg-cyan-500/10"
      >
       Limpar filtros
      </Button>
     </div>
    </CardContent>
   </Card>

   {error?(
    <Card className="border-destructive/20 bg-destructive/10">
     <CardContent className="p-8 text-center">
      <AlertCircle className="mx-auto mb-2"/>
      <p>Erro: {error}</p>
      <Button onClick={fetchData} variant="outline" className="mt-3">Tentar Novamente</Button>
     </CardContent>
    </Card>
   ):(
    <Card className="border-cyan-500/20">
     <CardHeader><CardTitle>Listagem de Contas</CardTitle></CardHeader>
     <CardContent className="p-0">
      {loading?(
       <div className="p-6"><LoadingSkeleton count={5} height="h-12"/></div>
      ):(
       <div className="responsive-table-wrapper">
        <Table>
         <TableHeader>
          <TableRow>
           <TableHead>Data</TableHead>
           <TableHead>Descrição</TableHead>
           <TableHead>Categoria</TableHead>
           <TableHead className="text-right">Previsto</TableHead>
           <TableHead className="text-right">Real</TableHead>
           <TableHead className="text-right">Diferença</TableHead>
           <TableHead className="text-center">Status</TableHead>
          </TableRow>
         </TableHeader>
         <TableBody>
          {!filtered.length?(
           <TableRow>
            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
             Nenhuma conta encontrada.
            </TableCell>
           </TableRow>
          ):filtered.map(x=>(
           <TableRow key={x.id} className="hover:bg-cyan-500/5">
            <TableCell>{format(parseISO(x.data_vencimento),'dd/MM/yyyy')}</TableCell>
            <TableCell>
             <div className="flex items-center gap-2">
              <CategoryIcon category={x.categoria} className="h-4 w-4 text-cyan-400"/>
              {x.descricao}
             </div>
            </TableCell>
            <TableCell>{x.categoria}</TableCell>
            <TableCell className="text-right">{brl(x.valor_previsto)}</TableCell>
            <TableCell className="text-right">{x.valor_real?brl(x.valor_real):'-'}</TableCell>
            <TableCell className={`text-right ${x.diferenca<0?'text-emerald-500':x.diferenca>0?'text-destructive':'text-muted-foreground'}`}>
             {brl(x.diferenca)}
            </TableCell>
            <TableCell className="text-center">{badge(x.status,x)}</TableCell>
           </TableRow>
          ))}
          {filtered.length>0&&(
           <TableRow className="bg-muted/30 font-bold">
            <TableCell colSpan={3} className="text-right">Subtotais:</TableCell>
            <TableCell className="text-right">{brl(totals.previsto)}</TableCell>
            <TableCell className="text-right text-emerald-500">{brl(totals.real)}</TableCell>
            <TableCell className="text-right">{brl(totals.dif)}</TableCell>
            <TableCell/>
           </TableRow>
          )}
         </TableBody>
        </Table>
       </div>
      )}
     </CardContent>
    </Card>
   )}

   <StatusChangeModal
    isOpen={modal}
    onClose={()=>setModal(false)}
    onStatusChange={fetchData}
    currentStatus={expense?.status}
    tableName="lm_despesas_previstas"
    recordId={expense?.id}
   />
  </div>
 );
}
