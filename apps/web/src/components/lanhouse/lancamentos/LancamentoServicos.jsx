import React,{useState,useMemo,useCallback,useEffect}from'react';
import{motion}from'framer-motion';
import{Plus,Trash2,Search,Download,Edit,Loader2,AlertTriangle,PackageSearch}from'lucide-react';
import{format,parse}from'date-fns';
import{ptBR}from'date-fns/locale';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/hooks/use-toast';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{Alert,AlertDescription}from'@/components/ui/alert';
import FolhasTable from'@/components/lanhouse/FolhasTable';
import{useServiceCache}from'@/hooks/useServiceCache';
import{useOptimizedServiceData}from'@/hooks/useOptimizedServiceData';
import{useEstoqueCalculation}from'@/hooks/useEstoqueCalculation';
import EstoqueAtualCard from'../estoques/EstoqueAtualCard';
import OfflineIndicator from'@/components/OfflineIndicator';
import{useOnlineStatus}from'@/hooks/useOnlineStatus';
import{saveOfflineData}from'@/lib/offlineStorage';
import * as XLSX from'xlsx';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const availableYears=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];

export default function LancamentoServicos(){
 const{user}=useAuth(),{toast}=useToast(),{isOnline,checkPending}=useOnlineStatus();
 const[searchTerm,setSearchTerm]=useState(''),[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth())),[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[isAddModalOpen,setIsAddModalOpen]=useState(false),[isExportOpen,setIsExportOpen]=useState(false),[isStockModalOpen,setIsStockModalOpen]=useState(false),[editingId,setEditingId]=useState(null),[folhasConsumo,setFolhasConsumo]=useState([]),[originalFolhas,setOriginalFolhas]=useState([]),[isSubmitting,setIsSubmitting]=useState(false);
 const[exportFilters,setExportFilters]=useState({month:new Date().getMonth(),year:new Date().getFullYear()});
 const{servicos:servicosOpcoes,clientes:clientesOpcoes,tiposFolha,isLoading:isCacheLoading,refreshAll:refreshCache}=useServiceCache();
 const{data:servicosLancados,loading:isLoadingLancamentos,refresh:refreshLancamentos}=useOptimizedServiceData({month:selectedMonth,year:selectedYear});
 const{stockData,isLoading:isStockLoading,lastUpdate}=useEstoqueCalculation();
 const initialFormData={data:format(new Date(),'yyyy-MM-dd'),servico_id:'',cliente_id:'',valor:'',forma_pagamento:''};
 const[formData,setFormData]=useState(initialFormData);

 const normalize=useCallback(v=>v?v.toString().toUpperCase().trim():'',[]);
 const folhasText=useCallback(v=>!Array.isArray(v)||!v.length?'-':v.filter(x=>!x.e_rascunho&&x.tipo_folha&&x.quantidade).map(x=>`${x.tipo_folha} - ${x.quantidade} un`).join(', ')||'-',[]);
 const filtered=useMemo(()=>!searchTerm.trim()?servicosLancados:servicosLancados.filter(i=>(i.lm_servicos?.servico?.toLowerCase()||'').includes(searchTerm.toLowerCase())||(i.lm_clientes?.nome?.toLowerCase()||i.cliente?.toLowerCase()||'').includes(searchTerm.toLowerCase())),[searchTerm,servicosLancados]);
 const total=useMemo(()=>filtered.reduce((a,i)=>a+Number(i.valor||0),0),[filtered]);
 const selectedServico=useMemo(()=>servicosOpcoes.find(s=>s.id===formData.servico_id),[servicosOpcoes,formData.servico_id]);
 const estoqueAtual=useMemo(()=>Object.fromEntries(Object.entries(stockData).map(([k,v])=>[k,v.estoqueAtual])),[stockData]);

 const openDialog=useCallback(item=>{
  if(item){
   const cid=item.cliente_id||clientesOpcoes.find(c=>c.nome===item.cliente)?.id||'';
   setEditingId(item.id);setFormData({data:item.data,servico_id:item.servico_id,cliente_id:cid,valor:item.valor,forma_pagamento:item.forma_pagamento||''});
   setOriginalFolhas(item.folhas_gastas?JSON.parse(JSON.stringify(item.folhas_gastas)):[]);
   setFolhasConsumo(item.folhas_gastas||[]);
  }else{
   setEditingId(null);setFormData(initialFormData);setOriginalFolhas([]);setFolhasConsumo([]);
  }
  setIsAddModalOpen(true);setIsSubmitting(false);
 },[clientesOpcoes]);

 const closeDialog=useCallback(()=>{
  if(isSubmitting)return;
  setIsAddModalOpen(false);setEditingId(null);setFormData(initialFormData);setFolhasConsumo([]);setOriginalFolhas([]);
 },[isSubmitting]);

 const validate=useCallback(()=>{
  if(!selectedServico?.usa_folha)return{valid:true};
  if(!folhasConsumo.length)return{valid:false,message:'Este serviço requer pelo menos uma folha.'};
  const stock={};
  Object.keys(stockData).forEach(k=>stock[k]=stockData[k].estoqueAtual);
  originalFolhas.forEach(f=>{if(!f.e_rascunho&&f.tipo_folha&&f.quantidade){const k=normalize(f.tipo_folha);stock[k]=(stock[k]||0)+Number(f.quantidade)}});
  for(const f of folhasConsumo){
   if(!f.tipo_folha)return{valid:false,message:'Selecione o tipo de folha.'};
   if(!f.quantidade||Number(f.quantidade)<=0)return{valid:false,message:'Quantidade deve ser maior que zero.'};
   if(!f.e_rascunho&&Number(f.quantidade)>(stock[normalize(f.tipo_folha)]||0))return{valid:false,message:`Estoque insuficiente para ${f.tipo_folha}. Disponível: ${stock[normalize(f.tipo_folha)]||0}`};
  }
  return{valid:true};
 },[selectedServico,folhasConsumo,stockData,originalFolhas,normalize]);

 const save=useCallback(async e=>{
  e.preventDefault();
  if(!formData.data||!formData.servico_id||!formData.cliente_id||!formData.valor||!formData.forma_pagamento){
   toast({title:'Atenção',description:'Preencha todos os campos obrigatórios.',variant:'destructive'});return;
  }
  const v=validate();if(!v.valid){toast({title:'Aviso de Estoque',description:v.message,variant:'destructive'});return}
  setIsSubmitting(true);
  try{
   const payload={user_id:user.id,data:formData.data,servico_id:formData.servico_id,cliente_id:formData.cliente_id,cliente:clientesOpcoes.find(c=>c.id===formData.cliente_id)?.nome||null,valor:Number(formData.valor),forma_pagamento:formData.forma_pagamento,folhas_gastas:folhasConsumo.length?folhasConsumo:null};
   if(!isOnline&&!editingId){await saveOfflineData('lm_servicos',payload);toast({title:'Offline',description:'Serviço salvo localmente.'});checkPending()}
   else{
    if(!isOnline){toast({title:'Offline',description:'Não é possível editar offline.',variant:'destructive'});return}
    const q=editingId?supabase.from('lm_lanc_servicos').update(payload).eq('id',editingId):supabase.from('lm_lanc_servicos').insert([payload]);
    const{error}=await q;if(error)throw error;
    toast({title:'Sucesso!',description:editingId?'Serviço atualizado.':'Serviço cadastrado.'});await refreshLancamentos();
   }
   setFormData(p=>({...initialFormData,data:p.data}));setFolhasConsumo([]);setOriginalFolhas([]);setEditingId(null);
  }catch(error){toast({title:'Erro ao salvar',description:error.message,variant:'destructive'})}
  finally{setIsSubmitting(false)}
 },[formData,validate,user,clientesOpcoes,folhasConsumo,isOnline,editingId,toast,refreshLancamentos,checkPending]);

 const remove=useCallback(async id=>{
  if(!isOnline){toast({title:'Offline',description:'Não é possível excluir offline.',variant:'destructive'});return}
  try{const{error}=await supabase.from('lm_lanc_servicos').delete().eq('id',id);if(error)throw error;toast({title:'Sucesso',description:'Removido.'});refreshLancamentos()}catch(error){toast({title:'Erro',description:error.message,variant:'destructive'})}
 },[toast,refreshLancamentos,isOnline]);

 const exportar=()=>{
  if(!filtered.length){toast({title:'Aviso',description:'Nenhum dado.',variant:'destructive'});return}
  const data=filtered.map(i=>({DATA:format(parse(i.data,'yyyy-MM-dd',new Date()),'dd/MM/yyyy'),SERVIÇO:i.lm_servicos?.servico||'N/A',CLIENTE:i.lm_clientes?.nome||i.cliente||'-','FOLHAS GASTAS':folhasText(i.folhas_gastas),PAGAMENTO:i.forma_pagamento||'-',VALOR:Number(i.valor||0)}));
  const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Serviços');XLSX.writeFile(wb,`Servicos_LM_${meses[exportFilters.month]}_${exportFilters.year}.xlsx`);setIsExportOpen(false);
 };

 return <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-8 py-8">
  <OfflineIndicator/>
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
   <div><h1 className="text-3xl font-extrabold text-primary">Lançamento de Serviços</h1><p className="mt-1 text-lg text-muted-foreground">Registre e gerencie os serviços prestados.</p></div>
   <div className="flex flex-wrap gap-3">
    <Button onClick={()=>setIsStockModalOpen(true)} variant="outline"><PackageSearch className="mr-2 h-4 w-4"/>Ver Estoque</Button>
    <Button onClick={()=>setIsExportOpen(true)} variant="outline"><Download className="mr-2 h-4 w-4"/>Exportar</Button>
    <Button onClick={()=>openDialog()} className="bg-primary text-primary-foreground"><Plus className="mr-2 h-4 w-4"/>Novo Serviço</Button>
   </div>
  </div>

  <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
   <DialogContent className="sm:max-w-[800px] border-border bg-card"><DialogHeader><DialogTitle><PackageSearch className="mr-2 inline h-5 w-5 text-primary"/>Estoque Atual</DialogTitle><DialogDescription>Consulte a disponibilidade de folhas.</DialogDescription></DialogHeader>
    <ScrollArea className="max-h-[60vh]"><div className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">{isStockLoading?<Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/>:Object.values(stockData).map(i=><EstoqueAtualCard key={i.tipo_folha} item={i} lastUpdate={lastUpdate}/>)}</div></ScrollArea>
    <DialogFooter><Button variant="outline" onClick={()=>setIsStockModalOpen(false)}>Fechar</Button></DialogFooter>
   </DialogContent>
  </Dialog>

  <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
   <DialogContent className="border-border bg-card sm:max-w-[400px]"><DialogHeader><DialogTitle>Exportar Serviços</DialogTitle><DialogDescription>Selecione o período.</DialogDescription></DialogHeader>
    <div className="grid grid-cols-2 gap-4 py-4">
     <div><Label>Mês</Label><Select value={String(exportFilters.month)} onValueChange={v=>setExportFilters(p=>({...p,month:Number(v)}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><ScrollArea className="h-48">{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
     <div><Label>Ano</Label><Select value={String(exportFilters.year)} onValueChange={v=>setExportFilters(p=>({...p,year:Number(v)}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <DialogFooter><Button variant="outline" onClick={()=>setIsExportOpen(false)}>Cancelar</Button><Button onClick={exportar} className="bg-primary text-primary-foreground">Exportar</Button></DialogFooter>
   </DialogContent>
  </Dialog>

  <Dialog open={isAddModalOpen} onOpenChange={o=>{if(!o)closeDialog();else setIsAddModalOpen(true)}}>
   <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-[650px]"><DialogHeader><DialogTitle>{editingId?'Editar Serviço':'Novo Lançamento'}</DialogTitle></DialogHeader>
    <form onSubmit={save} className="space-y-6 py-4">
     <div className="grid grid-cols-2 gap-4">
      <div><Label>Data *</Label><Input type="date" value={formData.data} onChange={e=>setFormData({...formData,data:e.target.value})} disabled={isSubmitting}/></div>
      <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={formData.valor} onChange={e=>setFormData({...formData,valor:e.target.value})} disabled={isSubmitting}/></div>
     </div>
     <div><Label>Tipo do Serviço *</Label><Select value={formData.servico_id} onValueChange={v=>setFormData(p=>({...p,servico_id:v}))} disabled={isSubmitting}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><ScrollArea className="h-48">{servicosOpcoes.map(s=><SelectItem key={s.id} value={s.id}>{s.servico}{s.usa_folha&&' 📄'}</SelectItem>)}</ScrollArea></SelectContent></Select>{selectedServico?.usa_folha&&<Alert className="mt-2 bg-cyan-500/10 border-cyan-500/30"><AlertTriangle className="h-4 w-4 text-cyan-400"/><AlertDescription>Este serviço consome folhas. O estoque será validado automaticamente.</AlertDescription></Alert>}</div>
     <div><Label>Cliente *</Label><Select value={formData.cliente_id} onValueChange={v=>setFormData(p=>({...p,cliente_id:v}))} disabled={isSubmitting}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><ScrollArea className="h-48">{clientesOpcoes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
     <div><Label>Forma de Pagamento *</Label><Select value={formData.forma_pagamento} onValueChange={v=>setFormData(p=>({...p,forma_pagamento:v}))} disabled={isSubmitting}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem><SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem></SelectContent></Select></div>
     {selectedServico?.usa_folha&&<div className="border-t border-border pt-6"><FolhasTable folhas={folhasConsumo} setFolhas={setFolhasConsumo} tiposFolha={tiposFolha} estoqueAtual={estoqueAtual} disabled={isSubmitting}/></div>}
     <DialogFooter><Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button><Button type="submit" className="bg-primary text-primary-foreground" disabled={isSubmitting}>{isSubmitting&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{editingId?'Atualizar Serviço':'Salvar Serviço'}</Button></DialogFooter>
    </form>
   </DialogContent>
  </Dialog>

  <div className="grid gap-6 md:grid-cols-4">
   <Card className="col-span-1 border-border/50 md:col-span-3"><CardContent className="p-5 flex flex-col gap-4 md:flex-row">
    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"/><Input placeholder="Buscar por serviço ou cliente..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="h-12 pl-10"/></div>
    <div className="flex gap-3">
     <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[150px]"><SelectValue/></SelectTrigger><SelectContent>{Array.from({length:12},(_,i)=><SelectItem key={i} value={String(i)}>{format(new Date(2024,i,1),'MMMM',{locale:ptBR})}</SelectItem>)}</SelectContent></Select>
     <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[110px]"><SelectValue/></SelectTrigger><SelectContent>{availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
    </div>
   </CardContent></Card>
   <Card><CardHeader className="pb-1"><CardTitle className="text-sm text-primary">Total no Período</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-primary">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(total)}</div></CardContent></Card>
  </div>

  <Card><CardContent className="p-0"><ScrollArea className="h-[600px]"><Table><TableHeader className="sticky top-0 z-10 bg-card/50"><TableRow><TableHead>Data</TableHead><TableHead>Serviço</TableHead><TableHead>Cliente</TableHead><TableHead>Folhas Gastas</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader><TableBody>
   {isLoadingLancamentos?<TableRow><TableCell colSpan={6} className="py-16 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary"/></TableCell></TableRow>:!filtered.length?<TableRow><TableCell colSpan={6} className="py-16 text-center text-muted-foreground">Nenhum serviço registrado.</TableCell></TableRow>:filtered.map(item=><TableRow key={item.id}>
    <TableCell>{format(parse(item.data,'yyyy-MM-dd',new Date()),'dd/MM/yyyy')}</TableCell>
    <TableCell><b>{item.lm_servicos?.servico||'N/A'}</b><div className="text-xs text-muted-foreground">{item.forma_pagamento||''}</div></TableCell>
    <TableCell>{item.lm_clientes?.nome||item.cliente||'-'}</TableCell>
    <TableCell>{folhasText(item.folhas_gastas)}</TableCell>
    <TableCell className="text-right font-bold text-primary">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.valor)}</TableCell>
    <TableCell><div className="flex justify-center gap-2"><Button variant="ghost" size="icon" onClick={()=>openDialog(item)}><Edit className="h-4 w-4 text-blue-400"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-400"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(item.id)} className="bg-red-500">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell>
   </TableRow>)}
  </TableBody></Table></ScrollArea></CardContent></Card>
 </motion.div>;
}
