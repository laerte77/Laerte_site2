import React,{useState,useEffect,useMemo,useCallback}from'react';
import{motion}from'framer-motion';
import{FileSearch,Download,RefreshCw,Calendar,Filter,RotateCcw,Loader2,Users,Wallet,Clock}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardDescription,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{ScrollArea}from'@/components/ui/scroll-area';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='#06b6d4';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const dateKey=v=>String(v||'').slice(0,10);
const collator=new Intl.Collator('pt-BR',{sensitivity:'base'});
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const dateBR=v=>{const d=dateKey(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return'—';const[y,m,day]=d.split('-');return`${day}/${m}/${y}`};
const todaySP=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`};
const calculateDays=value=>{const date=dateKey(value);if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return 0;const[a,b,c]=date.split('-').map(Number);const[y,m,d]=todaySP().split('-').map(Number);return Math.max(0,Math.floor((Date.UTC(y,m-1,d)-Date.UTC(a,b-1,c))/86400000))};
const csvCell=v=>`"${String(v??'').replace(/"/g,'""')}"`;

export default function RelatorioClientesDebito(){
 const{toast}=useToast();
 const{user}=useAuth();
 const[debitos,setDebitos]=useState([]);
 const[clientes,setClientes]=useState([]);
 const[loading,setLoading]=useState(true);
 const[filters,setFilters]=useState({dataInicio:'',dataFim:'',cliente:'todos',status:'todos'});

 const fetchData=useCallback(async()=>{
  if(!user){setDebitos([]);setClientes([]);setLoading(false);return}
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('lm_clientes_debito').select('*').eq('user_id',user.id),
    supabase.from('lm_clientes').select('id,nome').eq('user_id',user.id).order('nome',{ascending:true})
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   setDebitos(a.data||[]);
   setClientes(b.data||[]);
  }catch(e){
   console.error('Erro no relatório de débitos:',e);
   toast({title:'Erro ao carregar relatório',description:e.message||'Não foi possível buscar os dados.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase.channel(`relatorio_debitos_${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes_debito',filter:`user_id=eq.${user.id}`},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const nomesClientes=useMemo(()=>[...new Set(clientes.map(x=>x.nome).filter(Boolean))].sort(collator.compare),[clientes]);

 const filteredDebitos=useMemo(()=>debitos.filter(d=>{
  const date=dateKey(d.data);
  if(filters.dataInicio&&(!date||date<filters.dataInicio))return false;
  if(filters.dataFim&&(!date||date>filters.dataFim))return false;
  if(filters.cliente!=='todos'&&d.cliente!==filters.cliente)return false;
  if(filters.status!=='todos'&&norm(d.status)!==filters.status)return false;
  return true;
 }).sort((a,b)=>dateKey(b.data).localeCompare(dateKey(a.data))),[debitos,filters]);

 const stats=useMemo(()=>({
  total:filteredDebitos.length,
  devendo:filteredDebitos.filter(x=>norm(x.status)==='DEVENDO').length,
  parcial:filteredDebitos.filter(x=>norm(x.status)==='PARCIAL').length,
  pagos:filteredDebitos.filter(x=>norm(x.status)==='PAGO').length
 }),[filteredDebitos]);

 const setFilter=(key,value)=>setFilters(prev=>({...prev,[key]:value}));

 const clearFilters=()=>setFilters({dataInicio:'',dataFim:'',cliente:'todos',status:'todos'});

 const handleExport=()=>{
  if(!filteredDebitos.length){
   toast({title:'Sem dados',description:'Não há registros para exportar com os filtros atuais.',variant:'destructive'});
   return;
  }
  const rows=[
   ['Data','Cliente','Serviço','Status','Dias da Dívida','Valor'],
   ...filteredDebitos.map(d=>[
    dateBR(d.data),d.cliente,d.servico,d.status,
    norm(d.status)==='DEVENDO'?calculateDays(d.data):'-',
    Number(d.valor||0).toFixed(2).replace('.',',')
   ])
  ];
  const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`Relatorio_Clientes_Debito_${todaySP()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast({title:'Exportação concluída',description:`${filteredDebitos.length} registro(s) exportado(s).`});
 };

 const statusBadge=status=>{
  const s=norm(status);
  if(s==='PAGO')return <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">Pago</Badge>;
  if(s==='DEVENDO')return <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-400">Devendo</Badge>;
  if(s==='PARCIAL')return <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">Parcial</Badge>;
  return <Badge variant="outline">{status||'Não informado'}</Badge>;
 };

 const Stat=({title,value,Icon,color})=><Card className="border-cyan-500/20 bg-card/80"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p></div><Icon className={`h-6 w-6 ${color}`}/></CardContent></Card>;

 return <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="dark-lm-impressoes space-y-5 py-5">
  <Card className="border-cyan-500/20 bg-card/80">
   <CardContent className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center">
    <div className="flex items-start gap-3">
     <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/25 bg-cyan-500/10"><FileSearch className="h-6 w-6 text-cyan-400"/></div>
     <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-400">Relatórios • LM Impressões</p><h1 className="mt-1 text-2xl font-bold">Clientes com Débito</h1><p className="mt-1 text-sm text-muted-foreground">Consulte pendências, acompanhe os registros e exporte os resultados.</p></div>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={fetchData} disabled={loading} className="border-cyan-500/40 text-cyan-400"><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</Button>
     <Button variant="outline" onClick={handleExport} disabled={loading||!filteredDebitos.length} className="border-cyan-500/40 text-cyan-400"><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button>
    </div>
   </CardContent>
  </Card>

  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Stat title="Registros filtrados" value={stats.total} Icon={FileSearch} color="text-cyan-400"/>
   <Stat title="Devendo" value={stats.devendo} Icon={Clock} color="text-red-400"/>
   <Stat title="Pagamento parcial" value={stats.parcial} Icon={Wallet} color="text-amber-400"/>
   <Stat title="Pagos" value={stats.pagos} Icon={Users} color="text-emerald-400"/>
  </div>

  <Card className="border-cyan-500/20 bg-card/80">
   <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-5 w-5 text-cyan-400"/>Filtros</CardTitle><CardDescription>Os resultados e os indicadores são atualizados conforme os filtros selecionados.</CardDescription></CardHeader>
   <CardContent>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
     <div className="space-y-2"><Label>Data inicial</Label><Input type="date" value={filters.dataInicio} onChange={e=>setFilter('dataInicio',e.target.value)}/></div>
     <div className="space-y-2"><Label>Data final</Label><Input type="date" value={filters.dataFim} onChange={e=>setFilter('dataFim',e.target.value)}/></div>
     <div className="space-y-2"><Label>Cliente</Label><Select value={filters.cliente} onValueChange={v=>setFilter('cliente',v)}><SelectTrigger><SelectValue placeholder="Selecione o cliente"/></SelectTrigger><SelectContent><ScrollArea className="h-48"><SelectItem value="todos">Todos os clientes</SelectItem>{nomesClientes.map(nome=><SelectItem key={nome} value={nome}>{nome}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
     <div className="space-y-2"><Label>Status</Label><Select value={filters.status} onValueChange={v=>setFilter('status',v)}><SelectTrigger><SelectValue placeholder="Todos os status"/></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="DEVENDO">Devendo</SelectItem><SelectItem value="PARCIAL">Parcial</SelectItem><SelectItem value="PAGO">Pago</SelectItem></SelectContent></Select></div>
     <div className="flex items-end"><Button variant="outline" className="w-full" onClick={clearFilters}><RotateCcw className="mr-2 h-4 w-4"/>Limpar filtros</Button></div>
    </div>
    {filters.dataInicio&&filters.dataFim&&filters.dataInicio>filters.dataFim&&<p className="mt-3 text-sm text-red-400">A data inicial deve ser anterior ou igual à data final.</p>}
   </CardContent>
  </Card>

  <Card className="overflow-hidden border-cyan-500/20 bg-card/80">
   <CardHeader className="border-b border-cyan-500/10">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="text-lg">Resultados</CardTitle><CardDescription>Débitos ordenados do mais recente para o mais antigo.</CardDescription></div><Badge variant="outline" className="border-cyan-500/30 text-cyan-400">{filteredDebitos.length} registro(s)</Badge></div>
   </CardHeader>
   <CardContent className="p-0">
    <ScrollArea className="w-full">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader className="bg-secondary/70"><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Serviço</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Dias da dívida</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
       <TableBody>
        {loading?<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-cyan-400"/>Carregando registros...</TableCell></TableRow>
        :filters.dataInicio&&filters.dataFim&&filters.dataInicio>filters.dataFim?<TableRow><TableCell colSpan={6} className="py-10 text-center text-red-400">Corrija o período selecionado.</TableCell></TableRow>
        :!filteredDebitos.length?<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground"><FileSearch className="mx-auto mb-2 h-10 w-10 opacity-50"/>Nenhum registro encontrado para os filtros aplicados.</TableCell></TableRow>
        :filteredDebitos.map(d=><TableRow key={d.id} className="hover:bg-cyan-500/5">
         <TableCell className="whitespace-nowrap">{dateBR(d.data)}</TableCell>
         <TableCell className="font-medium">{d.cliente||'—'}</TableCell>
         <TableCell>{d.servico||'—'}</TableCell>
         <TableCell>{statusBadge(d.status)}</TableCell>
         <TableCell className="text-right tabular-nums">{norm(d.status)==='DEVENDO'?`${calculateDays(d.data)} dias`:'—'}</TableCell>
         <TableCell className="whitespace-nowrap text-right font-semibold text-cyan-400">{money(d.valor)}</TableCell>
        </TableRow>)}
       </TableBody>
      </Table>
     </div>
    </ScrollArea>
   </CardContent>
  </Card>
 </motion.div>;
}
