import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,Settings}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Switch}from'@/components/ui/switch';
import{Badge}from'@/components/ui/badge';
import{Card}from'@/components/ui/card';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogTrigger}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/hooks/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='hsl(var(--neon-lanhouse))';

export default function CadastroServicos(){
 const{toast}=useToast(),{user}=useAuth();
 const[servicos,setServicos]=useState([]),[loading,setLoading]=useState(true),[open,setOpen]=useState(false),[current,setCurrent]=useState(null),[form,setForm]=useState({servico:'',valor:'',usa_folha:false});

 const load=useCallback(async()=>{if(!user)return;setLoading(true);try{const{data,error}=await supabase.from('lm_servicos').select('*').eq('user_id',user.id).order('servico');if(error){if(error.message?.includes('column')&&error.message?.includes('usa_folha'))toast({title:'Aviso',description:'O campo "Usa Folha" ainda não está disponível.',variant:'destructive'});else throw error}setServicos((data||[]).map(x=>({...x,usa_folha:x.usa_folha??false})))}catch(e){toast({title:'Erro ao buscar serviços',description:e.message,variant:'destructive'})}finally{setLoading(false)}},[user,toast]);

 useEffect(()=>load(),[load]);
 useEffect(()=>{if(!user)return;const c=supabase.channel('lm_servicos_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_servicos',filter:`user_id=eq.${user.id}`},load).subscribe();return()=>supabase.removeChannel(c)},[user,load]);

 const reset=()=>{setForm({servico:'',valor:'',usa_folha:false});setCurrent(null)};
 const abrir=x=>{setCurrent(x);setForm(x?{servico:x.servico||'',valor:x.valor||'',usa_folha:x.usa_folha??false}:{servico:'',valor:'',usa_folha:false});setOpen(true)};
 const salvar=async()=>{if(!form.servico.trim())return toast({title:'Erro',description:'O nome do serviço é obrigatório.',variant:'destructive'});const d={servico:form.servico.trim(),valor:form.valor||0,usa_folha:form.usa_folha,user_id:user.id};try{const q=current?await supabase.from('lm_servicos').update(d).eq('id',current.id):await supabase.from('lm_servicos').insert(d);if(q.error)throw q.error;toast({title:'Sucesso',description:current?'Serviço atualizado.':'Novo serviço cadastrado.'});setOpen(false);reset();load()}catch(e){toast({title:'Erro ao salvar serviço',description:e.message,variant:'destructive'})}};
 const excluir=async id=>{const{error}=await supabase.from('lm_servicos').delete().eq('id',id);if(error)toast({title:'Erro ao remover',description:error.message,variant:'destructive'});else{toast({title:'Serviço removido'});load()}};

 return <div className="space-y-5">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 md:flex-row md:items-center md:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.25em]" style={{color:CYAN}}>Cadastros • LM Impressões</p><h2 className="text-2xl font-bold md:text-3xl">Serviços</h2><p className="text-sm text-muted-foreground">Gerencie os serviços oferecidos.</p></div><Dialog open={open} onOpenChange={v=>{setOpen(v);if(!v)reset()}}><DialogTrigger asChild><Button onClick={()=>abrir()} style={{background:CYAN,color:'#071018'}}><Plus className="mr-2 h-4 w-4"/>Novo Serviço</Button></DialogTrigger><DialogContent className="dark-lm-impressoes max-w-lg"><DialogHeader><DialogTitle style={{color:CYAN}}>{current?'Editar Serviço':'Adicionar Serviço'}</DialogTitle><DialogDescription>Preencha as informações do serviço.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div><Label>Nome *</Label><Input value={form.servico} onChange={e=>setForm({...form,servico:e.target.value})} className="mt-1"/></div><div><Label>Valor</Label><Input type="number" step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className="mt-1"/></div><div className="flex items-center gap-3 rounded-xl border border-border p-3"><Switch checked={form.usa_folha} onCheckedChange={v=>setForm({...form,usa_folha:v})}/><div><Label>Usa Folha?</Label><p className="text-xs text-muted-foreground">{form.usa_folha?'Sim, consome folhas':'Não consome folhas'}</p></div></div></div><DialogFooter><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button onClick={salvar} style={{background:CYAN,color:'#071018'}}>Salvar</Button></DialogFooter></DialogContent></Dialog></div>

  <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted/20"><th className="p-4 text-left">Serviço</th><th className="p-4 text-left">Valor</th><th className="p-4 text-center">Usa Folha?</th><th className="p-4 text-right">Ações</th></tr></thead><tbody>{loading?<tr><td colSpan="4" className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:!servicos.length?<tr><td colSpan="4" className="p-12 text-center text-muted-foreground"><Settings className="mx-auto mb-2 h-10 w-10"/>Nenhum serviço cadastrado.</td></tr>:servicos.map(s=><tr key={s.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.05)]"><td className="p-4 font-medium">{s.servico}</td><td className="p-4 font-semibold" style={{color:CYAN}}>R$ {Number(s.valor||0).toFixed(2)}</td><td className="p-4 text-center">{s.usa_folha?<Badge className="bg-[hsl(var(--neon-lanhouse)/.12)] text-[hsl(var(--neon-lanhouse))]">Sim</Badge>:<Badge variant="outline">Não</Badge>}</td><td className="p-4"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={()=>abrir(s)} style={{color:CYAN}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent className="dark-lm-impressoes"><AlertDialogHeader><AlertDialogTitle>Excluir serviço?</AlertDialogTitle><AlertDialogDescription>Deseja excluir <strong>{s.servico}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>excluir(s.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></td></tr>)}</tbody></table></div></Card>
 </div>
}
