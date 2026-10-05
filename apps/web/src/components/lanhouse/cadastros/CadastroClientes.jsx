import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,Users,RefreshCw,Search,Phone,UserRound}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const CYAN='hsl(var(--neon-lanhouse))';
const fmtPhone=v=>{const n=(v||'').replace(/\D/g,'');if(n.length<3)return`(${n}`;if(n.length<8)return`(${n.slice(0,2)}) ${n.slice(2)}`;return`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7,11)}`};

export default function CadastroClientes(){
 const{user}=useAuth(),{toast}=useToast();
 const[clientes,setClientes]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState(''),[open,setOpen]=useState(false),[editingId,setEditingId]=useState(null),[form,setForm]=useState({nome:'',telefone:'',apelido:''}),[checking,setChecking]=useState(false),[nameError,setNameError]=useState('');

 const load=useCallback(async()=>{if(!user)return;setLoading(true);const{data,error}=await supabase.from('lm_clientes').select('*').eq('user_id',user.id).order('nome');if(error)toast({title:'Erro ao buscar clientes',description:error.message,variant:'destructive'});else setClientes(data||[]);setLoading(false)},[user,toast]);
 useEffect(()=>load(),[load]);
 useEffect(()=>{if(!user)return;const c=supabase.channel('lm_clientes_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes',filter:`user_id=eq.${user.id}`},load).subscribe();return()=>supabase.removeChannel(c)},[user,load]);

 useEffect(()=>{let live=true;const t=setTimeout(async()=>{const n=form.nome.trim();if(!n||!user){setNameError('');setChecking(false);return}if(editingId&&clientes.find(x=>x.id===editingId)?.nome?.toLowerCase()===n.toLowerCase()){setNameError('');setChecking(false);return}setChecking(true);const{data}=await supabase.from('lm_clientes').select('id,nome').eq('user_id',user.id).ilike('nome',n);if(live)setNameError(data?.some(x=>x.id!==editingId&&String(x.nome).toLowerCase()===n.toLowerCase())?'Cliente com este nome já existe':'');if(live)setChecking(false)},400);return()=>{live=false;clearTimeout(t)}},[form.nome,editingId,user,clientes]);

 const reset=()=>{setForm({nome:'',telefone:'',apelido:''});setEditingId(null);setNameError('');setChecking(false)};
 const abrir=c=>{setEditingId(c?.id||null);setForm({nome:c?.nome||'',telefone:c?.telefone||'',apelido:c?.apelido||''});setOpen(true)};
 const salvar=async e=>{e.preventDefault();if(!form.nome.trim()||nameError)return toast({title:'Verifique o nome do cliente',variant:'destructive'});const d={...form,user_id:user.id};const q=editingId?await supabase.from('lm_clientes').update(d).eq('id',editingId).eq('user_id',user.id):await supabase.from('lm_clientes').insert(d);if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});toast({title:'Sucesso',description:editingId?'Cliente atualizado.':'Cliente cadastrado.'});setOpen(false);reset();load()};
 const excluir=async id=>{const{error}=await supabase.from('lm_clientes').delete().eq('id',id).eq('user_id',user.id);if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});else{toast({title:'Cliente excluído'});load()}};
 const lista=clientes.filter(c=>{const t=search.trim().toLowerCase();return!t||`${c.nome||''} ${c.telefone||''} ${c.apelido||''}`.toLowerCase().includes(t)});
 const telefones=clientes.filter(c=>c.telefone?.trim()).length,apelidos=clientes.filter(c=>c.apelido?.trim()).length;

 return <div className="dark-lm-impressoes space-y-4">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]"><Users className="h-5 w-5" style={{color:CYAN}}/></div><div><p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>Cadastros</p><h1 className="text-2xl font-bold tracking-tight">Clientes</h1><p className="text-sm text-muted-foreground">Cadastre e organize a base de clientes.</p></div></div>
   <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button><Button onClick={()=>abrir()} className="text-slate-950" style={{background:CYAN}}><Plus className="mr-2 h-4 w-4"/>Novo Cliente</Button></div>
  </div>

  <Card className="border-border bg-card/80"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar cliente..." className="bg-input pl-9"/></div><span className="text-sm text-muted-foreground">{lista.length} cliente(s)</span></CardContent></Card>

  <div className="grid gap-4 md:grid-cols-3">
   {[['Clientes cadastrados',clientes.length,Users],['Com telefone',telefones,Phone],['Com apelido',apelidos,UserRound]].map(([l,v,I],i)=><Card key={l} className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{l}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={{color:i===0?CYAN:undefined}}>{v}</p></CardContent></Card>)}
  </div>

  <ModalLancamentoPadrao open={open} onClose={()=>{setOpen(false);reset()}} title={editingId?'Editar Cliente':'Novo Cliente'} description="Preencha os dados do cliente." icon={Users} theme="cyan" footer={<><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button type="submit" form="form-cliente" disabled={checking||!!nameError} className="text-slate-950" style={{background:CYAN}}>{editingId?'Salvar Alterações':'Salvar Cliente'}</Button></>}>
   <form id="form-cliente" onSubmit={salvar} className="space-y-5">
    <div className="space-y-2"><Label>Nome</Label><div className="relative"><Input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome do cliente" required/>{checking&&<RefreshCw className="absolute right-3 top-3 h-4 w-4 animate-spin" style={{color:CYAN}}/>}</div>{nameError&&<p className="text-xs text-red-400">{nameError}</p>}</div>
    <div className="space-y-2"><Label>Telefone</Label><Input value={form.telefone} onChange={e=>setForm({...form,telefone:fmtPhone(e.target.value)})} placeholder="(83) 99999-9999"/></div>
    <div className="space-y-2"><Label>Apelido</Label><Input value={form.apelido} onChange={e=>setForm({...form,apelido:e.target.value})} placeholder="Apelido"/></div>
   </form>
  </ModalLancamentoPadrao>

  <Card className="border-border bg-card"><CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:CYAN}}>Clientes cadastrados</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-border bg-muted/30"><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Nome</th><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Telefone</th><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Apelido</th><th className="p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th></tr></thead><tbody>{loading?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:!lista.length?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-10 w-10 opacity-50"/>{clientes.length?'Nenhum resultado.':'Nenhum cliente cadastrado.'}</td></tr>:lista.map(c=><tr key={c.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]"><td className="p-4 font-medium">{c.nome}</td><td className="p-4">{c.telefone||'—'}</td><td className="p-4">{c.apelido||'—'}</td><td className="p-4 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={()=>abrir(c)} style={{color:CYAN}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent className="dark-lm-impressoes"><AlertDialogHeader><AlertDialogTitle>Excluir cliente?</AlertDialogTitle><AlertDialogDescription>Deseja excluir <strong>{c.nome}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>excluir(c.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></td></tr>)}</tbody></table></div></CardContent></Card>
 </div>
}
