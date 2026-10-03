import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,Heart,Search,Download,Receipt,DollarSign,TrendingDown,CalendarDays,RotateCcw}from'lucide-react';
import{parseISO,getMonth,getYear}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Card,CardContent}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import{exportToExcel}from'@/lib/ExportUtils';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TZ='America/Sao_Paulo';
const GREEN='hsl(142 70% 45%)';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const roundMoney=v=>fromCents(toCents(v));

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const moneyInput=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?BRL.format(fromCents(Number(d))):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?fromCents(Number(d)):0;
};

const moneyShow=v=>BRL.format(roundMoney(v));

const brDate=d=>d?new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';

const LancamentoDizimosOfertas=()=>{
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);
 const[lancamentos,setLancamentos]=useState([]);
 const[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState('');
 const[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[currentPage,setCurrentPage]=useState(1);
 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[isSearchModalOpen,setIsSearchModalOpen]=useState(false);
 const[isExportOpen,setIsExportOpen]=useState(false);
 const[currentLancamentoId,setCurrentLancamentoId]=useState(null);
 const[exportFilters,setExportFilters]=useState({month:new Date().getMonth(),year:new Date().getFullYear()});
 const initialForm=()=>({data:getBRDate(),valor:'',tipo_movimento:'DÍZIMO'});
 const[formData,setFormData]=useState(initialForm);
 const pageSize=10;

 useEffect(()=>{
  mounted.current=true;
  return()=>{mounted.current=false};
 },[]);

 const availableYears=useMemo(()=>{
  const years=lancamentos.map(d=>getYear(parseISO(d.data)));
  years.push(new Date().getFullYear());
  return[...new Set(years)].sort((a,b)=>b-a);
 },[lancamentos]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const{data,error}=await supabase.from('pessoal_dizimos_ofertas').select('*').eq('user_id',user.id).order('data',{ascending:false});
   if(error)throw error;
   if(!mounted.current)return;
   setLancamentos(data||[]);
  }catch(error){
   if(mounted.current)toast({title:'Erro ao carregar lançamentos',description:error.message||'Não foi possível carregar os registros.',variant:'destructive'});
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase.channel('pessoal_dizimos_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'pessoal_dizimos_ofertas'},()=>fetchData())
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filtered=useMemo(()=>{
  let result=lancamentos;
  if(selectedYear!=='all')result=result.filter(x=>String(getYear(parseISO(x.data)))===selectedYear);
  if(selectedMonth!=='all')result=result.filter(x=>String(getMonth(parseISO(x.data)))===selectedMonth);
  if(searchTerm.trim()){
   const term=searchTerm.toLowerCase();
   result=result.filter(x=>(x.tipo_movimento||'').toLowerCase().includes(term));
  }
  return result;
 },[lancamentos,selectedYear,selectedMonth,searchTerm]);

 useEffect(()=>setCurrentPage(1),[selectedYear,selectedMonth,searchTerm]);

 const totalC=filtered.reduce((s,x)=>s+toCents(x.valor),0);
 const averageC=filtered.length?Math.round(totalC/filtered.length):0;
 const biggestC=filtered.reduce((m,x)=>Math.max(m,toCents(x.valor)),0);
 const total=fromCents(totalC);
 const average=fromCents(averageC);
 const biggest=fromCents(biggestC);
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const paginated=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);

 const handleSave=async()=>{
  if(!formData.data||!formData.valor||!formData.tipo_movimento){
   toast({title:'Campos obrigatórios',description:'Preencha todos os campos.',variant:'destructive'});
   return;
  }

  const valor=roundMoney(moneyNum(formData.valor));
  if(valor<=0){
   toast({title:'Valor inválido',description:'Informe um valor maior que zero.',variant:'destructive'});
   return;
  }

  const dataToSave={...formData,user_id:user.id,valor};

  try{
   const result=currentLancamentoId
    ?await supabase.from('pessoal_dizimos_ofertas').update(dataToSave).eq('id',currentLancamentoId).eq('user_id',user.id)
    :await supabase.from('pessoal_dizimos_ofertas').insert(dataToSave);

   if(result.error)throw result.error;

   toast({title:'Sucesso',description:currentLancamentoId?'Lançamento atualizado.':'Lançamento registrado.'});
   closeDialog();
   fetchData();
  }catch(error){
   toast({title:'Erro ao salvar',description:error.message||'Não foi possível salvar o lançamento.',variant:'destructive'});
  }
 };

 const openDialog=item=>{
  if(item){
   setCurrentLancamentoId(item.id);
   setFormData({
    data:item.data||getBRDate(),
    valor:moneyInput(item.valor),
    tipo_movimento:item.tipo_movimento||'DÍZIMO'
   });
  }else{
   setCurrentLancamentoId(null);
   setFormData(initialForm());
  }
  setIsDialogOpen(true);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  setCurrentLancamentoId(null);
  setFormData(initialForm());
 };

 const handleDelete=async id=>{
  try{
   const{error}=await supabase.from('pessoal_dizimos_ofertas').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido',description:'Lançamento removido.'});
   fetchData();
  }catch(error){
   toast({title:'Erro ao remover',description:error.message||'Não foi possível remover.',variant:'destructive'});
  }
 };

 const handleExport=()=>{
  const exportData=lancamentos.filter(item=>{
   const d=parseISO(item.data);
   return getMonth(d)===exportFilters.month&&getYear(d)===exportFilters.year;
  });

  if(!exportData.length){
   toast({title:'Sem dados',description:'Não há registros para o período selecionado.',variant:'destructive'});
   return;
  }

  exportToExcel(
   exportData.map(item=>({
    DATA:brDate(item.data),
    TIPO:item.tipo_movimento,
    VALOR:roundMoney(item.valor)
   })),
   `Dizimos_Ofertas_${meses[exportFilters.month]}_${exportFilters.year}`,
   'Dízimos e Ofertas'
  );

  setIsExportOpen(false);
 };

 const limparFiltros=()=>{
  setSearchTerm('');
  setSelectedMonth(String(new Date().getMonth()));
  setSelectedYear(String(new Date().getFullYear()));
 };

 const stats=[
  {label:'Lançamentos',value:filtered.length,icon:Receipt},
  {label:'Total no Período',value:moneyShow(total),icon:DollarSign},
  {label:'Média',value:moneyShow(average),icon:TrendingDown},
  {label:'Maior Lançamento',value:moneyShow(biggest),icon:CalendarDays}
 ];

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="dark-pessoal space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:GREEN}}>Finanças Pessoais</p>
     <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Dízimos e Ofertas</h1>
     <p className="text-sm text-muted-foreground">Registre e acompanhe suas contribuições.</p>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={()=>setIsExportOpen(true)} className="border-border hover:bg-green-500/10" style={{color:GREEN}}><Download className="mr-2 h-4 w-4"/>Exportar</Button>
     <Button variant="outline" onClick={()=>setIsSearchModalOpen(true)} className="border-border hover:bg-green-500/10" style={{color:GREEN}}><Search className="mr-2 h-4 w-4"/>Selecionar</Button>
     <Button onClick={()=>openDialog()} className="text-white shadow-lg" style={{background:GREEN,boxShadow:'0 0 18px hsl(142 70% 45% / .20)'}}><Plus className="mr-2 h-4 w-4"/>Novo Lançamento</Button>
    </div>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {stats.map(({label,value,icon:Icon})=>(
     <Card key={label} className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-4">
       <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold tabular-nums" style={{color:GREEN}}>{value}</p>
       </div>
       <div className="rounded-xl bg-green-500/10 p-2.5" style={{color:GREEN}}><Icon className="h-5 w-5"/></div>
      </CardContent>
     </Card>
    ))}
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">
     <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="relative min-w-0 flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input placeholder="Buscar por tipo..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="h-10 bg-input pl-9"/>
      </div>
      <div className="flex flex-wrap gap-2">
       <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="h-10 w-[140px] bg-input"><SelectValue/></SelectTrigger>
        <SelectContent>
         <SelectItem value="all">Todos os meses</SelectItem>
         {meses.map((mes,i)=><SelectItem key={i} value={String(i)}>{mes}</SelectItem>)}
        </SelectContent>
       </Select>

       <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="h-10 w-[110px] bg-input"><SelectValue/></SelectTrigger>
        <SelectContent>
         <SelectItem value="all">Todos os anos</SelectItem>
         {availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
       </Select>

       <Button variant="outline" onClick={limparFiltros} className="h-10 border-border"><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button>
      </div>
     </div>
    </CardContent>
   </Card>

   <SearchableModal
    isOpen={isSearchModalOpen}
    onClose={()=>setIsSearchModalOpen(false)}
    onSelect={item=>{openDialog(item);setIsSearchModalOpen(false)}}
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
    open={isExportOpen}
    onClose={()=>setIsExportOpen(false)}
    title="Exportar Dízimos e Ofertas"
    description="Selecione o mês e o ano para exportar."
    icon={Download}
    theme="blue"
    footer={
     <>
      <Button variant="outline" onClick={()=>setIsExportOpen(false)} className="h-10 rounded-xl">Cancelar</Button>
      <Button onClick={handleExport} className="h-10 rounded-xl px-6 font-semibold text-white" style={{background:GREEN}}>Exportar</Button>
     </>
    }
   >
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
     <div className="space-y-2">
      <Label>Mês</Label>
      <Select value={String(exportFilters.month)} onValueChange={v=>setExportFilters(p=>({...p,month:Number(v)}))}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue/></SelectTrigger>
       <SelectContent>{meses.map((mes,i)=><SelectItem key={i} value={String(i)}>{mes}</SelectItem>)}</SelectContent>
      </Select>
     </div>

     <div className="space-y-2">
      <Label>Ano</Label>
      <Select value={String(exportFilters.year)} onValueChange={v=>setExportFilters(p=>({...p,year:Number(v)}))}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue/></SelectTrigger>
       <SelectContent>{availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
      </Select>
     </div>
    </div>
   </ModalLancamentoPadrao>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={currentLancamentoId?'Editar Lançamento':'Novo Lançamento'}
    description="Preencha os dados da contribuição."
    icon={Heart}
    theme="blue"
    footer={
     <>
      <Button type="button" variant="outline" onClick={closeDialog} className="h-10 rounded-xl">Cancelar</Button>
      <Button type="button" onClick={handleSave} className="h-10 rounded-xl px-7 font-semibold text-white" style={{background:GREEN}}>{currentLancamentoId?'Salvar Alterações':'Salvar Lançamento'}</Button>
     </>
    }
   >
    <div className="space-y-5">
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label>Data</Label>
       <Input type="date" value={formData.data} onChange={e=>setFormData(p=>({...p,data:e.target.value}))} className="h-11 rounded-xl bg-input" required/>
      </div>
      <div className="space-y-2">
       <Label>Valor</Label>
       <Input type="text" inputMode="numeric" value={formData.valor} onChange={e=>setFormData(p=>({...p,valor:moneyInput(e.target.value)}))} placeholder="R$ 0,00" className="h-11 rounded-xl bg-input font-semibold tabular-nums" required/>
      </div>
     </div>

     <div className="space-y-2">
      <Label>Tipo de Movimento</Label>
      <Select value={formData.tipo_movimento} onValueChange={v=>setFormData(p=>({...p,tipo_movimento:v}))}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent>
        <SelectItem value="DÍZIMO">Dízimo</SelectItem>
        <SelectItem value="OFERTA">Oferta</SelectItem>
       </SelectContent>
      </Select>
     </div>
    </div>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader className="sticky top-0 z-10 bg-secondary/50 backdrop-blur-sm">
        <TableRow>
         <TableHead>Data</TableHead>
         <TableHead>Tipo</TableHead>
         <TableHead className="text-right">Valor</TableHead>
         <TableHead className="text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Carregando lançamentos...</TableCell></TableRow>
        ):paginated.length===0?(
         <TableRow>
          <TableCell colSpan={4} className="py-12 text-center">
           <div className="flex flex-col items-center gap-2 text-muted-foreground"><Heart className="h-8 w-8 opacity-40"/><span>Nenhum lançamento encontrado.</span></div>
          </TableCell>
         </TableRow>
        ):(
         paginated.map(item=>(
          <TableRow key={item.id} className="transition-colors hover:bg-muted/40">
           <TableCell className="p-4 font-medium">{brDate(item.data)}</TableCell>
           <TableCell className="p-4"><span className="font-medium">{item.tipo_movimento}</span></TableCell>
           <TableCell className="p-4 text-right font-bold tabular-nums" style={{color:GREEN}}>{moneyShow(item.valor)}</TableCell>
           <TableCell className="p-4">
            <div className="flex justify-center gap-1">
             <Button variant="ghost" size="icon" onClick={()=>openDialog(item)} className="hover:bg-green-500/10" style={{color:GREEN}}><Edit className="h-4 w-4"/></Button>

             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4"/></Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="dark-pessoal">
               <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>Deseja remover este lançamento?</AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={()=>handleDelete(item.id)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
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

     {!loading&&filtered.length>0&&(
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
       <span>Mostrando {((currentPage-1)*pageSize)+1}–{Math.min(currentPage*pageSize,filtered.length)} de {filtered.length}</span>
       <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} className="h-8">Anterior</Button>
        <span className="px-2 text-xs">{currentPage} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} className="h-8">Próxima</Button>
       </div>
      </div>
     )}
    </CardContent>
   </Card>
  </motion.div>
 );
};

export default LancamentoDizimosOfertas;
