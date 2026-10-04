import React,{useCallback,useEffect,useState}from'react';
import{Plus,Edit,Trash2,Music,RefreshCw,Search}from'lucide-react';
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

const GOLD='hsl(var(--neon-igreja))';

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
 const[search,setSearch]=useState('');
 const[open,setOpen]=useState(false),[current,setCurrent]=useState(null);
 const[form,setForm]=useState({nome:'',classe:''});

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  const{data,error}=await supabase
   .from('igreja_conjuntos')
   .select('*')
   .order('nome_conjunto');

  if(error)
   toast({title:'Erro ao carregar conjuntos',description:error.message,variant:'destructive'});
  else
   setData(data||[]);

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;

  const ch=supabase
   .channel('igreja_conjuntos_changes')
   .on('postgres_changes',{
    event:'*',
    schema:'public',
    table:'igreja_conjuntos'
   },load)
   .subscribe();

  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const close=()=>{
  setOpen(false);
  setCurrent(null);
  setForm({nome:'',classe:''});
 };

 const save=async()=>{
  if(!form.nome.trim()||!form.classe){
   toast({
    title:'Campos obrigatórios',
    description:'Informe o nome e a classe.',
    variant:'destructive'
   });
   return;
  }

  const body={
   nome_conjunto:form.nome.trim(),
   classe:form.classe,
   user_id:user.id
  };

  const q=current
   ?await supabase.from('igreja_conjuntos').update(body).eq('id',current.id)
   :await supabase.from('igreja_conjuntos').insert(body);

  if(q.error){
   toast({
    title:'Erro ao salvar',
    description:q.error.message,
    variant:'destructive'
   });
   return;
  }

  toast({
   title:'Sucesso',
   description:current?'Conjunto atualizado.':'Conjunto cadastrado.'
  });

  close();
  load();
 };

 const remove=async id=>{
  const{error}=await supabase
   .from('igreja_conjuntos')
   .delete()
   .eq('id',id);

  if(error){
   toast({
    title:'Erro ao remover',
    description:error.message,
    variant:'destructive'
   });
   return;
  }

  toast({title:'Conjunto removido'});
  load();
 };

 const filtered=data.filter(x=>{
  const t=search.trim().toLowerCase();

  return !t||
   String(x.nome_conjunto||'').toLowerCase().includes(t)||
   String(x.classe||'').toLowerCase().includes(t);
 });

 const classesUsadas=new Set(
  data.map(x=>x.classe).filter(Boolean)
 );

 return(
  <div className="dark-igreja space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">

    <div className="flex items-center gap-3">

     <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
      style={{
       borderColor:`${GOLD.replace(')','/.20)')}`,
       background:`${GOLD.replace(')','/.08)')}`
      }}
     >
      <Music className="h-5 w-5" style={{color:GOLD}}/>
     </div>

     <div>
      <p
       className="text-[11px] font-semibold uppercase tracking-[.2em]"
       style={{color:GOLD}}
      >
       Cadastros
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Conjuntos
      </h1>

      <p className="text-sm text-muted-foreground">
       Gerencie os conjuntos e departamentos da igreja.
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
       setCurrent(null);
       setForm({nome:'',classe:''});
       setOpen(true);
      }}
      className="text-[hsl(var(--background))]"
      style={{background:GOLD}}
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Conjunto
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
       placeholder="Pesquisar conjunto ou classe..."
       className="bg-input pl-9"
      />

     </div>

     <span className="text-sm text-muted-foreground">
      {filtered.length} conjunto(s)
     </span>

    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-3">

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Conjuntos cadastrados
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold" style={{color:GOLD}}>
       {data.length}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Classes utilizadas
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold">
       {classesUsadas.size}
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

   </div>

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={current?'Editar conjunto':'Novo conjunto'}
    description="Preencha os dados do conjunto."
    icon={current?Edit:Music}
    theme="gold"
    footer={
     <>
      <Button variant="outline" onClick={close}>
       Cancelar
      </Button>

      <Button
       onClick={save}
       className="text-[hsl(var(--background))]"
       style={{background:GOLD}}
      >
       Salvar
      </Button>
     </>
    }
   >
    <form
     id="form-conjunto"
     onSubmit={e=>{
      e.preventDefault();
      save();
     }}
     className="space-y-5"
    >

     <div className="space-y-2">
      <Label>Nome do conjunto</Label>

      <Input
       value={form.nome}
       onChange={e=>setForm({...form,nome:e.target.value})}
       className="h-11 rounded-xl bg-input"
       autoFocus
       required
      />
     </div>

     <div className="space-y-2">
      <Label>Classe</Label>

      <Select
       value={form.classe}
       onValueChange={v=>setForm({...form,classe:v})}
      >
       <SelectTrigger className="h-11 rounded-xl bg-input">
        <SelectValue placeholder="Selecione a classe"/>
       </SelectTrigger>

       <SelectContent className="dark-igreja">
        {classes.map(x=>(
         <SelectItem key={x} value={x}>
          {x}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>

     </div>

    </form>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">

    <CardHeader className="pb-3">
     <CardTitle className="text-lg" style={{color:GOLD}}>
      Conjuntos cadastrados
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">

     <div className="overflow-x-auto">

      <table className="w-full">

       <thead>
        <tr className="border-b border-border bg-muted/30">
         <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
          Conjunto
         </th>

         <th className="p-4 text-left text-sm font-semibold text-muted-foreground">
          Classe
         </th>

         <th className="p-4 text-right text-sm font-semibold text-muted-foreground">
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
          <td colSpan={3} className="p-10 text-center text-muted-foreground">
           <Music className="mx-auto mb-2 h-10 w-10 opacity-50"/>
           {data.length
            ?'Nenhum conjunto corresponde à pesquisa.'
            :'Nenhum conjunto cadastrado.'}
          </td>
         </tr>
        ):(
         filtered.map(x=>(
          <tr
           key={x.id}
           className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-igreja)/.04)]"
          >
           <td className="p-4 font-medium">
            {x.nome_conjunto}
           </td>

           <td className="p-4 text-sm text-muted-foreground">
            {x.classe}
           </td>

           <td className="p-4 text-right">
            <div className="flex justify-end gap-1">

             <Button
              variant="ghost"
              size="icon"
              onClick={()=>{
               setCurrent(x);
               setForm({
                nome:x.nome_conjunto||'',
                classe:x.classe||''
               });
               setOpen(true);
              }}
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
                 Confirmar Exclusão
                </AlertDialogTitle>

                <AlertDialogDescription>
                 Deseja remover o conjunto{' '}
                 <strong>{x.nome_conjunto}</strong>?
                </AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>
                 Cancelar
                </AlertDialogCancel>

                <AlertDialogAction
                 onClick={()=>remove(x.id)}
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

  </div>
 );
}
