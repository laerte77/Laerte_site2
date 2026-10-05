import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,FileStack,RefreshCw,Search}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const C='hsl(var(--neon-lanhouse))';

export default function CadastroTiposFolhas(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState('');
 const[open,setOpen]=useState(false),[editId,setEditId]=useState(null),[nome,setNome]=useState('');

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  const{data,error}=await supabase.from('lm_tipos_folha').select('*').eq('user_id',user.id).order('tipo_folha');
  if(error)toast({title:'Erro ao carregar tipos de folha',description:error.message,variant:'destructive'});
  else setData(data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('lm_tipos_folha_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_tipos_folha',filter:`user_id=eq.${user.id}`},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const reset=()=>{setNome('');setEditId(null)};
 const openForm=x=>{setEditId(x?.id||null);setNome(x?.tipo_folha||'');setOpen(true)};

 const save=async e=>{
  e.preventDefault();
  if(!nome.trim())return toast({title:'Campo obrigatório',description:'Informe o tipo de folha.',variant:'destructive'});
  const payload={tipo_folha:nome.trim(),user_id:user.id};
  const q=editId
   ?await supabase.from('lm_tipos_folha').update(payload).eq('id',editId).eq('user_id',user.id)
   :await supabase.from('lm_tipos_folha').insert(payload);
  if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  toast({title:'Sucesso',description:editId?'Tipo atualizado.':'Tipo cadastrado.'});
  setOpen(false);reset();load();
 };

 const remove=async id=>{
  const{error}=await supabase.from('lm_tipos_folha').delete().eq('id',id).eq('user_id',user.id);
  if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});
  else{toast({title:'Tipo excluído'});load()}
 };

 const list=data.filter(x=>!search.trim()||String(x.tipo_folha||'').toLowerCase().includes(search.toLowerCase()));

 return <div className="dark-lm-impressoes space-y-4">

  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-3">
    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.2)] bg-[hsl(var(--neon-lanhouse)/.08)]"><FileStack className="h-5 w-5" style={{color:C}}/></div>
    <div><p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Cadastros</p><h1 className="text-2xl font-bold tracking-tight">Tipos de Folha</h1><p className="text-sm text-muted-foreground">Cadastre e organize os tipos de folhas.</p></div>
   </div>
   <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button><Button onClick={()=>openForm()} className="text-slate-950" style={{background:C}}><Plus className="mr-2 h-4 w-4"/>Novo Tipo</Button></div>
  </div>

  <Card><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar tipo de folha..." className="bg-input pl-9"/></div><span className="text-sm text-muted-foreground">{list.length} tipo(s)</span></CardContent></Card>

  <div className="grid gap-4 md:grid-cols-2">
   <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tipos cadastrados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={{color:C}}>{data.length}</p></CardContent></Card>
   <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Resultado atual</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{list.length}</p></CardContent></Card>
  </div>

  <ModalLancamentoPadrao open={open} onClose={()=>{setOpen(false);reset()}} title={editId?'Editar Tipo de Folha':'Novo Tipo de Folha'} description="Informe o nome do tipo de folha." icon={FileStack} theme="cyan" footer={<><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button type="submit" form="f-folha" className="text-slate-950" style={{background:C}}>{editId?'Salvar Alterações':'Salvar Tipo'}</Button></>}>
   <form id="f-folha" onSubmit={save} className="space-y-5"><div className="space-y-2"><Label>Nome do Tipo de Folha</Label><Input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: A4 75g" className="h-11 rounded-xl bg-input" required/></div></form>
  </ModalLancamentoPadrao>

  <Card><CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:C}}>Tipos de folha cadastrados</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-muted/30"><th className="p-4 text-left text-sm text-muted-foreground">Tipo de Folha</th><th className="p-4 text-right text-sm text-muted-foreground">Ações</th></tr></thead><tbody>{loading?<tr><td colSpan={2} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:!list.length?<tr><td colSpan={2} className="p-10 text-center text-muted-foreground"><FileStack className="mx-auto mb-2 h-10 w-10 opacity-40"/>{data.length?'Nenhum resultado.':'Nenhum tipo cadastrado.'}</td></tr>:list.map(x=><tr key={x.id} className="border-b last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]"><td className="p-4 font-medium">{x.tipo_folha}</td><td className="p-4 text-right"><Button variant="ghost" size="icon" onClick={()=>openForm(x)} style={{color:C}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent className="dark-lm-impressoes"><AlertDialogHeader><AlertDialogTitle>Excluir tipo de folha?</AlertDialogTitle><AlertDialogDescription>Deseja excluir <strong>{x.tipo_folha}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>)}</tbody></table></div></CardContent></Card>
 </div>
}
