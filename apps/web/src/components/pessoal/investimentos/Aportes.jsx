import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,PiggyBank,Search,Download,DollarSign,Building2,CalendarDays,TrendingUp,RotateCcw}from'lucide-react';
import{format,parseISO,getMonth,getYear}from'date-fns';
import{ptBR}from'date-fns/locale';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';
import{exportToExcel}from'@/lib/ExportUtils';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TZ='America/Sao_Paulo';
const BLUE='hsl(var(--neon-pessoal))';

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{
  timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(new Date()),v={};

 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d
  ?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100)
  :'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const moneyShow=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL'
}).format(Number(v)||0);

const brDate=d=>d
 ?new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'})
 :'—';

const Aportes=()=>{
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);

 const[aportes,setAportes]=useState([]);
 const[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState('');
 const[selectedMonth,setSelectedMonth]=useState('all');
 const[selectedYear,setSelectedYear]=useState('all');
 const[currentPage,setCurrentPage]=useState(1);

 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[currentAporte,setCurrentAporte]=useState(null);

 const initialForm=()=>({
  data:getBRDate(),
  valor:'',
  banco:''
 });

 const[formData,setFormData]=useState(initialForm);
 const pageSize=10;

 useEffect(()=>{
  mounted.current=true;
  return()=>{mounted.current=false};
 },[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  try{
   const{data,error}=await supabase
    .from('aportes')
    .select('*')
    .eq('user_id',user.id)
    .order('data',{ascending:false});

   if(error)throw error;
   if(!mounted.current)return;

   setAportes(data||[]);
  }catch(error){
   if(!mounted.current)return;

   toast({
    title:'Erro ao carregar aportes',
    description:error.message||'Não foi possível carregar os aportes.',
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
   .channel('pessoal_aportes_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'aportes'
    },
    fetchData
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const availableYears=useMemo(()=>{
  const years=aportes.map(item=>getYear(parseISO(item.data)));
  years.push(new Date().getFullYear());
  return[...new Set(years)].sort((a,b)=>b-a);
 },[aportes]);

 const filtered=useMemo(()=>{
  let result=aportes;

  if(selectedYear!=='all'){
   result=result.filter(
    item=>String(getYear(parseISO(item.data)))===selectedYear
   );
  }

  if(selectedMonth!=='all'){
   result=result.filter(
    item=>String(getMonth(parseISO(item.data)))===selectedMonth
   );
  }

  if(searchTerm.trim()){
   const term=searchTerm.toLowerCase();

   result=result.filter(item=>
    (item.banco||'').toLowerCase().includes(term)
   );
  }

  return result;
 },[aportes,selectedYear,selectedMonth,searchTerm]);

 useEffect(()=>{
  setCurrentPage(1);
 },[selectedYear,selectedMonth,searchTerm]);

 const total=useMemo(
  ()=>filtered.reduce((sum,item)=>sum+Number(item.valor||0),0),
  [filtered]
 );

 const average=filtered.length?total/filtered.length:0;

 const biggest=filtered.length
  ?Math.max(...filtered.map(item=>Number(item.valor||0)))
  :0;

 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));

 const paginated=filtered.slice(
  (currentPage-1)*pageSize,
  currentPage*pageSize
 );

 const resetForm=()=>{
  setFormData(initialForm());
  setCurrentAporte(null);
 };

 const openDialog=aporte=>{
  if(aporte){
   setCurrentAporte(aporte);

   setFormData({
    data:String(aporte.data||'').slice(0,10)||getBRDate(),
    valor:money(Number(aporte.valor||0)*100),
    banco:aporte.banco||''
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

 const handleSave=async e=>{
  e.preventDefault();

  const valor=moneyNum(formData.valor);

  if(
   !formData.data||
   valor<=0||
   !formData.banco.trim()
  ){
   toast({
    title:'Campos obrigatórios',
    description:'Preencha data, valor e banco/corretora.',
    variant:'destructive'
   });
   return;
  }

  const dataToSave={
   data:formData.data,
   valor,
   banco:formData.banco.trim(),
   user_id:user.id
  };

  try{
   const result=currentAporte
    ?await supabase
      .from('aportes')
      .update(dataToSave)
      .eq('id',currentAporte.id)
      .eq('user_id',user.id)
    :await supabase
      .from('aportes')
      .insert(dataToSave);

   if(result.error)throw result.error;

   toast({
    title:'Sucesso',
    description:currentAporte
     ?'Aporte atualizado.'
     :'Novo aporte registrado.'
   });

   closeDialog();
   fetchData();
  }catch(error){
   toast({
    title:'Erro ao salvar',
    description:error.message||'Não foi possível salvar o aporte.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async id=>{
  try{
   const{error}=await supabase
    .from('aportes')
    .delete()
    .eq('id',id)
    .eq('user_id',user.id);

   if(error)throw error;

   toast({
    title:'Removido',
    description:'Aporte removido.'
   });

   fetchData();
  }catch(error){
   toast({
    title:'Erro ao remover',
    description:error.message||'Não foi possível remover o aporte.',
    variant:'destructive'
   });
  }
 };

 const handleExport=()=>{
  if(!filtered.length){
   toast({
    title:'Sem dados',
    description:'Não há aportes para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   filtered.map(item=>({
    DATA:brDate(item.data),
    'BANCO/CORRETORA':item.banco,
    VALOR:Number(item.valor||0)
   })),
   'Aportes_Investimentos',
   'Aportes'
  );
 };

 const limparFiltros=()=>{
  setSearchTerm('');
  setSelectedMonth('all');
  setSelectedYear('all');
 };

 const stats=[
  {label:'Aportes',value:filtered.length,icon:PiggyBank},
  {label:'Total Investido',value:moneyShow(total),icon:DollarSign},
  {label:'Média por Aporte',value:moneyShow(average),icon:TrendingUp},
  {label:'Maior Aporte',value:moneyShow(biggest),icon:CalendarDays}
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
      Investimentos
     </p>

     <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
      Aportes
     </h1>

     <p className="text-sm text-muted-foreground">
      Registre os valores direcionados aos seus investimentos.
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
      Novo Aporte
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

     <div className="flex flex-col gap-3 xl:flex-row xl:items-center">

      <div className="relative min-w-0 flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

       <Input
        placeholder="Buscar por banco ou corretora..."
        value={searchTerm}
        onChange={e=>setSearchTerm(e.target.value)}
        className="h-10 bg-input pl-9"
       />
      </div>

      <div className="flex flex-wrap gap-2">

       <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="h-10 w-[140px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="all">Todos os meses</SelectItem>

         {meses.map((mes,i)=>(
          <SelectItem key={i} value={String(i)}>
           {mes}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>

       <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="h-10 w-[110px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="all">Todos os anos</SelectItem>

         {availableYears.map(year=>(
          <SelectItem key={year} value={String(year)}>
           {year}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>

       <Button
        variant="outline"
        onClick={limparFiltros}
        className="h-10 border-border"
       >
        <RotateCcw className="mr-2 h-4 w-4"/>
        Limpar
       </Button>

      </div>
     </div>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={currentAporte?'Editar Aporte':'Novo Aporte'}
    description="Preencha os dados do aporte."
    icon={PiggyBank}
    theme="blue"
    footer={
     <>
      <Button
       type="button"
       variant="outline"
       onClick={closeDialog}
       className="h-11 rounded-xl border-border px-5"
      >
       Cancelar
      </Button>

      <Button
       type="submit"
       form="form-aporte"
       className="h-11 rounded-xl px-6 font-semibold text-white hover:opacity-90"
       style={{
        background:BLUE,
        boxShadow:'0 0 18px hsl(var(--neon-pessoal)/.22)'
       }}
      >
       {currentAporte?'Salvar Alterações':'Salvar Aporte'}
      </Button>
     </>
    }
   >

    <form
     id="form-aporte"
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
         onChange={e=>setFormData(p=>({...p,data:e.target.value}))}
         className="h-11 rounded-xl bg-input"
         required
        />
       </div>

       <div className="space-y-2">
        <Label>Valor</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.valor}
         onChange={e=>setFormData(p=>({...p,valor:money(e.target.value)}))}
         placeholder="R$ 0,00"
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         required
        />
       </div>

      </div>

      <div className="space-y-2">
       <Label>Banco/Corretora</Label>

       <Input
        value={formData.banco}
        onChange={e=>setFormData(p=>({...p,banco:e.target.value}))}
        className="h-11 rounded-xl bg-input"
        placeholder="Ex: Nubank, Inter"
        required
       />
      </div>

     </div>
    </form>

   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardContent className="p-0">

     <div className="overflow-x-auto">

      <table className="w-full text-sm">

       <thead>
        <tr className="border-b border-border bg-secondary/30">

         <th className="p-4 text-left font-semibold text-muted-foreground">
          Data
         </th>

         <th className="p-4 text-left font-semibold text-muted-foreground">
          Banco/Corretora
         </th>

         <th className="p-4 text-right font-semibold text-muted-foreground">
          Valor
         </th>

         <th className="p-4 text-center font-semibold text-muted-foreground">
          Ações
         </th>

        </tr>
       </thead>

       <tbody>

        {loading?(
         <tr>
          <td colSpan={4} className="p-12 text-center text-muted-foreground">
           Carregando aportes...
          </td>
         </tr>
        ):paginated.length===0?(
         <tr>
          <td colSpan={4} className="p-12 text-center">

           <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <PiggyBank className="h-8 w-8 opacity-40"/>
            <span>Nenhum aporte encontrado.</span>
           </div>

          </td>
         </tr>
        ):(
         paginated.map(item=>(
          <tr
           key={item.id}
           className="border-b border-border transition-colors hover:bg-muted/40"
          >

           <td className="p-4 text-muted-foreground">
            {brDate(item.data)}
           </td>

           <td className="p-4">
            <div className="flex items-center gap-2 font-medium">
             <Building2
              className="h-4 w-4"
              style={{color:BLUE}}
             />
             {item.banco}
            </div>
           </td>

           <td
            className="p-4 text-right font-bold tabular-nums"
            style={{color:BLUE}}
           >
            {moneyShow(item.valor)}
           </td>

           <td className="p-4">

            <div className="flex justify-center gap-1">

             <Button
              variant="ghost"
              size="icon"
              onClick={()=>openDialog(item)}
              className="hover:bg-blue-500/10"
              style={{color:BLUE}}
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <AlertDialog>

              <AlertDialogTrigger asChild>
               <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:bg-red-500/10"
               >
                <Trash className="h-4 w-4"/>
               </Button>
              </AlertDialogTrigger>

              <AlertDialogContent className="dark-pessoal border-border bg-card">

               <AlertDialogHeader>
                <AlertDialogTitle>
                 Confirmar Exclusão
                </AlertDialogTitle>

                <AlertDialogDescription>
                 Deseja remover este aporte?
                </AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>

                <AlertDialogCancel>
                 Cancelar
                </AlertDialogCancel>

                <AlertDialogAction
                 onClick={()=>handleDelete(item.id)}
                 className="bg-red-600 text-white hover:bg-red-700"
                >
                 Deletar
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

     {!loading&&filtered.length>0&&(
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">

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

    </CardContent>
   </Card>

  </motion.div>
 );
};

export default Aportes;
