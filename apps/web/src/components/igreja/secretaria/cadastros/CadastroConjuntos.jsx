import React,{useCallback,useEffect,useState}from'react';
import{Plus,Edit,Trash2,Music}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const classes=[
 'CÍRCULO DE ORAÇÃO',
 'MOCIDADE',
 'CAMPANHA EVANGELIZADORA',
 'SENHORES',
 'ESCOLA DOMINICAL'
];

export default function CadastroConjuntos(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true);
 const[open,setOpen]=useState(false),[current,setCurrent]=useState(null);
 const[form,setForm]=useState({nome:'',classe:''});

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  const{data,error}=await supabase.from('igreja_conjuntos').select('*').order('nome_conjunto');
  if(error)toast({title:'Erro',description:error.message,variant:'destructive'});
  else setData(data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('igreja_conjuntos').on('postgres_changes',{event:'*',schema:'public',table:'igreja_conjuntos'},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const close=()=>{
  setOpen(false);
  setCurrent(null);
  setForm({nome:'',classe:''});
 };

 const save=async()=>{
  if(!form.nome.trim()||!form.classe){
   toast({title:'Campos obrigatórios',description:'Informe o nome e a classe.',variant:'destructive'});
   return;
  }

  const body={nome_conjunto:form.nome.trim(),classe:form.classe,user_id:user.id};

  const q=current
   ?await supabase.from('igreja_conjuntos').update(body).eq('id',current.id)
   :await supabase.from('igreja_conjuntos').insert(body);

  if(q.error)toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  else{toast({title:'Sucesso',description:current?'Conjunto atualizado.':'Conjunto cadastrado.'});close();load()}
 };

 const remove=async id=>{
  const{error}=await supabase.from('igreja_conjuntos').delete().eq('id',id);
  if(error)toast({title:'Erro ao remover',description:error.message,variant:'destructive'});
  else{toast({title:'Conjunto removido'});load()}
 };

 return(
  <div className="dark-igreja space-y-5">
   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Secretaria</p>
     <h1 className="text-2xl font-bold md:text-3xl">Conjuntos</h1>
     <p className="mt-1 text-sm text-muted-foreground">Gerencie os conjuntos e departamentos da igreja.</p>
    </div>
    <Button onClick={()=>{setCurrent(null);setForm({nome:'',classe:''});setOpen(true)}} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]">
     <Plus className="mr-2 h-4 w-4"/>Novo Conjunto
    </Button>
   </div>

   <Card className="border-border bg-card">
    <CardHeader><CardTitle>Conjuntos cadastrados</CardTitle></CardHeader>
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead><tr className="border-b border-border"><th className="p-4 text-left">Conjunto</th><th className="p-4 text-left">Classe</th><th className="p-4 text-right">Ações</th></tr></thead>
       <tbody>
        {loading?
         <tr><td colSpan={3} className="p-10 text-center">Carregando...</td></tr>:
         data.length?
         data.map(x=>(
          <tr key={x.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
           <td className="p-4 font-medium">{x.nome_conjunto}</td>
           <td className="p-4 text-muted-foreground">{x.classe}</td>
           <td className="p-4">
            <div className="flex justify-end gap-1">
             <Button variant="ghost" size="icon" onClick={()=>{setCurrent(x);setForm({nome:x.nome_conjunto||'',classe:x.classe||''});setOpen(true)}}><Edit className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/></Button>
             <AlertDialog>
              <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button></AlertDialogTrigger>
              <AlertDialogContent className="dark-igreja">
               <AlertDialogHeader><AlertDialogTitle>Excluir conjunto?</AlertDialogTitle><AlertDialogDescription>Deseja excluir "{x.nome_conjunto}"?</AlertDialogDescription></AlertDialogHeader>
               <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-destructive">Excluir</AlertDialogAction></AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>
            </div>
           </td>
          </tr>
         )):
         <tr><td colSpan={3} className="p-12 text-center text-muted-foreground"><Music className="mx-auto mb-3 h-10 w-10 opacity-40"/>Nenhum conjunto cadastrado.</td></tr>
        }
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={current?'Editar conjunto':'Novo conjunto'}
    description="Preencha os dados do conjunto."
    icon={current?Edit:Music}
    theme="gold"
    footer={<><Button variant="outline" onClick={close}>Cancelar</Button><Button onClick={save} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]">Salvar</Button></>}
   >
    <div className="space-y-4">
     <div className="space-y-2">
      <Label>Nome do conjunto</Label>
      <Input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})}/>
     </div>

     <div className="space-y-2">
      <Label>Classe</Label>
      <Select value={form.classe} onValueChange={v=>setForm({...form,classe:v})}>
       <SelectTrigger><SelectValue placeholder="Selecione a classe"/></SelectTrigger>
       <SelectContent>
        {classes.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}
       </SelectContent>
      </Select>
     </div>
    </div>
   </ModalLancamentoPadrao>
  </div>
 );
}
