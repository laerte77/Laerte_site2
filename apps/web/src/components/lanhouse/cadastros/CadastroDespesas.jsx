import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,DollarSign}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card}from'@/components/ui/card';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogTrigger}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='hsl(var(--neon-lanhouse))';

export default function CadastroDespesas(){
 const{toast}=useToast(),{user}=useAuth();
 const[despesas,setDespesas]=useState([]),[loading,setLoading]=useState(true),[open,setOpen]=useState(false),[current,setCurrent]=useState(null),[nome,setNome]=useState('');

 const load=useCallback(async()=>{if(!user)return;setLoading(true);const{data,error}=await supabase.from('lm_despesas').select('*').eq('user_id',user.id).order('despesa');if(error)toast({title:'Erro ao buscar despesas',description:error.message,variant:'destructive'});else setDespesas(data||[]);setLoading(false)},[user,toast]);
 useEffect(()=>load(),[load]);
 useEffect(()=>{if(!user)return;const c=supabase.channel('lm_despesas_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_despesas',filter:`user_id=eq.${user.id}`},load).subscribe();return()=>supabase.removeChannel(c)},[user,load]);

 const reset=()=>{setNome('');setCurrent(null)};
 const abrir=x=>{setCurrent(x);setNome(x?.despesa||'');setOpen(true)};
 const salvar=async()=>{if(!nome.trim())return toast({title:'Erro',description:'O nome da despesa não pode estar vazio.',variant:'destructive'});const d={despesa:nome.trim(),user_id:user.id};const q=current?await supabase.from('lm_despesas').update(d).eq('id',current.id):await supabase.from('lm_despesas').insert(d);if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});toast({title:'Sucesso',description:current?'Tipo de despesa atualizado.':'Novo tipo de despesa cadastrado.'});setOpen(false);reset();load()};
 const excluir=async id=>{const{error}=await supabase.from('lm_despesas').delete().eq('id',id);if(error)toast({title:'Erro ao remover',description:error.message,variant:'destructive'});else{toast({title:'Despesa removida'});load()}};

 return <div className="space-y-5">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.25em]" style={{color:CYAN}}>Cadastros • LM Impressões</p><h2 className="text-2xl font-bold md:text-3xl">Tipos de Despesa</h2><p className="text-sm text-muted-foreground">Gerencie os tipos de despesas do negócio.</p></div><Dialog open={open} onOpenChange={v=>{setOpen(v);if(!v)reset()}}><DialogTrigger asChild><Button onClick={()=>abrir()} style={{background:CYAN,color:'#071018'}}><Plus className="mr-2 h-4 w-4"/>Nova Despesa</Button></DialogTrigger><DialogContent className="dark-lm-impressoes max-w-lg"><DialogHeader><DialogTitle style={{color:CYAN}}>{current?'Editar Tipo de Despesa':'Adicionar Tipo de Despesa'}</DialogTitle><DialogDescription>Preencha as informações abaixo.</DialogDescription></DialogHeader><div className="py-4"><Label>Nome *</Label><Input value={nome} onChange={e=>setNome(e.target.value)} className="mt-1"/></div><DialogFooter><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button onClick={salvar} style={{background:CYAN,color:'#071018'}}>Salvar</Button></DialogFooter></DialogContent></Dialog></div>

  <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/20"><th className="p-4 text-left">Nome da Despesa</th><th className="p-4 text-right">Ações</th></tr></thead><tbody>{loading?<tr><td colSpan="2" className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:!despesas.length?<tr><td colSpan="2" className="p-12 text-center text-muted-foreground"><DollarSign className="mx-auto mb-2 h-10 w-10"/>Nenhum tipo de despesa cadastrado.</td></tr>:despesas.map(d=><tr key={d.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.05)]"><td className="p-4 font-medium">{d.despesa}</td><td className="p-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={()=>abrir(d)} style={{color:CYAN}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent className="dark-lm-impressoes"><AlertDialogHeader><AlertDialogTitle>Excluir tipo de despesa?</AlertDialogTitle><AlertDialogDescription>Deseja excluir <strong>{d.despesa}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>excluir(d.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></td></tr>)}</tbody></table></div></Card>
 </div>
}
