import React,{useState,useEffect,useCallback,useMemo}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import{Users,DollarSign,RefreshCw,AlertCircle,Edit,Trash2,CalendarClock,UserCheck,UserMinus,Filter,Save,Loader2,Search}from'lucide-react';
import{format,parseISO,subMonths}from'date-fns';
import{formatCurrency}from'@/lib/utils';
import{useToast}from'@/hooks/use-toast';

const GOLD='hsl(var(--neon-igreja))';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

export default function ConsultaTodosDizimistas(){
 const{user}=useAuth(),{toast}=useToast();
 const[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(null);
 const[filtroPeriodo,setFiltroPeriodo]=useState('12'),[filtroStatus,setFiltroStatus]=useState('Todos'),[search,setSearch]=useState('');
 const[data,setData]=useState([]);
 const[open,setOpen]=useState(false),[current,setCurrent]=useState(null),[nome,setNome]=useState(''),[telefone,setTelefone]=useState('');

 const fetchData=useCallback(async()=>{
  if(!user){setData([]);setLoading(false);return}
  setLoading(true);setError(null);
  try{
   const cutoff=format(subMonths(new Date(),Number(filtroPeriodo)),'yyyy-MM-dd');
   const[a,b]=await Promise.all([
    supabase.from('igreja_dizimistas').select('id,nome,telefone').eq('user_id',user.id),
    supabase.from('igreja_entradas').select('dizimista_id,valor,data').eq('user_id',user.id).not('dizimista_id','is',null)
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   const entradas=b.data||[];
   const rows=(a.data||[]).map(d=>{
    const contribs=entradas.filter(e=>e.dizimista_id===d.id);
    const total=contribs.reduce((s,x)=>s+Number(x.valor||0),0);
    const recentes=contribs.filter(x=>String(x.data||'').slice(0,10)>=cutoff);
    const datas=contribs.map(x=>String(x.data||'').slice(0,10)).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)).sort();
    return{
     id:d.id,nome:d.nome,telefone:d.telefone,
     valorTotal:total,ultimaContribuicao:datas.at(-1)||null,
     status:recentes.length?'Ativo':'Inativo'
    };
   }).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
   setData(rows);
  }catch(e){
   setError(e.message||'Não foi possível carregar os dados.');
   toast({title:'Erro ao carregar dados',description:e.message||'Tente novamente.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,filtroPeriodo,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase.channel(`consulta_dizimistas_${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'igreja_dizimistas',filter:`user_id=eq.${user.id}`},fetchData)
   .on('postgres_changes',{event:'*',schema:'public',table:'igreja_entradas',filter:`user_id=eq.${user.id}`},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filtered=useMemo(()=>data.filter(x=>
  (filtroStatus==='Todos'||x.status===filtroStatus)&&
  (!search.trim()||norm(`${x.nome} ${x.telefone||''}`).includes(norm(search)))
 ),[data,filtroStatus,search]);

 const ativos=data.filter(x=>x.status==='Ativo').length;
 const inativos=data.filter(x=>x.status==='Inativo').length;
 const totalHistorico=data.reduce((s,x)=>s+x.valorTotal,0);

 const phoneMask=v=>{
  const n=String(v||'').replace(/\D/g,'').slice(0,11);
  if(n.length<=2)return n?`(${n}`:'';
  if(n.length<=7)return`(${n.slice(0,2)}) ${n.slice(2)}`;
  return`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
 };

 const openEdit=item=>{
  setCurrent(item);
  setNome(item.nome||'');
  setTelefone(item.telefone||'');
  setOpen(true);
 };

 const closeModal=()=>{
  if(saving)return;
  setOpen(false);setCurrent(null);setNome('');setTelefone('');
 };

 const save=async()=>{
  if(!user||!current)return;
  if(!nome.trim()){
   toast({title:'Campo obrigatório',description:'Informe o nome do dizimista.',variant:'destructive'});
   return;
  }
  setSaving(true);
  try{
   const{error}=await supabase.from('igreja_dizimistas')
    .update({nome:nome.trim(),telefone:telefone.trim()})
    .eq('id',current.id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Dizimista atualizado',description:'Os dados foram salvos com sucesso.'});
   setOpen(false);setCurrent(null);setNome('');setTelefone('');
   await fetchData();
  }catch(e){
   toast({title:'Erro ao editar',description:e.message||'Não foi possível atualizar o dizimista.',variant:'destructive'});
  }finally{setSaving(false)}
 };

 const remove=async item=>{
  if(!user)return;
  setSaving(true);
  try{
   const{error}=await supabase.from('igreja_dizimistas').delete()
    .eq('id',item.id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Dizimista excluído',description:`${item.nome} foi removido do cadastro.`});
   await fetchData();
  }catch(e){
   toast({title:'Não foi possível excluir',description:e.message||'Verifique se há registros vinculados a este dizimista.',variant:'destructive'});
  }finally{setSaving(false)}
 };

 const Stat=({title,value,Icon,color})=><Card className="border-border bg-card/80"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</p><p className={`mt-1 text-2xl font-bold ${color||''}`}>{value}</p></div><Icon className={`h-5 w-5 ${color||''}`} /></div></CardContent></Card>;

 return(
  <div className="dark-igreja space-y-4">
   <div className="rounded-xl border border-border bg-card/70 p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[hsl(var(--neon-igreja)/.25)] bg-[hsl(var(--neon-igreja)/.10)]"><Users className="h-7 w-7" style={{color:GOLD}}/></div>
      <div><p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:GOLD}}>Consultas • Tesouraria</p><h1 className="text-2xl font-bold" style={{color:GOLD}}>Todos os Dizimistas</h1><p className="text-sm text-muted-foreground">Consulte contribuições, edite cadastros e acompanhe a atividade.</p></div>
     </div>
     <Button variant="outline" onClick={fetchData} disabled={loading||saving}><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardHeader className="border-b border-border bg-muted/20 pb-3"><CardTitle className="flex items-center text-base"><Filter className="mr-2 h-4 w-4" style={{color:GOLD}}/>Filtros</CardTitle></CardHeader>
    <CardContent className="grid gap-3 p-4 md:grid-cols-3">
     <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nome ou telefone..." className="bg-input pl-9"/></div>
     <Select value={filtroStatus} onValueChange={setFiltroStatus}><SelectTrigger className="bg-input"><SelectValue placeholder="Status"/></SelectTrigger><SelectContent className="dark-igreja bg-card"><SelectItem value="Todos">Todos os status</SelectItem><SelectItem value="Ativo">Ativos</SelectItem><SelectItem value="Inativo">Inativos</SelectItem></SelectContent></Select>
     <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}><SelectTrigger className="bg-input"><SelectValue placeholder="Período"/></SelectTrigger><SelectContent className="dark-igreja bg-card"><SelectItem value="3">Últimos 3 meses</SelectItem><SelectItem value="6">Últimos 6 meses</SelectItem><SelectItem value="12">Últimos 12 meses</SelectItem></SelectContent></Select>
    </CardContent>
   </Card>

   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <Stat title="Total cadastrados" value={data.length} Icon={Users}/>
    <Stat title="Total histórico" value={formatCurrency(totalHistorico)} Icon={DollarSign} color="text-[hsl(var(--neon-igreja))]"/>
    <Stat title="Ativos" value={ativos} Icon={UserCheck} color="text-emerald-400"/>
    <Stat title="Inativos" value={inativos} Icon={UserMinus} color="text-red-400"/>
   </div>

   {error?<Card className="border-red-500/30 bg-red-500/10"><CardContent className="flex flex-col items-center gap-2 p-8 text-red-400"><AlertCircle className="h-8 w-8"/><p>Erro ao carregar dados: {error}</p><Button variant="outline" onClick={fetchData}>Tentar novamente</Button></CardContent></Card>:(
    <Card className="overflow-hidden border-border bg-card/70">
     <CardHeader className="border-b border-border bg-muted/20 pb-3"><div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-lg" style={{color:GOLD}}>Relação de Dizimistas</CardTitle><Badge variant="outline">{filtered.length} registro(s)</Badge></div></CardHeader>
     <CardContent className="p-0">
      <div className="overflow-x-auto">
       <Table>
        <TableHeader className="bg-secondary/30"><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead className="text-right">Total histórico</TableHead><TableHead className="text-center">Última contribuição</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
        <TableBody>
         {loading?<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" style={{color:GOLD}}/>Carregando dados...</TableCell></TableRow>
         :!filtered.length?<TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Nenhum dizimista encontrado.</TableCell></TableRow>
         :filtered.map(x=><TableRow key={x.id} className="hover:bg-[hsl(var(--neon-igreja)/.04)]">
          <TableCell className="font-medium">{x.nome}</TableCell><TableCell className="text-muted-foreground">{x.telefone||'—'}</TableCell>
          <TableCell className="text-right font-semibold text-emerald-400">{formatCurrency(x.valorTotal)}</TableCell>
          <TableCell className="text-center text-muted-foreground">{x.ultimaContribuicao?<div className="flex items-center justify-center gap-2"><CalendarClock className="h-4 w-4" style={{color:GOLD}}/>{format(parseISO(x.ultimaContribuicao),'dd/MM/yyyy')}</div>:'—'}</TableCell>
          <TableCell className="text-center"><Badge className={x.status==='Ativo'?'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400':'border border-red-500/30 bg-red-500/10 text-red-400'}>{x.status}</Badge></TableCell>
          <TableCell><div className="flex justify-center gap-1">
           <Button variant="ghost" size="icon" disabled={saving} onClick={()=>openEdit(x)} className="text-[hsl(var(--neon-igreja))]" title="Editar dizimista"><Edit className="h-4 w-4"/></Button>
           <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" disabled={saving} className="text-red-400" title="Excluir dizimista"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
            <AlertDialogContent className="dark-igreja"><AlertDialogHeader><AlertDialogTitle>Excluir dizimista?</AlertDialogTitle><AlertDialogDescription>Deseja excluir “{x.nome}” do cadastro? A operação pode ser impedida caso existam registros financeiros vinculados.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={()=>remove(x)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
           </AlertDialog>
          </div></TableCell>
         </TableRow>)}
         {!loading&&filtered.length>0&&<TableRow className="bg-secondary/30 font-bold"><TableCell colSpan={2} className="text-right">Total da visão:</TableCell><TableCell className="text-right text-emerald-400">{formatCurrency(filtered.reduce((s,x)=>s+x.valorTotal,0))}</TableCell><TableCell colSpan={3}/></TableRow>}
        </TableBody>
       </Table>
      </div>
     </CardContent>
    </Card>
   )}

   <ModalLancamentoPadrao open={open} onClose={closeModal} title="Editar Dizimista" description="Atualize o nome e o telefone do cadastro." icon={Edit} theme="gold" footer={<><Button type="button" variant="outline" onClick={closeModal} disabled={saving}>Cancelar</Button><Button type="button" onClick={save} disabled={saving} className="text-[hsl(var(--background))]" style={{background:GOLD}}>{saving?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Salvando...</>:<><Save className="mr-2 h-4 w-4"/>Salvar alterações</>}</Button></>}>
    <div className="space-y-5">
     <div className="space-y-2"><Label>Nome *</Label><Input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Nome completo" className="h-11 rounded-xl bg-input" autoFocus/></div>
     <div className="space-y-2"><Label>Telefone</Label><Input value={telefone} onChange={e=>setTelefone(phoneMask(e.target.value))} placeholder="(83) 99999-9999" className="h-11 rounded-xl bg-input"/></div>
    </div>
   </ModalLancamentoPadrao>
  </div>
 );
}
