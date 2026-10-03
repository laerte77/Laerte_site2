import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{Plus,Edit,Trash,Download,Search,TrendingUp,DollarSign,FileText,ArrowUpRight,CalendarDays,Filter,ChevronLeft,ChevronRight}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import{exportToExcel}from'@/lib/ExportUtils';
import OfflineIndicator from'@/components/OfflineIndicator';
import{useOnlineStatus}from'@/hooks/useOnlineStatus';
import{saveOfflineData}from'@/lib/offlineStorage';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const TIME_ZONE='America/Sao_Paulo';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const availableYears=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];
const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const roundMoney=v=>fromCents(toCents(v));
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});

const getBrasiliaDateISO=()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 parts.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const formatDateBR=value=>{
 if(!value)return'-';
 const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(match)return`${match[3]}/${match[2]}/${match[1]}`;
 const date=new Date(value);
 return Number.isNaN(date.getTime())?'-':new Intl.DateTimeFormat('pt-BR',{timeZone:TIME_ZONE}).format(date);
};

const formatCurrencyBRL=value=>{
 const digits=String(value??'').replace(/\D/g,'');
 return digits?money.format(fromCents(Number(digits))):'';
};

const parseCurrencyBRL=value=>{
 const digits=String(value??'').replace(/\D/g,'');
 return digits?fromCents(Number(digits)):0;
};

const createInitialFormData=()=>({
 data:getBrasiliaDateISO(),
 receita:'',
 valor:'',
 origem:''
});

const StatCard=({icon:Icon,label,value})=>(
 <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
  <div className="flex items-center gap-3">
   <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
    <Icon className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
   </div>

   <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
     {label}
    </p>

    <p className="mt-1 truncate text-xl font-bold text-[hsl(var(--neon-pessoal))]">
     {value}
    </p>
   </div>
  </div>
 </div>
);

const Receitas=()=>{
 const{toast}=useToast(),{user}=useAuth(),{isOnline,checkPending}=useOnlineStatus();
 const isMountedRef=useRef(true);

 const[receitas,setReceitas]=useState([]);
 const[tiposReceita,setTiposReceita]=useState([]);
 const[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[isSearchModalOpen,setIsSearchModalOpen]=useState(false);
 const[itemToDelete,setItemToDelete]=useState(null);
 const[currentReceita,setCurrentReceita]=useState(null);
 const[formData,setFormData]=useState(createInitialFormData);
 const[searchTerm,setSearchTerm]=useState('');
 const[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[selectedCategory,setSelectedCategory]=useState('all');
 const[currentPage,setCurrentPage]=useState(1);

 const pageSize=10;

 useEffect(()=>{
  isMountedRef.current=true;
  return()=>{isMountedRef.current=false};
 },[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const[receitasRes,tiposRes]=await Promise.all([
    supabase.from('receitas').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('tipos_receita').select('id,nome_receita').eq('user_id',user.id).order('nome_receita')
   ]);

   if(!isMountedRef.current)return;
   if(receitasRes.error)throw receitasRes.error;
   if(tiposRes.error)throw tiposRes.error;

   setReceitas(receitasRes.data||[]);
   setTiposReceita(tiposRes.data||[]);
  }catch(error){
   if(isMountedRef.current)toast({
    title:'Erro',
    description:error.message,
    variant:'destructive'
   });
  }finally{
   if(isMountedRef.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_receitas_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'receitas'
    },
    ()=>isMountedRef.current&&fetchData()
   )
   .subscribe();

  return()=>{supabase.removeChannel(channel)};
 },[user,fetchData]);

 const categories=useMemo(
  ()=>['all',...tiposReceita.map(t=>t.nome_receita).filter(Boolean)],
  [tiposReceita]
 );

 const filteredItems=useMemo(()=>{
  const q=searchTerm.trim().toLowerCase();

  return receitas.filter(item=>{
   const rawDate=String(item.data||'');
   const y=rawDate.length>=4?parseInt(rawDate.slice(0,4),10):null;
   const m=rawDate.length>=7?parseInt(rawDate.slice(5,7),10)-1:null;
   const monthMatch=selectedMonth==='all'||m===Number(selectedMonth);
   const yearMatch=selectedYear==='all'||y===Number(selectedYear);
   const categoryMatch=selectedCategory==='all'||item.receita===selectedCategory;
   const searchMatch=
    !q||
    item.receita?.toLowerCase().includes(q)||
    item.origem?.toLowerCase().includes(q);

   return monthMatch&&yearMatch&&categoryMatch&&searchMatch;
  });
 },[receitas,selectedMonth,selectedYear,selectedCategory,searchTerm]);

 useEffect(()=>{
  setCurrentPage(1);
 },[selectedMonth,selectedYear,selectedCategory,searchTerm]);

 const totalC=filteredItems.reduce((s,x)=>s+toCents(x.valor),0);
 const mediaC=filteredItems.length?Math.round(totalC/filteredItems.length):0;
 const maiorC=filteredItems.reduce((m,x)=>Math.max(m,toCents(x.valor)),0);

 const totalPeriodo=fromCents(totalC);
 const media=fromCents(mediaC);
 const maiorLancamento=fromCents(maiorC);

 const totalPages=Math.max(1,Math.ceil(filteredItems.length/pageSize));

 const paginatedItems=useMemo(()=>{
  const start=(currentPage-1)*pageSize;
  return filteredItems.slice(start,start+pageSize);
 },[filteredItems,currentPage]);

 const resetForm=useCallback(()=>{
  setFormData(createInitialFormData());
  setCurrentReceita(null);
 },[]);

 const handleCloseModal=useCallback(()=>{
  setIsDialogOpen(false);
  resetForm();
 },[resetForm]);

 const handleValueChange=e=>{
  setFormData(prev=>({
   ...prev,
   valor:formatCurrencyBRL(e.target.value)
  }));
 };

 const handleSave=async e=>{
  e?.preventDefault();

  const numericValue=roundMoney(parseCurrencyBRL(formData.valor));

  if(!formData.data||!formData.receita||numericValue<=0){
   toast({
    title:'Erro',
    description:'Preencha os campos obrigatórios.',
    variant:'destructive'
   });
   return;
  }

  const dataToSave={
   data:formData.data,
   receita:formData.receita,
   valor:numericValue,
   origem:formData.origem,
   user_id:user.id
  };

  try{
   if(!isOnline&&!currentReceita){
    await saveOfflineData('pessoal_receitas',dataToSave);

    if(isMountedRef.current){
     toast({
      title:'Salvo offline',
      description:'Receita salva localmente e pronta para sincronização.'
     });
     resetForm();
    }

    checkPending();
    return;
   }

   if(currentReceita){
    if(!isOnline){
     toast({
      title:'Offline',
      description:'Edição offline não permitida.',
      variant:'destructive'
     });
     return;
    }

    const{error}=await supabase
     .from('receitas')
     .update(dataToSave)
     .eq('id',currentReceita.id);

    if(error)throw error;

    if(isMountedRef.current){
     toast({
      title:'Sucesso',
      description:'Receita atualizada com sucesso.'
     });
     resetForm();
     fetchData();
    }

    return;
   }

   const{error}=await supabase
    .from('receitas')
    .insert(dataToSave);

   if(error)throw error;

   if(isMountedRef.current){
    toast({
     title:'Sucesso',
     description:'Receita registrada com sucesso.'
    });
    resetForm();
    fetchData();
   }
  }catch(error){
   if(isMountedRef.current)toast({
    title:'Erro',
    variant:'destructive',
    description:error.message
   });
  }
 };

 const openDialog=item=>{
  if(item){
   setCurrentReceita(item);
   setFormData({
    data:String(item.data||'').slice(0,10)||getBrasiliaDateISO(),
    receita:item.receita||'',
    valor:formatCurrencyBRL(toCents(item.valor)),
    origem:item.origem||''
   });
  }else{
   resetForm();
  }

  setIsDialogOpen(true);
 };

 const handleDelete=async()=>{
  if(!itemToDelete)return;

  if(!isOnline){
   toast({
    title:'Offline',
    description:'Exclusão offline não permitida.',
    variant:'destructive'
   });
   return;
  }

  try{
   const{error}=await supabase
    .from('receitas')
    .delete()
    .eq('id',itemToDelete.id);

   if(error)throw error;

   if(isMountedRef.current){
    toast({
     title:'Removido',
     description:'Receita removida com sucesso.'
    });
    setItemToDelete(null);
    fetchData();
   }
  }catch(error){
   if(isMountedRef.current)toast({
    title:'Erro',
    variant:'destructive',
    description:error.message
   });
  }
 };

 const handleExport=()=>{
  if(!filteredItems.length){
   toast({
    title:'Aviso',
    description:'Nenhum dado para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   filteredItems.map(item=>({
    Data:formatDateBR(item.data),
    Descrição:item.origem||'-',
    Categoria:item.receita,
    Valor:roundMoney(item.valor)
   })),
   'Lançamento_Receitas',
   'Receitas'
  );
 };

 const clearFilters=()=>{
  setSearchTerm('');
  setSelectedMonth('all');
  setSelectedYear('all');
  setSelectedCategory('all');
 };

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-pessoal space-y-4"
  >
   <OfflineIndicator/>

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[hsl(var(--neon-pessoal)/.25)] bg-[hsl(var(--neon-pessoal)/.10)]">
       <TrendingUp className="h-7 w-7 text-[hsl(var(--neon-pessoal))]"/>
      </div>

      <div>
       <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--neon-pessoal))]">
        Lançamento de Receitas
       </h1>

       <p className="text-sm text-muted-foreground">
        Registre e acompanhe suas entradas financeiras.
       </p>
      </div>
     </div>

     <div className="flex flex-wrap gap-2">
      <Button
       variant="outline"
       onClick={handleExport}
       className="border-border bg-transparent"
      >
       <Download className="mr-2 h-4 w-4"/>
       Excel
      </Button>

      <Button
       variant="outline"
       onClick={()=>setIsSearchModalOpen(true)}
       className="border-border bg-transparent"
      >
       <Search className="mr-2 h-4 w-4"/>
       Selecionar
      </Button>

      <Button
       onClick={()=>openDialog()}
       className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      >
       <Plus className="mr-2 h-4 w-4"/>
       Novo Lançamento
      </Button>
     </div>
    </div>
   </div>

   <div className="rounded-xl border border-border bg-card/70 p-3">
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.6fr_.6fr_.45fr_.8fr_auto]">

     <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

      <Input
       placeholder="Buscar por descrição ou categoria..."
       value={searchTerm}
       onChange={e=>setSearchTerm(e.target.value)}
       className="h-11 border-border bg-input pl-10"
      />
     </div>

     <Select
      value={selectedMonth}
      onValueChange={setSelectedMonth}
     >
      <SelectTrigger className="h-11 border-border bg-input">
       <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>
       <SelectValue placeholder="Mês"/>
      </SelectTrigger>

      <SelectContent className="dark-pessoal border-border bg-card">
       <SelectItem value="all">
        Todos os Meses
       </SelectItem>

       {meses.map((m,i)=>(
        <SelectItem key={i} value={String(i)}>
         {m}
        </SelectItem>
       ))}
      </SelectContent>
     </Select>

     <Select
      value={selectedYear}
      onValueChange={setSelectedYear}
     >
      <SelectTrigger className="h-11 border-border bg-input">
       <SelectValue placeholder="Ano"/>
      </SelectTrigger>

      <SelectContent className="dark-pessoal border-border bg-card">
       <SelectItem value="all">
        Todos
       </SelectItem>

       {availableYears.map(y=>(
        <SelectItem key={y} value={String(y)}>
         {y}
        </SelectItem>
       ))}
      </SelectContent>
     </Select>

     <Select
      value={selectedCategory}
      onValueChange={setSelectedCategory}
     >
      <SelectTrigger className="h-11 border-border bg-input">
       <SelectValue placeholder="Categoria"/>
      </SelectTrigger>

      <SelectContent className="dark-pessoal border-border bg-card">
       <SelectItem value="all">
        Todas as Categorias
       </SelectItem>

       {categories.filter(c=>c!=='all').map(c=>(
        <SelectItem key={c} value={c}>
         {c}
        </SelectItem>
       ))}
      </SelectContent>
     </Select>

     <Button
      variant="outline"
      onClick={clearFilters}
      className="h-11 border-border"
     >
      <Filter className="mr-2 h-4 w-4"/>
      Limpar
     </Button>
    </div>
   </div>

   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard
     icon={FileText}
     label="Total de Registros"
     value={filteredItems.length}
    />

    <StatCard
     icon={DollarSign}
     label="Total do Período"
     value={money.format(totalPeriodo)}
    />

    <StatCard
     icon={ArrowUpRight}
     label="Média por Registro"
     value={money.format(media)}
    />

    <StatCard
     icon={TrendingUp}
     label="Maior Lançamento"
     value={money.format(maiorLancamento)}
    />
   </div>

   <div className="overflow-hidden rounded-xl border border-border bg-card/70">
    <div className="overflow-x-auto">
     <table className="w-full text-sm">
      <thead>
       <tr className="border-b border-border bg-secondary/30">
        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
         Categoria
        </th>

        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
         Descrição
        </th>

        <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
         Data
        </th>

        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
         Valor
        </th>

        <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
         Ações
        </th>
       </tr>
      </thead>

      <tbody>
       {loading?(
        <tr>
         <td colSpan="5" className="px-4 py-10 text-center text-muted-foreground">
          Carregando lançamentos...
         </td>
        </tr>
       ):paginatedItems.length===0?(
        <tr>
         <td colSpan="5" className="px-4 py-12">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
           <FileText className="h-10 w-10 text-muted-foreground"/>

           <p className="font-semibold text-foreground">
            Nenhum lançamento encontrado
           </p>

           <p className="text-sm text-muted-foreground">
            Não existem registros para os filtros selecionados.
           </p>

           <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="mt-2"
           >
            <Filter className="mr-2 h-4 w-4"/>
            Limpar Filtros
           </Button>
          </div>
         </td>
        </tr>
       ):(
        paginatedItems.map(item=>(
         <tr
          key={item.id}
          className="border-b border-border transition-colors last:border-b-0 hover:bg-secondary/30"
         >
          <td className="px-4 py-4 font-medium text-foreground">
           {item.receita}
          </td>

          <td className="px-4 py-4 text-foreground">
           {item.origem||'-'}
          </td>

          <td className="px-4 py-4 text-foreground">
           {formatDateBR(item.data)}
          </td>

          <td className="px-4 py-4 text-right font-bold text-[hsl(var(--neon-pessoal))]">
           {money.format(roundMoney(item.valor))}
          </td>

          <td className="px-4 py-4">
           <div className="flex justify-end gap-1">
            <Button
             variant="ghost"
             size="icon"
             onClick={()=>openDialog(item)}
             title="Editar lançamento"
             className="text-[hsl(var(--neon-pessoal))] hover:bg-[hsl(var(--neon-pessoal)/.10)]"
            >
             <Edit className="h-4 w-4"/>
            </Button>

            <Button
             variant="ghost"
             size="icon"
             onClick={()=>setItemToDelete(item)}
             title="Excluir lançamento"
             className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
             <Trash className="h-4 w-4"/>
            </Button>
           </div>
          </td>
         </tr>
        ))
       )}
      </tbody>
     </table>
    </div>

    {!loading&&filteredItems.length>0&&(
     <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
       Mostrando {Math.min((currentPage-1)*pageSize+1,filteredItems.length)} a {Math.min(currentPage*pageSize,filteredItems.length)} de {filteredItems.length} registros
      </div>

      <div className="flex items-center gap-2">
       <Button
        variant="outline"
        size="sm"
        disabled={currentPage===1}
        onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}
       >
        <ChevronLeft className="mr-1 h-4 w-4"/>
        Anterior
       </Button>

       <div className="flex h-9 min-w-9 items-center justify-center rounded-md bg-[hsl(var(--neon-pessoal))] px-3 text-sm font-semibold text-white">
        {currentPage}
       </div>

       <Button
        variant="outline"
        size="sm"
        disabled={currentPage>=totalPages}
        onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}
       >
        Próxima
        <ChevronRight className="ml-1 h-4 w-4"/>
       </Button>
      </div>
     </div>
    )}
   </div>

   <SearchableModal
    isOpen={isSearchModalOpen}
    onClose={()=>setIsSearchModalOpen(false)}
    onSelect={item=>{
     openDialog(item);
     setIsSearchModalOpen(false);
    }}
    tableName="receitas"
    searchField="origem"
    displayFields={[
     {key:'receita',label:'Categoria'},
     {key:'data',label:'Data',format:d=>formatDateBR(d)},
     {key:'valor',label:'Valor',format:v=>money.format(roundMoney(v))}
    ]}
    title="Buscar Receita"
   />

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={handleCloseModal}
    title={currentReceita?'Editar Receita':'Nova Receita'}
    description="Preencha os dados da receita."
    icon={TrendingUp}
    theme="blue"
    footer={
     <>
      <Button
       type="button"
       variant="outline"
       onClick={handleCloseModal}
       className="h-11 rounded-xl border-border px-5 hover:bg-secondary"
      >
       Cancelar
      </Button>

      <Button
       type="submit"
       form="form-lancamento-receita"
       className="h-11 rounded-xl bg-[hsl(var(--neon-pessoal))] px-6 font-semibold text-white shadow-[0_0_18px_hsl(var(--neon-pessoal)/.22)] hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      >
       {currentReceita?'Salvar Alterações':'Salvar'}
      </Button>
     </>
    }
   >
    <form
     id="form-lancamento-receita"
     onSubmit={handleSave}
     className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
    >
     <div className="space-y-5">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Data</Label>

        <Input
         type="date"
         value={formData.data}
         onChange={e=>setFormData({...formData,data:e.target.value})}
         className="h-11 rounded-xl bg-input"
        />
       </div>

       <div className="space-y-2">
        <Label>Valor</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.valor}
         onChange={handleValueChange}
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         placeholder="R$ 0,00"
        />
       </div>
      </div>

      <div className="space-y-2">
       <Label>Categoria de Receita</Label>

       <Select
        value={formData.receita||''}
        onValueChange={v=>setFormData({...formData,receita:v})}
       >
        <SelectTrigger className="h-11 rounded-xl bg-input">
         <SelectValue placeholder="Selecione"/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
         <ScrollArea className="h-48">
          {tiposReceita.map(t=>(
           <SelectItem
            key={t.id}
            value={t.nome_receita}
           >
            {t.nome_receita}
           </SelectItem>
          ))}
         </ScrollArea>
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label>Descrição / Origem</Label>

       <Input
        value={formData.origem}
        onChange={e=>setFormData({...formData,origem:e.target.value})}
        className="h-11 rounded-xl bg-input"
        placeholder="Ex: Salário, Freelance"
       />
      </div>

     </div>
    </form>
   </ModalLancamentoPadrao>

   <AlertDialog
    open={!!itemToDelete}
    onOpenChange={()=>setItemToDelete(null)}
   >
    <AlertDialogContent className="dark-pessoal border-border bg-card">
     <AlertDialogHeader>
      <AlertDialogTitle>
       Confirmar Exclusão
      </AlertDialogTitle>

      <AlertDialogDescription>
       Deseja remover esta receita?
      </AlertDialogDescription>
     </AlertDialogHeader>

     <AlertDialogFooter>
      <AlertDialogCancel>
       Cancelar
      </AlertDialogCancel>

      <AlertDialogAction
       onClick={handleDelete}
       className="bg-red-600 text-white hover:bg-red-700"
      >
       Deletar
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>

  </motion.div>
 );
};

export default Receitas;
