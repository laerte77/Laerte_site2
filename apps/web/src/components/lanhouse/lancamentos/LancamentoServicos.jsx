import React,{useState,useMemo,useCallback}from'react';
import{motion}from'framer-motion';
import{Plus,Trash2,Search,Download,Edit,Loader2,AlertTriangle,PackageSearch,RotateCcw,Receipt}from'lucide-react';
import{format,parse}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{Alert,AlertDescription}from'@/components/ui/alert';
import{useToast}from'@/hooks/use-toast';
import FolhasTable from'@/components/lanhouse/FolhasTable';
import{useServiceCache}from'@/hooks/useServiceCache';
import{useOptimizedServiceData}from'@/hooks/useOptimizedServiceData';
import{useEstoqueCalculation}from'@/hooks/useEstoqueCalculation';
import EstoqueAtualCard from'../estoques/EstoqueAtualCard';
import OfflineIndicator from'@/components/OfflineIndicator';
import{useOnlineStatus}from'@/hooks/useOnlineStatus';
import{saveOfflineData}from'@/lib/offlineStorage';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import*as XLSX from'xlsx';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CYAN='hsl(190 90% 50%)',BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const availableYears=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];

export default function LancamentoServicos(){
 const{user}=useAuth(),{toast}=useToast(),{isOnline,checkPending}=useOnlineStatus();
 const[searchTerm,setSearchTerm]=useState(''),[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth())),[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[addOpen,setAddOpen]=useState(false),[exportOpen,setExportOpen]=useState(false),[stockOpen,setStockOpen]=useState(false),[editingId,setEditingId]=useState(null),[folhasConsumo,setFolhasConsumo]=useState([]),[originalFolhas,setOriginalFolhas]=useState([]),[saving,setSaving]=useState(false);
 const[exportFilters,setExportFilters]=useState({month:new Date().getMonth(),year:new Date().getFullYear()});
 const{servicos:servicosOpcoes,clientes:clientesOpcoes,tiposFolha}=useServiceCache();
 const{data:servicosLancados,loading,refresh}=useOptimizedServiceData({month:selectedMonth,year:selectedYear});
 const{stockData,isLoading:isStockLoading,lastUpdate}=useEstoqueCalculation();
 const initial={data:format(new Date(),'yyyy-MM-dd'),servico_id:'',cliente_id:'',valor:'',forma_pagamento:''};
 const[formData,setFormData]=useState(initial);

 const normalize=useCallback(v=>v?v.toString().toUpperCase().trim():'',[]);
 const folhasText=useCallback(v=>!Array.isArray(v)||!v.length?'-':v.filter(x=>!x.e_rascunho&&x.tipo_folha&&x.quantidade).map(x=>`${x.tipo_folha} - ${x.quantidade} un`).join(', ')||'-',[]);
 const filtered=useMemo(()=>!searchTerm.trim()?servicosLancados:servicosLancados.filter(i=>(i.lm_servicos?.servico||'').toLowerCase().includes(searchTerm.toLowerCase())||(i.lm_clientes?.nome||i.cliente||'').toLowerCase().includes(searchTerm.toLowerCase())),[searchTerm,servicosLancados]);
 const total=filtered.reduce((s,x)=>s+Number(x.valor||0),0);
 const selectedServico=servicosOpcoes.find(s=>s.id===formData.servico_id);
 const estoqueAtual=Object.fromEntries(Object.entries(stockData).map(([k,v])=>[k,v.estoqueAtual]));

 const openDialog=item=>{
  if(item){
   const cid=item.cliente_id||clientesOpcoes.find(c=>c.nome===item.cliente)?.id||'';
   setEditingId(item.id);
   setFormData({data:item.data,servico_id:item.servico_id,cliente_id:cid,valor:item.valor,forma_pagamento:item.forma_pagamento||''});
   setOriginalFolhas(item.folhas_gastas?JSON.parse(JSON.stringify(item.folhas_gastas)):[]);
   setFolhasConsumo(item.folhas_gastas||[]);
  }else{
   setEditingId(null);setFormData(initial);setOriginalFolhas([]);setFolhasConsumo([]);
  }
  setSaving(false);setAddOpen(true);
 };

 const closeDialog=()=>{
  if(saving)return;
  setAddOpen(false);setEditingId(null);setFormData(initial);setFolhasConsumo([]);setOriginalFolhas([]);
 };

 const validate=()=>{
  if(!selectedServico?.usa_folha)return{ok:true};
  if(!folhasConsumo.length)return{ok:false,msg:'Este serviço requer pelo menos uma folha.'};
  const stock={};
  Object.keys(stockData).forEach(k=>stock[k]=stockData[k].estoqueAtual);
  originalFolhas.forEach(f=>{
   if(!f.e_rascunho&&f.tipo_folha&&f.quantidade){
    const k=normalize(f.tipo_folha);stock[k]=(stock[k]||0)+Number(f.quantidade);
   }
  });
  for(const f of folhasConsumo){
   if(!f.tipo_folha)return{ok:false,msg:'Selecione o tipo de folha.'};
   if(Number(f.quantidade)<=0)return{ok:false,msg:'Quantidade deve ser maior que zero.'};
   if(!f.e_rascunho&&Number(f.quantidade)>(stock[normalize(f.tipo_folha)]||0))
    return{ok:false,msg:`Estoque insuficiente para ${f.tipo_folha}.`};
  }
  return{ok:true};
 };

 const save=async e=>{
  e.preventDefault();
  if(!formData.data||!formData.servico_id||!formData.cliente_id||!formData.valor||!formData.forma_pagamento){
   toast({title:'Atenção',description:'Preencha todos os campos obrigatórios.',variant:'destructive'});return;
  }
  const v=validate();
  if(!v.ok){toast({title:'Aviso de Estoque',description:v.msg,variant:'destructive'});return}
  setSaving(true);
  try{
   const payload={
    user_id:user.id,data:formData.data,servico_id:formData.servico_id,cliente_id:formData.cliente_id,
    cliente:clientesOpcoes.find(c=>c.id===formData.cliente_id)?.nome||null,
    valor:Number(formData.valor),forma_pagamento:formData.forma_pagamento,
    folhas_gastas:folhasConsumo.length?folhasConsumo:null
   };
   if(!isOnline&&!editingId){
    await saveOfflineData('lm_servicos',payload);
    toast({title:'Offline',description:'Serviço salvo localmente.'});checkPending();
   }else{
    if(!isOnline){
     toast({title:'Offline',description:'Edição offline não permitida.',variant:'destructive'});return;
    }
    const q=editingId
     ?supabase.from('lm_lanc_servicos').update(payload).eq('id',editingId).eq('user_id',user.id)
     :supabase.from('lm_lanc_servicos').insert(payload);
    const{error}=await q;if(error)throw error;
    toast({title:'Sucesso',description:editingId?'Serviço atualizado.':'Serviço registrado.'});
    await refresh();
   }
   closeDialog();
  }catch(e){
   toast({title:'Erro ao salvar',description:e.message,variant:'destructive'});
  }finally{setSaving(false)}
 };

 const remove=async id=>{
  if(!isOnline){
   toast({title:'Offline',description:'Exclusão offline não permitida.',variant:'destructive'});return;
  }
  try{
   const{error}=await supabase.from('lm_lanc_servicos').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido',description:'Serviço excluído.'});refresh();
  }catch(e){
   toast({title:'Erro',description:e.message,variant:'destructive'});
  }
 };

 const exportar=()=>{
  if(!filtered.length){
   toast({title:'Aviso',description:'Nenhum dado.',variant:'destructive'});return;
  }
  const data=filtered.map(i=>({
   DATA:format(parse(i.data,'yyyy-MM-dd',new Date()),'dd/MM/yyyy'),
   SERVIÇO:i.lm_servicos?.servico||'N/A',
   CLIENTE:i.lm_clientes?.nome||i.cliente||'-',
   'FOLHAS GASTAS':folhasText(i.folhas_gastas),
   PAGAMENTO:i.forma_pagamento||'-',
   VALOR:Number(i.valor||0)
  }));
  const ws=XLSX.utils.json_to_sheet(data),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Serviços');
  XLSX.writeFile(wb,`Servicos_LM_${meses[exportFilters.month]}_${exportFilters.year}.xlsx`);
  setExportOpen(false);
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <OfflineIndicator/>

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p>
     <h1 className="mt-1 text-2xl font-bold text-foreground">Lançamento de Serviços</h1>
     <p className="text-sm text-muted-foreground">Registre e gerencie os serviços prestados.</p>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={()=>setStockOpen(true)}><PackageSearch className="mr-2 h-4 w-4"/>Estoque</Button>
     <Button variant="outline" onClick={()=>setExportOpen(true)}><Download className="mr-2 h-4 w-4"/>Exportar</Button>
     <Button onClick={()=>openDialog()} className="text-white" style={{background:CYAN}}><Plus className="mr-2 h-4 w-4"/>Novo Serviço</Button>
    </div>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[{l:'Registros',v:filtered.length},{l:'Total',v:BRL.format(total)},{l:'Com Folhas',v:filtered.filter(x=>Array.isArray(x.folhas_gastas)&&x.folhas_gastas.length).length},{l:'Clientes',v:new Set(filtered.map(x=>x.cliente_id||x.cliente)).size}].map(x=>
     <Card key={x.l} className="border-border bg-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p><p className="mt-1 text-xl font-bold" style={{color:CYAN}}>{x.v}</p></CardContent></Card>
    )}
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">
     <div className="flex flex-col gap-3 xl:flex-row">
      <div className="relative flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar serviço ou cliente..." className="h-10 pl-9"/>
      </div>
      <div className="flex flex-wrap gap-2">
       <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[140px]"><SelectValue/></SelectTrigger><SelectContent>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select>
       <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[110px]"><SelectValue/></SelectTrigger><SelectContent>{availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
       <Button variant="outline" onClick={()=>setSearchTerm('')}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button>
      </div>
     </div>
    </CardContent>
   </Card>

   <Dialog open={stockOpen} onOpenChange={setStockOpen}>
    <DialogContent className="bg-card border-border sm:max-w-[800px]">
     <DialogHeader><DialogTitle><PackageSearch className="mr-2 inline h-5 w-5" style={{color:CYAN}}/>Estoque Atual</DialogTitle><DialogDescription>Disponibilidade de folhas.</DialogDescription></DialogHeader>
     <ScrollArea className="max-h-[60vh]"><div className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">{isStockLoading?<Loader2 className="mx-auto h-8 w-8 animate-spin"/>:Object.values(stockData).map(i=><EstoqueAtualCard key={i.tipo_folha} item={i} lastUpdate={lastUpdate}/>)}</div></ScrollArea>
     <DialogFooter><Button variant="outline" onClick={()=>setStockOpen(false)}>Fechar</Button></DialogFooter>
    </DialogContent>
   </Dialog>

   <Dialog open={exportOpen} onOpenChange={setExportOpen}>
    <DialogContent className="bg-card border-border sm:max-w-[430px]">
     <DialogHeader><DialogTitle>Exportar Serviços</DialogTitle><DialogDescription>Selecione o período.</DialogDescription></DialogHeader>
     <div className="grid grid-cols-2 gap-4 py-4">
      <div><Label>Mês</Label><Select value={String(exportFilters.month)} onValueChange={v=>setExportFilters(p=>({...p,month:Number(v)}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Ano</Label><Select value={String(exportFilters.year)} onValueChange={v=>setExportFilters(p=>({...p,year:Number(v)}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableYears.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
     </div>
     <DialogFooter><Button variant="outline" onClick={()=>setExportOpen(false)}>Cancelar</Button><Button onClick={exportar} style={{background:CYAN}} className="text-white">Exportar</Button></DialogFooter>
    </DialogContent>
   </Dialog>

   <ModalLancamentoPadrao
    open={addOpen}
    onClose={closeDialog}
    title={editingId?'Editar Serviço':'Novo Serviço'}
    description={editingId?'Atualize os dados do serviço.':'Registre um novo serviço prestado.'}
    icon={Receipt}
    theme="blue"
    footer={
     <>
      <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
      <Button type="submit" form="form-servico" disabled={saving} className="bg-cyan-500 text-white hover:bg-cyan-400">
       {saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
       {editingId?'Atualizar':'Salvar'}
      </Button>
     </>
    }
   >
    <form id="form-servico" onSubmit={save} className="space-y-5">
     <div className="grid grid-cols-2 gap-4">
      <div><Label>Data *</Label><Input type="date" value={formData.data} onChange={e=>setFormData(p=>({...p,data:e.target.value}))}/></div>
      <div><Label>Valor *</Label><Input type="number" step="0.01" value={formData.valor} onChange={e=>setFormData(p=>({...p,valor:e.target.value}))}/></div>
     </div>

     <div>
      <Label>Tipo do Serviço *</Label>
      <Select value={formData.servico_id} onValueChange={v=>setFormData(p=>({...p,servico_id:v}))} disabled={saving}>
       <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent><ScrollArea className="h-48">{servicosOpcoes.map(s=><SelectItem key={s.id} value={s.id}>{s.servico}{s.usa_folha?' 📄':''}</SelectItem>)}</ScrollArea></SelectContent>
      </Select>
      {selectedServico?.usa_folha&&<Alert className="mt-2 border-cyan-500/30 bg-cyan-500/10"><AlertTriangle className="h-4 w-4"/><AlertDescription>Este serviço consome folhas e terá validação do estoque.</AlertDescription></Alert>}
     </div>

     <div>
      <Label>Cliente *</Label>
      <Select value={formData.cliente_id} onValueChange={v=>setFormData(p=>({...p,cliente_id:v}))} disabled={saving}>
       <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent><ScrollArea className="h-48">{clientesOpcoes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</ScrollArea></SelectContent>
      </Select>
     </div>

     <div>
      <Label>Forma de Pagamento *</Label>
      <Select value={formData.forma_pagamento} onValueChange={v=>setFormData(p=>({...p,forma_pagamento:v}))}>
       <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent>{['Dinheiro','PIX','Cartão de Crédito','Cartão de Débito'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
      </Select>
     </div>

     {selectedServico?.usa_folha&&<div className="border-t border-border pt-4"><FolhasTable folhas={folhasConsumo} setFolhas={setFolhasConsumo} tiposFolha={tiposFolha} estoqueAtual={estoqueAtual} disabled={saving}/></div>}
    </form>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <ScrollArea className="h-[560px]">
      <Table>
       <TableHeader className="sticky top-0 z-10 bg-secondary/70"><TableRow><TableHead>Data</TableHead><TableHead>Serviço</TableHead><TableHead>Cliente</TableHead><TableHead>Folhas</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
       <TableBody>
        {loading?<TableRow><TableCell colSpan={6} className="py-12 text-center">Carregando...</TableCell></TableRow>
        :!filtered.length?<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Nenhum serviço encontrado.</TableCell></TableRow>
        :filtered.map(x=>
         <TableRow key={x.id} className="hover:bg-muted/40">
          <TableCell>{format(parse(x.data,'yyyy-MM-dd',new Date()),'dd/MM/yyyy')}</TableCell>
          <TableCell className="font-semibold">{x.lm_servicos?.servico||'N/A'}<div className="text-xs text-muted-foreground">{x.forma_pagamento||''}</div></TableCell>
          <TableCell>{x.lm_clientes?.nome||x.cliente||'-'}</TableCell>
          <TableCell>{folhasText(x.folhas_gastas)}</TableCell>
          <TableCell className="text-right font-bold" style={{color:CYAN}}>{BRL.format(Number(x.valor)||0)}</TableCell>
          <TableCell>
           <div className="flex justify-center">
            <Button variant="ghost" size="icon" onClick={()=>openDialog(x)} style={{color:CYAN}}><Edit className="h-4 w-4"/></Button>
            <AlertDialog>
             <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-500"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
             <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir serviço?</AlertDialogTitle><AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
           </div>
          </TableCell>
         </TableRow>
        )}
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>
  </motion.div>
 )
}
