import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,Heart,Search,Download}from'lucide-react';
import{format,parseISO,getMonth,getYear}from'date-fns';
import{ptBR}from'date-fns/locale';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/pessoal/ModalLancamentoPadrao';
import*as XLSX from'xlsx';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TZ='America/Sao_Paulo';

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const moneyShow=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
const brDate=d=>new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'});

const LancamentoDizimosOfertas=()=>{
 const{toast}=useToast(),{user}=useAuth(),isMountedRef=useRef(true);
 const[lancamentos,setLancamentos]=useState([]),[filteredLancamentos,setFilteredLancamentos]=useState([]),[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState('');
 const[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[isDialogOpen,setIsDialogOpen]=useState(false),[isSearchModalOpen,setIsSearchModalOpen]=useState(false),[isExportOpen,setIsExportOpen]=useState(false);
 const[exportFilters,setExportFilters]=useState({month:new Date().getMonth(),year:new Date().getFullYear()});
 const[currentLancamentoId,setCurrentLancamentoId]=useState(null);
 const initialFormState={data:getBRDate(),valor:'',tipo_movimento:'DÍZIMO'};
 const[formData,setFormData]=useState(initialFormState);

 const availableYears=useMemo(()=>{
  const years=lancamentos.map(d=>getYear(parseISO(d.data)));
  years.push(new Date().getFullYear());
  return[...new Set(years)].sort((a,b)=>b-a);
 },[lancamentos]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const{data,error}=await supabase
    .from('pessoal_dizimos_ofertas')
    .select('*')
    .eq('user_id',user.id)
    .order('data',{ascending:false});

   if(!isMountedRef.current)return;
   if(error)throw error;
   setLancamentos(data||[]);
  }catch(error){
   if(!isMountedRef.current)return;
   toast({
    title:'Erro ao buscar lançamentos',
    variant:'destructive',
    description:error.message
   });
  }finally{
   if(isMountedRef.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  isMountedRef.current=true;
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_dizimos_changes')
   .on(
    'postgres_changes',
    {event:'*',schema:'public',table:'pessoal_dizimos_ofertas'},
    ()=>{if(isMountedRef.current)fetchData()}
   )
   .subscribe();

  return()=>{
   isMountedRef.current=false;
   supabase.removeChannel(channel);
  };
 },[user,fetchData]);

 useEffect(()=>{
  let results=lancamentos;

  if(selectedYear!=='all'){
   results=results.filter(
    item=>String(getYear(parseISO(item.data)))===selectedYear
   );
  }

  if(selectedMonth!=='all'){
   results=results.filter(
    item=>String(getMonth(parseISO(item.data)))===selectedMonth
   );
  }

  if(searchTerm){
   const search=searchTerm.toLowerCase();
   results=results.filter(
    item=>item.tipo_movimento?.toLowerCase().includes(search)
   );
  }

  setFilteredLancamentos(results);
 },[searchTerm,selectedMonth,selectedYear,lancamentos]);

 const handleSave=async()=>{
  if(!formData.data||!formData.valor||!formData.tipo_movimento){
   toast({
    title:'Erro',
    description:'Todos os campos são obrigatórios.',
    variant:'destructive'
   });
   return;
  }

  const dataToSave={
   ...formData,
   user_id:user.id,
   valor:moneyNum(formData.valor)
  };

  try{
   if(currentLancamentoId){
    const{error}=await supabase
     .from('pessoal_dizimos_ofertas')
     .update(dataToSave)
     .eq('id',currentLancamentoId);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Lançamento atualizado.'
    });
   }else{
    const{error}=await supabase
     .from('pessoal_dizimos_ofertas')
     .insert(dataToSave);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Lançamento registrado.'
    });
   }

   setCurrentLancamentoId(null);
   setFormData(initialFormState);
   fetchData();
  }catch(error){
   toast({
    title:'Erro ao salvar',
    variant:'destructive',
    description:error.message
   });
  }
 };

 const openDialog=item=>{
  if(item){
   setCurrentLancamentoId(item.id);
   setFormData({
    data:item.data||getBRDate(),
    valor:money(item.valor),
    tipo_movimento:item.tipo_movimento||'DÍZIMO'
   });
  }else{
   setCurrentLancamentoId(null);
   setFormData(initialFormState);
  }

  setIsDialogOpen(true);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  setCurrentLancamentoId(null);
  setFormData(initialFormState);
 };

 const closeExport=()=>setIsExportOpen(false);

 const handleDelete=async id=>{
  try{
   const{error}=await supabase
    .from('pessoal_dizimos_ofertas')
    .delete()
    .eq('id',id);

   if(error)throw error;

   toast({
    title:'Removido',
    description:'Lançamento removido.'
   });

   fetchData();
  }catch(error){
   toast({
    title:'Erro ao remover',
    variant:'destructive',
    description:error.message
   });
  }
 };

 const handleExport=()=>{
  const filteredData=lancamentos.filter(item=>{
   const d=parseISO(item.data);
   return getMonth(d)===exportFilters.month&&getYear(d)===exportFilters.year;
  });

  if(!filteredData.length){
   toast({
    title:'Nenhum dado para exportar',
    description:'Não há registros para o período selecionado.',
    variant:'destructive'
   });
   return;
  }

  const dataToExport=filteredData.map(item=>({
   DATA:brDate(item.data),
   TIPO:item.tipo_movimento,
   VALOR:parseFloat(item.valor)
  }));

  const worksheet=XLSX.utils.json_to_sheet(dataToExport);
  const workbook=XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
   workbook,
   worksheet,
   'Dizimos e Ofertas'
  );

  XLSX.writeFile(
   workbook,
   `Dizimos_Ofertas_Pessoal_${meses[exportFilters.month]}_${exportFilters.year}.xlsx`
  );

  setIsExportOpen(false);
 };

 const totalPeriodo=useMemo(
  ()=>filteredLancamentos.reduce(
   (acc,curr)=>acc+parseFloat(curr.valor||0),
   0
  ),
  [filteredLancamentos]
 );

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="space-y-8 py-8 dark-pessoal"
  >

   <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
    <div>
     <h1 className="text-3xl font-extrabold tracking-tight text-blue-500">
      Dízimos e Ofertas
     </h1>
     <p className="mt-1 text-lg text-muted-foreground">
      Registre e gerencie suas contribuições.
     </p>
    </div>

    <div className="flex flex-wrap gap-3">
     <Button
      onClick={()=>setIsExportOpen(true)}
      variant="outline"
      className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      onClick={()=>setIsSearchModalOpen(true)}
      variant="outline"
      className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
     >
      <Search className="mr-2 h-4 w-4"/>
      Selecionar
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Registro
     </Button>
    </div>
   </div>

   <ModalLancamentoPadrao
    open={isExportOpen}
    onClose={closeExport}
    title="Exportar Dízimos e Ofertas"
    description="Selecione o mês e o ano para exportar."
    icon={Download}
    theme="blue"
    footer={
     <>
      <Button
       variant="outline"
       onClick={closeExport}
       className="h-10 rounded-xl"
      >
       Cancelar
      </Button>

      <Button
       onClick={handleExport}
       className="h-10 rounded-xl bg-blue-600 px-6 font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
      >
       Exportar
      </Button>
     </>
    }
   >
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

     <div className="space-y-2">
      <Label>Mês</Label>
      <Select
       value={String(exportFilters.month)}
       onValueChange={v=>setExportFilters(p=>({
        ...p,
        month:Number(v)
       }))}
      >
       <SelectTrigger className="h-11 rounded-xl bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="z-[200]">
        <ScrollArea className="h-48">
         {meses.map((m,i)=>(
          <SelectItem key={i} value={String(i)}>
           {m}
          </SelectItem>
         ))}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>

     <div className="space-y-2">
      <Label>Ano</Label>
      <Select
       value={String(exportFilters.year)}
       onValueChange={v=>setExportFilters(p=>({
        ...p,
        year:Number(v)
       }))}
      >
       <SelectTrigger className="h-11 rounded-xl bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="z-[200]">
        {availableYears.map(y=>(
         <SelectItem key={y} value={String(y)}>
          {y}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>

    </div>
   </ModalLancamentoPadrao>

   <SearchableModal
    isOpen={isSearchModalOpen}
    onClose={()=>setIsSearchModalOpen(false)}
    onSelect={item=>{
     openDialog(item);
     setIsSearchModalOpen(false);
    }}
    tableName="pessoal_dizimos_ofertas"
    searchField="tipo_movimento"
    displayFields={[
     {key:'data',label:'Data',format:brDate},
     {key:'tipo_movimento',label:'Tipo'},
     {key:'valor',label:'Valor',format:moneyShow}
    ]}
    title="Buscar Lançamento"
   />

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={currentLancamentoId?'Editar Registro':'Novo Registro'}
    description="Preencha os dados da contribuição."
    icon={Heart}
    theme="blue"
    footer={
     <>
      <Button
       type="button"
       variant="outline"
       onClick={closeDialog}
       className="h-10 rounded-xl"
      >
       Cancelar
      </Button>

      <Button
       type="button"
       onClick={handleSave}
       className="h-10 rounded-xl bg-blue-600 px-7 font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
      >
       Salvar
      </Button>
     </>
    }
   >
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

     <div className="space-y-2">
      <Label>Data</Label>
      <Input
       type="date"
       value={formData.data}
       onChange={e=>setFormData({
        ...formData,
        data:e.target.value
       })}
       className="h-11 rounded-xl bg-input"
       required
      />
     </div>

     <div className="space-y-2">
      <Label>Valor (R$)</Label>
      <Input
       type="text"
       inputMode="decimal"
       value={formData.valor}
       onChange={e=>setFormData({
        ...formData,
        valor:money(e.target.value)
       })}
       className="h-11 rounded-xl bg-input font-semibold tabular-nums"
       placeholder="R$ 0,00"
       required
      />
     </div>

    </div>

    <div className="space-y-2">
     <Label>Tipo de Movimento</Label>

     <Select
      value={formData.tipo_movimento}
      onValueChange={v=>setFormData({
       ...formData,
       tipo_movimento:v
      })}
     >
      <SelectTrigger className="h-11 rounded-xl bg-input">
       <SelectValue placeholder="Selecione"/>
      </SelectTrigger>

      <SelectContent className="z-[200]">
       <SelectItem value="DÍZIMO">
        Dízimo
       </SelectItem>

       <SelectItem value="OFERTA">
        Oferta
       </SelectItem>
      </SelectContent>
     </Select>
    </div>

   </ModalLancamentoPadrao>

   <div className="grid gap-6 md:grid-cols-4">

    <Card className="col-span-1 rounded-2xl border-border bg-card shadow-md md:col-span-3">
     <CardContent className="flex flex-col items-center gap-4 p-5 md:flex-row">

      <div className="relative flex w-full flex-1 items-center gap-2">
       <Search className="absolute left-3 h-5 w-5 text-muted-foreground"/>

       <Input
        placeholder="Buscar por tipo..."
        value={searchTerm}
        onChange={e=>setSearchTerm(e.target.value)}
        className="h-12 flex-1 bg-input pl-10 text-base text-foreground"
       />
      </div>

      <div className="flex w-full gap-3 md:w-auto">

       <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="h-12 w-[150px] bg-input text-foreground">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="all">
          Todos os Meses
         </SelectItem>

         {Array.from({length:12},(_,i)=>(
          <SelectItem key={i} value={String(i)}>
           {format(new Date(2024,i,1),'MMMM',{locale:ptBR})}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>

       <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="h-12 w-[110px] bg-input text-foreground">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="all">
          Todos os Anos
         </SelectItem>

         {availableYears.map(y=>(
          <SelectItem key={y} value={String(y)}>
           {y}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>

      </div>
     </CardContent>
    </Card>

    <Card className="flex flex-col justify-center rounded-2xl border-blue-500/20 bg-blue-500/10 shadow-md">
     <CardHeader className="pb-1 pt-5">
      <CardTitle className="text-sm font-semibold uppercase tracking-wide text-blue-500">
       Total Filtrado
      </CardTitle>
     </CardHeader>

     <CardContent>
      <div className="truncate text-3xl font-black text-blue-500">
       {moneyShow(totalPeriodo)}
      </div>
     </CardContent>
    </Card>

   </div>

   <Card className="overflow-hidden rounded-2xl border-border bg-card shadow-lg">
    <CardContent className="p-0">

     <ScrollArea className="h-[500px]">
      <Table>

       <TableHeader className="sticky top-0 z-10 border-b border-border bg-secondary/50 backdrop-blur-sm">
        <TableRow className="hover:bg-transparent">
         <TableHead className="py-4 pl-6 font-semibold">Data</TableHead>
         <TableHead className="py-4 font-semibold">Tipo</TableHead>
         <TableHead className="py-4 text-right font-semibold">Valor</TableHead>
         <TableHead className="w-[120px] py-4 pr-6 text-center font-semibold">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>

        {loading?(
         <TableRow>
          <TableCell colSpan="4" className="py-16 text-center text-muted-foreground">
           Carregando...
          </TableCell>
         </TableRow>
        ):filteredLancamentos.length===0?(
         <TableRow>
          <TableCell colSpan="4" className="py-16 text-center text-muted-foreground">
           <Heart className="mx-auto mb-2 h-10 w-10"/>
           Nenhum registro encontrado neste período.
          </TableCell>
         </TableRow>
        ):(
         filteredLancamentos.map(item=>(
          <TableRow
           key={item.id}
           className="border-b border-border transition-colors duration-200 hover:bg-secondary/50"
          >
           <TableCell className="py-4 pl-6 font-medium">
            {brDate(item.data)}
           </TableCell>

           <TableCell className="py-4">
            <span className="font-semibold text-foreground">
             {item.tipo_movimento}
            </span>
           </TableCell>

           <TableCell className="py-4 text-right font-bold text-green-400">
            {moneyShow(item.valor)}
           </TableCell>

           <TableCell className="py-4 pr-6 text-center">
            <div className="flex items-center justify-center gap-2">

             <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={()=>openDialog(item)}
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-red-500 hover:bg-red-500/10 hover:text-red-600"
               >
                <Trash2 className="h-4 w-4"/>
               </Button>
              </AlertDialogTrigger>

              <AlertDialogContent className="dark-pessoal z-[150]">
               <AlertDialogHeader>
                <AlertDialogTitle>
                 Confirmar Exclusão
                </AlertDialogTitle>

                <AlertDialogDescription>
                 Deseja remover este registro?
                </AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>
                 Cancelar
                </AlertDialogCancel>

                <AlertDialogAction
                 onClick={()=>handleDelete(item.id)}
                 className="bg-red-600"
                >
                 Deletar
                </AlertDialogAction>
               </AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>

            </div>
           </TableCell>
          </TableRow>
         ))
        )}

       </TableBody>
      </Table>
     </ScrollArea>

    </CardContent>
   </Card>

  </motion.div>
 );
};

export default LancamentoDizimosOfertas;
