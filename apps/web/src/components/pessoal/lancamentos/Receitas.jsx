import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,Download,Search,TrendingUp,DollarSign}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Card,CardContent}from'@/components/ui/card';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import{exportToExcel}from'@/lib/ExportUtils';
import OfflineIndicator from'@/components/OfflineIndicator';
import{useOnlineStatus}from'@/hooks/useOnlineStatus';
import{saveOfflineData}from'@/lib/offlineStorage';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const TIME_ZONE='America/Sao_Paulo';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const availableYears=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];

const getBrasiliaDateISO=()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),values={};
 parts.forEach(p=>{if(p.type!=='literal')values[p.type]=p.value});
 return`${values.year}-${values.month}-${values.day}`;
};

const formatDateBR=value=>{
 if(!value)return'-';
 const match=String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(match)return`${match[3]}/${match[2]}/${match[1]}`;
 const date=new Date(value);
 if(Number.isNaN(date.getTime()))return'-';
 return new Intl.DateTimeFormat('pt-BR',{timeZone:TIME_ZONE}).format(date);
};

const formatCurrencyBRL=value=>{
 const digits=String(value??'').replace(/\D/g,'');
 if(!digits)return'';
 return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(digits)/100);
};

const parseCurrencyBRL=value=>{
 if(value===null||value===undefined||value==='')return 0;
 const digits=String(value).replace(/\D/g,'');
 return digits?Number(digits)/100:0;
};

const createInitialFormData=()=>({
 data:getBrasiliaDateISO(),
 receita:'',
 valor:'',
 origem:''
});

const Receitas=()=>{
 const{toast}=useToast();
 const{user}=useAuth();
 const{isOnline,checkPending}=useOnlineStatus();
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
    supabase.from('tipos_receita').select('id,nome_receita').eq('user_id',user.id)
   ]);

   if(!isMountedRef.current)return;
   if(receitasRes.error)throw receitasRes.error;
   if(tiposRes.error)throw tiposRes.error;

   setReceitas(receitasRes.data||[]);
   setTiposReceita(tiposRes.data||[]);
  }catch(error){
   if(isMountedRef.current)toast({title:'Erro',description:error.message,variant:'destructive'});
  }finally{
   if(isMountedRef.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;

  const channel=supabase.channel('pessoal_receitas_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'receitas'},()=>{
    if(isMountedRef.current)fetchData();
   })
   .subscribe();

  return()=>{supabase.removeChannel(channel)};
 },[user,fetchData]);

 const filteredItems=useMemo(()=>{
  return receitas.filter(item=>{
   const rawDate=String(item.data||'');
   const year=rawDate.length>=4?parseInt(rawDate.slice(0,4),10):null;
   const month=rawDate.length>=7?parseInt(rawDate.slice(5,7),10)-1:null;
   const monthMatch=selectedMonth==='all'||month===parseInt(selectedMonth,10);
   const yearMatch=selectedYear==='all'||year===parseInt(selectedYear,10);
   const searchLower=searchTerm.toLowerCase();
   const searchMatch=!searchTerm||item.receita?.toLowerCase().includes(searchLower)||item.origem?.toLowerCase().includes(searchLower);
   return monthMatch&&yearMatch&&searchMatch;
  });
 },[receitas,selectedMonth,selectedYear,searchTerm]);

 const totalPeriodo=filteredItems.reduce((acc,curr)=>acc+Number(curr.valor||0),0);

 const resetForm=useCallback(()=>{
  setFormData(createInitialFormData());
  setCurrentReceita(null);
 },[]);

 const handleCloseModal=useCallback(()=>{
  setIsDialogOpen(false);
  resetForm();
 },[resetForm]);

 const handleValueChange=e=>{
  setFormData(prev=>({...prev,valor:formatCurrencyBRL(e.target.value)}));
 };

 const handleSave=async e=>{
  e?.preventDefault();

  const numericValue=parseCurrencyBRL(formData.valor);

  if(!formData.data||!formData.receita||numericValue<=0){
   toast({title:'Erro',description:'Preencha os campos obrigatórios.',variant:'destructive'});
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
     toast({title:'Salvo offline',description:'Receita salva localmente e pronta para sincronização.'});
     resetForm();
    }

    checkPending();
    return;
   }

   if(currentReceita){
    if(!isOnline){
     toast({title:'Offline',description:'Edição offline não permitida.',variant:'destructive'});
     return;
    }

    const{error}=await supabase.from('receitas').update(dataToSave).eq('id',currentReceita.id);
    if(error)throw error;

    if(isMountedRef.current){
     toast({title:'Sucesso',description:'Receita atualizada com sucesso.'});
     resetForm();
     fetchData();
    }

    return;
   }

   const{error}=await supabase.from('receitas').insert(dataToSave);
   if(error)throw error;

   if(isMountedRef.current){
    toast({title:'Sucesso',description:'Receita registrada com sucesso.'});
    resetForm();
    fetchData();
   }
  }catch(error){
   if(isMountedRef.current)toast({title:'Erro',variant:'destructive',description:error.message});
  }
 };

 const openDialog=item=>{
  if(item){
   setCurrentReceita(item);
   setFormData({
    data:String(item.data||'').slice(0,10)||getBrasiliaDateISO(),
    receita:item.receita||'',
    valor:formatCurrencyBRL(item.valor?Number(item.valor)*100:''),
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
   toast({title:'Offline',description:'Exclusão offline não permitida.',variant:'destructive'});
   return;
  }

  try{
   const{error}=await supabase.from('receitas').delete().eq('id',itemToDelete.id);
   if(error)throw error;

   if(isMountedRef.current){
    toast({title:'Removido',description:'Receita removida com sucesso.'});
    setItemToDelete(null);
   }
  }catch(error){
   if(isMountedRef.current)toast({title:'Erro',variant:'destructive',description:error.message});
  }
 };

 const handleExport=()=>{
  if(filteredItems.length===0){
   toast({title:'Aviso',description:'Nenhum dado para exportar.',variant:'destructive'});
   return;
  }

  const dataToExport=filteredItems.map(item=>({
   Data:formatDateBR(item.data),
   Descrição:item.origem||'-',
   Categoria:item.receita,
   Valor:parseFloat(item.valor||0)
  }));

  exportToExcel(dataToExport,'Lançamento_Receitas','Receitas');
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="dark-pessoal space-y-6">
   <OfflineIndicator/>

   <div className="glass-card overflow-hidden">
    <div className="flex flex-col items-center justify-between gap-4 border-b border-border bg-card p-6 md:flex-row">
     <div className="flex items-center gap-4">
      <div className="rounded-full border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.10)] p-3">
       <TrendingUp className="h-8 w-8 text-[hsl(var(--neon-pessoal))]"/>
      </div>

      <div>
       <h1 className="text-2xl font-bold text-[hsl(var(--neon-pessoal))]">Lançamento de Receitas</h1>
       <p className="text-sm text-muted-foreground">Registre suas entradas financeiras (A-Z)</p>
      </div>
     </div>

     <div className="flex flex-wrap gap-2">
      <Button onClick={handleExport} variant="outline" className="border-border hover:bg-secondary">
       <Download className="mr-2 h-4 w-4"/>Excel
      </Button>

      <Button onClick={()=>setIsSearchModalOpen(true)} variant="outline" className="border-border hover:bg-secondary">
       <Search className="mr-2 h-4 w-4"/>Selecionar Registro
      </Button>

      <Button onClick={()=>openDialog()} className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]">
       <Plus className="mr-2 h-4 w-4"/>Novo Lançamento
      </Button>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
    <div className="flex flex-col gap-4 md:flex-row lg:col-span-3">
     <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input placeholder="Buscar por descrição ou categoria..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-input pl-10"/>
     </div>

     <div className="w-full md:w-48">
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Mês"/></SelectTrigger>
       <SelectContent className="dark-pessoal bg-card">
        <SelectItem value="all">Todos os Meses</SelectItem>
        {meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
       </SelectContent>
      </Select>
     </div>

     <div className="w-full md:w-32">
      <Select value={selectedYear} onValueChange={setSelectedYear}>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Ano"/></SelectTrigger>
       <SelectContent className="dark-pessoal bg-card">
        <SelectItem value="all">Todos</SelectItem>
        {availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
       </SelectContent>
      </Select>
     </div>
    </div>

    <Card className="border-border bg-card shadow-lg">
     <CardContent className="flex items-center justify-between p-4">
      <div>
       <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total no Período</p>
       <p className="mt-1 text-2xl font-bold text-green-400">
        {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(totalPeriodo)}
       </p>
      </div>

      <div className="rounded-full border border-green-400/20 bg-green-400/10 p-3">
       <DollarSign className="h-6 w-6 text-green-400"/>
      </div>
     </CardContent>
    </Card>
   </div>

   <div className="glass-card overflow-hidden">
    <div className="overflow-x-auto">
     <table className="w-full text-sm">
      <thead>
       <tr className="border-b border-border bg-secondary/50">
        <th className="p-4 text-left font-semibold text-muted-foreground">Categoria</th>
        <th className="p-4 text-left font-semibold text-muted-foreground">Descrição</th>
        <th className="p-4 text-left font-semibold text-muted-foreground">Data</th>
        <th className="p-4 text-right font-semibold text-muted-foreground">Valor</th>
        <th className="p-4 text-right font-semibold text-muted-foreground">Ações</th>
       </tr>
      </thead>

      <tbody>
       {loading?(
        <tr><td colSpan="5" className="p-8 text-center">Carregando...</td></tr>
       ):filteredItems.length===0?(
        <tr><td colSpan="5" className="p-8 text-center text-muted-foreground">Nenhum registro.</td></tr>
       ):(
        filteredItems.map(item=>(
         <tr key={item.id} className="border-b border-border transition-colors last:border-b-0 hover:bg-secondary/50">
          <td className="p-4 font-medium text-foreground">{item.receita}</td>
          <td className="p-4">{item.origem||'-'}</td>
          <td className="p-4">{formatDateBR(item.data)}</td>
          <td className="p-4 text-right font-bold text-green-400">
           {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(item.valor||0))}
          </td>
          <td className="flex justify-end gap-2 p-4">
           <Button variant="ghost" size="icon" onClick={()=>openDialog(item)}>
            <Edit className="h-4 w-4 text-[hsl(var(--neon-pessoal))]"/>
           </Button>

           <Button variant="ghost" size="icon" onClick={()=>setItemToDelete(item)}>
            <Trash className="h-4 w-4 text-red-500"/>
           </Button>
          </td>
         </tr>
        ))
       )}
      </tbody>
     </table>
    </div>
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
     {key:'valor',label:'Valor',format:v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(parseFloat(v||0))}
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
      <Button type="button" variant="outline" onClick={handleCloseModal} className="h-11 rounded-xl border-border px-5 hover:bg-secondary">
       Cancelar
      </Button>

      <Button
       type="submit"
       form="form-lancamento-receita"
       className="h-11 rounded-xl bg-[hsl(var(--neon-pessoal))] px-6 font-semibold text-white shadow-[0_0_18px_hsl(var(--neon-pessoal)/.22)] transition-all hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      >
       {currentReceita?'Salvar Alterações':'Salvar'}
      </Button>
     </>
    }
   >
    <form id="form-lancamento-receita" onSubmit={handleSave} className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
     <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label className="text-sm font-medium">Data</Label>
        <Input
         type="date"
         value={formData.data}
         onChange={e=>setFormData({...formData,data:e.target.value})}
         className="h-11 rounded-xl bg-input"
        />
       </div>

       <div className="space-y-2">
        <Label className="text-sm font-medium">Valor</Label>
        <Input
         type="text"
         inputMode="numeric"
         value={formData.valor}
         onChange={handleValueChange}
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         placeholder="R$ 0,00"
         aria-label="Valor da receita"
        />
       </div>
      </div>

      <div className="space-y-2">
       <Label className="text-sm font-medium">Categoria de Receita</Label>

       <Select value={formData.receita||''} onValueChange={v=>setFormData({...formData,receita:v})}>
        <SelectTrigger className="h-11 rounded-xl bg-input">
         <SelectValue placeholder="Selecione"/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
         <ScrollArea className="h-48">
          {tiposReceita.map(t=>(
           <SelectItem key={t.id} value={t.nome_receita}>{t.nome_receita}</SelectItem>
          ))}
         </ScrollArea>
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label className="text-sm font-medium">Descrição / Origem</Label>

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

   <AlertDialog open={!!itemToDelete} onOpenChange={()=>setItemToDelete(null)}>
    <AlertDialogContent className="dark-pessoal border-border bg-card">
     <AlertDialogHeader>
      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
      <AlertDialogDescription>Deseja remover esta receita?</AlertDialogDescription>
     </AlertDialogHeader>

     <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-red-600 text-white hover:bg-red-700">Deletar</AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </motion.div>
 );
};

export default Receitas;
