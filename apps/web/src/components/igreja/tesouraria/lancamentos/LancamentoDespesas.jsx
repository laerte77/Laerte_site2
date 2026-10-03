import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{Plus,Edit,Trash2,Download,Search,DollarSign,RefreshCw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import{exportToExcel}from'@/lib/ExportUtils';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const anos=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];

const LancamentoDespesas=()=>{
 const{user,adminUser}=useAuth(),{toast}=useToast(),mounted=useRef(true);
 const[items,setItems]=useState([]),[tipos,setTipos]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[month,setMonth]=useState(String(new Date().getMonth())),[year,setYear]=useState(String(new Date().getFullYear()));
 const[open,setOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),[deleteItem,setDeleteItem]=useState(null),[current,setCurrent]=useState(null);
 const initial={data:new Date().toISOString().split('T')[0],valor:'',despesa:''};
 const[form,setForm]=useState(initial);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const uid=adminUser?.id||user.id;
   const[a,b]=await Promise.all([
    supabase.from('igreja_despesas').select('*').eq('user_id',uid).order('data',{ascending:false}),
    supabase.from('igreja_tipos_despesa').select('id,despesa').eq('user_id',uid).order('despesa')
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   if(mounted.current){
    setItems(a.data||[]);
    setTipos(b.data||[]);
   }
  }catch(e){
   toast({
    title:'Erro ao carregar dados',
    description:e.message,
    variant:'destructive'
   })
  }finally{
   if(mounted.current)setLoading(false)
  }
 },[user,adminUser,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('igreja_despesas_lanc_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'igreja_despesas'},load)
   .subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const filtered=useMemo(()=>items.filter(i=>{
  const d=new Date(i.data);
  return(month==='all'||d.getUTCMonth()===Number(month))&&
   (year==='all'||d.getUTCFullYear()===Number(year))&&
   (!search||i.despesa?.toLowerCase().includes(search.toLowerCase()));
 }),[items,month,year,search]);

 const total=filtered.reduce((a,i)=>a+Number(i.valor||0),0);
 const reset=()=>{setForm(initial);setCurrent(null)};
 const close=()=>{setOpen(false);reset()};

 const save=async()=>{
  if(!form.data||!form.valor||!form.despesa){
   toast({
    title:'Campos obrigatórios',
    description:'Preencha todos os campos.',
    variant:'destructive'
   });
   return;
  }

  const payload={
   data:form.data,
   valor:form.valor,
   despesa:form.despesa,
   user_id:adminUser?.id||user.id
  };

  const q=current
   ?await supabase.from('igreja_despesas').update(payload).eq('id',current.id)
   :await supabase.from('igreja_despesas').insert(payload);

  if(q.error){
   toast({
    title:'Erro ao salvar',
    description:q.error.message,
    variant:'destructive'
   });
  }else{
   toast({
    title:'Sucesso',
    description:current?'Despesa atualizada.':'Despesa registrada.'
   });
   close();
   load();
  }
 };

 const openDialog=item=>{
  if(item){
   setCurrent(item);
   setForm({
    data:item.data?.slice(0,10)||'',
    valor:item.valor||'',
    despesa:item.despesa||''
   });
  }else reset();
  setOpen(true);
 };

 const remove=async()=>{
  if(!deleteItem)return;
  const{error}=await supabase.from('igreja_despesas').delete().eq('id',deleteItem.id);
  if(error){
   toast({
    title:'Erro ao remover',
    description:error.message,
    variant:'destructive'
   });
  }else{
   toast({
    title:'Sucesso',
    description:'Despesa removida.'
   });
   setDeleteItem(null);
   load();
  }
 };

 const exportar=()=>{
  if(!filtered.length){
   toast({
    title:'Nenhum dado',
    description:'Não há registros para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   filtered.map(i=>({
    Data:new Date(i.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}),
    Descrição:i.despesa,
    Valor:Number(i.valor)
   })),
   'Lançamento_Despesas',
   'Despesas'
  );
 };

 return(
  <div className="dark-igreja space-y-5">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
      <DollarSign className="h-5 w-5 text-red-400"/>
     </div>
     <div>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">
       Tesouraria • Lançamentos
      </p>
      <h1 className="text-2xl font-bold md:text-3xl">Despesas</h1>
      <p className="text-sm text-muted-foreground">
       Registre e acompanhe as despesas da igreja.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={load}>
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>

     <Button variant="outline" onClick={exportar}>
      <Download className="mr-2 h-4 w-4"/>
      Excel
     </Button>

     <Button variant="outline" onClick={()=>setSearchOpen(true)}>
      <Search className="mr-2 h-4 w-4"/>
      Selecionar Registro
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Lançamento
     </Button>
    </div>
   </div>

   <div className="grid gap-4 lg:grid-cols-4">

    <Card className="border-border bg-card/80 lg:col-span-3">
     <CardContent className="flex flex-col gap-3 p-4 md:flex-row">

      <div className="relative flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input
        value={search}
        onChange={e=>setSearch(e.target.value)}
        placeholder="Pesquisar despesa..."
        className="bg-input pl-9"
       />
      </div>

      <Select value={month} onValueChange={setMonth}>
       <SelectTrigger className="w-full bg-input md:w-48">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-igreja bg-card igreja-select-hover">
        <SelectItem value="all">Todos os meses</SelectItem>
        {meses.map((m,i)=>
         <SelectItem key={i} value={String(i)}>
          {m}
         </SelectItem>
        )}
       </SelectContent>
      </Select>

      <Select value={year} onValueChange={setYear}>
       <SelectTrigger className="w-full bg-input md:w-32">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-igreja bg-card igreja-select-hover">
        <SelectItem value="all">Todos</SelectItem>
        {anos.map(y=>
         <SelectItem key={y} value={String(y)}>
          {y}
         </SelectItem>
        )}
       </SelectContent>
      </Select>

     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm text-muted-foreground">
       Total no período
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p className="text-2xl font-bold text-red-400">
       R$ {total.toFixed(2)}
      </p>
     </CardContent>
    </Card>

   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-igreja))]">
      Lançamentos de despesas
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">

       <thead>
        <tr className="border-b border-border bg-muted/30">
         <th className="p-4 text-left text-muted-foreground">Data</th>
         <th className="p-4 text-left text-muted-foreground">Descrição</th>
         <th className="p-4 text-right text-muted-foreground">Valor</th>
         <th className="p-4 text-right text-muted-foreground">Ações</th>
        </tr>
       </thead>

       <tbody>
        {loading?
         <tr>
          <td colSpan={4} className="p-10 text-center text-muted-foreground">
           Carregando...
          </td>
         </tr>
        :
         filtered.length?
          filtered.map(i=>(
           <tr
            key={i.id}
            className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-igreja)/.04)]"
           >
            <td className="p-4">
             {new Date(i.data).toLocaleDateString('pt-BR',{timeZone:'UTC'})}
            </td>

            <td className="p-4 font-medium">
             {i.despesa}
            </td>

            <td className="p-4 text-right font-bold text-red-400">
             R$ {Number(i.valor||0).toFixed(2)}
            </td>

            <td className="p-4">
             <div className="flex justify-end gap-1">

              <Button
               variant="ghost"
               size="icon"
               onClick={()=>openDialog(i)}
               className="text-[hsl(var(--neon-igreja))]"
              >
               <Edit className="h-4 w-4"/>
              </Button>

              <Button
               variant="ghost"
               size="icon"
               onClick={()=>setDeleteItem(i)}
               className="text-red-400"
              >
               <Trash2 className="h-4 w-4"/>
              </Button>

             </div>
            </td>
           </tr>
          ))
         :
          <tr>
           <td colSpan={4} className="p-12 text-center text-muted-foreground">
            <DollarSign className="mx-auto mb-3 h-10 w-10 opacity-40"/>
            Nenhum lançamento encontrado.
           </td>
          </tr>
        }
       </tbody>

      </table>
     </div>
    </CardContent>
   </Card>

   <SearchableModal
    isOpen={searchOpen}
    onClose={()=>setSearchOpen(false)}
    onSelect={i=>{
     openDialog(i);
     setSearchOpen(false);
    }}
    tableName="igreja_despesas"
    searchField="despesa"
    displayFields={[
     {
      key:'data',
      label:'Data',
      format:d=>new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'})
     },
     {
      key:'despesa',
      label:'Tipo'
     },
     {
      key:'valor',
      label:'Valor',
      format:v=>`R$ ${Number(v).toFixed(2)}`
     }
    ]}
    title="Buscar Despesa"
   />

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={current?'Editar Despesa':'Nova Despesa'}
    description="Preencha os dados da despesa."
    icon={current?Edit:DollarSign}
    theme="red"
    footer={
     <>
      <Button variant="outline" onClick={close}>
       Cancelar
      </Button>

      <Button
       onClick={save}
       className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"
      >
       Salvar
      </Button>
     </>
    }
   >

    <div className="space-y-5">

     <div className="grid gap-4 sm:grid-cols-2">

      <div className="space-y-2">
       <Label>Data</Label>
       <Input
        type="date"
        value={form.data}
        onChange={e=>setForm({...form,data:e.target.value})}
        className="bg-input"
       />
      </div>

      <div className="space-y-2">
       <Label>Valor</Label>
       <Input
        type="number"
        value={form.valor}
        onChange={e=>setForm({...form,valor:e.target.value})}
        className="bg-input"
       />
      </div>

     </div>

     <div className="space-y-2">
      <Label>Tipo de Despesa</Label>

      <Select
       value={form.despesa}
       onValueChange={v=>setForm({...form,despesa:v})}
      >
       <SelectTrigger className="bg-input">
        <SelectValue placeholder="Selecione"/>
       </SelectTrigger>

       <SelectContent className="dark-igreja bg-card igreja-select-hover">
        <ScrollArea className="h-48">
         {[...tipos]
          .sort((a,b)=>a.despesa.localeCompare(b.despesa,'pt-BR'))
          .map(t=>
           <SelectItem key={t.id} value={t.despesa}>
            {t.despesa}
           </SelectItem>
          )}
        </ScrollArea>
       </SelectContent>

      </Select>
     </div>

    </div>

   </ModalLancamentoPadrao>

   <AlertDialog
    open={!!deleteItem}
    onOpenChange={()=>setDeleteItem(null)}
   >
    <AlertDialogContent className="dark-igreja">

     <AlertDialogHeader>
      <AlertDialogTitle>
       Excluir despesa?
      </AlertDialogTitle>
     </AlertDialogHeader>

     <AlertDialogFooter>
      <AlertDialogCancel>
       Cancelar
      </AlertDialogCancel>

      <AlertDialogAction
       onClick={remove}
       className="bg-red-600"
      >
       Excluir
      </AlertDialogAction>
     </AlertDialogFooter>

    </AlertDialogContent>
   </AlertDialog>

  </div>
 );
};

export default LancamentoDespesas;
