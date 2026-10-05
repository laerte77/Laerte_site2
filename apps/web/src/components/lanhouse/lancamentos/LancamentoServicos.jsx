import React,{useState,useMemo,useCallback}from'react';
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
import{useToast}from'@/components/ui/use-toast';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter,DialogDescription}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{Alert,AlertDescription}from'@/components/ui/alert';
import SearchableModal from'@/components/SearchableModal';
import FolhasTable from'@/components/lanhouse/FolhasTable';
import{useServiceCache}from'@/hooks/useServiceCache';
import{useOptimizedServiceData}from'@/hooks/useOptimizedServiceData';
import{useEstoqueCalculation}from'@/hooks/useEstoqueCalculation';
import EstoqueAtualCard from'../estoques/EstoqueAtualCard';
import OfflineIndicator from'@/components/OfflineIndicator';
import{useOnlineStatus}from'@/hooks/useOnlineStatus';
import{saveOfflineData}from'@/lib/offlineStorage';
import*as XLSX from'xlsx';

const C='hsl(var(--neon-lanhouse))';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const availableYears=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];

export default function LancamentoServicos(){
 const{user}=useAuth(),{toast}=useToast(),{isOnline,checkPending}=useOnlineStatus();
 const[searchTerm,setSearchTerm]=useState('');
 const[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[isAddModalOpen,setIsAddModalOpen]=useState(false);
 const[isExportOpen,setIsExportOpen]=useState(false);
 const[isSearchModalOpen,setIsSearchModalOpen]=useState(false);
 const[isStockModalOpen,setIsStockModalOpen]=useState(false);
 const[exportFilters,setExportFilters]=useState({month:new Date().getMonth(),year:new Date().getFullYear()});
 const[editingId,setEditingId]=useState(null);
 const[folhasConsumo,setFolhasConsumo]=useState([]);
 const[originalFolhas,setOriginalFolhas]=useState([]);
 const[isSubmitting,setIsSubmitting]=useState(false);

 const{servicos:servicosOpcoes,clientes:clientesOpcoes,tiposFolha}=useServiceCache();
 const{data:servicosLancados,loading:isLoadingLancamentos,refresh:refreshLancamentos}=useOptimizedServiceData({
  month:selectedMonth,
  year:selectedYear
 });
 const{stockData,loading:isStockLoading,lastUpdate}=useEstoqueCalculation();

 const initialFormData={
  data:format(new Date(),'yyyy-MM-dd'),
  servico_id:'',
  cliente_id:'',
  valor:'',
  forma_pagamento:''
 };
 const[formData,setFormData]=useState(initialFormData);

 const normalizeProductName=useCallback(
  value=>value?value.toString().toUpperCase().trim():'',
  []
 );

 const formatFolhasGastas=useCallback(folhasGastas=>{
  if(!Array.isArray(folhasGastas)||!folhasGastas.length)return'-';
  const itens=folhasGastas.filter(f=>!f.e_rascunho&&f.tipo_folha&&f.quantidade);
  return itens.length?itens.map(f=>`${f.tipo_folha} - ${f.quantidade} un`).join(', '):'-';
 },[]);

 const filteredServicos=useMemo(()=>{
  if(!searchTerm.trim())return servicosLancados;
  const search=searchTerm.toLowerCase();
  return servicosLancados.filter(item=>
   (item.lm_servicos?.servico?.toLowerCase()||'').includes(search)||
   (item.lm_clientes?.nome?.toLowerCase()||item.cliente?.toLowerCase()||'').includes(search)
  );
 },[searchTerm,servicosLancados]);

 const totalServicos=useMemo(
  ()=>filteredServicos.reduce((acc,curr)=>acc+parseFloat(curr.valor||0),0),
  [filteredServicos]
 );

 const handleInputChange=useCallback(e=>{
  const{name,value}=e.target;
  setFormData(prev=>({...prev,[name]:value}));
 },[]);

 const handleServicoChange=useCallback(servicoId=>{
  setFormData(prev=>({...prev,servico_id:servicoId}));
  if(!servicosOpcoes.find(s=>s.id===servicoId)?.usa_folha)setFolhasConsumo([]);
 },[servicosOpcoes]);

 const handleOpenDialog=useCallback(async(item=null)=>{
  if(item){
   let cid=item.cliente_id;
   if(!cid&&item.cliente)cid=clientesOpcoes.find(c=>c.nome===item.cliente)?.id;
   setEditingId(item.id);
   setFormData({
    data:item.data,
    servico_id:item.servico_id,
    cliente_id:cid||'',
    valor:item.valor,
    forma_pagamento:item.forma_pagamento||''
   });
   if(Array.isArray(item.folhas_gastas)){
    setOriginalFolhas(JSON.parse(JSON.stringify(item.folhas_gastas)));
    setFolhasConsumo(item.folhas_gastas);
   }else{
    setOriginalFolhas([]);
    setFolhasConsumo([]);
   }
  }else{
   setEditingId(null);
   setFormData(initialFormData);
   setFolhasConsumo([]);
   setOriginalFolhas([]);
  }
  setIsAddModalOpen(true);
  setIsSubmitting(false);
 },[clientesOpcoes,initialFormData]);

 const handleCloseModal=useCallback(()=>{
  if(isSubmitting)return;
  setIsAddModalOpen(false);
  setEditingId(null);
  setFormData(initialFormData);
  setFolhasConsumo([]);
  setOriginalFolhas([]);
 },[isSubmitting,initialFormData]);

 const validateFolhasConsumo=useCallback((isUpdate=false)=>{
  const selectedServico=servicosOpcoes.find(s=>s.id===formData.servico_id);
  if(!selectedServico?.usa_folha)return{valid:true};

  if(!folhasConsumo.length||folhasConsumo.filter(f=>!f.e_rascunho).length===0){
   return{valid:false,message:'Este serviço requer pelo menos uma folha.'};
  }

  const adjustedEstoque={};
  Object.keys(stockData).forEach(k=>{
   adjustedEstoque[k]=stockData[k].estoqueAtual;
  });

  if(isUpdate&&originalFolhas.length){
   originalFolhas.forEach(f=>{
    if(!f.e_rascunho&&f.tipo_folha&&f.quantidade){
     const n=normalizeProductName(f.tipo_folha);
     adjustedEstoque[n]=(adjustedEstoque[n]||0)+parseInt(f.quantidade);
    }
   });
  }

  for(const folha of folhasConsumo){
   if(!folha.tipo_folha)return{valid:false,message:'Selecione o tipo de folha.'};
   if(!folha.quantidade||parseInt(folha.quantidade)<=0){
    return{valid:false,message:'Quantidade deve ser maior que zero.'};
   }

   if(!folha.e_rascunho){
    const key=normalizeProductName(folha.tipo_folha);
    const estoqueDisponivel=adjustedEstoque[key]||0;
    if(parseInt(folha.quantidade)>estoqueDisponivel){
     return{
      valid:false,
      message:`Estoque insuficiente para ${folha.tipo_folha}. Disponível: ${estoqueDisponivel}`
     };
    }
   }
  }

  return{valid:true};
 },[
  servicosOpcoes,
  formData.servico_id,
  folhasConsumo,
  stockData,
  originalFolhas,
  normalizeProductName
 ]);

 const handleSubmit=useCallback(async e=>{
  e.preventDefault();

  if(!formData.data||!formData.servico_id||!formData.cliente_id||!formData.valor||!formData.forma_pagamento){
   toast({
    title:'Atenção',
    description:'Por favor, preencha todos os campos obrigatórios, incluindo a forma de pagamento.',
    variant:'destructive'
   });
   return;
  }

  const validation=validateFolhasConsumo(!!editingId);

  if(!validation.valid){
   toast({
    title:'Aviso de Estoque',
    description:validation.message,
    variant:'destructive'
   });
   return;
  }

  setIsSubmitting(true);

  try{
   const payload={
    user_id:user.id,
    data:formData.data,
    servico_id:formData.servico_id,
    cliente_id:formData.cliente_id,
    cliente:clientesOpcoes.find(c=>c.id===formData.cliente_id)?.nome||null,
    valor:parseFloat(formData.valor),
    forma_pagamento:formData.forma_pagamento,
    folhas_gastas:folhasConsumo.length?folhasConsumo:null
   };

   if(!isOnline&&!editingId){
    await saveOfflineData('lm_servicos',payload);
    toast({
     title:'Offline',
     description:'Serviço salvo localmente. Será sincronizado quando reconectar.'
    });
    checkPending();
   }else if(editingId){
    if(!isOnline){
     toast({
      title:'Offline',
      description:'Não é possível editar offline.',
      variant:'destructive'
     });
     setIsSubmitting(false);
     return;
    }

    const{error}=await supabase.from('lm_lanc_servicos').update(payload).eq('id',editingId);
    if(error)throw error;

    toast({
     title:'Sucesso!',
     description:'Serviço atualizado com sucesso.'
    });
   }else{
    const{error}=await supabase.from('lm_lanc_servicos').insert([payload]);
    if(error)throw error;

    toast({
     title:'Sucesso!',
     description:'Serviço cadastrado com sucesso.'
    });
   }

   setFormData(prev=>({...initialFormData,data:prev.data}));
   setFolhasConsumo([]);
   setOriginalFolhas([]);
   setEditingId(null);

   if(isOnline)await refreshLancamentos();
  }catch(error){
   console.error('Save error:',error);
   toast({
    title:'Erro ao salvar',
    description:error.message||'Falha ao processar o lançamento. Tente novamente.',
    variant:'destructive'
   });
  }finally{
   setIsSubmitting(false);
  }
 },[
  formData,
  validateFolhasConsumo,
  clientesOpcoes,
  user,
  editingId,
  folhasConsumo,
  toast,
  initialFormData,
  refreshLancamentos,
  isOnline,
  checkPending
 ]);

 const handleDelete=useCallback(async id=>{
  if(!isOnline){
   toast({
    title:'Offline',
    description:'Não é possível excluir offline.',
    variant:'destructive'
   });
   return;
  }

  try{
   const{error}=await supabase.from('lm_lanc_servicos').delete().eq('id',id);
   if(error)throw error;

   toast({title:'Sucesso',description:'Removido.'});
   refreshLancamentos();
  }catch{
   toast({
    title:'Erro',
    description:'Falha ao remover.',
    variant:'destructive'
   });
  }
 },[toast,refreshLancamentos,isOnline]);

 const handleExport=useCallback(()=>{
  if(!filteredServicos.length){
   toast({
    title:'Aviso',
    description:'Nenhum dado.',
    variant:'destructive'
   });
   return;
  }

  const dataToExport=filteredServicos.map(i=>({
   DATA:format(parse(i.data,'yyyy-MM-dd',new Date()),'dd/MM/yyyy'),
   SERVIÇO:i.lm_servicos?.servico||'N/A',
   CLIENTE:i.lm_clientes?.nome||i.cliente||'-',
   'FOLHAS GASTAS':formatFolhasGastas(i.folhas_gastas),
   PAGAMENTO:i.forma_pagamento||'-',
   VALOR:parseFloat(i.valor)
  }));

  const ws=XLSX.utils.json_to_sheet(dataToExport);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Serviços');
  XLSX.writeFile(
   wb,
   `Servicos_LM_${meses[exportFilters.month]}_${exportFilters.year}.xlsx`
  );
  setIsExportOpen(false);
 },[filteredServicos,exportFilters,toast,formatFolhasGastas]);

 const formatDateDisplay=useCallback(
  dateString=>dateString?format(parse(dateString,'yyyy-MM-dd',new Date()),'dd/MM/yyyy',{locale:ptBR}):'-',
  []
 );

 const selectedServico=useMemo(
  ()=>servicosOpcoes.find(s=>s.id===formData.servico_id),
  [servicosOpcoes,formData.servico_id]
 );

 const mappedEstoqueAtual=useMemo(()=>{
  const map={};
  Object.keys(stockData).forEach(k=>{
   map[k]=stockData[k].estoqueAtual;
  });
  return map;
 },[stockData]);

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-lm-impressoes space-y-4"
  >
   <OfflineIndicator/>

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]">
       <PackageSearch className="h-5 w-5" style={{color:C}}/>
      </div>

      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Lançamentos</p>
       <h1 className="text-2xl font-bold">Lançamento de Serviços</h1>
       <p className="text-sm text-muted-foreground">Registre e gerencie os serviços prestados.</p>
      </div>
     </div>

     <div className="flex flex-wrap gap-2">
      <Button
       variant="outline"
       onClick={()=>setIsStockModalOpen(true)}
       className="border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10"
      >
       <PackageSearch className="mr-2 h-4 w-4"/>Ver Estoque
      </Button>

      <Button variant="outline" onClick={()=>setIsExportOpen(true)}>
       <Download className="mr-2 h-4 w-4"/>Exportar
      </Button>

      <Button variant="outline" onClick={()=>setIsSearchModalOpen(true)}>
       <Search className="mr-2 h-4 w-4"/>Selecionar Registro
      </Button>

      <Button onClick={()=>handleOpenDialog()} className="text-slate-950" style={{background:C}}>
       <Plus className="mr-2 h-4 w-4"/>Novo Serviço
      </Button>
     </div>
    </div>
   </div>

   <Dialog open={isStockModalOpen} onOpenChange={setIsStockModalOpen}>
    <DialogContent onInteractOutside={e=>e.preventDefault()} className="border-border bg-card sm:max-w-[800px]">
     <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
       <PackageSearch className="h-5 w-5" style={{color:C}}/>
       Estoque Atual em Tempo Real
      </DialogTitle>
      <DialogDescription>
       Consulte a disponibilidade de folhas antes de realizar os lançamentos.
      </DialogDescription>
     </DialogHeader>

     <ScrollArea className="max-h-[60vh] pr-4">
      {isStockLoading?
       <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" style={{color:C}}/></div>:
       <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(stockData).map(item=>
         <EstoqueAtualCard key={item.tipo_folha} item={item} lastUpdate={lastUpdate}/>
        )}
        {!Object.keys(stockData).length&&
         <div className="col-span-full py-4 text-center text-muted-foreground">
          Nenhum estoque registrado.
         </div>
        }
       </div>
      }
     </ScrollArea>

     <DialogFooter>
      <Button variant="outline" onClick={()=>setIsStockModalOpen(false)}>Fechar</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
    <DialogContent onInteractOutside={e=>e.preventDefault()} className="border-border bg-card sm:max-w-[400px]">
     <DialogHeader>
      <DialogTitle>Exportar Serviços</DialogTitle>
      <DialogDescription>Selecione o período para gerar o relatório.</DialogDescription>
     </DialogHeader>

     <div className="grid grid-cols-2 gap-4 py-4">
      <div className="space-y-2">
       <Label>Mês</Label>
       <Select value={String(exportFilters.month)} onValueChange={v=>setExportFilters(prev=>({...prev,month:Number(v)}))}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>
         <ScrollArea className="h-48">
          {meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
         </ScrollArea>
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label>Ano</Label>
       <Select value={String(exportFilters.year)} onValueChange={v=>setExportFilters(prev=>({...prev,year:Number(v)}))}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>{availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
       </Select>
      </div>
     </div>

     <DialogFooter>
      <Button variant="outline" onClick={()=>setIsExportOpen(false)}>Cancelar</Button>
      <Button onClick={handleExport} className="text-slate-950" style={{background:C}}>
       <Download className="mr-2 h-4 w-4"/>Exportar
      </Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <SearchableModal
    isOpen={isSearchModalOpen}
    onClose={()=>setIsSearchModalOpen(false)}
    onSelect={handleOpenDialog}
    tableName="lm_lanc_servicos"
    searchField="lm_servicos.servico"
    displayFields={[
     {key:'data',label:'Data',format:formatDateDisplay},
     {key:'lm_servicos.servico',label:'Serviço'},
     {key:'cliente_nome',label:'Cliente',format:(_,i)=>i.lm_clientes?.nome||i.cliente||'-'},
     {key:'valor',label:'Valor',format:v=>`R$ ${parseFloat(v).toFixed(2)}`}
    ]}
    title="Buscar Lançamento de Serviço"
    customQuery={async(supabase,st)=>{
     const{data}=await supabase
      .from('lm_lanc_servicos')
      .select('id,data,valor,forma_pagamento,servico_id,cliente_id,cliente,folhas_gastas,lm_servicos(id,servico),lm_clientes(id,nome)')
      .eq('user_id',user.id)
      .or(`cliente.ilike.%${st}%,lm_servicos.servico.ilike.%${st}%`)
      .order('data',{ascending:false})
      .limit(50);
     return data||[];
    }}
   />

   <Dialog open={isAddModalOpen} onOpenChange={open=>{if(!open)handleCloseModal();else setIsAddModalOpen(true)}}>
    <DialogContent onInteractOutside={e=>e.preventDefault()} className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-[650px]">
     <DialogHeader>
      <DialogTitle className="text-xl">{editingId?'Editar Serviço':'Novo Lançamento'}</DialogTitle>
     </DialogHeader>

     <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label>Data *</Label>
        <Input type="date" name="data" value={formData.data} onChange={handleInputChange} required disabled={isSubmitting}/>
       </div>

       <div className="space-y-2">
        <Label>Valor (R$) *</Label>
        <Input type="number" name="valor" step="0.01" value={formData.valor} onChange={handleInputChange} required disabled={isSubmitting}/>
       </div>
      </div>

      <div className="space-y-2">
       <Label>Tipo do Serviço *</Label>
       <Select value={formData.servico_id} onValueChange={handleServicoChange} disabled={isSubmitting}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent>
         <ScrollArea className="h-48">
          {servicosOpcoes.map(s=>
           <SelectItem key={s.id} value={s.id}>
            {s.servico} {s.usa_folha?'📄':''}
           </SelectItem>
          )}
         </ScrollArea>
        </SelectContent>
       </Select>

       {selectedServico?.usa_folha&&
        <Alert className="mt-2 border-cyan-500/30 bg-cyan-500/10">
         <AlertTriangle className="h-4 w-4 text-cyan-400"/>
         <AlertDescription className="text-sm text-cyan-400">
          Este serviço consome folhas. O estoque será validado automaticamente.
         </AlertDescription>
        </Alert>
       }
      </div>

      <div className="space-y-2">
       <Label>Cliente *</Label>
       <Select
        value={formData.cliente_id}
        onValueChange={val=>setFormData(prev=>({...prev,cliente_id:val}))}
        disabled={isSubmitting}
       >
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent>
         <ScrollArea className="h-48">
          {clientesOpcoes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
         </ScrollArea>
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label>Forma de Pagamento *</Label>
       <Select
        value={formData.forma_pagamento}
        onValueChange={val=>setFormData(prev=>({...prev,forma_pagamento:val}))}
        disabled={isSubmitting}
       >
        <SelectTrigger><SelectValue placeholder="Selecione a forma de pagamento"/></SelectTrigger>
        <SelectContent>
         <SelectItem value="Dinheiro">Dinheiro</SelectItem>
         <SelectItem value="PIX">PIX</SelectItem>
         <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
         <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
        </SelectContent>
       </Select>
      </div>

      {selectedServico?.usa_folha&&
       <div className="border-t border-border pt-6">
        <FolhasTable
         folhas={folhasConsumo}
         setFolhas={setFolhasConsumo}
         tiposFolha={tiposFolha}
         estoqueAtual={mappedEstoqueAtual}
         disabled={isSubmitting}
        />
       </div>
      }

      <DialogFooter className="mt-6 gap-2">
       <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>Cancelar</Button>

       <Button type="submit" className="text-slate-950" style={{background:C}} disabled={isSubmitting}>
        {isSubmitting&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
        {editingId?'Atualizar Serviço':'Salvar Serviço'}
       </Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

   <div className="grid gap-4 md:grid-cols-4">
    <Card className="col-span-1 border-border md:col-span-3">
     <CardContent className="flex flex-col items-center gap-4 p-4 md:flex-row">
      <div className="relative flex w-full flex-1 items-center">
       <Search className="absolute left-3 h-5 w-5 text-muted-foreground"/>
       <Input
        placeholder="Buscar por serviço ou cliente..."
        value={searchTerm}
        onChange={e=>setSearchTerm(e.target.value)}
        className="h-11 pl-10"
       />
      </div>

      <div className="flex w-full gap-3 md:w-auto">
       <Select value={selectedMonth} onValueChange={setSelectedMonth}>
        <SelectTrigger className="w-[150px]"><SelectValue/></SelectTrigger>
        <SelectContent>
         {Array.from({length:12},(_,i)=>
          <SelectItem key={i} value={String(i)}>
           {format(new Date(2024,i,1),'MMMM',{locale:ptBR})}
          </SelectItem>
         )}
        </SelectContent>
       </Select>

       <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="w-[110px]"><SelectValue/></SelectTrigger>
        <SelectContent>{availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
       </Select>
      </div>
     </CardContent>
    </Card>

    <Card className="border-primary/20 bg-primary/10">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-semibold uppercase tracking-wide text-primary">Total no Período</CardTitle>
     </CardHeader>
     <CardContent>
      <div className="truncate text-2xl font-black text-primary">
       {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(totalServicos)}
      </div>
     </CardContent>
    </Card>
   </div>

   <Card className="overflow-hidden border-border">
    <CardContent className="p-0">
     <ScrollArea className="h-[600px]">
      <Table>
       <TableHeader className="sticky top-0 z-10 border-b border-border/40 bg-card/95 backdrop-blur">
        <TableRow>
         <TableHead className="w-[120px] py-4 pl-6">Data</TableHead>
         <TableHead className="py-4">Serviço</TableHead>
         <TableHead className="py-4">Cliente</TableHead>
         <TableHead className="py-4">Folhas Gastas</TableHead>
         <TableHead className="py-4 text-right">Valor</TableHead>
         <TableHead className="w-[120px] py-4 pr-6 text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {isLoadingLancamentos?
         <TableRow>
          <TableCell colSpan={6} className="py-16 text-center">
           <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{color:C}}/>
          </TableCell>
         </TableRow>:
         !filteredServicos.length?
         <TableRow>
          <TableCell colSpan={6} className="py-16 text-center text-muted-foreground">
           Nenhum serviço registrado neste período.
          </TableCell>
         </TableRow>:
         filteredServicos.map(item=>
          <TableRow key={item.id} className="border-border/30 hover:bg-[hsl(var(--neon-lanhouse)/.04)]">
           <TableCell className="py-4 pl-6 font-medium">{formatDateDisplay(item.data)}</TableCell>

           <TableCell className="py-4">
            <div className="flex flex-col">
             <span className="font-semibold">{item.lm_servicos?.servico||'N/A'}</span>
             {item.forma_pagamento&&
              <span className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{item.forma_pagamento}</span>
             }
            </div>
           </TableCell>

           <TableCell className="py-4">
            <span className="text-sm font-semibold uppercase tracking-wider">{item.lm_clientes?.nome||item.cliente||'-'}</span>
           </TableCell>

           <TableCell className="py-4 text-sm">{formatFolhasGastas(item.folhas_gastas)}</TableCell>

           <TableCell className="py-4 text-right font-bold" style={{color:C}}>
            {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(item.valor)}
           </TableCell>

           <TableCell className="pr-6 text-center">
            <div className="flex items-center justify-center gap-2">
             <Button
              variant="ghost"
              size="icon"
              className="text-blue-400 hover:bg-blue-500/10 hover:text-blue-500"
              onClick={()=>handleOpenDialog(item)}
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10 hover:text-red-500">
                <Trash2 className="h-4 w-4"/>
               </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
               <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>Tem certeza?</AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={()=>handleDelete(item.id)} className="bg-red-500">Excluir</AlertDialogAction>
               </AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>
            </div>
           </TableCell>
          </TableRow>
         )
        }
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>
  </motion.div>
 );
}
