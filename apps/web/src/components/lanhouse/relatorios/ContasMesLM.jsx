import React,{useState,useMemo,useEffect,useCallback}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Button}from'@/components/ui/button';
import{Badge}from'@/components/ui/badge';
import{formatCurrency}from'@/lib/utils';
import{AlertCircle,RefreshCw,CheckCircle2,Clock,AlertTriangle,FileText,Filter,Receipt,TrendingDown,TrendingUp,Minus,Loader2}from'lucide-react';
import{format,parseISO,subMonths}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import CategoryIcon from'@/components/CategoryIcon';
import StatusChangeModal from'@/components/StatusChangeModal';
import LoadingSkeleton from'@/components/ui/LoadingSkeleton';
import{calculateGastoReal}from'@/lib/gastoRealUtils.js';

const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const brl=v=>formatCurrency(Number(v)||0);
const dateKey=v=>String(v||'').slice(0,10);
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const todaySP=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`};

export default function ContasMesLM(){
 const{user}=useAuth();
 const now=new Date();
 const[m,setM]=useState(now.getMonth()+1),[y,setY]=useState(now.getFullYear());
 const[cat,setCat]=useState('Todas'),[status,setStatus]=useState('Todos');
 const[data,setData]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(null);
 const[expense,setExpense]=useState(null),[modal,setModal]=useState(false);
 const[comparison,setComparison]=useState({previstoAnterior:0,gastoRealAnterior:0,gastoRealAtual:0});

 const fetchData=useCallback(async()=>{
  if(!user){setData([]);setLoading(false);return}
  setLoading(true);setError(null);
  try{
   const selectedDate=new Date(y,m-1,1),previousDate=new Date(y,m-2,1);
   const start=format(new Date(y,m-1,1),'yyyy-MM-dd');
   const end=format(new Date(y,m,0),'yyyy-MM-dd');
   const previousStart=format(new Date(y,m-2,1),'yyyy-MM-dd');
   const previousEnd=format(new Date(y,m-1,0),'yyyy-MM-dd');
   const[pRes,rRes,prevRes,realCurrent,realPrevious]=await Promise.all([
    supabase.from('lm_despesas_previstas').select('*').eq('user_id',user.id).gte('data_vencimento',start).lte('data_vencimento',end),
    supabase.from('lm_lanc_despesas').select('*,lm_despesas(despesa)').eq('user_id',user.id).gte('data',start).lte('data',end),
    supabase.from('lm_despesas_previstas').select('valor').eq('user_id',user.id).gte('data_vencimento',previousStart).lte('data_vencimento',previousEnd),
    calculateGastoReal(user.id,selectedDate,'lanhouse'),
    calculateGastoReal(user.id,previousDate,'lanhouse')
   ]);
   for(const r of[pRes,rRes,prevRes])if(r.error)throw r.error;

   const launches=rRes.data||[];
   const today=todaySP();

   const result=(pRes.data||[]).map(x=>{
    const previsto=Number(x.valor)||0;
    const desc=normalize(x.descricao);
    const reais=launches.filter(z=>normalize(z.lm_despesas?.despesa)===desc);
    const real=reais.reduce((sum,z)=>sum+(Number(z.valor)||0),0);
    const dif=real-previsto;
    const savedStatus=normalize(x.status);
    let st;

    if(previsto>0&&real>=previsto)st='Pago';
    else if(real>0)st='Pago Parcialmente';
    else if(savedStatus==='pago')st='Pago';
    else if(savedStatus==='pago parcialmente'||savedStatus==='parcial')st='Pago Parcialmente';
    else if(savedStatus==='atrasado')st='Atrasado';
    else st=dateKey(x.data_vencimento)<today?'Atrasado':'Pendente';

    return{
     id:x.id,data_vencimento:x.data_vencimento,descricao:x.descricao,
     categoria:x.categoria||'Outros',valor_previsto:previsto,
     valor_real:real,diferenca:dif,status:st
    };
   }).sort((a,b)=>dateKey(a.data_vencimento).localeCompare(dateKey(b.data_vencimento)));

   setData(result);
   setComparison({
    previstoAnterior:(prevRes.data||[]).reduce((s,x)=>s+(Number(x.valor)||0),0),
    gastoRealAnterior:Number(realPrevious)||0,
    gastoRealAtual:Number(realCurrent)||0
   });
  }catch(e){
   console.error('Erro em Contas do Mês:',e);
   setError(e.message||'Não foi possível carregar as contas.');
  }finally{setLoading(false)}
 },[user,m,y]);

 useEffect(()=>{fetchData()},[fetchData]);

 const years=useMemo(()=>{const c=new Date().getFullYear();return[c-2,c-1,c,c+1,c+2]},[]);
 const cats=useMemo(()=>['Todas',...new Set(data.map(x=>x.categoria).filter(Boolean))],[data]);

 const filtered=useMemo(()=>data.filter(x=>
  (cat==='Todas'||x.categoria===cat)&&
  (status==='Todos'||
   (status==='Parcial'&&['parcial','pago parcialmente'].includes(normalize(x.status)))||
   normalize(x.status)===normalize(status))
 ),[data,cat,status]);

 const totals=useMemo(()=>filtered.reduce((a,x)=>({
  previsto:a.previsto+x.valor_previsto,
  real:a.real+x.valor_real,
  dif:a.dif+x.diferenca
 }),{previsto:0,real:0,dif:0}),[filtered]);

 const clear=()=>{setM(new Date().getMonth()+1);setY(new Date().getFullYear());setCat('Todas');setStatus('Todos')};
 const change=item=>{setExpense(item);setModal(true)};

 const badge=s=>{
  const cfg={
   pago:[CheckCircle2,'Pago','border-emerald-500/30 bg-emerald-500/10 text-emerald-400'],
   'pago parcialmente':[AlertTriangle,'Parcial','border-orange-500/30 bg-orange-500/10 text-orange-400'],
   parcial:[AlertTriangle,'Parcial','border-orange-500/30 bg-orange-500/10 text-orange-400'],
   atrasado:[AlertCircle,'Atrasado','border-red-500/30 bg-red-500/10 text-red-400'],
   pendente:[Clock,'Pendente','border-yellow-500/30 bg-yellow-500/10 text-yellow-400']
  }[normalize(s)]||[Clock,'Pendente','border-yellow-500/30 bg-yellow-500/10 text-yellow-400'];
  const Icon=cfg[0];
  return <div className="flex flex-col items-center gap-1"><Badge variant="outline" className={cfg[2]}><Icon className="mr-1 h-3 w-3"/>{cfg[1]}</Badge><Button variant="ghost" size="sm" className="h-6 text-xs text-cyan-500" onClick={()=>change({id:filtered.find(x=>x.status===s)?.id,status:s})}> </Button></div>;
 };

 const diff=comparison.gastoRealAtual-comparison.gastoRealAnterior;
 const selectedLabel=`${MONTHS[m-1]} de ${y}`;
 const openStatus=item=>{setExpense(item);setModal(true)};

 const StatusBadge=({item})=>{
  const cfg={
   pago:[CheckCircle2,'Pago','border-emerald-500/30 bg-emerald-500/10 text-emerald-400'],
   'pago parcialmente':[AlertTriangle,'Parcial','border-orange-500/30 bg-orange-500/10 text-orange-400'],
   parcial:[AlertTriangle,'Parcial','border-orange-500/30 bg-orange-500/10 text-orange-400'],
   atrasado:[AlertCircle,'Atrasado','border-red-500/30 bg-red-500/10 text-red-400'],
   pendente:[Clock,'Pendente','border-yellow-500/30 bg-yellow-500/10 text-yellow-400']
  }[normalize(item.status)]||[Clock,'Pendente','border-yellow-500/30 bg-yellow-500/10 text-yellow-400'];
  const Icon=cfg[0];
  return <div className="flex flex-col items-center gap-1"><Badge variant="outline" className={cfg[2]}><Icon className="mr-1 h-3 w-3"/>{cfg[1]}</Badge><Button variant="ghost" size="sm" className="h-6 text-xs text-cyan-500 hover:text-cyan-400" onClick={()=>openStatus(item)}>Mudar status</Button></div>;
 };

 return(
  <div className="space-y-5">
   <Card className="border-cyan-500/20">
    <CardContent className="p-5">
     <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10"><FileText className="h-7 w-7 text-cyan-400"/></div><div><p className="text-xs uppercase tracking-wider text-cyan-400">Consultas • LM Impressões</p><h1 className="text-2xl font-bold">Contas do Mês</h1><p className="text-sm text-muted-foreground">Acompanhamento das despesas e vencimentos.</p></div></div>
      <Button variant="outline" onClick={fetchData} disabled={loading} className="border-cyan-500/40 text-cyan-400"><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</Button>
     </div>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
    {[{title:'Contas',value:filtered.length,Icon:Receipt,color:'text-cyan-400'},{title:'Total previsto',value:brl(totals.previsto),Icon:Receipt,color:'text-blue-400'},{title:'Total realizado',value:brl(totals.real),Icon:CheckCircle2,color:'text-emerald-400'},{title:'Pendentes / atrasadas',value:filtered.filter(x=>['pendente','atrasado'].includes(normalize(x.status))).length,Icon:Clock,color:'text-yellow-500'}].map(x=><Card key={x.title} className="border-cyan-500/20"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase text-muted-foreground">{x.title}</p><p className={`mt-1 text-xl font-bold ${x.color}`}>{x.value}</p></div><x.Icon className={`h-6 w-6 ${x.color}`}/></CardContent></Card>)}
   </div>

   <Card className="border-cyan-500/20">
    <CardHeader><CardTitle>Comparativo com o mês anterior</CardTitle><p className="text-sm text-muted-foreground">Resumo financeiro de {selectedLabel}; não muda com os filtros da tabela.</p></CardHeader>
    <CardContent><div className="grid grid-cols-1 gap-4 md:grid-cols-3">
     <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4"><p className="text-sm text-muted-foreground">Previsto no mês anterior</p><p className="mt-2 text-xl font-bold">{brl(comparison.previstoAnterior)}</p></div>
     <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4"><p className="text-sm text-muted-foreground">Gasto real anterior</p><p className="mt-2 text-xl font-bold">{brl(comparison.gastoRealAnterior)}</p></div>
     <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4"><p className="text-sm text-muted-foreground">Gasto real em {selectedLabel}</p><p className="mt-2 text-xl font-bold">{brl(comparison.gastoRealAtual)}</p><div className="mt-2 flex items-center gap-1 text-sm">{diff>0?<><TrendingUp className="h-4 w-4 text-red-400"/><span className="text-red-400">Gastou {brl(diff)} a mais</span></>:diff<0?<><TrendingDown className="h-4 w-4 text-emerald-400"/><span className="text-emerald-400">Economizou {brl(Math.abs(diff))}</span></>:<><Minus className="h-4 w-4"/><span>Mesmo valor</span></>}<span className="text-muted-foreground">vs. mês anterior</span></div></div>
    </div></CardContent>
   </Card>

   <Card className="border-cyan-500/20">
    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4 text-cyan-400"/>Filtros</CardTitle></CardHeader>
    <CardContent><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
     <Select value={String(m)} onValueChange={v=>setM(Number(v))}><SelectTrigger><SelectValue placeholder="Mês"/></SelectTrigger><SelectContent>{MONTHS.map((x,i)=><SelectItem key={i} value={String(i+1)}>{x}</SelectItem>)}</SelectContent></Select>
     <Select value={String(y)} onValueChange={v=>setY(Number(v))}><SelectTrigger><SelectValue placeholder="Ano"/></SelectTrigger><SelectContent>{years.map(x=><SelectItem key={x} value={String(x)}>{x}</SelectItem>)}</SelectContent></Select>
     <Select value={cat} onValueChange={setCat}><SelectTrigger><SelectValue placeholder="Categoria"/></SelectTrigger><SelectContent>{cats.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
     <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue placeholder="Status"/></SelectTrigger><SelectContent>{['Todos','Pago','Parcial','Pendente','Atrasado'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
     <Button variant="outline" onClick={clear} className="border-cyan-500/30 hover:bg-cyan-500/10"><RefreshCw className="mr-2 h-4 w-4"/>Limpar filtros</Button>
    </div></CardContent>
   </Card>

   {error?<Card className="border-destructive/20 bg-destructive/10"><CardContent className="p-8 text-center"><AlertCircle className="mx-auto mb-2"/><p>Erro: {error}</p><Button onClick={fetchData} variant="outline" className="mt-3">Tentar novamente</Button></CardContent></Card>:(
    <Card className="overflow-hidden border-cyan-500/20">
     <CardHeader><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle>Listagem de Contas</CardTitle><Badge variant="outline">{filtered.length} registro(s)</Badge></div><p className="text-sm text-muted-foreground">Contas vencidas sem pagamento registrado são identificadas como atrasadas.</p></CardHeader>
     <CardContent className="p-0">
      {loading?<div className="p-6"><LoadingSkeleton count={5} height="h-12"/></div>:(
       <div className="overflow-x-auto"><Table>
        <TableHeader className="bg-secondary/70"><TableRow><TableHead>Vencimento</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Previsto</TableHead><TableHead className="text-right">Real</TableHead><TableHead className="text-right">Diferença</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader>
        <TableBody>
         {!filtered.length?<TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>:filtered.map(x=><TableRow key={x.id} className="hover:bg-cyan-500/5">
          <TableCell className="whitespace-nowrap">{dateKey(x.data_vencimento)?format(parseISO(dateKey(x.data_vencimento)),'dd/MM/yyyy'):'—'}</TableCell>
          <TableCell><div className="flex items-center gap-2"><CategoryIcon category={x.categoria} className="h-4 w-4 text-cyan-400"/>{x.descricao}</div></TableCell>
          <TableCell>{x.categoria}</TableCell><TableCell className="text-right">{brl(x.valor_previsto)}</TableCell><TableCell className="text-right">{x.valor_real?brl(x.valor_real):'—'}</TableCell>
          <TableCell className={`text-right ${x.diferenca<0?'text-emerald-500':x.diferenca>0?'text-destructive':'text-muted-foreground'}`}>{brl(x.diferenca)}</TableCell>
          <TableCell className="text-center"><StatusBadge item={x}/></TableCell>
         </TableRow>)}
         {filtered.length>0&&<TableRow className="bg-muted/30 font-bold"><TableCell colSpan={3} className="text-right">Subtotais:</TableCell><TableCell className="text-right">{brl(totals.previsto)}</TableCell><TableCell className="text-right text-emerald-500">{brl(totals.real)}</TableCell><TableCell className="text-right">{brl(totals.dif)}</TableCell><TableCell/></TableRow>}
        </TableBody>
       </Table></div>
      )}
     </CardContent>
    </Card>
   )}

   <StatusChangeModal isOpen={modal} onClose={()=>setModal(false)} onStatusChange={fetchData} currentStatus={expense?.status} tableName="lm_despesas_previstas" recordId={expense?.id}/>
  </div>
 );
}

