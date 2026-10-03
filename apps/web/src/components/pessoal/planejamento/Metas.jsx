import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,Target,Search,Download,WalletCards,CheckCircle2,TrendingUp,RotateCcw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Progress}from'@/components/ui/progress';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import{exportToExcel}from'@/lib/ExportUtils';

const BLUE='hsl(var(--neon-pessoal))';

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d
  ?new Intl.NumberFormat('pt-BR',{
   style:'currency',
   currency:'BRL'
  }).format(Number(d)/100)
  :'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const showMoney=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL'
}).format(Number(v)||0);

const Metas=()=>{
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);

 const[metas,setMetas]=useState([]);
 const[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState('');
 const[currentPage,setCurrentPage]=useState(1);
 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[currentItem,setCurrentItem]=useState(null);
 const[itemToDelete,setItemToDelete]=useState(null);

 const initialForm=()=>({
  descricao:'',
  valor:'',
  meta:''
 });

 const[formData,setFormData]=useState(initialForm);
 const pageSize=9;

 useEffect(()=>{
  mounted.current=true;
  return()=>{mounted.current=false};
 },[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  try{
   const{data,error}=await supabase
    .from('metas')
    .select('*')
    .eq('user_id',user.id)
    .order('created_at',{ascending:false});

   if(error)throw error;
   if(!mounted.current)return;

   setMetas(data||[]);
  }catch(error){
   if(!mounted.current)return;

   toast({
    title:'Erro ao carregar metas',
    description:error.message||'Não foi possível carregar as metas.',
    variant:'destructive'
   });
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('metas_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'metas'
    },
    fetchData
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filtered=useMemo(()=>{
  const term=searchTerm.trim().toLowerCase();

  if(!term)return metas;

  return metas.filter(item=>
   (item.descricao||'').toLowerCase().includes(term)
  );
 },[metas,searchTerm]);

 useEffect(()=>{
  setCurrentPage(1);
 },[searchTerm]);

 const totalMeta=useMemo(
  ()=>filtered.reduce((sum,item)=>sum+Number(item.meta||0),0),
  [filtered]
 );

 const totalAtual=useMemo(
  ()=>filtered.reduce((sum,item)=>sum+Number(item.valor||0),0),
  [filtered]
 );

 const concluidas=useMemo(
  ()=>filtered.filter(item=>Number(item.meta||0)>0&&Number(item.valor||0)>=Number(item.meta||0)).length,
  [filtered]
 );

 const percentualGeral=totalMeta>0
  ?Math.min(100,(totalAtual/totalMeta)*100)
  :0;

 const totalPages=Math.max(
  1,
  Math.ceil(filtered.length/pageSize)
 );

 const paginated=filtered.slice(
  (currentPage-1)*pageSize,
  currentPage*pageSize
 );

 const resetForm=()=>{
  setFormData(initialForm());
  setCurrentItem(null);
 };

 const openDialog=item=>{
  if(item){
   setCurrentItem(item);

   setFormData({
    descricao:item.descricao||'',
    valor:money(item.valor),
    meta:money(item.meta)
   });
  }else{
   resetForm();
  }

  setIsDialogOpen(true);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  resetForm();
 };

 const handleSave=async()=>{
  if(!formData.descricao||!formData.meta){
   toast({
    title:'Campos obrigatórios',
    description:'Informe a descrição e o valor da meta.',
    variant:'destructive'
   });
   return;
  }

  const valor=moneyNum(formData.valor);
  const meta=moneyNum(formData.meta);

  if(meta<=0){
   toast({
    title:'Meta inválida',
    description:'A meta deve ser maior que zero.',
    variant:'destructive'
   });
   return;
  }

  const dataToSave={
   descricao:formData.descricao.trim(),
   valor,
   meta,
   user_id:user.id
  };

  try{
   const result=currentItem
    ?await supabase
      .from('metas')
      .update(dataToSave)
      .eq('id',currentItem.id)
      .eq('user_id',user.id)
    :await supabase
      .from('metas')
      .insert(dataToSave);

   if(result.error)throw result.error;
   if(!mounted.current)return;

   toast({
    title:'Sucesso',
    description:currentItem
     ?'Meta atualizada.'
     :'Meta criada.'
   });

   closeDialog();
   fetchData();
  }catch(error){
   toast({
    title:'Erro ao salvar',
    description:error.message||'Não foi possível salvar a meta.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async()=>{
  if(!itemToDelete)return;

  try{
   const{error}=await supabase
    .from('metas')
    .delete()
    .eq('id',itemToDelete.id)
    .eq('user_id',user.id);

   if(error)throw error;
   if(!mounted.current)return;

   toast({
    title:'Removido',
    description:'Meta removida.'
   });

   setItemToDelete(null);
   fetchData();
  }catch(error){
   toast({
    title:'Erro ao remover',
    description:error.message||'Não foi possível remover a meta.',
    variant:'destructive'
   });
  }
 };

 const handleExport=()=>{
  if(!filtered.length){
   toast({
    title:'Sem dados',
    description:'Não há metas para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   filtered.map(item=>({
    DESCRIÇÃO:item.descricao,
    'VALOR ATUAL':Number(item.valor||0),
    META:Number(item.meta||0),
    'PROGRESSO (%)':Number(item.meta)>0
     ?Number(((Number(item.valor||0)/Number(item.meta))*100).toFixed(1))
     :0
   })),
   'Metas_Financeiras',
   'Metas'
  );
 };

 const limparBusca=()=>setSearchTerm('');

 const stats=[
  {
   label:'Metas',
   value:filtered.length,
   icon:Target
  },
  {
   label:'Valor Atual',
   value:showMoney(totalAtual),
   icon:WalletCards
  },
  {
   label:'Objetivo Total',
   value:showMoney(totalMeta),
   icon:TrendingUp
  },
  {
   label:'Concluídas',
   value:`${concluidas}/${filtered.length}`,
   icon:CheckCircle2
  }
 ];

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-pessoal space-y-5"
  >

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    <div>
     <p
      className="text-xs font-semibold uppercase tracking-[.2em]"
      style={{color:BLUE}}
     >
      Planejamento
     </p>

     <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
      Metas Financeiras
     </h1>

     <p className="text-sm text-muted-foreground">
      Acompanhe seus objetivos e o progresso de cada meta.
     </p>
    </div>

    <div className="flex flex-wrap gap-2">

     <Button
      variant="outline"
      onClick={handleExport}
      className="border-border hover:bg-blue-500/10"
      style={{color:BLUE}}
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="text-white shadow-lg hover:opacity-90"
      style={{
       background:BLUE,
       boxShadow:'0 0 18px hsl(var(--neon-pessoal)/.2)'
      }}
     >
      <Plus className="mr-2 h-4 w-4"/>
      Nova Meta
     </Button>

    </div>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

    {stats.map(({label,value,icon:Icon})=>(
     <Card key={label} className="border-border bg-card">

      <CardContent className="flex items-center justify-between p-4">

       <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
         {label}
        </p>

        <p
         className="mt-1 text-xl font-bold tabular-nums"
         style={{color:BLUE}}
        >
         {value}
        </p>
       </div>

       <div
        className="rounded-xl bg-blue-500/10 p-2.5"
        style={{color:BLUE}}
       >
        <Icon className="h-5 w-5"/>
       </div>

      </CardContent>
     </Card>
    ))}

   </div>

   <Card className="border-border bg-card">

    <CardContent className="p-4">

     <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

      <div className="relative min-w-0 flex-1">

       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

       <Input
        placeholder="Buscar meta..."
        value={searchTerm}
        onChange={e=>setSearchTerm(e.target.value)}
        className="h-10 bg-input pl-9"
       />

      </div>

      <Button
       variant="outline"
       onClick={limparBusca}
       className="h-10 border-border"
      >
       <RotateCcw className="mr-2 h-4 w-4"/>
       Limpar
      </Button>

     </div>

     <div className="mt-4">

      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
       <span>Progresso geral</span>
       <span className="font-semibold">
        {percentualGeral.toFixed(1)}%
       </span>
      </div>

      <Progress value={percentualGeral} className="h-2"/>

     </div>

    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={currentItem?'Editar Meta':'Nova Meta'}
    description="Defina seu objetivo financeiro e acompanhe o progresso."
    icon={Target}
    theme="blue"
    footer={
     <>
      <Button
       variant="outline"
       onClick={closeDialog}
       className="h-10 rounded-xl"
      >
       Cancelar
      </Button>

      <Button
       onClick={handleSave}
       className="h-10 rounded-xl px-7 font-semibold text-white hover:opacity-90"
       style={{background:BLUE}}
      >
       {currentItem?'Salvar Alterações':'Salvar Meta'}
      </Button>
     </>
    }
   >

    <div className="space-y-5">

     <div className="space-y-2">
      <Label>Descrição</Label>

      <Input
       value={formData.descricao}
       onChange={e=>setFormData(p=>({
        ...p,
        descricao:e.target.value
       }))}
       placeholder="Ex.: Viagem, carro, reserva..."
       className="h-11 rounded-xl bg-input"
      />
     </div>

     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

      <div className="space-y-2">
       <Label>Valor Atual</Label>

       <Input
        type="text"
        inputMode="numeric"
        value={formData.valor}
        onChange={e=>setFormData(p=>({
         ...p,
         valor:money(e.target.value)
        }))}
        placeholder="R$ 0,00"
        className="h-11 rounded-xl bg-input font-semibold tabular-nums"
       />
      </div>

      <div className="space-y-2">
       <Label>Meta</Label>

       <Input
        type="text"
        inputMode="numeric"
        value={formData.meta}
        onChange={e=>setFormData(p=>({
         ...p,
         meta:money(e.target.value)
        }))}
        placeholder="R$ 0,00"
        className="h-11 rounded-xl bg-input font-semibold tabular-nums"
       />
      </div>

     </div>

    </div>
   </ModalLancamentoPadrao>

   {loading?(
    <Card className="border-border bg-card">
     <CardContent className="flex min-h-[280px] items-center justify-center">
      <span className="text-sm text-muted-foreground">
       Carregando metas...
      </span>
     </CardContent>
    </Card>
   ):paginated.length===0?(
    <Card className="border-border bg-card">
     <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
      <Target className="h-10 w-10 opacity-40"/>
      <span>Nenhuma meta encontrada.</span>
     </CardContent>
    </Card>
   ):(
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

     {paginated.map(item=>{

      const atual=Number(item.valor)||0;
      const meta=Number(item.meta)||0;
      const percentual=meta>0
       ?Math.min(100,Math.max(0,(atual/meta)*100))
       :0;
      const concluida=meta>0&&atual>=meta;

      return(
       <Card
        key={item.id}
        className="group border-border bg-card transition-colors hover:border-blue-500/30"
       >

        <CardContent className="p-5">

         <div className="flex items-start justify-between gap-3">

          <div className="min-w-0">
           <div className="flex items-center gap-2">

            <div
             className="rounded-lg bg-blue-500/10 p-2"
             style={{color:BLUE}}
            >
             {concluida
              ?<CheckCircle2 className="h-4 w-4 text-green-400"/>
              :<Target className="h-4 w-4"/>
             }
            </div>

            <h3 className="truncate font-semibold text-foreground">
             {item.descricao}
            </h3>

           </div>
          </div>

          <div className="flex shrink-0 gap-1">

           <Button
            variant="ghost"
            size="icon"
            onClick={()=>openDialog(item)}
            className="h-8 w-8 hover:bg-blue-500/10"
            style={{color:BLUE}}
           >
            <Edit className="h-4 w-4"/>
           </Button>

           <Button
            variant="ghost"
            size="icon"
            onClick={()=>setItemToDelete(item)}
            className="h-8 w-8 text-red-500 hover:bg-red-500/10"
           >
            <Trash className="h-4 w-4"/>
           </Button>

          </div>

         </div>

         <div className="mt-5 space-y-3">

          <div className="flex items-end justify-between gap-3">

           <div>
            <p className="text-xs text-muted-foreground">
             Valor atual
            </p>

            <p
             className="mt-0.5 text-lg font-bold tabular-nums"
             style={{color:BLUE}}
            >
             {showMoney(atual)}
            </p>
           </div>

           <div className="text-right">
            <p className="text-xs text-muted-foreground">
             Meta
            </p>

            <p className="mt-0.5 font-semibold tabular-nums">
             {showMoney(meta)}
            </p>
           </div>

          </div>

          <Progress value={percentual} className="h-2"/>

          <div className="flex items-center justify-between text-xs">

           <span
            className={concluida?'font-semibold text-green-400':'text-muted-foreground'}
           >
            {concluida?'Meta concluída':'Em andamento'}
           </span>

           <span className="font-semibold text-muted-foreground">
            {percentual.toFixed(1)}%
           </span>

          </div>

         </div>

        </CardContent>
       </Card>
      );
     })}

    </div>
   )}

   {!loading&&filtered.length>0&&(
    <div className="flex flex-col gap-2 border-t border-border pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">

     <span>
      Mostrando {((currentPage-1)*pageSize)+1}–{Math.min(currentPage*pageSize,filtered.length)} de {filtered.length}
     </span>

     <div className="flex items-center gap-1">

      <Button
       variant="outline"
       size="sm"
       disabled={currentPage===1}
       onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}
       className="h-8"
      >
       Anterior
      </Button>

      <span className="px-2 text-xs">
       {currentPage} / {totalPages}
      </span>

      <Button
       variant="outline"
       size="sm"
       disabled={currentPage===totalPages}
       onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}
       className="h-8"
      >
       Próxima
      </Button>

     </div>
    </div>
   )}

   <AlertDialog
    open={!!itemToDelete}
    onOpenChange={open=>{
     if(!open)setItemToDelete(null);
    }}
   >

    <AlertDialogContent className="dark-pessoal border-border bg-card">

     <AlertDialogHeader>
      <AlertDialogTitle>
       Excluir Meta?
      </AlertDialogTitle>
     </AlertDialogHeader>

     <AlertDialogFooter>

      <AlertDialogCancel>
       Cancelar
      </AlertDialogCancel>

      <AlertDialogAction
       onClick={handleDelete}
       className="bg-red-600 text-white hover:bg-red-700"
      >
       Excluir
      </AlertDialogAction>

     </AlertDialogFooter>

    </AlertDialogContent>
   </AlertDialog>

  </motion.div>
 );
};

export default Metas;
