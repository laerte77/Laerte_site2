import React,{useState,useEffect,useMemo,useCallback}from'react';
import{FileSearch,Download,RefreshCw,FileBarChart,Calendar,Filter,RotateCcw,Loader2,Receipt,Wallet}from'lucide-react';
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

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const dateKey=v=>String(v||'').slice(0,10);
const dateBR=v=>{const d=dateKey(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return'—';const[y,m,day]=d.split('-');return`${day}/${m}/${y}`};
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const csvCell=v=>`"${String(v??'').replace(/"/g,'""')}"`;
const todaySP=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`};

export default function RelatorioDespesas(){
 const{toast}=useToast(),{user}=useAuth();
 const[despesas,setDespesas]=useState([]);
 const[tiposDespesa,setTiposDespesa]=useState([]);
 const[loading,setLoading]=useState(true);
 const[filters,setFilters]=useState({dataInicio:'',dataFim:'',tipo:'todos',mes:'todos'});
 const invalidPeriod=!!(filters.dataInicio&&filters.dataFim&&filters.dataInicio>filters.dataFim);

 const fetchData=useCallback(async()=>{
  if(!user){setDespesas([]);setTiposDespesa([]);setLoading(false);return}
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('igreja_despesas').select('*').eq('user_id',user.id),
    supabase.from('igreja_tipos_despesa').select('despesa').eq('user_id',user.id)
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   setDespesas(a.data||[]);
   setTiposDespesa(b.data||[]);
  }catch(e){
   console.error('Erro no relatório de despesas da igreja:',e);
   toast({title:'Erro ao carregar relatório',description:e.message||'Não foi possível buscar as despesas.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase.channel(`igreja_relatorio_despesas_${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'igreja_despesas',filter:`user_id=eq.${user.id}`},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filteredData=useMemo(()=>{
  if(invalidPeriod)return[];
  return despesas.filter(item=>{
   const d=dateKey(item.data);
   if(!d)return false;
   if(filters.dataInicio&&d<filters.dataInicio)return false;
   if(filters.dataFim&&d>filters.dataFim)return false;
   if(filters.tipo!=='todos'&&item.despesa!==filters.tipo)return false;
   if(filters.mes!=='todos'&&Number(d.slice(5,7))-1!==Number(filters.mes))return false;
   return true;
  }).sort((a,b)=>dateKey(b.data).localeCompare(dateKey(a.data)));
 },[despesas,filters,invalidPeriod]);

 const subtotal=useMemo(()=>filteredData.reduce((s,x)=>s+Number(x.valor||0),0),[filteredData]);
 const setFilter=(key,value)=>setFilters(p=>({...p,[key]:value}));
 const clear=()=>setFilters({dataInicio:'',dataFim:'',tipo:'todos',mes:'todos'});

 const handleExport=()=>{
  if(!filteredData.length){
   toast({title:'Sem dados',description:'Não há despesas para exportar com os filtros atuais.',variant:'destructive'});
   return;
  }
  const rows=[
   ['Data','Descrição','Valor'],
   ...filteredData.map(x=>[dateBR(x.data),x.despesa||'Não informado',Number(x.valor||0).toFixed(2).replace('.',',')]),
   [],
   ['Quantidade de registros',filteredData.length],
   ['Subtotal',subtotal.toFixed(2).replace('.',',')]
  ];
  const csv='\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=`Relatorio_Despesas_Igreja_${todaySP()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast({title:'Exportação concluída',description:`${filteredData.length} registro(s) exportado(s).`});
 };

 const Stat=({title,value,Icon,moneyValue=false})=><Card className="border-border/60 bg-card"><CardContent className="flex items-center justify-between gap-3 p-4"><div><p className="text-xs uppercase tracking-wider text-muted-foreground">{title}</p><p className="mt-1 text-xl font-bold text-foreground">{moneyValue?money(value):value}</p></div><Icon className="h-6 w-6 text-[hsl(var(--neon-igreja))]"/></CardContent></Card>;

 return <div className="theme-igreja space-y-5 py-5">
  <Card className="border-border/60 bg-card">
   <CardContent className="flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center">
    <div className="flex items-start gap-3">
     <div className="glow-igreja flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--neon-igreja))]/10"><FileBarChart className="h-6 w-6 text-[hsl(var(--neon-igreja))]"/></div>
     <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Relatórios • Tesouraria</p><h1 className="mt-1 text-2xl font-bold text-foreground">Relatório de Despesas</h1><p className="mt-1 text-sm text-muted-foreground">Consulte, filtre e exporte as despesas da igreja.</p></div>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={fetchData} disabled={loading} className="border-[hsl(var(--neon-igreja))]/40"><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</Button>
     <Button variant="outline" onClick={handleExport} disabled={loading||!filteredData.length||invalidPeriod} className="border-[hsl(var(--neon-igreja))]/40"><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button>
    </div>
   </CardContent>
  </Card>

  <div className="grid gap-3 sm:grid-cols-2">
   <Stat title="Despesas encontradas" value={filteredData.length} Icon={Receipt}/>
   <Stat title="Subtotal do período" value={subtotal} Icon={Wallet} moneyValue/>
  </div>

  <Card className="border-border/60 bg-card">
   <CardHeader className="border-b border-border/60"><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-5 w-5 text-[hsl(var(--neon-igreja))]"/>Filtros do relatório</CardTitle><CardDescription>Os resultados e o subtotal acompanham os filtros selecionados.</CardDescription></CardHeader>
   <CardContent>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
     <div className="space-y-2"><Label>Data inicial</Label><Input type="date" value={filters.dataInicio} onChange={e=>setFilter('dataInicio',e.target.value)} className="bg-input"/></div>
     <div className="space-y-2"><Label>Data final</Label><Input type="date" value={filters.dataFim} onChange={e=>setFilter('dataFim',e.target.value)} className="bg-input"/></div>
     <div className="space-y-2"><Label>Tipo de despesa</Label><Select value={filters.tipo} onValueChange={v=>setFilter('tipo',v)}><SelectTrigger className="bg-input"><SelectValue placeholder="Todas"/></SelectTrigger><SelectContent className="dark-igreja"><ScrollArea className="h-48"><SelectItem value="todos">Todos os tipos</SelectItem>{[...new Set(tiposDespesa.map(t=>t.despesa).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(tipo=><SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
     <div className="space-y-2"><Label>Mês</Label><Select value={filters.mes} onValueChange={v=>setFilter('mes',v)}><SelectTrigger className="bg-input"><SelectValue placeholder="Todos"/></SelectTrigger><SelectContent className="dark-igreja"><ScrollArea className="h-48"><SelectItem value="todos">Todos os meses</SelectItem>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
     <div className="flex items-end"><Button variant="outline" onClick={clear} className="w-full"><RotateCcw className="mr-2 h-4 w-4"/>Limpar filtros</Button></div>
    </div>
    {invalidPeriod&&<p className="mt-3 text-sm text-red-400">A data inicial deve ser anterior ou igual à data final.</p>}
   </CardContent>
  </Card>

  <Card className="overflow-hidden border-border/60 bg-card">
   <CardHeader className="border-b border-border/60">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><CardTitle className="text-lg">Despesas encontradas</CardTitle><CardDescription>Registros do período ordenados do mais recente para o mais antigo.</CardDescription></div><Badge variant="outline" className="border-[hsl(var(--neon-igreja))]/40">{filteredData.length} registro(s)</Badge></div>
   </CardHeader>
   <CardContent className="p-0">
    <ScrollArea className="w-full">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader className="bg-muted/50"><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
       <TableBody>
        {loading?<TableRow><TableCell colSpan={3} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-[hsl(var(--neon-igreja))]"/>Carregando despesas...</TableCell></TableRow>
        :invalidPeriod?<TableRow><TableCell colSpan={3} className="py-10 text-center text-red-400">Corrija o período selecionado.</TableCell></TableRow>
        :!filteredData.length?<TableRow><TableCell colSpan={3} className="py-12 text-center text-muted-foreground"><FileSearch className="mx-auto mb-2 h-10 w-10 opacity-50"/>Nenhuma despesa encontrada para os filtros aplicados.</TableCell></TableRow>
        :filteredData.map(item=><TableRow key={item.id} className="hover:bg-[hsl(var(--neon-igreja))]/5">
         <TableCell className="whitespace-nowrap">{dateBR(item.data)}</TableCell>
         <TableCell className="font-medium">{item.despesa||'Não informado'}</TableCell>
         <TableCell className="whitespace-nowrap text-right font-semibold text-red-400">{money(item.valor)}</TableCell>
        </TableRow>)}
        {!loading&&!invalidPeriod&&filteredData.length>0&&<TableRow className="bg-muted/30 font-bold"><TableCell colSpan={2} className="text-right">Subtotal:</TableCell><TableCell className="text-right text-red-400">{money(subtotal)}</TableCell></TableRow>}
       </TableBody>
      </Table>
     </div>
    </ScrollArea>
   </CardContent>
  </Card>
 </div>;
}
