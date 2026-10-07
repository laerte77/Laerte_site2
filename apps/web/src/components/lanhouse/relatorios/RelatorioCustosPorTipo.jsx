import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{BarChart3,Calendar,Download,Loader2,RotateCcw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,Legend,ResponsiveContainer}from'recharts';

const CYAN='#06b6d4',RED='#ef4444',BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

export default function RelatorioCustosPorTipo(){
 const{toast}=useToast(),{user}=useAuth();
 const[loading,setLoading]=useState(true),[start,setStart]=useState(''),[end,setEnd]=useState(''),[rows,setRows]=useState([]);

 const load=useCallback(async()=>{
  if(!user)return;setLoading(true);
  try{
   let q=supabase.from('lm_lanc_custos').select('tipo_folha,tipo,custo_total,data_lancamento').eq('user_id',user.id);
   if(start)q=q.gte('data_lancamento',start);if(end)q=q.lte('data_lancamento',end);
   const{data,error}=await q;if(error)throw error;
   const g={};
   (data||[]).forEach(x=>{const k=x.tipo_folha||'Não especificado';g[k]||(g[k]={tipo_folha:k,total_consumo:0,total_perda:0,total_custos:0,margem_perda:0});if(x.tipo==='Consumo')g[k].total_consumo+=Number(x.custo_total||0);if(x.tipo==='Perda')g[k].total_perda+=Number(x.custo_total||0)});
   setRows(Object.values(g).map(x=>({...x,total_custos:x.total_consumo+x.total_perda,margem_perda:x.total_custos?x.total_perda/(x.total_consumo+x.total_perda)*100:0})).sort((a,b)=>b.total_custos-a.total_custos));
  }catch(e){toast({title:'Erro',description:e.message||'Falha ao carregar relatório.',variant:'destructive'})}finally{setLoading(false)}
 },[user,start,end,toast]);

 useEffect(()=>load(),[load]);

 const totals=useMemo(()=>rows.reduce((a,x)=>({c:a.c+x.total_consumo,p:a.p+x.total_perda,t:a.t+x.total_custos}),{c:0,p:0,t:0}),[rows]);

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p><h1 className="mt-1 text-2xl font-bold">Relatório de Custos por Tipo</h1><p className="text-sm text-muted-foreground">Análise de consumo e perdas por folha.</p></div><Button variant="outline"><Download className="mr-2 h-4 w-4"/>Exportar</Button></div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[{l:'Consumo',v:BRL.format(totals.c)},{l:'Perdas',v:BRL.format(totals.p)},{l:'Total de Custos',v:BRL.format(totals.t)}].map(x=><Card key={x.l} className="border-border bg-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p><p className="mt-1 text-xl font-bold" style={{color:CYAN}}>{x.v}</p></CardContent></Card>)}</div>

   <Card className="border-border bg-card"><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-4"><div><Label>Data Inicial</Label><Input type="date" value={start} onChange={e=>setStart(e.target.value)}/></div><div><Label>Data Final</Label><Input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div><div className="flex items-end"><Button onClick={load} className="w-full text-white" style={{background:CYAN}} disabled={loading}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Atualizar</Button></div><div className="flex items-end"><Button variant="outline" className="w-full" onClick={()=>{setStart('');setEnd('')}}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button></div></div></CardContent></Card>

   <Card className="border-border bg-card"><CardContent className="h-[340px] p-4">{rows.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={rows}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="tipo_folha"/><YAxis/><Tooltip formatter={v=>BRL.format(Number(v)||0)}/><Legend/><Bar dataKey="total_consumo" name="Consumo" fill={CYAN}/><Bar dataKey="total_perda" name="Perda" fill={RED}/></BarChart></ResponsiveContainer>:<div className="flex h-full items-center justify-center text-muted-foreground"><BarChart3 className="mr-2 h-6 w-6"/>Nenhum dado disponível.</div>}</CardContent></Card>

   <Card className="border-border bg-card"><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader className="sticky top-0 z-10 bg-secondary/70"><TableRow><TableHead>Tipo de Folha</TableHead><TableHead className="text-right">Consumo</TableHead><TableHead className="text-right">Perda</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Margem de Perda</TableHead></TableRow></TableHeader><TableBody>{loading?<TableRow><TableCell colSpan={5} className="py-12 text-center">Carregando...</TableCell></TableRow>:!rows.length?<TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum custo encontrado.</TableCell></TableRow>:rows.map(x=><TableRow key={x.tipo_folha} className="hover:bg-muted/40"><TableCell className="font-semibold">{x.tipo_folha}</TableCell><TableCell className="text-right text-cyan-400">{BRL.format(x.total_consumo)}</TableCell><TableCell className="text-right text-red-400">{BRL.format(x.total_perda)}</TableCell><TableCell className="text-right font-bold">{BRL.format(x.total_custos)}</TableCell><TableCell className={`text-right font-bold ${x.margem_perda>10?'text-red-400':'text-muted-foreground'}`}>{x.margem_perda.toFixed(2)}%</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
  </motion.div>
 )
}
