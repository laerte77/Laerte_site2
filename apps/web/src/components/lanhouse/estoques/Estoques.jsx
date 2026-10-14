import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{Package,Search,TrendingUp,TrendingDown,AlertTriangle,Calendar,Clock,RefreshCw,Boxes,ArrowDownToLine,ArrowUpFromLine,Loader2}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Input}from'@/components/ui/input';
import{Card,CardContent,CardHeader,CardTitle,CardDescription}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{Tabs,TabsContent,TabsList,TabsTrigger}from'@/components/ui/tabs';
import{Alert,AlertDescription}from'@/components/ui/alert';

const CYAN='text-[hsl(var(--neon-lanhouse))]';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const dateKey=v=>String(v||'').slice(0,10);
const dateBR=v=>v?new Date(`${dateKey(v)}T12:00:00-03:00`).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Não definida';
const qty=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:3});
const blank=nome=>({produto:nome,unidade:'unidade',baseline:0,entradas:0,saidas:0,perdas:0,estoqueAtual:0,variacao:0});

export default function Estoques(){
 const{user}=useAuth();
 const{toast}=useToast();
 const mounted=useRef(true);
 const[loading,setLoading]=useState(true);
 const[estoqueData,setEstoqueData]=useState([]);
 const[baselineDate,setBaselineDate]=useState(null);
 const[lastUpdate,setLastUpdate]=useState(null);
 const[searchTerm,setSearchTerm]=useState('');

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const fetchEstoque=useCallback(async()=>{
  if(!user){setEstoqueData([]);setLoading(false);return}
  setLoading(true);
  try{
   const[baseRes,insRes,folRes,servRes,repRes]=await Promise.all([
    supabase.from('lm_estoques_inicial').select('*').eq('user_id',user.id),
    supabase.from('lm_insumos').select('id,nome,unidade,estoque_minimo,ativo').eq('user_id',user.id),
    supabase.from('lm_folhas').select('*').eq('user_id',user.id),
    supabase.from('lm_lanc_servicos').select('data,folhas_gastas').eq('user_id',user.id).not('folhas_gastas','is',null),
    supabase.from('lm_lanc_despesas').select('*').eq('user_id',user.id).eq('tipo_lancamento','Estoque').not('quantidade','is',null)
   ]);
   for(const r of[baseRes,insRes,folRes,servRes,repRes])if(r.error)throw r.error;

   const bases=baseRes.data||[],insumos=insRes.data||[];
   const dates=bases.map(x=>dateKey(x.data_inventario)).filter(Boolean).sort();
   const baseline=dates[0]||null;
   const afterBase=x=>!baseline||!x?.data||dateKey(x.data)>=baseline;
   const byId=new Map(insumos.map(i=>[String(i.id),i]));
   const byName=new Map(insumos.map(i=>[norm(i.nome),i]));
   const map={};
   const ensure=(name,unit='unidade')=>{
    const key=norm(name);
    if(!key)return null;
    if(!map[key])map[key]={...blank(String(name).trim()),unidade:unit||'unidade'};
    if(unit&&map[key].unidade==='unidade')map[key].unidade=unit;
    return map[key];
   };
   const linkedName=id=>id?byId.get(String(id))?.nome:null;
   const linkedUnit=id=>id?byId.get(String(id))?.unidade:null;

   // Todos os insumos aparecem, inclusive os que começam com saldo zero.
   insumos.forEach(i=>ensure(i.nome,i.unidade));

   bases.forEach(x=>{
    const name=linkedName(x.insumo_id)||x.produto;
    const row=ensure(name,linkedUnit(x.insumo_id)||x.unidade);
    if(row)row.baseline+=Number(x.quantidade_inicial)||0;
   });

   let latest=null;
   const trackDate=d=>{
    if(d&&(!latest||dateKey(d)>dateKey(latest)))latest=d;
   };

   (folRes.data||[]).filter(afterBase).forEach(x=>{
    if(!x.tipo_folha)return;
    const ins=byName.get(norm(x.tipo_folha));
    const row=ensure(ins?.nome||x.tipo_folha,ins?.unidade);
    if(!row)return;
    const n=Number(x.quantidade)||0;
    const type=norm(x.tipo_movimento);
    if(type==='ENTRADA')row.entradas+=n;
    else if(type==='SAIDA')row.saidas+=n;
    else if(type==='PERDA')row.perdas+=n;
    trackDate(x.data);
   });

   (servRes.data||[]).filter(afterBase).forEach(x=>{
    if(!Array.isArray(x.folhas_gastas))return;
    x.folhas_gastas.forEach(f=>{
     if(f.e_rascunho||!f.tipo_folha||Number(f.quantidade)<=0)return;
     const ins=byName.get(norm(f.tipo_folha));
     const row=ensure(ins?.nome||f.tipo_folha,ins?.unidade);
     if(row)row.saidas+=Number(f.quantidade)||0;
    });
    trackDate(x.data);
   });

   (repRes.data||[]).filter(afterBase).forEach(x=>{
    if(Number(x.quantidade)<=0)return;
    const ins=x.insumo_id?byId.get(String(x.insumo_id)):null;
    const name=ins?.nome||x.tipo_folha;
    const row=ensure(name,ins?.unidade);
    if(row)row.entradas+=Number(x.quantidade)||0;
    trackDate(x.data);
   });

   Object.values(map).forEach(x=>{
    x.estoqueAtual=x.baseline+x.entradas-x.saidas-x.perdas;
    x.variacao=x.estoqueAtual-x.baseline;
   });

   const result=Object.values(map).sort((a,b)=>a.produto.localeCompare(b.produto,'pt-BR'));
   if(!mounted.current)return;
   setEstoqueData(result);
   setBaselineDate(baseline);
   setLastUpdate(latest);
  }catch(e){
   console.error('Erro ao carregar rastreamento de estoque:',e);
   if(mounted.current)toast({title:'Erro ao carregar estoque',description:e.message||'Não foi possível carregar os dados.',variant:'destructive'});
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchEstoque();
  if(!user)return;
  const channel=supabase.channel(`estoques-consolidados-${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_insumos',filter:`user_id=eq.${user.id}`},fetchEstoque)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_estoques_inicial',filter:`user_id=eq.${user.id}`},fetchEstoque)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_folhas',filter:`user_id=eq.${user.id}`},fetchEstoque)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_lanc_servicos',filter:`user_id=eq.${user.id}`},fetchEstoque)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_lanc_despesas',filter:`user_id=eq.${user.id}`},fetchEstoque)
   .subscribe();
  return()=>{supabase.removeChannel(channel)};
 },[user,fetchEstoque]);

 const filtered=useMemo(()=>estoqueData.filter(x=>x.produto.toLowerCase().includes(searchTerm.trim().toLowerCase())),[estoqueData,searchTerm]);
 const totals=useMemo(()=>filtered.reduce((a,x)=>({
  itens:a.itens+1,entradas:a.entradas+x.entradas,saidas:a.saidas+x.saidas,negativos:a.negativos+(x.estoqueAtual<0?1:0)
 }),{itens:0,entradas:0,saidas:0,negativos:0}),[filtered]);
 const status=x=>x.estoqueAtual<0?{label:'Negativo',cls:'border-red-500/30 bg-red-500/10 text-red-400'}:x.estoqueAtual===0?{label:'Zerado',cls:'border-amber-500/30 bg-amber-500/10 text-amber-400'}:x.estoqueAtual<10?{label:'Baixo',cls:'border-amber-500/30 bg-amber-500/10 text-amber-400'}:{label:'Disponível',cls:'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'};
 const stat=(title,value,icon,color)=> <Card className="border-border bg-card/80"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="text-sm text-muted-foreground">{title}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{qty(value)}</p></div><div className="rounded-xl border border-border bg-muted/40 p-3"><icon.type className={`h-5 w-5 ${color}`}/></div></CardContent></Card>;

 return <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="dark-lm-impressoes space-y-5 py-5">
  <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center">
   <div className="flex items-start gap-3">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.25)] bg-[hsl(var(--neon-lanhouse)/.1)]"><Package className={`h-6 w-6 ${CYAN}`}/></div>
    <div><p className={`text-[11px] font-semibold uppercase tracking-[.2em] ${CYAN}`}>Estoque</p><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Rastreamento de Estoque</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe o saldo inicial, as entradas, as saídas e as perdas.</p></div>
   </div>
   <button type="button" onClick={fetchEstoque} disabled={loading} className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-muted disabled:opacity-50"><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</button>
  </div>

  <Alert className="border-[hsl(var(--neon-lanhouse)/.25)] bg-[hsl(var(--neon-lanhouse)/.07)]">
   <div className="flex items-start gap-3"><Calendar className={`mt-0.5 h-4 w-4 ${CYAN}`}/><div className="space-y-1"><AlertDescription className="text-sm font-medium text-foreground">Data baseline: <strong>{dateBR(baselineDate)}</strong></AlertDescription><AlertDescription className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4"/>{lastUpdate?`Última movimentação: ${dateBR(lastUpdate)}`:'Nenhuma movimentação registrada'}</AlertDescription></div></div>
  </Alert>

  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   {stat('Insumos na consulta',totals.itens,Boxes,CYAN)}
   {stat('Total de entradas',totals.entradas,ArrowDownToLine,'text-emerald-400')}
   {stat('Total de saídas',totals.saidas,ArrowUpFromLine,'text-red-400')}
   {stat('Estoques negativos',totals.negativos,AlertTriangle,totals.negativos?'text-red-400':'text-muted-foreground')}
  </div>

  <Card className="border-border bg-card/80">
   <CardContent className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
    <div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar por insumo ou produto..." className="h-11 rounded-xl bg-input pl-9"/></div>
    <span className="text-sm text-muted-foreground">{filtered.length} item(ns)</span>
   </CardContent>
  </Card>

  <Tabs defaultValue="movimentacao" className="w-full space-y-4">
   <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-border bg-card p-1">
    <TabsTrigger value="movimentacao" className="rounded-lg py-2.5 data-[state=active]:bg-[hsl(var(--neon-lanhouse))] data-[state=active]:text-slate-950">Movimentação desde Baseline</TabsTrigger>
    <TabsTrigger value="comparacao" className="rounded-lg py-2.5 data-[state=active]:bg-[hsl(var(--neon-lanhouse))] data-[state=active]:text-slate-950">Baseline vs. Atual</TabsTrigger>
   </TabsList>

   <TabsContent value="movimentacao">
    <Card className="overflow-hidden border-border bg-card">
     <CardHeader className="border-b border-border bg-muted/20"><CardTitle className={`text-xl ${CYAN}`}>Movimentação desde {dateBR(baselineDate)}</CardTitle><CardDescription>Insumos cadastrados e movimentações registradas após a data de referência.</CardDescription></CardHeader>
     <CardContent className="p-0"><ScrollArea className="h-[600px]"><div className="overflow-x-auto"><Table>
      <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur"><TableRow><TableHead className="min-w-[210px]">Insumo / Produto</TableHead><TableHead className="min-w-[110px] text-center">Baseline</TableHead><TableHead className="min-w-[110px] text-center text-emerald-400">Entradas (+)</TableHead><TableHead className="min-w-[110px] text-center text-red-400">Saídas (-)</TableHead><TableHead className="min-w-[100px] text-center text-red-400">Perdas (-)</TableHead><TableHead className="min-w-[130px] text-center">Estoque atual</TableHead><TableHead className="min-w-[120px] text-center">Status</TableHead></TableRow></TableHeader>
      <TableBody>{loading?<TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Carregando estoque...</TableCell></TableRow>:!filtered.length?<TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground"><Package className="mx-auto mb-2 h-9 w-9 opacity-40"/>{searchTerm?'Nenhum item corresponde à pesquisa.':'Nenhum insumo cadastrado.'}</TableCell></TableRow>:filtered.map(x=><TableRow key={norm(x.produto)} className="transition-colors hover:bg-[hsl(var(--neon-lanhouse)/.04)]"><TableCell><div className="font-semibold">{x.produto}</div><div className="text-xs text-muted-foreground">{x.unidade}</div></TableCell><TableCell className="text-center font-medium text-violet-400">{qty(x.baseline)}</TableCell><TableCell className="text-center font-medium text-emerald-400">+{qty(x.entradas)}</TableCell><TableCell className="text-center font-medium text-red-400">-{qty(x.saidas)}</TableCell><TableCell className="text-center font-medium text-red-400">-{qty(x.perdas)}</TableCell><TableCell className="text-center"><Badge variant="outline" className={`border px-3 py-1 text-sm font-bold ${x.estoqueAtual<0?'border-red-500/30 bg-red-500/10 text-red-400':x.estoqueAtual===0?'border-amber-500/30 bg-amber-500/10 text-amber-400':'border-[hsl(var(--neon-lanhouse)/.3)] bg-[hsl(var(--neon-lanhouse)/.1)] text-[hsl(var(--neon-lanhouse))]'}`}>{qty(x.estoqueAtual)}</Badge></TableCell><TableCell className="text-center"><Badge variant="outline" className={status(x).cls}>{status(x).label}</Badge></TableCell></TableRow>)}</TableBody>
     </Table></div></ScrollArea></CardContent>
    </Card>
   </TabsContent>

   <TabsContent value="comparacao">
    <Card className="overflow-hidden border-border bg-card">
     <CardHeader className="border-b border-border bg-muted/20"><CardTitle className={`text-xl ${CYAN}`}>Baseline vs. Estoque Atual</CardTitle><CardDescription>Compare o inventário de referência com o saldo calculado de cada insumo.</CardDescription></CardHeader>
     <CardContent className="p-0"><ScrollArea className="h-[600px]"><div className="overflow-x-auto"><Table>
      <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur"><TableRow><TableHead className="min-w-[220px]">Insumo / Produto</TableHead><TableHead className="min-w-[130px] text-center">Baseline</TableHead><TableHead className="min-w-[130px] text-center">Estoque atual</TableHead><TableHead className="min-w-[130px] text-center">Variação</TableHead><TableHead className="min-w-[120px] text-center">Status</TableHead></TableRow></TableHeader>
      <TableBody>{loading?<TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin"/>Carregando estoque...</TableCell></TableRow>:!filtered.length?<TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum insumo encontrado.</TableCell></TableRow>:filtered.map(x=><TableRow key={norm(x.produto)} className="hover:bg-[hsl(var(--neon-lanhouse)/.04)]"><TableCell><div className="font-semibold">{x.produto}</div><div className="text-xs text-muted-foreground">{x.unidade}</div></TableCell><TableCell className="text-center font-medium text-violet-400">{qty(x.baseline)}</TableCell><TableCell className="text-center"><Badge variant="outline" className={`px-3 py-1 font-bold ${x.estoqueAtual<0?'border-red-500/30 bg-red-500/10 text-red-400':x.estoqueAtual===0?'border-amber-500/30 bg-amber-500/10 text-amber-400':'border-[hsl(var(--neon-lanhouse)/.3)] bg-[hsl(var(--neon-lanhouse)/.1)] text-[hsl(var(--neon-lanhouse))]'}`}>{qty(x.estoqueAtual)}</Badge></TableCell><TableCell className="text-center"><span className={`inline-flex items-center justify-center gap-1 font-semibold ${x.variacao>0?'text-emerald-400':x.variacao<0?'text-red-400':'text-muted-foreground'}`}>{x.variacao>0?<TrendingUp className="h-4 w-4"/>:x.variacao<0?<TrendingDown className="h-4 w-4"/>:null}{x.variacao>0?'+':''}{qty(x.variacao)}</span></TableCell><TableCell className="text-center"><Badge variant="outline" className={status(x).cls}>{status(x).label}</Badge></TableCell></TableRow>)}</TableBody>
     </Table></div></ScrollArea></CardContent>
    </Card>
   </TabsContent>
  </Tabs>
 </motion.div>;
}

