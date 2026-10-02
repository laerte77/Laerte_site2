import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,Download,Search,TrendingUp,DollarSign}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
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

const TIME_ZONE='America/Sao_Paulo';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const availableYears=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];

const getBrasiliaDateISO=()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const values={};
 parts.forEach(p=>{if(p.type!=='literal')values[p.type]=p.value});
 return `${values.year}-${values.month}-${values.day}`;
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
 const number=Number(digits)/100;
 return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(number);
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
   if(!isMountedRef.current)return;
   toast({title:'Erro',description:error.message,variant:'destructive'});
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

   const searchMatch=
    !searchTerm||
    item.receita?.toLowerCase().includes(searchLower)||
    item.origem?.toLowerCase().includes(searchLower);

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
  const formatted=formatCurrencyBRL(e.target.value);
  setFormData(prev=>({...prev,valor:formatted}));
 };

 const handleSave=async()=>{
  const numericValue=parseCurrencyBRL(formData.valor);

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
   }
  }catch(error){
   if(isMountedRef.current){
    toast({
     title:'Erro',
     variant:'destructive',
     description:error.message
    });
   }
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
   }
  }catch(error){
   if(isMountedRef.current){
    toast({
     title:'Erro',
     variant:'destructive',
     description:error.message
    });
   }
  }
 };

 const handleExport=()=>{
  if(filteredItems.length===0){
   toast({
    title:'Aviso',
    description:'Nenhum dado para exportar.',
    variant:'destructive'
   });
   return;
  }

  const dataToExport=filteredItems.map(item=>({
   Data:formatDateBR(item.data),
   Descrição:item.origem||'-',
   Categoria:item.receita,
   Valor:parseFloat(item.valor||0)
  }));

  exportToExcel(
   dataToExport,
   'Lançamento_Receitas',
   'Receitas'
  );
 };

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-pessoal space-y-6"
  >
   <OfflineIndicator/>

   <div className="glass-card overflow-hidden">
    <div className="bg-card border-b border-border p-6 flex flex-col md:flex-row items-center justify-between gap-4">
     <div className="flex items-center gap-4">
      <div className="p-3 bg-[hsl(var(--neon-pessoal)/.10)] rounded-full border border-[hsl(var(--neon-pessoal)/.20)]">
       <TrendingUp className="w-8 h-8 text-[hsl(var(--neon-pessoal))]"/>
      </div>

      <div>
       <h1 className="text-2xl font-bold text-[hsl(var(--neon-pessoal))]">
        Lançamento de Receitas
       </h1>

       <p className="text-muted-foreground text-sm">
        Registre suas entradas financeiras (A-Z)
       </p>
      </div>
     </div>

     <div className="flex gap-2 flex-wrap">
      <Button
       onClick={handleExport}
       variant="outline"
       className="border-border hover:bg-secondary"
      >
       <Download className="w-4 h-4 mr-2"/>
       Excel
      </Button>

      <Button
       onClick={()=>setIsSearchModalOpen(true)}
       variant="outline"
       className="border-border hover:bg-secondary"
      >
       <Search className="w-4 h-4 mr-2"/>
       Selecionar Registro
      </Button>

      <Button
       onClick={()=>openDialog()}
       className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      >
       <Plus className="w-4 h-4 mr-2"/>
       Novo Lançamento
      </Button>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
    <div className="lg:col-span-3 flex flex-col md:flex-row gap-4">
     <div className="flex-1 relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
      <Input
       placeholder="Buscar por descrição ou categoria..."
       value={searchTerm}
       onChange={e=>setSearchTerm(e.target.value)}
       className="pl-10 bg-input"
      />
     </div>

     <div className="w-full md:w-48">
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
       <SelectTrigger className="bg-input">
        <SelectValue placeholder="Mês"/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal bg-card">
        <SelectItem value="all">Todos os Meses</SelectItem>

        {meses.map((m,i)=>(
         <SelectItem key={i} value={String(i)}>
          {m}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>

     <div className="w-full md:w-32">
      <Select value={selectedYear} onValueChange={setSelectedYear}>
       <SelectTrigger className="bg-input">
        <SelectValue placeholder="Ano"/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal bg-card">
        <SelectItem value="all">Todos</SelectItem>

        {availableYears.map(y=>(
         <SelectItem key={y} value={String(y)}>
          {y}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>
    </div>

    <Card className="bg-card border-border shadow-lg">
     <CardContent className="p-4 flex items-center justify-between">
      <div>
       <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Total no Período
       </p>

       <p className="text-2xl font-bold text-green-400 mt-1">
        {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(totalPeriodo)}
       </p>
      </div>

      <div className="p-3 bg-green-400/10 rounded-full border border-green-400/20">
       <DollarSign className="w-6 h-6 text-green-400"/>
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
        <tr>
         <td colSpan="5" className="p-8 text-center">
          Carregando...
         </td>
        </tr>
       ):filteredItems.length===0?(
        <tr>
         <td colSpan="5" className="p-8 text-center text-muted-foreground">
          Nenhum registro.
         </td>
        </tr>
       ):(
        filteredItems.map(item=>(
         <tr
          key={item.id}
          className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors"
         >
          <td className="p-4 font-medium text-foreground">
           {item.receita}
          </td>

          <td className="p-4">
           {item.origem||'-'}
          </td>

          <td className="p-4">
           {formatDateBR(item.data)}
          </td>

          <td className="p-4 text-right font-bold text-green-400">
           {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(item.valor||0))}
          </td>

          <td className="p-4 flex justify-end gap-2">
           <Button
            variant="ghost"
            size="icon"
            onClick={()=>openDialog(item)}
           >
            <Edit className="w-4 h-4 text-[hsl(var(--neon-pessoal))]"/>
           </Button>

           <Button
            variant="ghost"
            size="icon"
            onClick={()=>setItemToDelete(item)}
           >
            <Trash className="w-4 h-4 text-red-500"/>
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

   <Dialog
    open={isDialogOpen}
    onOpenChange={open=>{
     if(!open)handleCloseModal();
     else setIsDialogOpen(true);
    }}
   >
    <DialogContent
     onInteractOutside={e=>e.preventDefault()}
     onEscapeKeyDown={e=>e.preventDefault()}
     onPointerDownOutside={e=>e.preventDefault()}
     className="dark-pessoal w-[calc(100%-2rem)] max-w-[640px] overflow-hidden rounded-2xl border border-[hsl(var(--neon-pessoal)/.26)] bg-[hsl(var(--card-bg))] p-0 text-foreground shadow-[0_24px_80px_rgba(0,0,0,.58)]"
    >
     <DialogHeader className="border-b border-[hsl(var(--neon-pessoal)/.14)] bg-[hsl(var(--neon-pessoal)/.045)] px-6 py-5 pr-14">
      <div className="flex items-center gap-3">
       <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.22)] bg-[hsl(var(--neon-pessoal)/.09)]">
        <TrendingUp className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
       </div>

       <div>
        <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
         {currentReceita?'Editar':'Nova'} Receita
        </DialogTitle>

        <DialogDescription className="mt-1 text-sm text-muted-foreground">
         Preencha os dados da receita.
        </DialogDescription>
       </div>
      </div>
     </DialogHeader>

     <div className="space-y-5 px-6 py-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label className="text-sm font-medium">
         Data
        </Label>

        <Input
         type="date"
         value={formData.data}
         onChange={e=>setFormData({...formData,data:e.target.value})}
         className="h-11 rounded-xl border-border bg-input transition-colors focus:border-[hsl(var(--neon-pessoal)/.65)] focus:ring-[hsl(var(--neon-pessoal)/.25)]"
        />
       </div>

       <div className="space-y-2">
        <Label className="text-sm font-medium">
         Valor
        </Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.valor}
         onChange={handleValueChange}
         className="h-11 rounded-xl border-border bg-input font-semibold tabular-nums transition-colors focus:border-[hsl(var(--neon-pessoal)/.65)] focus:ring-[hsl(var(--neon-pessoal)/.25)]"
         placeholder="R$ 0,00"
         aria-label="Valor da receita"
        />
       </div>
      </div>

      <div className="space-y-2">
       <Label className="text-sm font-medium">
        Categoria de Receita
       </Label>

       <Select
        value={formData.receita||''}
        onValueChange={v=>setFormData({...formData,receita:v})}
       >
        <SelectTrigger className="h-11 rounded-xl border-border bg-input transition-colors focus:border-[hsl(var(--neon-pessoal)/.65)] focus:ring-[hsl(var(--neon-pessoal)/.25)]">
         <SelectValue placeholder="Selecione"/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
         <ScrollArea className="h-48">
          {tiposReceita.map(t=>(
           <SelectItem key={t.id} value={t.nome_receita}>
            {t.nome_receita}
           </SelectItem>
          ))}
         </ScrollArea>
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label className="text-sm font-medium">
        Descrição / Origem
       </Label>

       <Input
        value={formData.origem}
        onChange={e=>setFormData({...formData,origem:e.target.value})}
        className="h-11 rounded-xl border-border bg-input transition-colors focus:border-[hsl(var(--neon-pessoal)/.65)] focus:ring-[hsl(var(--neon-pessoal)/.25)]"
        placeholder="Ex: Salário, Freelance"
       />
      </div>
     </div>

     <DialogFooter className="border-t border-border/70 bg-background/20 px-6 py-4">
      <Button
       variant="outline"
       onClick={handleCloseModal}
       className="h-10 rounded-xl border-border px-5 hover:bg-secondary"
      >
       Cancelar
      </Button>

      <Button
       onClick={handleSave}
       className="h-10 rounded-xl bg-[hsl(var(--neon-pessoal))] px-6 font-semibold text-white shadow-[0_0_18px_hsl(var(--neon-pessoal)/.22)] transition-all hover:bg-[hsl(var(--neon-pessoal)/.88)] hover:shadow-[0_0_24px_hsl(var(--neon-pessoal)/.32)]"
      >
       {currentReceita?'Salvar Alterações':'Salvar'}
      </Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <AlertDialog
    open={!!itemToDelete}
    onOpenChange={()=>setItemToDelete(null)}
   >
    <AlertDialogContent className="dark-pessoal bg-card border-border">
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
