import React,{useState,useEffect,useCallback}from'react';
import{Heart,PlusCircle,Edit,Trash2,Search}from'lucide-react';
import{format,parseISO}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

export default function LancamentoCasamentos(){
 const{user}=useAuth(),{toast}=useToast();

 const[casamentos,setCasamentos]=useState([]);
 const[membros,setMembros]=useState([]);
 const[loading,setLoading]=useState(true);
 const[open,setOpen]=useState(false);
 const[saving,setSaving]=useState(false);
 const[editingId,setEditingId]=useState(null);
 const[search,setSearch]=useState('');
 const[data,setData]=useState('');
 const[membroId,setMembroId]=useState('');

 const load=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  try{
   const[{data:cas,error:casError},{data:mem,error:memError}]=await Promise.all([
    supabase
     .from('igreja_casamentos')
     .select('*,membro:igreja_membros(nome_completo)')
     .order('data',{ascending:false}),
    supabase
     .from('igreja_membros')
     .select('id,nome_completo')
     .order('nome_completo',{ascending:true})
   ]);

   if(casError)throw casError;
   if(memError)throw memError;

   setCasamentos(cas||[]);
   setMembros(mem||[]);
  }catch(error){
   toast({
    title:'Erro ao carregar casamentos',
    description:error.message,
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  load();
 },[load]);

 useEffect(()=>{
  if(!user)return;

  const channel=supabase
   .channel('igreja_casamentos_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'igreja_casamentos'
    },
    load
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,load]);

 const reset=()=>{
  setEditingId(null);
  setData('');
  setMembroId('');
 };

 const close=()=>{
  setOpen(false);
  reset();
 };

 const create=()=>{
  reset();
  setOpen(true);
 };

 const edit=item=>{
  setEditingId(item.id);
  setData(item.data||'');
  setMembroId(item.membro_id||'');
  setOpen(true);
 };

 const save=async()=>{
  if(!data||!membroId){
   toast({
    title:'Campos obrigatórios',
    description:'Informe a data e o membro.',
    variant:'destructive'
   });
   return;
  }

  setSaving(true);

  try{
   const updateData={
    data,
    membro_id:membroId
   };

   const result=editingId
    ?await supabase
      .from('igreja_casamentos')
      .update(updateData)
      .eq('id',editingId)
    :await supabase
      .from('igreja_casamentos')
      .insert({
       ...updateData,
       user_id:user.id
      });

   if(result.error)throw result.error;

   toast({
    title:'Sucesso',
    description:editingId
     ?'Casamento atualizado com sucesso.'
     :'Casamento registrado com sucesso.'
   });

   close();
   load();
  }catch(error){
   toast({
    title:'Erro ao salvar',
    description:error.message,
    variant:'destructive'
   });
  }finally{
   setSaving(false);
  }
 };

 const remove=async id=>{
  try{
   const{error}=await supabase
    .from('igreja_casamentos')
    .delete()
    .eq('id',id);

   if(error)throw error;

   toast({
    title:'Casamento removido',
    description:'O registro foi excluído.'
   });

   load();
  }catch(error){
   toast({
    title:'Erro ao excluir',
    description:error.message,
    variant:'destructive'
   });
  }
 };

 const filtered=casamentos.filter(item=>
  (item.membro?.nome_completo||'')
   .toLowerCase()
   .includes(search.trim().toLowerCase())
 );

 const formatDate=value=>{
  if(!value)return'-';

  try{
   return format(parseISO(value),'dd/MM/yyyy');
  }catch{
   return value;
  }
 };

 return(
  <div className="dark-igreja space-y-5">

   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">
      Secretaria
     </p>

     <h1 className="text-2xl font-bold md:text-3xl">
      Casamentos
     </h1>

     <p className="mt-1 text-sm text-muted-foreground">
      Registre e acompanhe os casamentos vinculados aos membros da igreja.
     </p>
    </div>

    <Button
     onClick={create}
     className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"
    >
     <PlusCircle className="mr-2 h-4 w-4"/>
     Novo Casamento
    </Button>
   </div>

   <Card className="border-border bg-card">

    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
     <CardTitle>Casamentos registrados</CardTitle>

     <div className="relative w-full sm:w-80">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

      <Input
       value={search}
       onChange={e=>setSearch(e.target.value)}
       placeholder="Buscar por membro..."
       className="pl-9"
      />
     </div>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">

      <table className="w-full text-sm">

       <thead>
        <tr className="border-b border-border">
         <th className="p-4 text-left">Membro</th>
         <th className="p-4 text-left">Data</th>
         <th className="p-4 text-right">Ações</th>
        </tr>
       </thead>

       <tbody>

        {loading&&(
         <tr>
          <td colSpan={3} className="p-10 text-center text-muted-foreground">
           Carregando casamentos...
          </td>
         </tr>
        )}

        {!loading&&filtered.length===0&&(
         <tr>
          <td colSpan={3} className="p-12 text-center text-muted-foreground">
           <Heart className="mx-auto mb-3 h-10 w-10 opacity-40"/>
           Nenhum casamento encontrado.
          </td>
         </tr>
        )}

        {!loading&&filtered.map(item=>(
         <tr
          key={item.id}
          className="border-b border-border/50 last:border-0 hover:bg-muted/30"
         >
          <td className="p-4 font-medium">
           {item.membro?.nome_completo||'Membro não identificado'}
          </td>

          <td className="p-4 text-muted-foreground">
           {formatDate(item.data)}
          </td>

          <td className="p-4">
           <div className="flex justify-end gap-1">

            <Button
             variant="ghost"
             size="icon"
             onClick={()=>edit(item)}
            >
             <Edit className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/>
            </Button>

            <AlertDialog>
             <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
               <Trash2 className="h-4 w-4 text-destructive"/>
              </Button>
             </AlertDialogTrigger>

             <AlertDialogContent className="dark-igreja">
              <AlertDialogHeader>
               <AlertDialogTitle>
                Excluir casamento?
               </AlertDialogTitle>

               <AlertDialogDescription>
                Deseja excluir o registro de casamento de{' '}
                <strong>
                 {item.membro?.nome_completo||'este membro'}
                </strong>?
               </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
               <AlertDialogCancel>
                Cancelar
               </AlertDialogCancel>

               <AlertDialogAction
                onClick={()=>remove(item.id)}
                className="bg-destructive"
               >
                Excluir
               </AlertDialogAction>
              </AlertDialogFooter>

             </AlertDialogContent>
            </AlertDialog>

           </div>
          </td>
         </tr>
        ))}

       </tbody>
      </table>

     </div>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={editingId?'Editar casamento':'Novo casamento'}
    description="Registre a data do casamento e o membro relacionado."
    icon={editingId?Edit:Heart}
    theme="gold"
    footer={
     <>
      <Button
       type="button"
       variant="outline"
       onClick={close}
       disabled={saving}
      >
       Cancelar
      </Button>

      <Button
       type="button"
       onClick={save}
       disabled={saving}
       className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"
      >
       {saving?'Salvando...':'Salvar'}
      </Button>
     </>
    }
   >

    <div className="grid gap-5">

     <div className="space-y-2">
      <Label>Data do casamento *</Label>

      <Input
       type="date"
       value={data}
       onChange={e=>setData(e.target.value)}
      />
     </div>

     <div className="space-y-2">
      <Label>Membro *</Label>

      <Select
       value={membroId}
       onValueChange={setMembroId}
      >
       <SelectTrigger>
        <SelectValue placeholder="Selecione o membro"/>
       </SelectTrigger>

       <SelectContent className="dark-igreja">
        {membros.map(m=>(
         <SelectItem
          key={m.id}
          value={m.id}
         >
          {m.nome_completo}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>

    </div>

   </ModalLancamentoPadrao>

  </div>
 );
}
