import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash2,Settings,RefreshCw,Search}from'lucide-react';
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

const C='hsl(var(--neon-lanhouse))';
const fmt=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));

export default function CadastroServicos(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState('');
 const[open,setOpen]=useState(false),[editId,setEditId]=useState(null),[form,setForm]=useState({servico:'',valor:'',usa_folha:false});

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const{data,error}=await supabase.from('lm_servicos').select('*').eq('user_id',user.id).order('servico');
   if(error)throw error;
   setData((data||[]).map(x=>({...x,usa_folha:x.usa_folha??false})));
  }catch(e){
   toast({title:'Erro ao carregar serviços',description:e.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('lm_servicos_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_servicos',filter:`user_id=eq.${user.id}`},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const reset=()=>{setForm({servico:'',valor:'',usa_folha:false});setEditId(null)};
 const closeForm=()=>{setOpen(false);reset()};
 const openForm=x=>{
  setEditId(x?.id||null);
  setForm({servico:x?.servico||'',valor:x?.valor??'',usa_folha:x?.usa_folha??false});
  setOpen(true);
 };

 const save=async e=>{
  e.preventDefault();
  if(!form.servico.trim())return toast({title:'Campo obrigatório',description:'Informe o serviço.',variant:'destructive'});
  const payload={servico:form.servico.trim(),valor:Number(form.valor||0),usa_folha:!!form.usa_folha,user_id:user.id};
  const q=editId
   ?await supabase.from('lm_servicos').update(payload).eq('id',editId).eq('user_id',user.id)
   :await supabase.from('lm_servicos').insert(payload);
  if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  toast({title:'Sucesso',description:editId?'Serviço atualizado.':'Serviço cadastrado.'});
  closeForm();
  await load();
 };

 const remove=async id=>{
  const{error}=await supabase.from('lm_servicos').delete().eq('id',id).eq('user_id',user.id);
  if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});
  else{toast({title:'Serviço excluído'});await load()}
 };

 const list=data.filter(x=>!search.trim()||String(x.servico||'').toLowerCase().includes(search.trim().toLowerCase()));
 const folha=data.filter(x=>x.usa_folha).length;
 const media=data.length?data.reduce((a,x)=>a+Number(x.valor||0),0)/data.length:0;
 const stats=[{label:'Serviços cadastrados',value:data.length,icon:Settings},{label:'Usam folha',value:folha,icon:RefreshCw},{label:'Valor médio',value:fmt(media),icon:Badge}];

 return <div className="dark-lm-impressoes space-y-4">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]">
     <Settings className="h-5 w-5" style={{color:C}}/>
    </div>
    <div>
     <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Cadastros</p>
     <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
     <p className="text-sm text-muted-foreground">Cadastre e organize os serviços oferecidos.</p>
    </div>
   </div>
   <div className="flex flex-wrap gap-2">
    <Button type="button" variant="outline" onClick={load} disabled={loading}>
     <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar
    </Button>
    <Button type="button" onClick={()=>openForm()} className="text-slate-950 hover:opacity-90" style={{background:C}}>
     <Plus className="mr-2 h-4 w-4"/>Novo Serviço
    </Button>
   </div>
  </div>

  <Card className="border-border bg-card">
   <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="relative w-full max-w-md">
     <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
     <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar serviço..." className="h-11 rounded-xl bg-input pl-9"/>
    </div>
    <span className="text-sm text-muted-foreground">{list.length} serviço(s)</span>
   </CardContent>
  </Card>

  <div className="grid gap-4 md:grid-cols-3">
   {stats.map(({label,value,icon:Icon},i)=><Card key={label} className="border-border bg-card">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
     <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
     <Icon className="h-4 w-4" style={{color:i===0?C:undefined}}/>
    </CardHeader>
    <CardContent><p className="text-2xl font-bold" style={i===0?{color:C}:undefined}>{value}</p></CardContent>
   </Card>)}
  </div>

  <ModalLancamentoPadrao open={open} onClose={closeForm} title={editId?'Editar Serviço':'Novo Serviço'} description="Cadastre o serviço, valor e consumo de folha." icon={Settings} theme="cyan" footer={<>
   <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
   <Button type="submit" form="form-servico" disabled={!form.servico.trim()} className="text-slate-950 hover:opacity-90" style={{background:C}}>
    {editId?'Salvar Alterações':'Salvar Serviço'}
   </Button>
  </>}>
   <form id="form-servico" onSubmit={save} className="space-y-5">
    <div className="space-y-2">
     <Label htmlFor="servico-nome">Nome do Serviço</Label>
     <Input id="servico-nome" value={form.servico} onChange={e=>setForm(p=>({...p,servico:e.target.value}))} placeholder="Ex.: Impressão colorida" className="h-11 rounded-xl bg-input" required/>
    </div>
    <div className="space-y-2">
     <Label htmlFor="servico-valor">Valor (R$)</Label>
     <Input id="servico-valor" type="number" min="0" step="0.01" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))} placeholder="0,00" className="h-11 rounded-xl bg-input"/>
    </div>
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card/60 p-4">
     <Switch id="servico-folha" checked={form.usa_folha} onCheckedChange={v=>setForm(p=>({...p,usa_folha:v}))}/>
     <div className="flex-1">
      <Label htmlFor="servico-folha">Usa folha?</Label>
      <p className="text-xs text-muted-foreground">{form.usa_folha?'Sim, este serviço consome folhas.':'Não consome folhas.'}</p>
     </div>
    </div>
   </form>
  </ModalLancamentoPadrao>

  <Card className="overflow-hidden border-border bg-card">
   <CardHeader className="border-b border-border pb-3">
    <CardTitle className="text-lg" style={{color:C}}>Serviços cadastrados</CardTitle>
    <p className="text-sm text-muted-foreground">Consulte os valores e o consumo de folhas de cada serviço.</p>
   </CardHeader>
   <CardContent className="p-0">
    <div className="overflow-x-auto">
     <table className="w-full min-w-[650px]">
      <thead><tr className="border-b bg-muted/30">
       <th className="p-4 text-left text-sm font-medium text-muted-foreground">Serviço</th>
       <th className="p-4 text-left text-sm font-medium text-muted-foreground">Valor</th>
       <th className="p-4 text-center text-sm font-medium text-muted-foreground">Usa folha?</th>
       <th className="p-4 text-right text-sm font-medium text-muted-foreground">Ações</th>
      </tr></thead>
      <tbody>
       {loading?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Carregando serviços...</td></tr>:
        !list.length?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground"><Settings className="mx-auto mb-2 h-10 w-10 opacity-40"/>{data.length?'Nenhum resultado encontrado.':'Nenhum serviço cadastrado.'}</td></tr>:
        list.map(x=><tr key={x.id} className="border-b last:border-0 transition-colors hover:bg-[hsl(var(--neon-lanhouse)/.04)]">
         <td className="p-4 font-medium">{x.servico}</td>
         <td className="p-4 font-semibold" style={{color:C}}>{fmt(x.valor)}</td>
         <td className="p-4 text-center">{x.usa_folha?<Badge variant="outline" className="border-[hsl(var(--neon-lanhouse)/.30)] text-[hsl(var(--neon-lanhouse))]">Sim</Badge>:<Badge variant="outline">Não</Badge>}</td>
         <td className="p-4 text-right">
          <Button type="button" variant="ghost" size="icon" title="Editar serviço" aria-label={`Editar ${x.servico}`} onClick={()=>openForm(x)} style={{color:C}}>
           <Edit className="h-4 w-4"/>
          </Button>
          <AlertDialog>
           <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon" title="Excluir serviço" aria-label={`Excluir ${x.servico}`} className="text-red-400 hover:bg-red-500/10 hover:text-red-400">
             <Trash2 className="h-4 w-4"/>
            </Button>
           </AlertDialogTrigger>
           <AlertDialogContent className="dark-lm-impressoes border-border bg-card">
            <AlertDialogHeader>
             <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
             <AlertDialogDescription>Deseja excluir <strong>{x.servico}</strong>? Essa ação não poderá ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
             <AlertDialogCancel>Cancelar</AlertDialogCancel>
             <AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600 text-white hover:bg-red-700">Excluir</AlertDialogAction>
            </AlertDialogFooter>
           </AlertDialogContent>
          </AlertDialog>
         </td>
        </tr>)
       }
      </tbody>
     </table>
    </div>
   </CardContent>
  </Card>
 </div>;
}
