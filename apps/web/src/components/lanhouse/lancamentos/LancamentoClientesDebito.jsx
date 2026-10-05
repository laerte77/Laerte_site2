import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash2,UserX,Search,RefreshCw,CreditCard}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Badge}from'@/components/ui/badge';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const C='hsl(var(--neon-lanhouse))';
const moeda=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));

export default function LancamentoClientesDebito(){
 const{user}=useAuth(),{toast}=useToast();
 const[debitos,setDebitos]=useState([]),[clientes,setClientes]=useState([]),[servicos,setServicos]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[statusFilter,setStatusFilter]=useState('all'),[open,setOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),[editId,setEditId]=useState(null);
 const[form,setForm]=useState({data:new Date().toISOString().split('T')[0],cliente:'',servico:'',valor:'',status:'DEVENDO'});

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b,c]=await Promise.all([
    supabase.from('lm_clientes_debito').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_clientes').select('nome').eq('user_id',user.id).order('nome'),
    supabase.from('lm_servicos').select('servico').eq('user_id',user.id).order('servico')
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
   setDebitos(a.data||[]);setClientes(b.data||[]);setServicos(c.data||[]);
  }catch(e){toast({title:'Erro ao carregar débitos',description:e.message,variant:'destructive'})}
  finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>load(),[load]);
 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('lm_clientes_debito_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes_debito',filter:`user_id=eq.${user.id}`},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const reset=()=>{setForm({data:new Date().toISOString().split('T')[0],cliente:'',servico:'',valor:'',status:'DEVENDO'});setEditId(null)};
 const openForm=x=>{setEditId(x?.id||null);setForm(x?{data:x.data||new Date().toISOString().split('T')[0],cliente:x.cliente||'',servico:x.servico||'',valor:x.valor??'',status:x.status||'DEVENDO'}:{data:new Date().toISOString().split('T')[0],cliente:'',servico:'',valor:'',status:'DEVENDO'});setOpen(true)};

 const save=async e=>{
  e.preventDefault();
  if(!form.data||!form.cliente||!form.servico||!form.valor)return toast({title:'Campos obrigatórios',description:'Preencha data, cliente, serviço e valor.',variant:'destructive'});
  const payload={...form,user_id:user.id,valor:Number(form.valor)};
  const q=editId?await supabase.from('lm_clientes_debito').update(payload).eq('id',editId).eq('user_id',user.id):await supabase.from('lm_clientes_debito').insert(payload);
  if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  toast({title:'Sucesso',description:editId?'Débito atualizado.':'Débito registrado.'});
  setOpen(false);reset();load();
 };

 const remove=async id=>{
  const{error}=await supabase.from('lm_clientes_debito').delete().eq('id',id).eq('user_id',user.id);
  if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});
  else{toast({title:'Débito excluído'});load()}
 };

 const list=debitos.filter(x=>{
  const t=`${x.cliente||''} ${x.servico||''}`.toLowerCase();
  return(!search||t.includes(search.toLowerCase()))&&(statusFilter==='all'||x.status===statusFilter);
 });
 const total=list.reduce((a,x)=>a+Number(x.valor||0),0);
 const devendo=list.filter(x=>x.status==='DEVENDO').length;
 const pago=list.filter(x=>x.status==='PAGO').length;
 const valorDevendo=list.filter(x=>x.status==='DEVENDO').reduce((a,x)=>a+Number(x.valor||0),0);

 const badge=s=>s==='PAGO'?<Badge className="bg-green-500/15 text-green-400 border border-green-500/20">Pago</Badge>:s==='PARCIAL'?<Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">Parcial</Badge>:<Badge className="bg-red-500/15 text-red-400 border border-red-500/20">Devendo</Badge>;

 return <div className="dark-lm-impressoes space-y-4">

  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]"><UserX className="h-5 w-5" style={{color:C}}/></div><div><p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Lançamentos</p><h1 className="text-2xl font-bold">Clientes com Débito</h1><p className="text-sm text-muted-foreground">Controle dos valores pendentes dos clientes.</p></div></div>
   <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button><Button variant="outline" onClick={()=>setSearchOpen(true)}><Search className="mr-2 h-4 w-4"/>Selecionar</Button><Button onClick={()=>openForm()} className="text-slate-950" style={{background:C}}><Plus className="mr-2 h-4 w-4"/>Novo Débito</Button></div>
  </div>

  <Card><CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative w-full lg:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar cliente ou serviço..." className="pl-9"/></div><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full lg:w-[160px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="DEVENDO">Devendo</SelectItem><SelectItem value="PARCIAL">Parcial</SelectItem><SelectItem value="PAGO">Pago</SelectItem></SelectContent></Select></CardContent></Card>

  <div className="grid gap-4 md:grid-cols-4">
   {[['Valor filtrado',moeda(total)],['Devendo',devendo],['Pagos',pago],['Valor pendente',moeda(valorDevendo)]].map(([t,v],i)=><Card key={t}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={i===0?{color:C}:i===3?{color:'hsl(var(--destructive))'}:undefined}>{v}</p></CardContent></Card>)}
  </div>

  <SearchableModal isOpen={searchOpen} onClose={()=>setSearchOpen(false)} onSelect={x=>{setSearchOpen(false);openForm(x)}} tableName="lm_clientes_debito" searchField="cliente" displayFields={[{key:'data',label:'Data',format:d=>new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'})},{key:'cliente',label:'Cliente'},{key:'valor',label:'Valor',format:moeda}]} title="Buscar Débito"/>

  <ModalLancamentoPadrao open={open} onClose={()=>{setOpen(false);reset()}} title={editId?'Editar Débito':'Novo Débito'} description="Registre um valor pendente de cliente." icon={CreditCard} theme="cyan" footer={<><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button type="submit" form="f-debito" className="text-slate-950" style={{background:C}}>Salvar</Button></>}>
   <form id="f-debito" onSubmit={save} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} required/></div><div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} required/></div></div>
    <div className="space-y-2"><Label>Cliente</Label><Select value={form.cliente} onValueChange={v=>setForm({...form,cliente:v})}><SelectTrigger><SelectValue placeholder="Selecione o cliente"/></SelectTrigger><SelectContent>{clientes.map(x=><SelectItem key={x.nome} value={x.nome}>{x.nome}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><Label>Serviço</Label><Select value={form.servico} onValueChange={v=>setForm({...form,servico:v})}><SelectTrigger><SelectValue placeholder="Selecione o serviço"/></SelectTrigger><SelectContent>{servicos.map(x=><SelectItem key={x.servico} value={x.servico}>{x.servico}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="DEVENDO">Devendo</SelectItem><SelectItem value="PARCIAL">Parcial</SelectItem><SelectItem value="PAGO">Pago</SelectItem></SelectContent></Select></div>
   </form>
  </ModalLancamentoPadrao>

  <Card><CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:C}}>Débitos cadastrados</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-muted/30"><th className="p-4 text-left text-sm text-muted-foreground">Data</th><th className="p-4 text-left text-sm text-muted-foreground">Cliente</th><th className="p-4 text-left text-sm text-muted-foreground">Serviço</th><th className="p-4 text-left text-sm text-muted-foreground">Status</th><th className="p-4 text-right text-sm text-muted-foreground">Valor</th><th className="p-4 text-right text-sm text-muted-foreground">Ações</th></tr></thead><tbody>{loading?<tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:!list.length?<tr><td colSpan={6} className="p-10 text-center text-muted-foreground"><UserX className="mx-auto mb-2 h-10 w-10 opacity-40"/>{debitos.length?'Nenhum resultado.':'Nenhum débito cadastrado.'}</td></tr>:list.map(x=><tr key={x.id} className="border-b last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]"><td className="p-4">{x.data?new Date(x.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—'}</td><td className="p-4 font-medium">{x.cliente}</td><td className="p-4">{x.servico}</td><td className="p-4">{badge(x.status)}</td><td className="p-4 text-right font-semibold" style={{color:C}}>{moeda(x.valor)}</td><td className="p-4 text-right"><Button variant="ghost" size="icon" onClick={()=>openForm(x)} style={{color:C}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir débito?</AlertDialogTitle><AlertDialogDescription>Deseja excluir este lançamento?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>)}</tbody></table></div></CardContent></Card>
 </div>;
}
