import React,{useState,useMemo,useEffect,useCallback}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Button}from'@/components/ui/button';
import{Badge}from'@/components/ui/badge';
import{formatCurrency}from'@/lib/utils';
import{AlertCircle,RefreshCw,CheckCircle2,Clock,AlertTriangle,FileBarChart3,Filter,Receipt}from'lucide-react';
import{format,parseISO,endOfMonth}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import CategoryIcon from'@/components/CategoryIcon';
import StatusChangeModal from'@/components/StatusChangeModal';
import LoadingSkeleton from'@/components/ui/LoadingSkeleton';

const MONTHS=[{value:1,label:'Janeiro'},{value:2,label:'Fevereiro'},{value:3,label:'Março'},{value:4,label:'Abril'},{value:5,label:'Maio'},{value:6,label:'Junho'},{value:7,label:'Julho'},{value:8,label:'Agosto'},{value:9,label:'Setembro'},{value:10,label:'Outubro'},{value:11,label:'Novembro'},{value:12,label:'Dezembro'}];

export default function ContasMesLM(){
 const{user}=useAuth(),d=new Date();
 const[m,setM]=useState(d.getMonth()+1),[y,setY]=useState(d.getFullYear()),[cat,setCat]=useState('Todas'),[status,setStatus]=useState('Todos'),[data,setData]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(null),[expense,setExpense]=useState(null),[modal,setModal]=useState(false);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);setError(null);
  try{
   const start=format(new Date(y,m-1,1),'yyyy-MM-dd'),end=format(endOfMonth(new Date(y,m-1,1)),'yyyy-MM-dd');
   const{data:p,error:e1}=await supabase.from('lm_despesas_previstas').select('*').eq('user_id',user.id).gte('data_vencimento',start).lte('data_vencimento',end);
   if(e1)throw e1;
   const{data:r,error:e2}=await supabase.from('lm_lanc_despesas').select('*, lm_despesas(despesa)').eq('user_id',user.id).gte('data',start).lte('data',end);
   if(e2)throw e2;
   const result=p.map(x=>{
    const previsto=Number(x.valor)||0,desc=(x.descricao||'').toLowerCase().trim();
    const reais=r.filter(z=>(z.lm_despesas?.despesa||'').toLowerCase().trim()===desc);
    const real=reais.reduce((s,z)=>s+(Number(z.valor)||0),0),dif=real-previsto;
    let st=real>=previsto&&previsto>0?'Pago':real>0?'Parcial':'Pendente';
    if(real===0&&x.status&&x.status!=='Pendente')st=x.status;
    return{id:x.id,data_vencimento:x.data_vencimento,descricao:x.descricao,categoria:x.categoria||'Outros',valor_previsto:previsto,valor_real:real,diferenca:dif,status:st};
   }).sort((a,b)=>new Date(a.data_vencimento)-new Date(b.data_vencimento));
   setData(result);
  }catch(e){setError(e.message)}finally{setLoading(false)}
 },[user,m,y]);

 useEffect(()=>{fetchData()},[fetchData]);

 const years=useMemo(()=>{const c=new Date().getFullYear();return[c-2,c-1,c,c+1,c+2]},[]);
 const cats=useMemo(()=>['Todas',...new Set(data.map(x=>x.categoria).filter(Boolean))],[data]);
 const filtered=useMemo(()=>data.filter(x=>(cat==='Todas'||x.categoria===cat)&&(status==='Todos'||x.status===status)),[data,cat,status]);
 const totals=useMemo(()=>filtered.reduce((a,x)=>({previsto:a.previsto+x.valor_previsto,real:a.real+x.valor_real,dif:a.dif+x.diferenca}),{previsto:0,real:0,dif:0}),[filtered]);
 const clear=()=>{setM(d.getMonth()+1);setY(d.getFullYear());setCat('Todas');setStatus('Todos')};
 const change=e=>{setExpense(e);setModal(true)};

 const badge=(s,e)=>{
  const cfg={Pago:['bg-emerald-500','CheckCircle2','Pago'],Parcial:['bg-orange-500','AlertTriangle','Parcial'],Atrasado:['bg-red-500','AlertCircle','Atrasado'],Pendente:['bg-yellow-500','Clock','Pendente']}[s]||['bg-yellow-500','Clock','Pendente'];
  const Icon={CheckCircle2,AlertTriangle,AlertCircle,Clock}[cfg[1]];
  return <div className="flex flex-col items-center gap-1"><Badge className={`${cfg[0]} text-white`}><Icon className="w-3 h-3 mr-1"/>{cfg[2]}</Badge><Button variant="ghost" size="sm" className="h-6 text-xs text-cyan-500" onClick={()=>change(e)}>Mudar Status</Button></div>
 };

 return <div className="space-y-6">
  <Card className="border-cyan-500/20"><CardContent className="p-5"><div className="flex justify-between items-center gap-4"><div className="flex gap-3 items-center"><FileBarChart3 className="w-7 h-7 text-cyan-400"/><div><p className="text-xs uppercase text-cyan-400">Consultas • LM Impressões</p><h1 className="text-2xl font-bold">Contas do Mês</h1><p className="text-sm text-muted-foreground">Acompanhamento das despesas do mês.</p></div></div><Button variant="outline" onClick={fetchData} disabled={loading}><RefreshCw className={`w-4 h-4 mr-2 ${loading?'animate-spin':''}`}/>Atualizar</Button></div></CardContent></Card>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
   {[['Contas',filtered.length,Receipt,'text-cyan-400'],['Total Previsto',formatCurrency(totals.previsto),Receipt,'text-blue-400'],['Total Realizado',formatCurrency(totals.real),Receipt,'text-emerald-500'],['Pendentes',filtered.filter(x=>x.status==='Pendente').length,Clock,'text-yellow-500']].map(([t,v,I,c])=><Card key={t} className="border-cyan-500/20"><CardContent className="p-5 flex justify-between items-center"><div><p className="text-xs uppercase text-muted-foreground">{t}</p><p className={`text-xl font-bold mt-1 ${c}`}>{v}</p></div><I className={`w-6 h-6 ${c}`}/></CardContent></Card>)}
  </div>

  <Card className="border-cyan-500/20"><CardHeader><CardTitle className="flex gap-2 items-center text-base"><Filter className="w-4 h-4 text-cyan-400"/>Filtros</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
   <Select value={String(m)} onValueChange={v=>setM(Number(v))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{MONTHS.map(x=><SelectItem key={x.value} value={String(x.value)}>{x.label}</SelectItem>)}</SelectContent></Select>
   <Select value={String(y)} onValueChange={v=>setY(Number(v))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{years.map(x=><SelectItem key={x} value={String(x)}>{x}</SelectItem>)}</SelectContent></Select>
   <Select value={cat} onValueChange={setCat}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{cats.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
   <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{['Todos','Pago','Pendente','Parcial','Atrasado'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
   <Button variant="outline" onClick={clear}>Limpar filtros</Button>
  </div></CardContent></Card>

  {error?<Card className="border-destructive/20 bg-destructive/10"><CardContent className="p-8 text-center"><AlertCircle className="mx-auto mb-2"/><p>Erro: {error}</p><Button onClick={fetchData} variant="outline" className="mt-3">Tentar Novamente</Button></CardContent></Card>:
  <Card className="border-cyan-500/20"><CardHeader><CardTitle>Listagem de Contas</CardTitle></CardHeader><CardContent className="p-0">
   {loading?<div className="p-6"><LoadingSkeleton count={5} height="h-12"/></div>:
   <div className="responsive-table-wrapper"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Previsto</TableHead><TableHead className="text-right">Real</TableHead><TableHead className="text-right">Diferença</TableHead><TableHead className="text-center">Status</TableHead></TableRow></TableHeader><TableBody>
    {!filtered.length?<TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Nenhuma conta encontrada.</TableCell></TableRow>:filtered.map(x=><TableRow key={x.id} className="hover:bg-cyan-500/5"><TableCell>{format(parseISO(x.data_vencimento),'dd/MM/yyyy')}</TableCell><TableCell><div className="flex gap-2 items-center"><CategoryIcon category={x.categoria} className="w-4 h-4 text-cyan-400"/>{x.descricao}</div></TableCell><TableCell>{x.categoria}</TableCell><TableCell className="text-right">{formatCurrency(x.valor_previsto)}</TableCell><TableCell className="text-right">{x.valor_real?formatCurrency(x.valor_real):'-'}</TableCell><TableCell className={`text-right ${x.diferenca<0?'text-emerald-500':x.diferenca>0?'text-destructive':'text-muted-foreground'}`}>{formatCurrency(x.diferenca)}</TableCell><TableCell className="text-center">{badge(x.status,x)}</TableCell></TableRow>)}
    {filtered.length>0&&<TableRow className="font-bold bg-muted/30"><TableCell colSpan={3} className="text-right">Subtotais:</TableCell><TableCell className="text-right">{formatCurrency(totals.previsto)}</TableCell><TableCell className="text-right text-emerald-500">{formatCurrency(totals.real)}</TableCell><TableCell className="text-right">{formatCurrency(totals.dif)}</TableCell><TableCell/></TableRow>}
   </TableBody></Table></div>}
  </CardContent></Card>}

  <StatusChangeModal isOpen={modal} onClose={()=>setModal(false)} onStatusChange={fetchData} currentStatus={expense?.status} tableName="lm_despesas_previstas" recordId={expense?.id}/>
 </div>
}
