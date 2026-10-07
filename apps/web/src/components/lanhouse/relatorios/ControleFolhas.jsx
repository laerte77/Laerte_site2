import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{FileText,Download,Calendar,TrendingUp,TrendingDown,AlertTriangle,RotateCcw,Loader2}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='hsl(190 90% 50%)',BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

export default function ControleFolhas(){
 const{toast}=useToast(),{user}=useAuth();
 const[loading,setLoading]=useState(true),[tipos,setTipos]=useState([]),[data,setData]=useState([]);
 const[start,setStart]=useState(''),[end,setEnd]=useState(''),[tipo,setTipo]=useState('Todos');

 const load=useCallback(async()=>{
  if(!user)return;setLoading(true);
  try{
   let e=supabase.from('lm_estoques_entradas').select('produto,quantidade,data').eq('user_id',user.id),s=supabase.from('lm_estoques_saidas').select('produto,quantidade,data').eq('user_id',user.id),p=supabase.from('lm_lanc_custos').select('tipo_folha,quantidade,data_lancamento').eq('user_id',user.id).eq('tipo','Perda');
   if(start){e=e.gte('data',start);s=s.gte('data',start);p=p.gte('data_lancamento',start)}if(end){e=e.lte('data',end);s=s.lte('data',end);p=p.lte('data_lancamento',end)}
   const[a,b,c]=await Promise.all([e,s,p]);if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;

   const g={};
   const add=(k)=>g[k]||(g[k]={tipo_folha:k,entradas:0,saidas:0,perdas:0,custo_unitario:0,saldo:0,saldo_valor:0});
   (a.data||[]).forEach(x=>{add(x.produto||'Não especificado').entradas+=Number(x.quantidade||0)});
   (b.data||[]).forEach(x=>{add(x.produto||'Não especificado').saidas+=Number(x.quantidade||0)});
   (c.data||[]).forEach(x=>{add(x.tipo_folha||'Não especificado').perdas+=Number(x.quantidade||0)});
   const nomes=Object.keys(g);
   for(const nome of nomes){
    const{data:d}=await supabase.from('lm_tipos_folha').select('preco').eq('user_id',user.id).eq('tipo_folha',nome).maybeSingle();
    g[nome].custo_unitario=Number(d?.preco||0);
   }
   setTipos(nomes);setData(Object.values(g).map(x=>({...x,saldo:x.entradas-x.saidas-x.perdas,saldo_valor:(x.entradas-x.saidas-x.perdas)*x.custo_unitario})).filter(x=>tipo==='Todos'||x.tipo_folha===tipo));
  }catch(e){toast({title:'Erro',description:e.message||'Falha ao carregar controle.',variant:'destructive'})}finally{setLoading(false)}
 },[user,start,end,tipo,toast]);

 useEffect(()=>load(),[load]);

 const totals=useMemo(()=>data.reduce((a,x)=>({e:a.e+x.entradas,s:a.s+x.saidas,p:a.p+x.perdas,v:a.v+x.saldo_valor}),{e:0,s:0,p:0,v:0}),[data]);

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p><h1 className="mt-1 text-2xl font-bold">Controle de Folhas</h1><p className="text-sm text-muted-foreground">Inventário e movimentação por tipo de folha.</p></div><Button variant="outline"><Download className="mr-2 h-4 w-4"/>Exportar</Button></div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{l:'Entradas',v:totals.e,i:TrendingUp},{l:'Saídas',v:totals.s,i:TrendingDown},{l:'Perdas',v:totals.p,i:AlertTriangle},{l:'Saldo em Valor',v:BRL.format(totals.v),i:FileText}].map(x=><Card key={x.l} className="border-border bg-card"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p><p className="mt-1 text-xl font-bold" style={{color:CYAN}}>{x.v}</p></div><x.i className="h-5 w-5" style={{color:CYAN}}/></CardContent></Card>)}</div>

   <Card className="border-border bg-card"><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-5"><div><Label>Tipo de Folha</Label><Select value={tipo} onValueChange={setTipo}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Todos">Todos</SelectItem>{tipos.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Data Inicial</Label><Input type="date" value={start} onChange={e=>setStart(e.target.value)}/></div><div><Label>Data Final</Label><Input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div><div className="flex items-end"><Button onClick={load} className="w-full text-white" style={{background:CYAN}} disabled={loading}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Atualizar</Button></div><div className="flex items-end"><Button variant="outline" className="w-full" onClick={()=>{setStart('');setEnd('');setTipo('Todos')}}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button></div></div></CardContent></Card>

   <Card className="border-border bg-card"><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader className="sticky top-0 z-10 bg-secondary/70"><TableRow><TableHead>Tipo de Folha</TableHead><TableHead className="text-right">Entradas</TableHead><TableHead className="text-right">Saídas</TableHead><TableHead className="text-right">Perdas</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead className="text-right">Saldo em Valor</TableHead></TableRow></TableHeader><TableBody>{loading?<TableRow><TableCell colSpan={6} className="py-12 text-center">Carregando...</TableCell></TableRow>:!data.length?<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Nenhuma movimentação encontrada.</TableCell></TableRow>:data.map(x=><TableRow key={x.tipo_folha} className="hover:bg-muted/40"><TableCell className="font-semibold">{x.tipo_folha}</TableCell><TableCell className="text-right text-green-400">{x.entradas}</TableCell><TableCell className="text-right text-blue-400">{x.saidas}</TableCell><TableCell className="text-right text-red-400">{x.perdas}</TableCell><TableCell className="text-right font-bold">{x.saldo}</TableCell><TableCell className="text-right font-bold" style={{color:CYAN}}>{BRL.format(x.saldo_valor)}</TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
  </motion.div>
 )
}
