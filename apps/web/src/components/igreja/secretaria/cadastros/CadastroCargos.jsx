import React,{useCallback,useEffect,useState}from'react';
import{Plus,Edit,Trash2,Briefcase}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

export default function CadastroCargos(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true);
 const[open,setOpen]=useState(false),[current,setCurrent]=useState(null),[nome,setNome]=useState('');

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  const{data,error}=await supabase.from('cargos_igreja').select('*').order('nome_cargo');
  if(error)toast({title:'Erro',description:error.message,variant:'destructive'});
  else setData(data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('cargos_igreja').on('postgres_changes',{event:'*',schema:'public',table:'cargos_igreja'},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const close=()=>{setOpen(false);setCurrent(null);setNome('')};

 const save=async()=>{
  if(!nome.trim()){
   toast({title:'Campo obrigatório',description:'Informe o nome do cargo.',variant:'destructive'});
   return;
  }

  const q=current
   ?await supabase.from('cargos_igreja').update({nome_cargo:nome.trim()}).eq('id',current.id)
   :await supabase.from('cargos_igreja').insert({nome_cargo:nome.trim(),user_id:user.id});

  if(q.error)toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  else{toast({title:'Sucesso',description:current?'Cargo atualizado.':'Cargo cadastrado.'});close();load()}
 };

 const remove=async id=>{
  const{error}=await supabase.from('cargos_igreja').delete().eq('id',id);
  if(error)toast({title:'Erro ao remover',description:error.message,variant:'destructive'});
  else{toast({title:'Cargo removido'});load()}
 };

 return(
  <div className="dark-igreja space-y-5">
   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Secretaria</p>
     <h1 className="text-2xl font-bold md:text-3xl">Cargos</h1>
     <p className="mt-1 text-sm text-muted-foreground">Cargos ministeriais e administrativos.</p>
    </div>
    <Button onClick={()=>{setCurrent(null);setNome('');setOpen(true)}} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]">
     <Plus className="mr-2 h-4 w-4"/>Novo Cargo
    </Button>
   </div>

   <Card className="border-border bg-card">
    <CardHeader><CardTitle>Cargos cadastrados</CardTitle></CardHeader>
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead><tr className="border-b border-border"><th className="p-4 text-left">Cargo</th><th className="p-4 text-right">Ações</th></tr></thead>
       <tbody>
        {loading?
         <tr><td colSpan={2} className="p-10 text-center">Carregando...</td></tr>:
         data.length?
         data.map(x=>(
          <tr key={x.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
           <td className="p-4 font-medium">{x.nome_cargo}</td>
           <td className="p-4">
            <div className="flex justify-end gap-1">
             <Button variant="ghost" size="icon" onClick={()=>{setCurrent(x);setNome(x.nome_cargo||'');setOpen(true)}}><Edit className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/></Button>
             <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
              <AlertDialogContent className="dark-igreja">
               <AlertDialogHeader><AlertDialogTitle>Excluir cargo?</AlertDialogTitle><AlertDialogDescription>Deseja excluir "{x.nome_cargo}"?</AlertDialogDescription></AlertDialogHeader>
               <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>
            </div>
           </td>
          </tr>
         )):
         <tr><td colSpan={2} className="p-12 text-center text-muted-foreground"><Briefcase className="mx-auto mb-3 h-10 w-10 opacity-40"/>Nenhum cargo cadastrado.</td></tr>
        }
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={current?'Editar cargo':'Novo cargo'}
    description="Informe o nome do cargo."
    icon={current?Edit:Briefcase}
    theme="gold"
    footer={<><Button variant="outline" onClick={close}>Cancelar</Button><Button onClick={save} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]">Salvar</Button></>}
   >
    <div className="space-y-2">
     <Label>Nome do cargo</Label>
     <Input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: Diácono, Presbítero, Tesoureiro" autoFocus/>
    </div>
   </ModalLancamentoPadrao>
  </div>
 );
}
