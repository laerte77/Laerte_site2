import React,{useState,useEffect,useCallback}from'react';
import{Heart,Plus,Edit,Trash2,RefreshCw,Search}from'lucide-react';
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

const GOLD='hsl(var(--neon-igreja))';

export default function LancamentoCasamentos(){
 const{user}=useAuth(),{toast}=useToast();
 const[casamentos,setCasamentos]=useState([]),[membros,setMembros]=useState([]);
 const[loading,setLoading]=useState(true),[search,setSearch]=useState('');
 const[open,setOpen]=useState(false),[saving,setSaving]=useState(false),[editingId,setEditingId]=useState(null);
 const[data,setData]=useState(''),[membroId,setMembroId]=useState('');

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
  }catch(e){
   toast({
    title:'Erro ao carregar casamentos',
    description:e.message,
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;

  const ch=supabase
   .channel('igreja_casamentos_changes')
   .on(
    'postgres_changes',
    {event:'*',schema:'public',table:'igreja_casamentos'},
    load
   )
   .subscribe();

  return()=>supabase.removeChannel(ch);
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

 const edit=item=>{
  setEditingId(item.id);
  setData(item.data?.slice(0,10)||'');
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
   const payload={
    data,
    membro_id:membroId
   };

   const q=editingId
    ?await supabase
      .from('igreja_casamentos')
      .update(payload)
      .eq('id',editingId)
    :await supabase
      .from('igreja_casamentos')
      .insert({...payload,user_id:user.id});

   if(q.error)throw q.error;

   toast({
    title:'Sucesso',
    description:editingId
     ?'Casamento atualizado.'
     :'Casamento registrado.'
   });

   close();
   load();
  }catch(e){
   toast({
    title:'Erro ao salvar',
    description:e.message,
    variant:'destructive'
   });
  }finally{
   setSaving(false);
  }
 };

 const remove=async id=>{
  const{error}=await supabase
   .from('igreja_casamentos')
   .delete()
   .eq('id',id);

  if(error){
   toast({
    title:'Erro ao excluir',
    description:error.message,
    variant:'destructive'
   });
   return;
  }

  toast({title:'Casamento removido'});
  load();
 };

 const filtered=casamentos.filter(x=>{
  const t=search.trim().toLowerCase();
  return !t||
   String(x.membro?.nome_completo||'')
    .toLowerCase()
    .includes(t);
 });

 const date=v=>{
  if(!v)return'-';
  try{return format(parseISO(v),'dd/MM/yyyy')}catch{return v}
 };

 return(
  <div className="dark-igreja space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">

    <div className="flex items-center gap-3">

     <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
      style={{
       borderColor:'hsl(var(--neon-igreja) / .20)',
       background:'hsl(var(--neon-igreja) / .08)'
      }}
     >
      <Heart className="h-5 w-5" style={{color:GOLD}}/>
     </div>

     <div>
      <p
       className="text-[11px] font-semibold uppercase tracking-[.2em]"
       style={{color:GOLD}}
      >
       Lançamentos
      </p>

      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
       Casamentos
      </h1>

      <p className="text-sm text-muted-foreground">
       Registre e acompanhe os casamentos dos membros da igreja.
      </p>
     </div>

    </div>

    <div className="flex flex-wrap gap-2">

     <Button variant="outline" onClick={load}>
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>

     <Button
      onClick={()=>{
       reset();
       setOpen(true);
      }}
      className="text-[hsl(var(--background))]"
      style={{background:GOLD}}
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Casamento
     </Button>

    </div>

   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">

     <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

      <Input
       value={search}
       onChange={e=>setSearch(e.target.value)}
       placeholder="Pesquisar membro..."
       className="bg-input pl-9"
      />
     </div>

     <span className="text-sm text-muted-foreground">
      {filtered.length} casamento(s)
     </span>

    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-3">

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Casamentos cadastrados
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p className="text-2xl font-bold" style={{color:GOLD}}>
       {casamentos.length}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Resultado atual
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p className="text-2xl font-bold">
       {filtered.length}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Situação
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p className="text-2xl font-bold text-emerald-400">
       Ativo
      </p>
     </CardContent>
    </Card>

   </div>

   <Card className="border-border bg-card">

    <CardHeader className="pb-3">
     <CardTitle
      className="text-lg"
      style={{color:GOLD}}
     >
      Casamentos cadastrados
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">

     <div className="overflow-x-auto">

      <table className="w-full text-sm">

       <thead>
        <tr className="border-b border-border bg-muted/30">
         <th className="p-4 text-left font-semibold text-muted-foreground">
          Membro
         </th>

         <th className="p-4 text-left font-semibold text-muted-foreground">
          Data
         </th>

         <th className="p-4 text-right font-semibold text-muted-foreground">
          Ações
         </th>
        </tr>
       </thead>

       <tbody>

        {loading?(
         <tr>
          <td colSpan={3} className="p-10 text-center text-muted-foreground">
           Carregando...
          </td>
         </tr>
        ):filtered.length===0?(
         <tr>
          <td colSpan={3} className="p-12 text-center text-muted-foreground">
           <Heart className="mx-auto mb-3 h-10 w-10 opacity-40"/>
           {casamentos.length
            ?'Nenhum casamento corresponde à pesquisa.'
            :'Nenhum casamento cadastrado.'}
          </td>
         </tr>
        ):(
         filtered.map(item=>(
          <tr
           key={item.id}
           className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-igreja)/.04)]"
          >

           <td className="p-4 font-medium">
            {item.membro?.nome_completo||'Membro não identificado'}
           </td>

           <td className="p-4 text-muted-foreground">
            {date(item.data)}
           </td>

           <td className="p-4">
            <div className="flex justify-end gap-1">

             <Button
              variant="ghost"
              size="icon"
              onClick={()=>edit(item)}
              className="text-[hsl(var(--neon-igreja))]"
              title="Editar"
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <AlertDialog>

              <AlertDialogTrigger asChild>
               <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:bg-red-500/10"
                title="Excluir"
               >
                <Trash2 className="h-4 w-4"/>
               </Button>
              </AlertDialogTrigger>

              <AlertDialogContent className="dark-igreja border-border bg-card">

               <AlertDialogHeader>
                <AlertDialogTitle>
                 Confirmar exclusão
                </AlertDialogTitle>

                <AlertDialogDescription>
                 Deseja excluir o casamento de{' '}
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
                 className="bg-red-600 hover:bg-red-700"
                >
                 Excluir
                </AlertDialogAction>
               </AlertDialogFooter>

              </AlertDialogContent>

             </AlertDialog>

            </div>
           </td>

          </tr>
         ))
        )}

       </tbody>

      </table>

     </div>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={editingId?'Editar casamento':'Novo casamento'}
    description="Informe a data e o membro relacionado."
    icon={editingId?Edit:Heart}
    theme="gold"
    footer={
     <>
      <Button
       variant="outline"
       onClick={close}
       disabled={saving}
      >
       Cancelar
      </Button>

      <Button
       onClick={save}
       disabled={saving}
       className="text-[hsl(var(--background))]"
       style={{background:GOLD}}
      >
       {saving?'Salvando...':'Salvar'}
      </Button>
     </>
    }
   >

    <div className="space-y-5">

     <div className="space-y-2">
      <Label>Data do casamento</Label>

      <Input
       type="date"
       value={data}
       onChange={e=>setData(e.target.value)}
       className="h-11 rounded-xl bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label>Membro</Label>

      <Select
       value={membroId}
       onValueChange={setMembroId}
      >
       <SelectTrigger className="h-11 rounded-xl bg-input">
        <SelectValue placeholder="Selecione o membro"/>
       </SelectTrigger>

       <SelectContent className="dark-igreja bg-card">
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
