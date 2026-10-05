import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,Settings,RefreshCw,Search}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Switch}from'@/components/ui/switch';
import{Badge}from'@/components/ui/badge';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const CYAN='hsl(var(--neon-lanhouse))';

export default function CadastroServicos(){
 const{user}=useAuth(),{toast}=useToast();
 const[servicos,setServicos]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState(''),[open,setOpen]=useState(false),[editingId,setEditingId]=useState(null),[form,setForm]=useState({servico:'',valor:'',usa_folha:false});

 const load=useCallback(async()=>{if(!user)return;setLoading(true);try{const{data,error}=await supabase.from('lm_servicos').select('*').eq('user_id',user.id).order('servico');if(error)throw error;setServicos((data||[]).map(x=>({...x,usa_folha:x.usa_folha??false})))}catch(e){toast({title:'Erro ao buscar serviços',description:e.message,variant:'destructive'})}finally{setLoading(false)}},[user,toast]);
 useEffect(()=>load(),[load]);
 useEffect(()=>{if(!user)return;const c=supabase.channel('lm_servicos_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_servicos',filter:`user_id=eq.${user.id}`},load).subscribe();return()=>supabase.removeChannel(c)},[user,load]);

 const reset=()=>{setForm({servico:'',valor:'',usa_folha:false});setEditingId(null)};
 const abrir=x=>{setEditingId(x?.id||null);setForm({servico:x?.servico||'',valor:x?.valor??'',usa_folha:x?.usa_folha??false});setOpen(true)};
 const salvar=async e=>{e.preventDefault();if(!form.servico.trim())return toast({title:'Campo obrigatório',description:'Informe o serviço.',variant:'destructive'});const d={servico:form.servico.trim(),valor:form.valor||0,usa_folha:form.usa_folha,user_id:user.id};const q=editingId?await supabase.from('lm_servicos').update(d).eq('id',editingId).eq('user_id',user.id):await supabase.from('lm_servicos').insert(d);if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});toast({title:'Sucesso',description:editingId?'Serviço atualizado.':'Serviço cadastrado.'});setOpen(false);reset();load()};
 const excluir=async id=>{const{error}=await supabase.from('lm_servicos').delete().eq('id',id).eq('user_id',user.id);if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});else{toast({title:'Serviço excluído'});load()}};
 const lista=servicos.filter(x=>!search.trim()||`${x.servico||''}`.toLowerCase().includes(search.toLowerCase()));
 const comFolha=servicos.filter(x=>x.usa_folha).length;
 const soma=servicos.reduce((t,x)=>t+Number(x.valor||0),0),media=servicos.length?soma/servicos.length:0;

 return <div className="dark-lm-impressoes space-y-4">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]"><Settings className="h-5 w-5" style={{color:CYAN}}/></div><div><p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>Cadastros</p><h1 className="text-2xl font-bold tracking-tight">Serviços</h1><p className="text-sm text-muted-foreground">Cadastre e organize os serviços oferecidos.</p></div></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button><Button onClick={()=>abrir()} className="text-slate-950" style={{background:CYAN}}><Plus className="mr-2 h-4 w-4"/>Novo Serviço</Button></div></div>

  <Card className="border-border bg-card/80"><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar serviço..." className="bg-input pl-9"/></div><span className="text-sm text-muted-foreground">{lista.length} serviço(s)</span></CardContent></Card>

  <div className="grid gap-4 md:grid-cols-3">{[['Serviços cadastrados',servicos.length],['Usam folha',comFolha],['Valor médio',`R$ ${media.toFixed(2)}`]].map(([l,v],i)=><Card key={l} className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{l}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={{color:i===0?CYAN:undefined}}>{v}</p></CardContent></Card>)}</div>

  <ModalLancamentoPadrao open={open} onClose={()=>{setOpen(false);reset()}} title={editingId?'Editar Serviço':'Novo Serviço'} description="Cadastre o serviço, valor e consumo de folha." icon={Settings} theme="cyan" footer={<><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button type="submit" form="form-servico" className="text-slate-950" style={{background:CYAN}}>{editingId?'Salvar Alterações':'Salvar Serviço'}</Button></>}>
   <form id="form-servico" onSubmit={salvar} className="space-y-5">
    <div className="space-y-2"><Label>Nome do Serviço</Label><Input value={form.servico} onChange={e=>setForm({...form,servico:e.target.value})} placeholder="Ex: Impressão colorida" required/></div>
    <div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} placeholder="0,00"/></div>
    <div className="flex items-center gap-3 rounded-xl border border-border p-4"><Switch checked={form.usa_folha} onCheckedChange={v=>setForm({...form,usa_folha:v})}/><div><Label>Usa Folha?</Label><p className="text-xs text-muted-foreground">{form.usa_folha?'Sim, consome folhas':'Não consome folhas'}</p></div></div>
   </form>
  </ModalLancamentoPadrao>

  <Card className="border-border bg-card"><CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:CYAN}}>Serviços cadastrados</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-border bg-muted/30"><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Serviço</th><th className="p-4 text-left text-sm font-semibold text-muted-foreground">Valor</th><th className="p-4 text-center text-sm font-semibold text-muted-foreground">Usa Folha?</th><th className="p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th></tr></thead><tbody>{loading?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:!lista.length?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground"><Settings className="mx-auto mb-2 h-10 w-10 opacity-50"/>{servicos.length?'Nenhum resultado.':'Nenhum serviço cadastrado.'}</td></tr>:lista.map(x=><tr key={x.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]"><td className="p-4 font-medium">{x.servico}</td><td className="p-4 font-semibold" style={{color:CYAN}}>R$ {Number(x.valor||0).toFixed(2)}</td><td className="p-4 text-center">{x.usa_folha?<Badge variant="outline" className="border-[hsl(var(--neon-lanhouse)/.30)] text-[hsl(var(--neon-lanhouse))]">Sim</Badge>:<Badge variant="outline">Não</Badge>}</td><td className="p-4 text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={()=>abrir(x)} style={{color:CYAN}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent className="dark-lm-impressoes"><AlertDialogHeader><AlertDialogTitle>Excluir serviço?</AlertDialogTitle><AlertDialogDescription>Deseja excluir <strong>{x.servico}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>excluir(x.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></td></tr>)}</tbody></table></div></CardContent></Card>
 </div>
}
