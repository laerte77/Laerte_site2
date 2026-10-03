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

export default function CadastroFuncoes(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true);
 const[open,setOpen]=useState(false),[current,setCurrent]=useState(null),[nome,setNome]=useState('');

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  const{data,error}=await supabase.from('igreja_funcoes').select('*').order('nome_funcao');
  if(error)toast({title:'Erro',description:error.message,variant:'destructive'});
  else setData(data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('igreja_funcoes').on('postgres_changes',{event:'*',schema:'public',table:'igreja_funcoes'},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const reset=()=>{setNome('');setCurrent(null)};
 const close=()=>{setOpen(false);reset()};

 const save=async()=>{
  if(!nome.trim()){
   toast({title:'Campo obrigatório',description:'Informe o nome da função.',variant:'destructive'});
   return;
  }

  const q=current
   ?await supabase.from('igreja_funcoes').update({nome_funcao:nome.trim()}).eq('id',current.id)
   :await supabase.from('igreja_funcoes').insert({nome_funcao:nome.trim(),user_id:user.id});

  if(q.error)toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  else{
   toast({title:'Sucesso',description:current?'Função atualizada.':'Função cadastrada.'});
   close();
   load();
  }
 };

 const remove=async id=>{
  const c=await supabase.from('igreja_membros').select('*',{count:'exact',head:true}).eq('funcao_id',id);
  if(c.error){toast({title:'Erro',description:c.error.message,variant:'destructive'});return}
  if(c.count>0){toast({title:'Exclusão bloqueada',description:`A função está vinculada a ${c.count} membro(s).`,variant:'destructive'});return}

  const{error}=await supabase.from('igreja_funcoes').delete().eq('id',id);
  if(error)toast({title:'Erro',description:error.message,variant:'destructive'});
  else{toast({title:'Função removida'});load()}
 };

 return(
  <div className="dark-igreja space-y-5">
   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Secretaria</p>
     <h1 className="text-2xl font-bold md:text-3xl">Funções</h1>
     <p className="mt-1 text-sm text-muted-foreground">Funções exercidas pelos membros.</p>
    </div>
    <Button onClick={()=>{reset();setOpen(true)}} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]">
     <Plus className="mr-2 h-4 w-4"/>Nova Função
    </Button>
   </div>

   <Card className="border-border bg-card">
    <CardHeader><CardTitle>Funções cadastradas</CardTitle></CardHeader>
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead><tr className="border-b border-border"><th className="p-4 text-left">Função</th><th className="p-4 text-right">Ações</th></tr></thead>
       <tbody>
        {loading?
         <tr><td colSpan={2} className="p-10 text-center">Carregando...</td></tr>:
         data.length?
         data.map(x=>(
          <tr key={x.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
           <td className="p-4 font-medium">{x.nome_funcao}</td>
           <td className="p-4">
            <div className="flex justify-end gap-1">
             <Button variant="ghost" size="icon" onClick={()=>{setCurrent(x);setNome(x.nome_funcao||'');setOpen(true)}}><Edit className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/></Button>
             <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
              <AlertDialogContent className="dark-igreja">
               <AlertDialogHeader><AlertDialogTitle>Excluir função?</AlertDialogTitle><AlertDialogDescription>Deseja excluir "{x.nome_funcao}"?</AlertDialogDescription></AlertDialogHeader>
               <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>
            </div>
           </td>
          </tr>
         )):
         <tr><td colSpan={2} className="p-12 text-center text-muted-foreground"><Briefcase className="mx-auto mb-3 h-10 w-10 opacity-40"/>Nenhuma função cadastrada.</td></tr>
        }
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={current?'Editar função':'Nova função'}
    description="Informe o nome da função."
    icon={current?Edit:Briefcase}
    theme="gold"
    footer={<><Button variant="outline" onClick={close}>Cancelar</Button><Button onClick={save} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]">Salvar</Button></>}
   >
    <div className="space-y-2">
     <Label>Nome da função</Label>
     <Input value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: Diácono" autoFocus/>
    </div>
   </ModalLancamentoPadrao>
  </div>
 );
}
