import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,Search,BookOpen,Download,BookMarked,Hash,CalendarDays,RotateCcw}from'lucide-react';
import{getMonth,getYear,parseISO}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import{exportToExcel}from'@/lib/ExportUtils';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const TZ='America/Sao_Paulo',BLUE='hsl(var(--neon-pessoal))';
const getBRDate=()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 parts.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};
const brDate=d=>d?new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—';

const Leitura=()=>{
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);
 const[leituras,setLeituras]=useState([]),[livros,setLivros]=useState([]),[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState(''),[selectedMonth,setSelectedMonth]=useState('all'),[selectedYear,setSelectedYear]=useState('all'),[currentPage,setCurrentPage]=useState(1);
 const[isDialogOpen,setIsDialogOpen]=useState(false),[isSearchModalOpen,setIsSearchModalOpen]=useState(false),[itemToDelete,setItemToDelete]=useState(null),[currentLeitura,setCurrentLeitura]=useState(null);
 const[formData,setFormData]=useState({data:getBRDate(),livro:'',capitulos_lidos:''});
 const pageSize=10;

 useEffect(()=>()=>{mounted.current=false},[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[leiturasRes,livrosRes]=await Promise.all([
    supabase.from('leituras').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('livros').select('nome_livro').eq('user_id',user.id).order('nome_livro')
   ]);
   if(leiturasRes.error)throw leiturasRes.error;
   if(livrosRes.error)throw livrosRes.error;
   if(!mounted.current)return;
   setLeituras(leiturasRes.data||[]);
   setLivros(livrosRes.data||[]);
  }catch(error){
   if(mounted.current)toast({title:'Erro',description:error.message||'Não foi possível carregar os dados.',variant:'destructive'});
  }finally{if(mounted.current)setLoading(false)}
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase.channel('pessoal_leitura_changes').on('postgres_changes',{event:'*',schema:'public',table:'leituras'},fetchData).subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const availableYears=useMemo(()=>{
  const years=leituras.map(x=>getYear(parseISO(x.data)));
  years.push(new Date().getFullYear());
  return[...new Set(years)].sort((a,b)=>b-a);
 },[leituras]);

 const filtered=useMemo(()=>{
  let result=leituras;
  if(selectedYear!=='all')result=result.filter(x=>String(getYear(parseISO(x.data)))===selectedYear);
  if(selectedMonth!=='all')result=result.filter(x=>String(getMonth(parseISO(x.data)))===selectedMonth);
  if(searchTerm.trim()){
   const term=searchTerm.toLowerCase();
   result=result.filter(x=>(x.livro||'').toLowerCase().includes(term));
  }
  return result;
 },[leituras,selectedYear,selectedMonth,searchTerm]);

 useEffect(()=>setCurrentPage(1),[selectedYear,selectedMonth,searchTerm]);

 const totalCapitulos=filtered.reduce((s,x)=>s+Number(x.capitulos_lidos||0),0);
 const totalLivros=new Set(filtered.map(x=>x.livro).filter(Boolean)).size;
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const paginated=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);

 const resetForm=()=>{setFormData({data:getBRDate(),livro:'',capitulos_lidos:''});setCurrentLeitura(null)};
 const openDialog=item=>{
  if(item){
   setCurrentLeitura(item);
   setFormData({data:item.data||getBRDate(),livro:item.livro||'',capitulos_lidos:item.capitulos_lidos||''});
  }else resetForm();
  setIsDialogOpen(true);
 };
 const closeDialog=()=>{setIsDialogOpen(false);resetForm()};

 const handleSave=async()=>{
  if(!formData.data||!formData.livro||!formData.capitulos_lidos){
   toast({title:'Campos obrigatórios',description:'Preencha todos os campos.',variant:'destructive'});
   return;
  }

  try{
   const payload={...formData,user_id:user.id};
   const result=currentLeitura
    ?await supabase.from('leituras').update(payload).eq('id',currentLeitura.id).eq('user_id',user.id)
    :await supabase.from('leituras').insert(payload);

   if(result.error)throw result.error;
   if(!mounted.current)return;

   toast({title:'Sucesso',description:currentLeitura?'Leitura atualizada.':'Leitura registrada.'});
   closeDialog();
   fetchData();
  }catch(error){
   toast({title:'Erro',description:error.message||'Não foi possível salvar.',variant:'destructive'});
  }
 };

 const handleDelete=async()=>{
  if(!itemToDelete)return;
  try{
   const{error}=await supabase.from('leituras').delete().eq('id',itemToDelete.id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido',description:'Leitura removida.'});
   setItemToDelete(null);
   fetchData();
  }catch(error){
   toast({title:'Erro',description:error.message||'Não foi possível remover.',variant:'destructive'});
  }
 };

 const handleExport=()=>{
  if(!filtered.length){
   toast({title:'Sem dados',description:'Não há leituras para exportar.',variant:'destructive'});
   return;
  }
  exportToExcel(filtered.map(x=>({DATA:brDate(x.data),LIVRO:x.livro,CAPÍTULOS:Number(x.capitulos_lidos||0)})),'Leituras_Biblicas','Leituras');
 };

 const limparFiltros=()=>{
  setSearchTerm('');
  setSelectedMonth('all');
  setSelectedYear('all');
 };

 const stats=[
  ['Leituras',filtered.length,BookMarked],
  ['Capítulos',totalCapitulos,Hash],
  ['Livros',totalLivros,BookOpen],
  ['Período',selectedMonth==='all'?'Todos':meses[Number(selectedMonth)],CalendarDays]
 ];

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="dark-pessoal space-y-5">

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:BLUE}}>Vida Pessoal</p>
     <h1 className="mt-1 text-2xl font-bold">Lançamento de Leitura</h1>
     <p className="text-sm text-muted-foreground">Registre e acompanhe suas leituras bíblicas.</p>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={handleExport} style={{color:BLUE}}>
      <Download className="mr-2 h-4 w-4"/>Exportar
     </Button>

     <Button variant="outline" onClick={()=>setIsSearchModalOpen(true)} style={{color:BLUE}}>
      <Search className="mr-2 h-4 w-4"/>Selecionar
     </Button>

     <Button onClick={()=>openDialog()} className="text-white" style={{background:BLUE}}>
      <Plus className="mr-2 h-4 w-4"/>Nova Leitura
     </Button>
    </div>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {stats.map(([label,value,Icon])=>(
     <Card key={label} className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-4">
       <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold" style={{color:BLUE}}>{value}</p>
       </div>
       <div className="rounded-xl bg-blue-500/10 p-2.5" style={{color:BLUE}}><Icon className="h-5 w-5"/></div>
      </CardContent>
     </Card>
    ))}
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">
     <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="relative min-w-0 flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar por livro..." className="h-10 bg-input pl-9"/>
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
         {availableYears.map(year=><SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
        </SelectContent>
       </Select>

       <Button variant="outline" onClick={limparFiltros} className="h-10">
        <RotateCcw className="mr-2 h-4 w-4"/>Limpar
       </Button>
      </div>
     </div>
    </CardContent>
   </Card>

   <SearchableModal
    isOpen={isSearchModalOpen}
    onClose={()=>setIsSearchModalOpen(false)}
    onSelect={item=>{openDialog(item);setIsSearchModalOpen(false)}}
    tableName="leituras"
    searchField="livro"
    displayFields={[
     {key:'data',label:'Data',format:brDate},
     {key:'livro',label:'Livro'},
     {key:'capitulos_lidos',label:'Capítulos'}
    ]}
    title="Buscar Leitura"
   />

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={currentLeitura?'Editar Leitura':'Nova Leitura'}
    description="Registre a data, o livro e os capítulos lidos."
    icon={BookOpen}
    theme="blue"
    footer={
     <>
      <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
      <Button onClick={handleSave} className="text-white" style={{background:BLUE}}>
       {currentLeitura?'Salvar Alterações':'Salvar Leitura'}
      </Button>
     </>
    }
   >
    <div className="space-y-5">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label>Data</Label>
       <Input type="date" value={formData.data} onChange={e=>setFormData(p=>({...p,data:e.target.value}))} className="h-11 rounded-xl bg-input"/>
      </div>

      <div className="space-y-2">
       <Label>Capítulos</Label>
       <Input type="number" min="1" value={formData.capitulos_lidos} onChange={e=>setFormData(p=>({...p,capitulos_lidos:e.target.value}))} className="h-11 rounded-xl bg-input"/>
      </div>
     </div>

     <div className="space-y-2">
      <Label>Livro</Label>
      <Select value={formData.livro} onValueChange={v=>setFormData(p=>({...p,livro:v}))}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione o livro"/></SelectTrigger>
       <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
        <ScrollArea className="h-48">
         {livros.map(l=><SelectItem key={l.nome_livro} value={l.nome_livro}>{l.nome_livro}</SelectItem>)}
        </ScrollArea>
       </SelectContent>
      </Select>
     </div>
    </div>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-border bg-secondary/30">
         <th className="p-4 text-left font-semibold text-muted-foreground">Data</th>
         <th className="p-4 text-left font-semibold text-muted-foreground">Livro</th>
         <th className="p-4 text-right font-semibold text-muted-foreground">Capítulos</th>
         <th className="p-4 text-center font-semibold text-muted-foreground">Ações</th>
        </tr>
       </thead>

       <tbody>
        {loading?(
         <tr><td colSpan={4} className="p-12 text-center text-muted-foreground">Carregando leituras...</td></tr>
        ):paginated.length===0?(
         <tr><td colSpan={4} className="p-12 text-center"><div className="flex flex-col items-center gap-2 text-muted-foreground"><BookOpen className="h-8 w-8 opacity-40"/><span>Nenhuma leitura encontrada.</span></div></td></tr>
        ):paginated.map(item=>(
         <tr key={item.id} className="border-b border-border transition-colors hover:bg-muted/40">
          <td className="p-4 text-muted-foreground">{brDate(item.data)}</td>
          <td className="p-4 font-medium">{item.livro}</td>
          <td className="p-4 text-right font-bold" style={{color:BLUE}}>{item.capitulos_lidos}</td>
          <td className="p-4">
           <div className="flex justify-center gap-1">
            <Button variant="ghost" size="icon" onClick={()=>openDialog(item)} style={{color:BLUE}}><Edit className="h-4 w-4"/></Button>
            <Button variant="ghost" size="icon" onClick={()=>setItemToDelete(item)} className="text-red-500"><Trash className="h-4 w-4"/></Button>
           </div>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>

     {!loading&&filtered.length>0&&(
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
       <span>Mostrando {((currentPage-1)*pageSize)+1}–{Math.min(currentPage*pageSize,filtered.length)} de {filtered.length}</span>
       <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}>Anterior</Button>
        <span className="px-2 text-xs">{currentPage} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}>Próxima</Button>
       </div>
      </div>
     )}
    </CardContent>
   </Card>

   <AlertDialog open={!!itemToDelete} onOpenChange={open=>{if(!open)setItemToDelete(null)}}>
    <AlertDialogContent className="dark-pessoal">
     <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle></AlertDialogHeader>
     <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>

  </motion.div>
 );
};

export default Leitura;
