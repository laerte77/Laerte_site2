import React,{useState,useEffect,useMemo,useCallback}from'react';
import{FileSearch,Filter,Download,RefreshCw,Receipt,Calendar,RotateCcw,Loader2,TrendingDown,TrendingUp}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardDescription,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{ScrollArea}from'@/components/ui/scroll-area';

const CYAN='#06b6d4';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const dateKey=v=>String(v||'').slice(0,10);
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const todaySP=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`};
const dateBR=v=>{const d=dateKey(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return'—';const[y,m,day]=d.split('-');return`${day}/${m}/${y}`};
const csvCell=v=>`"${String(v??'').replace(/"/g,'""')}"`;

export default function RelatorioDespesas(){
 const{toast}=useToast(),{user}=useAuth();
 const[data,setData]=useState([]),[tipos,setTipos]=useState([]),[loading,setLoading]=useState(true);
 const[filters,setFilters]=useState({dataInicio:'',dataFim:'',despesa_id:'todos'});
 const invalidPeriod=!!(filters.dataInicio&&filters.dataFim&&filters.dataInicio>filters.dataFim);

 const fetchData=useCallback(async()=>{
  if(!user){setData([]);setTipos([]);setLoading(false);return}
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('lm_lanc_despesas').select('*,lm_despesas(despesa)').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_despesas').select('*').eq('user_id',user.id).order('despesa',{ascending:true})
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   setData(a.data||[]);
   setTipos(b.data||[]);
  }catch(e){
   console.error('Erro no relatório de despesas:',e);
   toast({title:'Erro ao carregar relatório',description:e.message||'Não foi possível buscar as despesas.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase.channel(`relatorio_despesas_${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_lanc_despesas',filter:`user_id=eq.${user.id}`},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filtered=useMemo(()=>{
  if(invalidPeriod)return[];
  return data.filter(x=>{
   const d=dateKey(x.data);
   if(filters.dataInicio&&(!d||d<filters.dataInicio))return false;
   if(filters.dataFim&&(!d||d>filters.dataFim))return false;
   if(filters.despesa_id!=='todos'&&String(x.despesa_id)!==String(filters.despesa_id))return false;
   return true;
  }).sort((a,b)=>dateKey(b.data).localeCompare(dateKey(a.data)));
 },[data,filters,invalidPeriod]);

 const totals=useMemo(()=>{
  const sum=rows=>rows.reduce((s,x)=>s+Number(x.valor||0),0);
  return{
   quantidade:filtered.length,
   fixas:sum(filtered.filter(x=>['FIXO','FIXA'].includes(norm(x.tipo_custo)))),
   variaveis:sum(filtered.filter(x=>['VARIAVEL','VARIAVEL'].includes(norm(x.tipo_custo)))),
   total:sum(filtered)
  };
 },[filtered]);

 const setFilter=(key,value)=>setFilters(p=>({...p,[key]:value}));
 const clear=()=>setFilters({dataInicio:'',dataFim:'',despesa_id:'todos'});

 const exportData=()=>{
  if(!filtered.length){
   toast({title:'Sem dados',description:'Não há despesas para exportar com os filtros atuais.',variant:'destructive'});
   return;
  }
  const rows=[
   ['Data','Tipo de despesa','Classificação','Tipo de lançamento','Quantidade','Valor'],
   ...filtered.map(x=>[
    dateBR(x.data),x.lm_despesas?.despesa||'Não informado',
    x.tipo_custo||'',x.tipo_lancamento||'',x.quantidade??'',
    Number(x.valor||0).toFixed(2).replace('.',',')
   ])
  ];
  const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`Relatorio_Despesas_${todaySP()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast({title:'Exportação concluída',description:`${filtered.length} lançamento(s) exportado(s).`});
 };

 const Stat=({title,value,Icon,color,isMoney=false})=><Card className="border-cyan-500/20 bg-card/80"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p><p className={`mt-1 text-xl font-bold ${color}`}>{isMoney?money(value):value}</p></div><Icon className={`h-6 w-6 ${color}`}/></CardContent></Card>;

 return <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="dark-lm-impressoes space-y-5 py-5">
  <Card className="border-cyan-500/20 bg-card/80">
   <CardContent className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center">
    <div className="flex items-start gap-3">
     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10"><FileSearch className="h-6 w-6 text-cyan-400"/></div>
     <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-400">Relatórios • LM Impressões</p><h1 className="mt-1 text-2xl font-bold">Relatório de Despesas</h1><p className="mt-1 text-sm text-muted-foreground">Consulte, filtre e exporte as despesas do negócio.</p></div>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={fetchData} disabled={loading} className="border-cyan-500/40 text-cyan-400"><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</Button>
     <Button variant="outline" onClick={exportData} disabled={loading||!filtered.length||invalidPeriod} className="border-cyan-500/40 text-cyan-400"><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button>
    </div>
   </CardContent>
  </Card>

  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
   <Stat title="Lançamentos" value={totals.quantidade} Icon={Receipt} color="text-cyan-400"/>
   <Stat title="Despesas fixas" value={totals.fixas} Icon={TrendingUp} color="text-amber-400" isMoney/>
   <Stat title="Total de despesas" value={totals.total} Icon={TrendingDown} color="text-red-400" isMoney/>
  </div>

  <Card className="border-cyan-500/20 bg-card/80">
   <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-5 w-5 text-cyan-400"/>Filtros</CardTitle><CardDescription>Os resultados e os totais acompanham os filtros selecionados.</CardDescription></CardHeader>
   <CardContent>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
     <div className="space-y-2"><Label>Data inicial</Label><Input type="date" value={filters.dataInicio} onChange={e=>setFilter('dataInicio',e.target.value)}/></div>
     <div className="space-y-2"><Label>Data final</Label><Input type="date" value={filters.dataFim} onChange={e=>setFilter('dataFim',e.target.value)}/></div>
     <div className="space-y-2"><Label>Tipo de despesa</Label><Select value={filters.despesa_id} onValueChange={v=>setFilter('despesa_id',v)}><SelectTrigger><SelectValue placeholder="Todas"/></SelectTrigger><SelectContent><ScrollArea className="h-48"><SelectItem value="todos">Todas as despesas</SelectItem>{tipos.map(x=><SelectItem key={x.id} value={String(x.id)}>{x.despesa}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
     <div className="flex items-end"><Button variant="outline" onClick={clear} className="w-full"><RotateCcw className="mr-2 h-4 w-4"/>Limpar filtros</Button></div>
    </div>
    {invalidPeriod&&<p className="mt-3 text-sm text-red-400">A data inicial deve ser anterior ou igual à data final.</p>}
   </CardContent>
  </Card>

  <Card className="overflow-hidden border-cyan-500/20 bg-card/80">
   <CardHeader className="border-b border-cyan-500/10">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="text-lg">Resultados</CardTitle><CardDescription>Despesas ordenadas da data mais recente para a mais antiga.</CardDescription></div><Badge variant="outline" className="border-cyan-500/30 text-cyan-400">{filtered.length} registro(s)</Badge></div>
   </CardHeader>
   <CardContent className="p-0">
    <ScrollArea className="w-full">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader className="bg-secondary/70"><TableRow><TableHead>Data</TableHead><TableHead>Tipo de despesa</TableHead><TableHead>Classificação</TableHead><TableHead>Tipo de lançamento</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
       <TableBody>
        {loading?<TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-cyan-400"/>Carregando despesas...</TableCell></TableRow>
        :invalidPeriod?<TableRow><TableCell colSpan={5} className="py-10 text-center text-red-400">Corrija o período selecionado.</TableCell></TableRow>
        :!filtered.length?<TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground"><FileSearch className="mx-auto mb-2 h-10 w-10 opacity-50"/>Nenhuma despesa encontrada para os filtros aplicados.</TableCell></TableRow>
        :filtered.map(x=><TableRow key={x.id} className="hover:bg-cyan-500/5">
         <TableCell className="whitespace-nowrap">{dateBR(x.data)}</TableCell>
         <TableCell className="font-medium">{x.lm_despesas?.despesa||'Não informado'}</TableCell>
         <TableCell><Badge variant="outline">{x.tipo_custo||'—'}</Badge></TableCell>
         <TableCell>{x.tipo_lancamento||'—'}</TableCell>
         <TableCell className="whitespace-nowrap text-right font-semibold text-red-400">{money(x.valor)}</TableCell>
        </TableRow>)}
        {!loading&&!invalidPeriod&&filtered.length>0&&<TableRow className="bg-muted/30 font-bold"><TableCell colSpan={4} className="text-right">Total:</TableCell><TableCell className="whitespace-nowrap text-right text-red-400">{money(totals.total)}</TableCell></TableRow>}
       </TableBody>
      </Table>
     </div>
    </ScrollArea>
   </CardContent>
  </Card>
 </motion.div>;
}

