
import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash2,Users,RefreshCw,Search,Phone,User}from'lucide-react';
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
const phone=v=>{const n=String(v||'').replace(/\D/g,'');return n.length<=2?`(${n}`:n.length<=7?`(${n.slice(0,2)}) ${n.slice(2)}`:`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7,11)}`};

export default function CadastroClientes(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState('');
 const[open,setOpen]=useState(false),[editId,setEditId]=useState(null),[form,setForm]=useState({nome:'',telefone:'',apelido:''}),[checking,setChecking]=useState(false),[nameError,setNameError]=useState('');

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  const{data,error}=await supabase.from('lm_clientes').select('*').eq('user_id',user.id).order('nome');
  if(error)toast({title:'Erro ao carregar clientes',description:error.message,variant:'destructive'});
  else setData(data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('lm_clientes_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes',filter:`user_id=eq.${user.id}`},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 useEffect(()=>{
  let live=true;
  const t=setTimeout(async()=>{
   const n=form.nome.trim();
   if(!n||!user){setNameError('');setChecking(false);return}
   if(editId&&data.find(x=>x.id===editId)?.nome?.toLowerCase()===n.toLowerCase()){setNameError('');setChecking(false);return}
   setChecking(true);
   const{data:r}=await supabase.from('lm_clientes').select('id,nome').eq('user_id',user.id).ilike('nome',n);
   if(live)setNameError(r?.some(x=>x.id!==editId&&String(x.nome).toLowerCase()===n.toLowerCase())?'Cliente com este nome já existe':'');
   if(live)setChecking(false);
  },400);
  return()=>{live=false;clearTimeout(t)};
 },[form.nome,editId,user,data]);

 const reset=()=>{setForm({nome:'',telefone:'',apelido:''});setEditId(null);setNameError('');setChecking(false)};
 const closeForm=()=>{setOpen(false);reset()};
 const openForm=x=>{
  setEditId(x?.id||null);
  setForm({nome:x?.nome||'',telefone:x?.telefone||'',apelido:x?.apelido||''});
  setNameError('');
  setOpen(true);
 };

 const save=async e=>{
  e.preventDefault();
  if(!form.nome.trim()||nameError||checking)return;
  const d={nome:form.nome.trim(),telefone:form.telefone.trim(),apelido:form.apelido.trim(),user_id:user.id};
  const q=editId
   ?await supabase.from('lm_clientes').update(d).eq('id',editId).eq('user_id',user.id)
   :await supabase.from('lm_clientes').insert(d);
  if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  toast({title:'Sucesso',description:editId?'Cliente atualizado.':'Cliente cadastrado.'});
  closeForm();
  await load();
 };

 const remove=async id=>{
  const{error}=await supabase.from('lm_clientes').delete().eq('id',id).eq('user_id',user.id);
  if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});
  else{toast({title:'Cliente excluído'});await load()}
 };

 const list=data.filter(x=>!search.trim()||`${x.nome||''} ${x.telefone||''} ${x.apelido||''}`.toLowerCase().includes(search.trim().toLowerCase()));
 const phones=data.filter(x=>x.telefone?.trim()).length;
 const nicks=data.filter(x=>x.apelido?.trim()).length;
 const stats=[{label:'Clientes cadastrados',value:data.length,icon:Users},{label:'Com telefone',value:phones,icon:Phone},{label:'Com apelido',value:nicks,icon:User}];

 return <div className="dark-lm-impressoes space-y-4">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]">
     <Users className="h-5 w-5" style={{color:C}}/>
    </div>
    <div>
     <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Cadastros</p>
     <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
     <p className="text-sm text-muted-foreground">Cadastre e organize a base de clientes.</p>
    </div>
   </div>
   <div className="flex flex-wrap gap-2">
    <Button type="button" variant="outline" onClick={load} disabled={loading}>
     <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar
    </Button>
    <Button type="button" onClick={()=>openForm()} className="text-slate-950 hover:opacity-90" style={{background:C}}>
     <Plus className="mr-2 h-4 w-4"/>Novo Cliente
    </Button>
   </div>
  </div>

  <Card className="border-border bg-card">
   <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="relative w-full max-w-md">
     <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
     <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por nome, telefone ou apelido..." className="h-11 rounded-xl bg-input pl-9"/>
    </div>
    <span className="text-sm text-muted-foreground">{list.length} cliente(s)</span>
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

  <ModalLancamentoPadrao open={open} onClose={closeForm} title={editId?'Editar Cliente':'Novo Cliente'} description="Preencha os dados do cliente." icon={Users} theme="cyan" footer={<>
   <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
   <Button type="submit" form="f-cliente" disabled={checking||!!nameError||!form.nome.trim()} className="text-slate-950 hover:opacity-90" style={{background:C}}>
    {checking?<><RefreshCw className="mr-2 h-4 w-4 animate-spin"/>Verificando...</>:editId?'Salvar Alterações':'Salvar Cliente'}
   </Button>
  </>}>
   <form id="f-cliente" onSubmit={save} className="space-y-5">
    <div className="space-y-2">
     <Label htmlFor="cliente-nome">Nome</Label>
     <div className="relative">
      <Input id="cliente-nome" value={form.nome} onChange={e=>setForm(p=>({...p,nome:e.target.value}))} placeholder="Nome completo do cliente" className="h-11 rounded-xl bg-input pr-10" required/>
      {checking&&<RefreshCw className="absolute right-3 top-3 h-4 w-4 animate-spin" style={{color:C}}/>}
     </div>
     {nameError&&<p className="text-xs text-red-400">{nameError}</p>}
    </div>
    <div className="space-y-2">
     <Label htmlFor="cliente-telefone">Telefone</Label>
     <Input id="cliente-telefone" value={form.telefone} onChange={e=>setForm(p=>({...p,telefone:phone(e.target.value)}))} placeholder="(83) 99999-9999" className="h-11 rounded-xl bg-input"/>
    </div>
    <div className="space-y-2">
     <Label htmlFor="cliente-apelido">Apelido</Label>
     <Input id="cliente-apelido" value={form.apelido} onChange={e=>setForm(p=>({...p,apelido:e.target.value}))} placeholder="Apelido (opcional)" className="h-11 rounded-xl bg-input"/>
    </div>
   </form>
  </ModalLancamentoPadrao>

  <Card className="overflow-hidden border-border bg-card">
   <CardHeader className="border-b border-border pb-3">
    <CardTitle className="text-lg" style={{color:C}}>Clientes cadastrados</CardTitle>
    <p className="text-sm text-muted-foreground">Consulte, pesquise e gerencie os clientes.</p>
   </CardHeader>
   <CardContent className="p-0">
    <div className="overflow-x-auto">
     <table className="w-full min-w-[620px]">
      <thead><tr className="border-b bg-muted/30">
       <th className="p-4 text-left text-sm font-medium text-muted-foreground">Nome</th>
       <th className="p-4 text-left text-sm font-medium text-muted-foreground">Telefone</th>
       <th className="p-4 text-left text-sm font-medium text-muted-foreground">Apelido</th>
       <th className="p-4 text-right text-sm font-medium text-muted-foreground">Ações</th>
      </tr></thead>
      <tbody>
       {loading?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Carregando clientes...</td></tr>:
        !list.length?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-10 w-10 opacity-40"/>{data.length?'Nenhum resultado encontrado.':'Nenhum cliente cadastrado.'}</td></tr>:
        list.map(x=><tr key={x.id} className="border-b last:border-0 transition-colors hover:bg-[hsl(var(--neon-lanhouse)/.04)]">
         <td className="p-4 font-medium">{x.nome}</td>
         <td className="p-4">{x.telefone||'—'}</td>
         <td className="p-4">{x.apelido||'—'}</td>
         <td className="p-4 text-right">
          <Button type="button" variant="ghost" size="icon" title="Editar cliente" aria-label={`Editar ${x.nome}`} onClick={()=>openForm(x)} style={{color:C}}>
           <Edit className="h-4 w-4"/>
          </Button>
          <AlertDialog>
           <AlertDialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon" title="Excluir cliente" aria-label={`Excluir ${x.nome}`} className="text-red-400 hover:bg-red-500/10 hover:text-red-400">
             <Trash2 className="h-4 w-4"/>
            </Button>
           </AlertDialogTrigger>
           <AlertDialogContent className="dark-lm-impressoes border-border bg-card">
            <AlertDialogHeader>
             <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
             <AlertDialogDescription>Deseja excluir <strong>{x.nome}</strong>? Essa ação não poderá ser desfeita.</AlertDialogDescription>
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

