import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,TrendingUp,Search,Download,DollarSign,Landmark,CalendarDays,Receipt,RotateCcw}from'lucide-react';
import{parseISO,getMonth,getYear}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import{exportToExcel}from'@/lib/ExportUtils';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TZ='America/Sao_Paulo',BLUE='hsl(var(--neon-pessoal))';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const roundMoney=v=>fromCents(toCents(v));

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?BRL.format(fromCents(Number(d))):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?fromCents(Number(d)):0;
};

const moneyShow=v=>BRL.format(roundMoney(v));
const brDate=d=>d?new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';

const Rendimentos=()=>{
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);
 const[rendimentos,setRendimentos]=useState([]),[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState(''),[selectedMonth,setSelectedMonth]=useState('all'),[selectedYear,setSelectedYear]=useState('all');
 const[currentPage,setCurrentPage]=useState(1),[isDialogOpen,setIsDialogOpen]=useState(false),[currentRendimento,setCurrentRendimento]=useState(null);
 const[formData,setFormData]=useState({data:getBRDate(),banco:'',rendimento_bruto:'',iof:'',ir:''});
 const pageSize=10;

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const{data,error}=await supabase
    .from('rendimentos')
    .select('*')
    .eq('user_id',user.id)
    .order('data',{ascending:false});

   if(error)throw error;
   if(mounted.current)setRendimentos(data||[]);
  }catch(error){
   if(mounted.current)toast({
    title:'Erro ao carregar rendimentos',
    description:error.message||'Não foi possível carregar os rendimentos.',
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
   .channel('pessoal_rendimentos_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'rendimentos'},fetchData)
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const availableYears=useMemo(()=>{
  const years=rendimentos.map(x=>getYear(parseISO(x.data)));
  years.push(new Date().getFullYear());
  return[...new Set(years)].sort((a,b)=>b-a);
 },[rendimentos]);

 const filtered=useMemo(()=>{
  let r=rendimentos;

  if(selectedYear!=='all'){
   r=r.filter(x=>String(getYear(parseISO(x.data)))===selectedYear);
  }

  if(selectedMonth!=='all'){
   r=r.filter(x=>String(getMonth(parseISO(x.data)))===selectedMonth);
  }

  if(searchTerm.trim()){
   const q=searchTerm.toLowerCase();
   r=r.filter(x=>(x.banco||'').toLowerCase().includes(q));
  }

  return r;
 },[rendimentos,selectedYear,selectedMonth,searchTerm]);

 useEffect(()=>setCurrentPage(1),[selectedYear,selectedMonth,searchTerm]);

 const brutoC=filtered.reduce((s,x)=>s+toCents(x.rendimento_bruto),0);
 const descontosC=filtered.reduce((s,x)=>s+toCents(x.iof)+toCents(x.ir),0);
 const liquidoC=filtered.reduce((s,x)=>s+toCents(x.rendimento_liquido),0);
 const bruto=fromCents(brutoC),descontos=fromCents(descontosC),liquido=fromCents(liquidoC);
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const paginated=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);

 const resetForm=()=>{
  setFormData({
   data:getBRDate(),
   banco:'',
   rendimento_bruto:'',
   iof:'',
   ir:''
  });
  setCurrentRendimento(null);
 };

 const openDialog=item=>{
  if(item){
   setCurrentRendimento(item);
   setFormData({
    data:String(item.data||'').slice(0,10)||getBRDate(),
    banco:item.banco||'',
    rendimento_bruto:money(item.rendimento_bruto),
    iof:money(item.iof),
    ir:money(item.ir)
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

  const brutoC=toCents(moneyNum(formData.rendimento_bruto));
  const iofC=toCents(moneyNum(formData.iof));
  const irC=toCents(moneyNum(formData.ir));
  const liquidoC=brutoC-iofC-irC;

  if(!formData.data||!formData.banco.trim()||brutoC<=0){
   toast({
    title:'Campos obrigatórios',
    description:'Data, banco e rendimento bruto são obrigatórios.',
    variant:'destructive'
   });
   return;
  }

  if(iofC<0||irC<0){
   toast({
    title:'Valores inválidos',
    description:'IOF e IR não podem ser negativos.',
    variant:'destructive'
   });
   return;
  }

  if(liquidoC<0){
   toast({
    title:'Valores inválidos',
    description:'O rendimento líquido não pode ser negativo.',
    variant:'destructive'
   });
   return;
  }

  const payload={
   data:formData.data,
   banco:formData.banco.trim(),
   rendimento_bruto:fromCents(brutoC),
   iof:fromCents(iofC),
   ir:fromCents(irC),
   rendimento_liquido:fromCents(liquidoC),
   user_id:user.id
  };

  try{
   const result=currentRendimento
    ?await supabase
     .from('rendimentos')
     .update(payload)
     .eq('id',currentRendimento.id)
     .eq('user_id',user.id)
    :await supabase
     .from('rendimentos')
     .insert(payload);

   if(result.error)throw result.error;

   toast({
    title:'Sucesso',
    description:currentRendimento?'Rendimento atualizado.':'Novo rendimento registrado.'
   });

   closeDialog();
   fetchData();
  }catch(error){
   toast({
    title:'Erro ao salvar',
    description:error.message||'Não foi possível salvar o rendimento.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async id=>{
  try{
   const{error}=await supabase
    .from('rendimentos')
    .delete()
    .eq('id',id)
    .eq('user_id',user.id);

   if(error)throw error;

   toast({
    title:'Removido',
    description:'Rendimento removido.'
   });

   fetchData();
  }catch(error){
   toast({
    title:'Erro ao remover',
    description:error.message||'Não foi possível remover o rendimento.',
    variant:'destructive'
   });
  }
 };

 const handleExport=()=>{
  if(!filtered.length){
   toast({
    title:'Sem dados',
    description:'Não há rendimentos para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   filtered.map(x=>({
    DATA:brDate(x.data),
    BANCO:x.banco,
    'RENDIMENTO BRUTO':roundMoney(x.rendimento_bruto),
    IOF:roundMoney(x.iof),
    IR:roundMoney(x.ir),
    'RENDIMENTO LÍQUIDO':roundMoney(x.rendimento_liquido)
   })),
   'Rendimentos_Investimentos',
   'Rendimentos'
  );
 };

 const limparFiltros=()=>{
  setSearchTerm('');
  setSelectedMonth('all');
  setSelectedYear('all');
 };

 const stats=[
  {label:'Registros',value:filtered.length,icon:Receipt},
  {label:'Rendimento Bruto',value:moneyShow(bruto),icon:TrendingUp},
  {label:'Descontos',value:moneyShow(descontos),icon:DollarSign},
  {label:'Rendimento Líquido',value:moneyShow(liquido),icon:CalendarDays}
 ];

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-pessoal space-y-5"
  >
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:BLUE}}>
      Investimentos
     </p>

     <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
      Rendimentos
     </h1>

     <p className="text-sm text-muted-foreground">
      Registre e acompanhe os ganhos dos seus investimentos.
     </p>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={handleExport}
      className="border-border"
      style={{color:BLUE}}
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="text-white shadow-lg hover:opacity-90"
      style={{background:BLUE,boxShadow:'0 0 18px hsl(var(--neon-pessoal)/.2)'}}
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Rendimento
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

      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
       <SelectTrigger className="h-10 w-[140px] bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent>
        <SelectItem value="all">Todos os meses</SelectItem>

        {meses.map((m,i)=>(
         <SelectItem key={i} value={String(i)}>
          {m}
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

        {availableYears.map(y=>(
         <SelectItem key={y} value={String(y)}>
          {y}
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
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={currentRendimento?'Editar Rendimento':'Novo Rendimento'}
    description="Preencha os dados do rendimento."
    icon={TrendingUp}
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
       form="form-rendimento"
       className="h-11 rounded-xl px-6 font-semibold text-white hover:opacity-90"
       style={{background:BLUE}}
      >
       {currentRendimento?'Salvar Alterações':'Salvar Rendimento'}
      </Button>
     </>
    }
   >
    <form
     id="form-rendimento"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
       <div className="space-y-2">
        <Label>Rendimento Bruto</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.rendimento_bruto}
         onChange={e=>setFormData(p=>({...p,rendimento_bruto:money(e.target.value)}))}
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         placeholder="R$ 0,00"
         required
        />
       </div>

       <div className="space-y-2">
        <Label>IOF</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.iof}
         onChange={e=>setFormData(p=>({...p,iof:money(e.target.value)}))}
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         placeholder="R$ 0,00"
        />
       </div>

       <div className="space-y-2">
        <Label>IR</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.ir}
         onChange={e=>setFormData(p=>({...p,ir:money(e.target.value)}))}
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         placeholder="R$ 0,00"
        />
       </div>
      </div>

      <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-4">
       <p className="text-sm text-muted-foreground">
        Rendimento líquido
       </p>

       <p
        className="mt-1 text-xl font-bold tabular-nums"
        style={{color:BLUE}}
       >
        {moneyShow(
         Math.max(
          0,
          moneyNum(formData.rendimento_bruto)-
          moneyNum(formData.iof)-
          moneyNum(formData.ir)
         )
        )}
       </p>
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
          Bruto
         </th>

         <th className="p-4 text-right font-semibold text-muted-foreground">
          Líquido
         </th>

         <th className="p-4 text-center font-semibold text-muted-foreground">
          Ações
         </th>
        </tr>
       </thead>

       <tbody>
        {loading?(
         <tr>
          <td colSpan={5} className="p-12 text-center text-muted-foreground">
           Carregando rendimentos...
          </td>
         </tr>
        ):paginated.length===0?(
         <tr>
          <td colSpan={5} className="p-12 text-center">
           <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-8 w-8 opacity-40"/>
            <span>Nenhum rendimento encontrado.</span>
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
             <Landmark className="h-4 w-4" style={{color:BLUE}}/>
             {item.banco}
            </div>
           </td>

           <td className="p-4 text-right font-semibold text-muted-foreground tabular-nums">
            {moneyShow(item.rendimento_bruto)}
           </td>

           <td
            className="p-4 text-right font-bold tabular-nums"
            style={{color:BLUE}}
           >
            {moneyShow(item.rendimento_liquido)}
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
                 Deseja remover este rendimento?
                </AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>

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
        Mostrando {((currentPage-1)*pageSize)+1}–
        {Math.min(currentPage*pageSize,filtered.length)} de {filtered.length}
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

export default Rendimentos;
