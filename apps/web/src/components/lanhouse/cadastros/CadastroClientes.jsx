import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash,Users,Loader2,Search}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter,DialogTrigger}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='hsl(var(--neon-lanhouse))';
const phone=v=>{const n=(v||'').replace(/\D/g,'');if(n.length<3)return`(${n}`;if(n.length<8)return`(${n.slice(0,2)}) ${n.slice(2)}`;return`(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7,11)}`};

export default function CadastroClientes(){
 const{toast}=useToast(),{user}=useAuth();
 const[clientes,setClientes]=useState([]),[loading,setLoading]=useState(true),[open,setOpen]=useState(false),[current,setCurrent]=useState(null),[busca,setBusca]=useState('');
 const[form,setForm]=useState({nome:'',telefone:'',apelido:''}),[checking,setChecking]=useState(false),[nameError,setNameError]=useState('');

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  const{data,error}=await supabase.from('lm_clientes').select('*').eq('user_id',user.id).order('nome');
  if(error)toast({title:'Erro ao buscar clientes',description:error.message,variant:'destructive'});
  else setClientes(data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>load(),[load]);

 useEffect(()=>{
  if(!user)return;
  const c=supabase.channel('lm_clientes_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes',filter:`user_id=eq.${user.id}`},load).subscribe();
  return()=>supabase.removeChannel(c);
 },[user,load]);

 useEffect(()=>{
  let live=true;
  const t=setTimeout(async()=>{
   const n=form.nome.trim();
   if(!n||!user){setNameError('');setChecking(false);return}
   if(current&&n.toLowerCase()===current.nome.toLowerCase()){setNameError('');setChecking(false);return}
   setChecking(true);
   const{data}=await supabase.from('lm_clientes').select('id,nome').eq('user_id',user.id).ilike('nome',n);
   if(live)setNameError(data?.some(x=>x.id!==current?.id&&x.nome.toLowerCase()===n.toLowerCase())?'Cliente com este nome já existe':'');
   if(live)setChecking(false);
  },400);
  return()=>{live=false;clearTimeout(t)};
 },[form.nome,current,user]);

 const reset=()=>{setForm({nome:'',telefone:'',apelido:''});setCurrent(null);setNameError('');setChecking(false)};

 const abrir=c=>{
  setCurrent(c);
  setForm(c?{
   nome:c.nome||'',
   telefone:c.telefone||'',
   apelido:c.apelido||''
  }:{
   nome:'',
   telefone:'',
   apelido:''
  });
  setOpen(true);
 };

 const salvar=async()=>{
  if(!form.nome.trim())return toast({title:'Erro',description:'O nome do cliente é obrigatório.',variant:'destructive'});
  if(nameError)return;
  const d={...form,user_id:user.id};
  const q=current?await supabase.from('lm_clientes').update(d).eq('id',current.id):await supabase.from('lm_clientes').insert(d);
  if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  toast({title:'Sucesso',description:current?'Cliente atualizado.':'Novo cliente cadastrado.'});
  setOpen(false);reset();load();
 };

 const excluir=async id=>{
  const{error}=await supabase.from('lm_clientes').delete().eq('id',id);
  if(error)toast({title:'Erro ao remover',description:error.message,variant:'destructive'});
  else{toast({title:'Cliente removido'});load()}
 };

 const lista=clientes.filter(c=>{
  const s=busca.toLowerCase().trim();
  return!s||c.nome?.toLowerCase().includes(s)||c.apelido?.toLowerCase().includes(s)||c.telefone?.includes(s);
 });

 return <div className="space-y-5">

  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 md:flex-row md:items-center md:justify-between">
   <div>
    <p className="text-[10px] font-semibold uppercase tracking-[.25em]" style={{color:CYAN}}>Cadastros • LM Impressões</p>
    <h2 className="text-2xl font-bold md:text-3xl">Clientes</h2>
    <p className="text-sm text-muted-foreground">Gerencie sua base de clientes.</p>
   </div>

   <Dialog open={open} onOpenChange={v=>{setOpen(v);if(!v)reset()}}>
    <DialogTrigger asChild>
     <Button onClick={()=>abrir()} style={{background:CYAN,color:'#071018'}}>
      <Plus className="mr-2 h-4 w-4"/>Novo Cliente
     </Button>
    </DialogTrigger>

    <DialogContent className="dark-lm-impressoes max-w-lg border-[hsl(var(--neon-lanhouse)/.30)]">
     <DialogHeader>
      <DialogTitle style={{color:CYAN}}>{current?'Editar Cliente':'Adicionar Cliente'}</DialogTitle>
      <DialogDescription>Preencha as informações do cliente.</DialogDescription>
     </DialogHeader>

     <div className="space-y-4 py-4">
      <div>
       <Label>Nome *</Label>
       <div className="relative mt-1">
        <Input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} placeholder="Nome do cliente"/>
        {checking&&<Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" style={{color:CYAN}}/>}
       </div>
       {nameError&&<p className="mt-1 text-xs text-red-400">{nameError}</p>}
      </div>

      <div>
       <Label>Telefone</Label>
       <Input value={form.telefone} onChange={e=>setForm({...form,telefone:phone(e.target.value)})} className="mt-1" placeholder="(83) 99999-9999"/>
      </div>

      <div>
       <Label>Apelido</Label>
       <Input value={form.apelido} onChange={e=>setForm({...form,apelido:e.target.value})} className="mt-1"/>
      </div>
     </div>

     <DialogFooter>
      <Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button>
      <Button onClick={salvar} disabled={checking||!!nameError||!form.nome.trim()} style={{background:CYAN,color:'#071018'}}>Salvar</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>
  </div>

  <Card>
   <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
    <div className="relative w-full max-w-md">
     <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
     <Input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar cliente..." className="pl-9"/>
    </div>
    <span className="text-sm text-muted-foreground">{lista.length} cliente(s)</span>
   </CardContent>
  </Card>

  <Card className="overflow-hidden">
   <div className="overflow-x-auto">
    <table className="w-full text-sm">
     <thead>
      <tr className="border-b border-border bg-muted/20">
       <th className="p-4 text-left">Nome</th>
       <th className="p-4 text-left">Telefone</th>
       <th className="p-4 text-left">Apelido</th>
       <th className="p-4 text-right">Ações</th>
      </tr>
     </thead>

     <tbody>
      {loading?
       <tr><td colSpan="4" className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:
       !lista.length?
       <tr><td colSpan="4" className="p-12 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-10 w-10"/>{clientes.length?'Nenhum cliente encontrado.':'Nenhum cliente cadastrado.'}</td></tr>:
       lista.map(c=>
        <tr key={c.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.05)]">
         <td className="p-4 font-medium">{c.nome}</td>
         <td className="p-4">{c.telefone||'-'}</td>
         <td className="p-4">{c.apelido||'-'}</td>
         <td className="p-4">
          <div className="flex justify-end gap-1">
           <Button variant="ghost" size="icon" onClick={()=>abrir(c)} style={{color:CYAN}}><Edit className="h-4 w-4"/></Button>

           <AlertDialog>
            <AlertDialogTrigger asChild>
             <Button variant="ghost" size="icon" className="text-red-400"><Trash className="h-4 w-4"/></Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="dark-lm-impressoes">
             <AlertDialogHeader>
              <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
              <AlertDialogDescription>Deseja excluir <strong>{c.nome}</strong>?</AlertDialogDescription>
             </AlertDialogHeader>

             <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={()=>excluir(c.id)} className="bg-red-600">Excluir</AlertDialogAction>
             </AlertDialogFooter>
            </AlertDialogContent>
           </AlertDialog>
          </div>
         </td>
        </tr>
       )
      }
     </tbody>
    </table>
   </div>
  </Card>

 </div>;
}
