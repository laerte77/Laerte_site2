import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash2,CalendarCheck,Search,Download,CheckCircle,XCircle,Clock,RefreshCw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const anos=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];

const LancamentoDespesaPrevista=()=>{
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[tipos,setTipos]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState('');
 const[open,setOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),[exportOpen,setExportOpen]=useState(false);
 const[deleteItem,setDeleteItem]=useState(null),[current,setCurrent]=useState(null);
 const[exportFilters,setExportFilters]=useState({month:new Date().getMonth(),year:new Date().getFullYear()});
 const initial={vencimento:'',despesa:'',valor:'',forma_pagamento:'',parcelas:1,status:'PENDENTE'};
 const[form,setForm]=useState(initial);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('igreja_despesas_previstas').select('*').eq('user_id',user.id).order('vencimento'),
    supabase.from('igreja_tipos_despesa').select('id,despesa').eq('user_id',user.id).order('despesa')
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   setData(a.data||[]);setTipos(b.data||[]);
  }catch(e){toast({title:'Erro ao carregar dados',description:e.message,variant:'destructive'})}
  finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('igreja_despesas_previstas_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'igreja_despesas_previstas'},load)
   .subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const filtered=data.filter(i=>
  !search||
  `${i.despesa||''} ${i.forma_pagamento||''} ${i.status||''}`.toLowerCase().includes(search.toLowerCase())
 );

 const reset=()=>{setForm(initial);setCurrent(null)};
 const close=()=>{setOpen(false);reset()};

 const save=async()=>{
  if(!form.vencimento||!form.despesa||!form.valor||!form.forma_pagamento){
   toast({title:'Campos obrigatórios',description:'Preencha os campos obrigatórios.',variant:'destructive'});
   return;
  }

  const payload={
   ...form,
   user_id:user.id,
   parcelas:form.forma_pagamento==='CARTÃO DE CRÉDITO'?form.parcelas:null
  };

  const q=current
   ?await supabase.from('igreja_despesas_previstas').update(payload).eq('id',current.id)
   :await supabase.from('igreja_despesas_previstas').insert(payload);

  if(q.error)toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  else{toast({title:'Sucesso',description:current?'Despesa prevista atualizada.':'Despesa prevista registrada.'});close();load()}
 };

 const openDialog=item=>{
  if(item){
   setCurrent(item);
   setForm({...item,parcelas:item.parcelas||1,vencimento:item.vencimento?.slice(0,10)||''});
  }else reset();
  setOpen(true);
 };

 const remove=async()=>{
  if(!deleteItem)return;
  const{error}=await supabase.from('igreja_despesas_previstas').delete().eq('id',deleteItem.id);
  if(error)toast({title:'Erro ao remover',description:error.message,variant:'destructive'});
  else{toast({title:'Sucesso',description:'Despesa prevista removida.'});setDeleteItem(null);load()}
 };

 const statusIcon=s=>s==='PAGO'?<CheckCircle className="h-5 w-5 text-green-400"/>:s==='VENCIDO'?<XCircle className="h-5 w-5 text-red-400"/>:<Clock className="h-5 w-5 text-yellow-400"/>;

 return(
  <div className="dark-igreja space-y-5">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10">
      <CalendarCheck className="h-5 w-5 text-orange-400"/>
     </div>
     <div>
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Tesouraria • Lançamentos</p>
      <h1 className="text-2xl font-bold md:text-3xl">Despesas Previstas</h1>
      <p className="text-sm text-muted-foreground">Controle compromissos financeiros futuros da igreja.</p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button>
     <Button variant="outline" onClick={()=>setExportOpen(true)}><Download className="mr-2 h-4 w-4"/>Exportar</Button>
     <Button variant="outline" onClick={()=>setSearchOpen(true)}><Search className="mr-2 h-4 w-4"/>Buscar</Button>
     <Button onClick={()=>openDialog()} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"><Plus className="mr-2 h-4 w-4"/>Nova Despesa</Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="p-4">
     <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar despesa prevista..." className="bg-input pl-9"/>
     </div>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-3">
    <Card className="border-border bg-card">
     <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total cadastradas</CardTitle></CardHeader>
     <CardContent><p className="text-2xl font-bold text-[hsl(var(--neon-igreja))]">{data.length}</p></CardContent>
    </Card>
    <Card className="border-border bg-card">
     <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Resultado atual</CardTitle></CardHeader>
     <CardContent><p className="text-2xl font-bold">{filtered.length}</p></CardContent>
    </Card>
    <Card className="border-border bg-card">
     <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendentes</CardTitle></CardHeader>
     <CardContent><p className="text-2xl font-bold text-yellow-400">{data.filter(x=>x.status==='PENDENTE').length}</p></CardContent>
    </Card>
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3"><CardTitle className="text-lg text-[hsl(var(--neon-igreja))]">Despesas previstas</CardTitle></CardHeader>
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead><tr className="border-b border-border bg-muted/30">
        <th className="p-4 text-left text-muted-foreground">Vencimento</th>
        <th className="p-4 text-left text-muted-foreground">Tipo</th>
        <th className="p-4 text-left text-muted-foreground">Pagamento</th>
        <th className="p-4 text-right text-muted-foreground">Valor</th>
        <th className="p-4 text-center text-muted-foreground">Status</th>
        <th className="p-4 text-right text-muted-foreground">Ações</th>
       </tr></thead>

       <tbody>
        {loading?<tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:
         filtered.length?filtered.map(i=>(
          <tr key={i.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-igreja)/.04)]">
           <td className="p-4">{new Date(i.vencimento).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</td>
           <td className="p-4 font-medium">{i.despesa}</td>
           <td className="p-4">{i.forma_pagamento}{i.forma_pagamento==='CARTÃO DE CRÉDITO'&&i.parcelas>1?` (${i.parcelas}x)`:''}</td>
           <td className="p-4 text-right font-bold text-red-400">R$ {Number(i.valor||0).toFixed(2)}</td>
           <td className="p-4"><div className="flex justify-center">{statusIcon(i.status)}</div></td>
           <td className="p-4">
            <div className="flex justify-end gap-1">
             <Button variant="ghost" size="icon" onClick={()=>openDialog(i)} className="text-[hsl(var(--neon-igreja))]"><Edit className="h-4 w-4"/></Button>
             <Button variant="ghost" size="icon" onClick={()=>setDeleteItem(i)} className="text-red-400"><Trash2 className="h-4 w-4"/></Button>
            </div>
           </td>
          </tr>
         )):
         <tr><td colSpan={6} className="p-12 text-center text-muted-foreground"><CalendarCheck className="mx-auto mb-3 h-10 w-10 opacity-40"/>Nenhuma despesa prevista encontrada.</td></tr>}
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>

   <SearchableModal
    isOpen={searchOpen}
    onClose={()=>setSearchOpen(false)}
    onSelect={i=>{openDialog(i);setSearchOpen(false)}}
    tableName="igreja_despesas_previstas"
    searchField="despesa"
    displayFields={[
     {key:'vencimento',label:'Venc.',format:d=>new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'})},
     {key:'despesa',label:'Tipo'},
     {key:'valor',label:'Valor',format:v=>`R$ ${Number(v).toFixed(2)}`}
    ]}
    title="Buscar Despesa Prevista"
   />

   <ModalLancamentoPadrao
    open={open}
    onClose={close}
    title={current?'Editar Despesa Prevista':'Nova Despesa Prevista'}
    description="Preencha os dados da despesa prevista."
    icon={current?Edit:CalendarCheck}
    theme="orange"
    footer={<><Button variant="outline" onClick={close}>Cancelar</Button><Button onClick={save} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]">Salvar</Button></>}
   >
    <div className="space-y-5">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.vencimento} onChange={e=>setForm({...form,vencimento:e.target.value})} className="bg-input"/></div>
      <div className="space-y-2"><Label>Valor</Label><Input type="number" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} className="bg-input"/></div>
     </div>

     <div className="space-y-2">
      <Label>Tipo de Despesa</Label>
      <Select value={form.despesa} onValueChange=v=>setForm({...form,despesa:v})>
       <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card igreja-select-hover">
        <ScrollArea className="h-48">{[...tipos].sort((a,b)=>a.despesa.localeCompare(b.despesa,'pt-BR')).map(t=><SelectItem key={t.id} value={t.despesa}>{t.despesa}</SelectItem>)}</ScrollArea>
       </SelectContent>
      </Select>
     </div>

     <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label>Forma de Pagamento</Label>
       <Select value={form.forma_pagamento} onValueChange=v=>setForm({...form,forma_pagamento:v})>
        <SelectTrigger className="bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent className="dark-igreja bg-card igreja-select-hover">
         <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
         <SelectItem value="CARTÃO DE CRÉDITO">Cartão de Crédito</SelectItem>
         <SelectItem value="CARTÃO DE DÉBITO">Cartão de Débito</SelectItem>
         <SelectItem value="PIX">PIX</SelectItem>
         <SelectItem value="BOLETO">Boleto</SelectItem>
        </SelectContent>
       </Select>
      </div>

      {form.forma_pagamento==='CARTÃO DE CRÉDITO'&&
       <div className="space-y-2">
        <Label>Parcelas</Label>
        <Input type="number" min="1" value={form.parcelas} onChange={e=>setForm({...form,parcelas:parseInt(e.target.value)||1})} className="bg-input"/>
       </div>}
     </div>

     <div className="space-y-2">
      <Label>Status</Label>
      <Select value={form.status} onValueChange=v=>setForm({...form,status:v})>
       <SelectTrigger className="bg-input"><SelectValue/></SelectTrigger>
       <SelectContent className="dark-igreja bg-card igreja-select-hover">
        <SelectItem value="PENDENTE">Pendente</SelectItem>
        <SelectItem value="PAGO">Pago</SelectItem>
        <SelectItem value="VENCIDO">Vencido</SelectItem>
       </SelectContent>
      </Select>
     </div>
    </div>
   </ModalLancamentoPadrao>

   <DialogExport open={exportOpen} setOpen={setExportOpen} filters={exportFilters} setFilters={setExportFilters}/>
   
   <AlertDialog open={!!deleteItem} onOpenChange={()=>setDeleteItem(null)}>
    <AlertDialogContent className="dark-igreja">
     <AlertDialogHeader><AlertDialogTitle>Excluir despesa prevista?</AlertDialogTitle></AlertDialogHeader>
     <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>
  </div>
 );
};

const DialogExport=({open,setOpen,filters,setFilters})=>(
 <div>
  <AlertDialog open={false}/>
 </div>
);

export default LancamentoDespesaPrevista;
