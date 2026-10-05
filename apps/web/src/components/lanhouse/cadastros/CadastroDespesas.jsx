import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,DollarSign,RefreshCw,Search}from'lucide-react';
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

export default function CadastroDespesas(){
 const{user}=useAuth(),{toast}=useToast();
 const[despesas,setDespesas]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState(''),[open,setOpen]=useState(false),[editingId,setEditingId]=useState(null),[nome,setNome]=useState('');

 const load=useCallback(async()=>{if(!user)return;setLoading(true);const{data,error}=await supabase.from('lm_despesas').select('*').eq('user_id',user.id).order('despesa');if(error)toast({title:'Erro ao buscar tipos de despesa',description:error.message,variant:'destructive'});else setDespesas(data||[]);setLoading(false)},[user,toast]);
 useEffect(()=>load(),[load]);
 useEffect(()=>{if(!user)return;const c=supabase.channel('lm_despesas_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_despesas',filter:`user_id=eq.${user.id}`},load).subscribe();return()=>supabase.removeChannel(c)},[user,load]);

 const reset=()=>{setNome('');setEditingId(null)};
 const abrir=x=>{setEditingId(x?.id||null);setNome(x?.despesa||'');setOpen(true)};
 const salvar=async e=>{e.preventDefault();if(!nome.trim())return toast({title:'Campo obrigatório',description:'Informe o tipo de despesa.',variant:'destructive'});const d={despesa:nome.trim(),user_id:user.id};const q=editingId?await supabase.from('lm_despesas').update(d).eq('id',editingId).eq('user_id',user.id):await supabase.from('lm_despesas').insert(d);if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});toast({title:'Sucesso',description:editingId?'Tipo atualizado.':'Tipo cadastrado.'});setOpen(false);reset();load()};
 const excluir=async id=>{const{error}=await supabase.from('lm_despesas').delete().eq('id',id).eq('user_id',user.id);if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});else{toast({title:'Tipo excluído'});load()}};
 const lista=despesas.filter(x=>!search.trim()||String(x.despesa||'').toLowerCase().includes(search.toLowerCase()));

 return <div className="dark-lm-impressoes space-y-4">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]"><DollarSign className="h-5 w-5" style={{color:CYAN}}/></div><div><p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>Cadastros</p><h1 className="text-2xl font-bold tracking-tight">Tipos de Despesa</h1><p className="text-sm text-muted-foreground">Cadastre e organize os tipos de despesas.</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button><Button onClick={()=>abrir()} className="text-slate-950" style={{background:CYAN}}><Plus className="mr-2 h-4 w-4"/>Nova Despesa</Button></div></div>

  <Card className="border-border bg-card/80"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar despesa..." className="bg-input pl-9"/></div><span className="text-sm text-muted-foreground">{lista.length} tipo(s)</span></CardContent></Card>

  <div className="grid gap-4 md:grid-cols-2"><Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tipos cadastrados</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={{color:CYAN}}>{despesas.length}</p></CardContent></Card><Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Resultado atual</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{lista.length}</p></CardContent></Card></div>

  <ModalLancamentoPadrao open={open} onClose={()=>{setOpen(false);reset()}} title={editingId?'Editar Tipo de Despesa':'Novo Tipo de Despesa'} description="Informe o nome do tipo de despesa." icon={DollarSign} theme="cyan" footer={<><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button type="submit" form="form-despesa" className="text-slate-950" style={{background:CYAN}}>{editingId?'Salvar Alterações':'Salvar Tipo'}</Button></>}>
   <form id="form-despesa" onSubmit={salvar} className="space-y-5"><div className="space-y-2"><Label>Nome da Despesa</Label><Input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Internet" className="h-11 rounded-xl bg-input" required/></div></form>
  </ModalLancamentoPadrao>

  <Card className="border-border bg-card"><CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:CYAN}}>Tipos cadastrados</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-border bg-muted/30"><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Nome da Despesa</th><th className="p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th></tr></thead><tbody>{loading?<tr><td colSpan={2} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:!lista.length?<tr><td colSpan={2} className="p-10 text-center text-muted-foreground"><DollarSign className="mx-auto mb-2 h-10 w-10 opacity-50"/>{despesas.length?'Nenhum resultado.':'Nenhum tipo cadastrado.'}</td></tr>:lista.map(x=><tr key={x.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]"><td className="p-4 font-medium">{x.despesa}</td><td className="p-4 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={()=>abrir(x)} style={{color:CYAN}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent className="dark-lm-impressoes"><AlertDialogHeader><AlertDialogTitle>Excluir tipo de despesa?</AlertDialogTitle><AlertDialogDescription>Deseja excluir <strong>{x.despesa}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>excluir(x.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></td></tr>)}</tbody></table></div></CardContent></Card>
 </div>
}
