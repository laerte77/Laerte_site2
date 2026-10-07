import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,FileText,Search,RotateCcw,Boxes,ArrowDownToLine,ArrowUpFromLine,AlertTriangle}from'lucide-react';
import{parseISO,getMonth,getYear}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CYAN='hsl(190 90% 50%)';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const getBRDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
const brDate=d=>d?new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR'):'—';

const LancamentoFolhas=()=>{
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);
 const[folhas,setFolhas]=useState([]),[tiposFolha,setTiposFolha]=useState([]),[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState(''),[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear())),[currentPage,setCurrentPage]=useState(1);
 const[dialogOpen,setDialogOpen]=useState(false),[currentItem,setCurrentItem]=useState(null),[deleteItem,setDeleteItem]=useState(null);
 const pageSize=10,initialForm=()=>({data:getBRDate(),tipo_folha:'',tipo_movimento:'ENTRADA',quantidade:'',valor:''});
 const[formData,setFormData]=useState(initialForm);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('lm_folhas').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_tipos_folha').select('*').eq('user_id',user.id).order('tipo_folha',{ascending:true})
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   if(!mounted.current)return;
   setFolhas(a.data||[]);setTiposFolha(b.data||[]);
  }catch(error){
   if(mounted.current)toast({title:'Erro ao carregar',description:error.message||'Não foi possível carregar os lançamentos.',variant:'destructive'});
  }finally{if(mounted.current)setLoading(false)}
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase.channel('lm_folhas_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_folhas'},fetchData).subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const availableYears=useMemo(()=>{
  const years=folhas.map(x=>getYear(parseISO(x.data)));
  years.push(new Date().getFullYear());
  return[...new Set(years)].sort((a,b)=>b-a);
 },[folhas]);

 const filtered=useMemo(()=>{
  let r=folhas;
  if(selectedYear!=='all')r=r.filter(x=>String(getYear(parseISO(x.data)))===selectedYear);
  if(selectedMonth!=='all')r=r.filter(x=>String(getMonth(parseISO(x.data)))===selectedMonth);
  if(searchTerm.trim()){
   const t=searchTerm.toLowerCase();
   r=r.filter(x=>(x.tipo_folha||'').toLowerCase().includes(t)||(x.tipo_movimento||'').toLowerCase().includes(t));
  }
  return r;
 },[folhas,selectedYear,selectedMonth,searchTerm]);

 useEffect(()=>setCurrentPage(1),[selectedYear,selectedMonth,searchTerm]);

 const totalEntradas=filtered.filter(x=>x.tipo_movimento==='ENTRADA').reduce((s,x)=>s+Number(x.quantidade||0),0);
 const totalSaidas=filtered.filter(x=>x.tipo_movimento==='SAÍDA').reduce((s,x)=>s+Number(x.quantidade||0),0);
 const totalPerdas=filtered.filter(x=>x.tipo_movimento==='PERDA').reduce((s,x)=>s+Number(x.quantidade||0),0);
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const paginated=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);

 const openDialog=item=>{
  if(item){
   setCurrentItem(item);
   setFormData({data:item.data||getBRDate(),tipo_folha:item.tipo_folha||'',tipo_movimento:item.tipo_movimento||'ENTRADA',quantidade:item.quantidade||'',valor:item.valor??''});
  }else{setCurrentItem(null);setFormData(initialForm())}
  setDialogOpen(true);
 };

 const closeDialog=()=>{setDialogOpen(false);setCurrentItem(null);setFormData(initialForm())};

 const handleSave=async()=>{
  if(!formData.data||!formData.tipo_folha||!formData.quantidade){
   toast({title:'Campos obrigatórios',description:'Preencha Data, Tipo de Folha e Quantidade.',variant:'destructive'});return;
  }
  const payload={
   user_id:user.id,data:formData.data,tipo_folha:formData.tipo_folha,
   tipo_movimento:formData.tipo_movimento,quantidade:Number(formData.quantidade),
   valor:formData.tipo_movimento==='ENTRADA'&&formData.valor!==''?Number(formData.valor):null
  };
  try{
   const result=currentItem
    ?await supabase.from('lm_folhas').update(payload).eq('id',currentItem.id).eq('user_id',user.id)
    :await supabase.from('lm_folhas').insert(payload);
   if(result.error)throw result.error;
   toast({title:'Sucesso',description:currentItem?'Lançamento atualizado.':'Lançamento registrado.'});
   closeDialog();fetchData();
  }catch(error){
   toast({title:'Erro ao salvar',description:error.message||'Não foi possível salvar.',variant:'destructive'});
  }
 };

 const handleDelete=async()=>{
  if(!deleteItem)return;
  try{
   const{error}=await supabase.from('lm_folhas').delete().eq('id',deleteItem.id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido',description:'Lançamento excluído com sucesso.'});
   setDeleteItem(null);fetchData();
  }catch(error){
   toast({title:'Erro ao excluir',description:error.message||'Não foi possível excluir.',variant:'destructive'});
  }
 };

 const limparFiltros=()=>{
  setSearchTerm('');
  setSelectedMonth(String(new Date().getMonth()));
  setSelectedYear(String(new Date().getFullYear()));
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p>
     <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Controle de Folhas</h1>
     <p className="text-sm text-muted-foreground">Controle entradas, saídas e perdas de materiais.</p>
    </div>
    <Button onClick={()=>openDialog()} className="text-white shadow-lg" style={{background:CYAN,boxShadow:'0 0 18px hsl(190 90% 50% / .20)'}}>
     <Plus className="mr-2 h-4 w-4"/>Novo Lançamento
    </Button>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[
     {label:'Registros',value:filtered.length,icon:FileText},
     {label:'Entradas',value:totalEntradas,icon:ArrowDownToLine},
     {label:'Saídas',value:totalSaidas,icon:ArrowUpFromLine},
     {label:'Perdas',value:totalPerdas,icon:AlertTriangle}
    ].map(({label,value,icon:Icon})=>(
     <Card key={label} className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-4">
       <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold tabular-nums" style={{color:CYAN}}>{value}</p>
       </div>
       <div className="rounded-xl bg-cyan-500/10 p-2.5" style={{color:CYAN}}><Icon className="h-5 w-5"/></div>
      </CardContent>
     </Card>
    ))}
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">
     <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <div className="relative min-w-0 flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input placeholder="Buscar por tipo de folha ou movimento..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="h-10 bg-input pl-9"/>
      </div>
      <div className="flex flex-wrap gap-2">
       <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="h-10 w-[140px] bg-input"><SelectValue/></SelectTrigger>
        <SelectContent>
         <SelectItem value="all">Todos os meses</SelectItem>
         {meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
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

   <ModalLancamentoPadrao
    open={dialogOpen}
    onClose={closeDialog}
    title={currentItem?'Editar Lançamento':'Novo Lançamento'}
    description="Preencha os dados da movimentação de folhas."
    icon={Boxes}
    theme="blue"
    footer={
     <>
      <Button variant="outline" onClick={closeDialog} className="h-10 rounded-xl">Cancelar</Button>
      <Button onClick={handleSave} className="h-10 rounded-xl px-7 font-semibold text-white" style={{background:CYAN}}>
       {currentItem?'Salvar Alterações':'Salvar Lançamento'}
      </Button>
     </>
    }
   >
    <div className="space-y-5">
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Data</Label><Input type="date" value={formData.data} onChange={e=>setFormData(p=>({...p,data:e.target.value}))} className="h-11 rounded-xl bg-input" required/></div>
      <div className="space-y-2"><Label>Quantidade</Label><Input type="number" min="1" value={formData.quantidade} onChange={e=>setFormData(p=>({...p,quantidade:e.target.value}))} className="h-11 rounded-xl bg-input" required/></div>
     </div>

     <div className="space-y-2">
      <Label>Tipo de Folha</Label>
      <Select value={formData.tipo_folha} onValueChange={v=>setFormData(p=>({...p,tipo_folha:v}))}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent>{tiposFolha.map(t=><SelectItem key={t.id||t.tipo_folha} value={t.tipo_folha}>{t.tipo_folha}</SelectItem>)}</SelectContent>
      </Select>
     </div>

     <div className="space-y-2">
      <Label>Tipo de Movimento</Label>
      <Select value={formData.tipo_movimento} onValueChange={v=>setFormData(p=>({...p,tipo_movimento:v,valor:v==='ENTRADA'?p.valor:''}))}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue/></SelectTrigger>
       <SelectContent>
        <SelectItem value="ENTRADA">Entrada</SelectItem>
        <SelectItem value="SAÍDA">Saída</SelectItem>
        <SelectItem value="PERDA">Perda</SelectItem>
       </SelectContent>
      </Select>
     </div>

     {formData.tipo_movimento==='ENTRADA'&&(
      <div className="space-y-2">
       <Label>Valor Total</Label>
       <Input type="number" min="0" step="0.01" value={formData.valor} onChange={e=>setFormData(p=>({...p,valor:e.target.value}))} placeholder="0,00" className="h-11 rounded-xl bg-input"/>
       {formData.valor!==''&&<p className="text-xs text-muted-foreground">{BRL.format(Number(formData.valor)||0)}</p>}
      </div>
     )}
    </div>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader className="sticky top-0 z-10 bg-secondary/50 backdrop-blur-sm">
        <TableRow>
         <TableHead>Data</TableHead><TableHead>Tipo de Folha</TableHead><TableHead>Movimento</TableHead>
         <TableHead className="text-right">Quantidade</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>
       <TableBody>
        {loading?(
         <TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Carregando lançamentos...</TableCell></TableRow>
        ):paginated.length===0?(
         <TableRow><TableCell colSpan={6} className="py-12 text-center"><div className="flex flex-col items-center gap-2 text-muted-foreground"><FileText className="h-8 w-8 opacity-40"/><span>Nenhum lançamento encontrado.</span></div></TableCell></TableRow>
        ):paginated.map(item=>(
         <TableRow key={item.id} className="transition-colors hover:bg-muted/40">
          <TableCell className="p-4 font-medium">{brDate(item.data)}</TableCell>
          <TableCell className="p-4 font-medium">{item.tipo_folha}</TableCell>
          <TableCell className="p-4">
           <Badge variant="outline" className={item.tipo_movimento==='ENTRADA'?'border-green-500/30 bg-green-500/10 text-green-500':item.tipo_movimento==='SAÍDA'?'border-blue-500/30 bg-blue-500/10 text-blue-500':'border-red-500/30 bg-red-500/10 text-red-500'}>{item.tipo_movimento}</Badge>
          </TableCell>
          <TableCell className="p-4 text-right font-mono tabular-nums">{item.quantidade}</TableCell>
          <TableCell className="p-4 text-right font-bold tabular-nums" style={{color:CYAN}}>{item.valor!=null?BRL.format(Number(item.valor)||0):'—'}</TableCell>
          <TableCell className="p-4">
           <div className="flex justify-center gap-1">
            <Button variant="ghost" size="icon" onClick={()=>openDialog(item)} className="hover:bg-cyan-500/10" style={{color:CYAN}}><Edit className="h-4 w-4"/></Button>
            <AlertDialog>
             <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
             <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover este lançamento de folhas?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction></AlertDialogFooter>
             </AlertDialogContent>
            </AlertDialog>
           </div>
          </TableCell>
         </TableRow>
        ))}
       </TableBody>
      </Table>
     </ScrollArea>

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
  </motion.div>
 );
};

export default LancamentoFolhas;
