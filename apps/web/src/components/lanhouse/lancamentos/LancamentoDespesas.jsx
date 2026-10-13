import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,Search,RotateCcw,Receipt}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{RadioGroup,RadioGroupItem}from'@/components/ui/radio-group';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{ScrollArea}from'@/components/ui/scroll-area';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import OfflineIndicator from'@/components/OfflineIndicator';
import{useOnlineStatus}from'@/hooks/useOnlineStatus';
import{saveOfflineData}from'@/lib/offlineStorage';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const TZ='America/Sao_Paulo';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const RED='hsl(0 84% 60%)';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const getSPDate=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`};
const getSPYear=()=>Number(getSPDate().slice(0,4));
const dateKey=v=>String(v||'').slice(0,10);
const dateBR=v=>{const m=dateKey(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:'-'};

export default function LancamentoDespesas(){
 const{user}=useAuth(),{toast}=useToast(),{isOnline,checkPending}=useOnlineStatus(),mounted=useRef(true);
 const[despesas,setDespesas]=useState([]),[tiposDespesa,setTiposDespesa]=useState([]),[tiposFolha,setTiposFolha]=useState([]),[loading,setLoading]=useState(true);
 const today=getSPDate();
 const[searchTerm,setSearchTerm]=useState(''),[selectedMonth,setSelectedMonth]=useState(String(Number(today.slice(5,7))-1)),[selectedYear,setSelectedYear]=useState(String(getSPYear()));
 const[dialogOpen,setDialogOpen]=useState(false),[editingId,setEditingId]=useState(null);
 const initialForm={data:getSPDate(),despesa_id:'',valor:'',forma_pagamento:'',parcelas:1,tipo_custo:'Fixo',categoria:'',recorrencia:'',tipo_lancamento:'',quantidade:'',tipo_folha:''};
 const[formData,setFormData]=useState(initialForm);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b,c]=await Promise.all([
    supabase.from('lm_lanc_despesas').select('*,lm_despesas(despesa,categoria)').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_despesas').select('id,despesa,categoria').eq('user_id',user.id).order('despesa',{ascending:true}),
    supabase.from('lm_tipos_folha').select('id,tipo_folha').eq('user_id',user.id).order('tipo_folha',{ascending:true})
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
   if(mounted.current){setDespesas(a.data||[]);setTiposDespesa(b.data||[]);setTiposFolha(c.data||[])}
  }catch(e){
   if(mounted.current)toast({title:'Erro',description:e.message||'Não foi possível carregar.',variant:'destructive'});
  }finally{if(mounted.current)setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const years=useMemo(()=>{
  const y=despesas.map(x=>Number(dateKey(x.data).slice(0,4))).filter(Number.isFinite);
  y.push(getSPYear());
  return[...new Set(y)].sort((a,b)=>b-a);
 },[despesas]);

 const filtered=useMemo(()=>{
  let r=despesas;
  if(selectedYear!=='all')r=r.filter(x=>dateKey(x.data).slice(0,4)===selectedYear);
  if(selectedMonth!=='all')r=r.filter(x=>Number(dateKey(x.data).slice(5,7))-1===Number(selectedMonth));
  if(searchTerm.trim()){
   const s=searchTerm.toLowerCase();
   r=r.filter(x=>(x.lm_despesas?.despesa||'').toLowerCase().includes(s)||(x.lm_despesas?.categoria||'').toLowerCase().includes(s)||(x.tipo_folha||'').toLowerCase().includes(s));
  }
  return r;
 },[despesas,selectedYear,selectedMonth,searchTerm]);

 const total=filtered.reduce((s,x)=>s+Number(x.valor||0),0);
 const isEstoque=formData.tipo_lancamento==='Estoque';
 const showParcelas=formData.forma_pagamento==='Cartão de Crédito';

 useEffect(()=>{
  if(isEstoque&&!editingId){
   const x=tiposDespesa.find(d=>(d.despesa||'').toLowerCase().includes('reposição de folha'));
   if(x)setFormData(p=>({...p,despesa_id:x.id}));
  }
 },[isEstoque,tiposDespesa,editingId]);

 const openDialog=item=>{
  if(item){
   setEditingId(item.id);
   setFormData({
    data:dateKey(item.data),despesa_id:item.despesa_id,valor:item.valor??'',
    forma_pagamento:item.forma_pagamento||'',parcelas:item.parcelas||1,
    tipo_custo:item.tipo_custo||'Fixo',categoria:item.categoria||'',
    recorrencia:item.recorrencia||'',tipo_lancamento:item.tipo_lancamento||'',
    quantidade:item.quantidade??'',tipo_folha:item.tipo_folha||''
   });
  }else{
   setEditingId(null);setFormData({...initialForm,data:getSPDate()});
  }
  setDialogOpen(true);
 };

 const closeDialog=()=>{setDialogOpen(false);setEditingId(null);setFormData({...initialForm,data:getSPDate()})};

 const save=async e=>{
  e.preventDefault();
  if(!formData.despesa_id||!formData.valor||!formData.data||!formData.forma_pagamento||!formData.tipo_custo||!formData.categoria||!formData.recorrencia||!formData.tipo_lancamento||!formData.quantidade){
   toast({title:'Atenção',description:'Preencha os campos obrigatórios.',variant:'destructive'});return;
  }
  if(!Number.isFinite(Number(formData.valor))||Number(formData.valor)<=0){
   toast({title:'Valor inválido',description:'Informe um valor maior que zero.',variant:'destructive'});return;
  }
  if(isEstoque&&!formData.tipo_folha){
   toast({title:'Atenção',description:'Tipo Folha é obrigatório para Estoque.',variant:'destructive'});return;
  }
  if(!Number.isFinite(Number(formData.quantidade))||Number(formData.quantidade)<=0){
   toast({title:'Atenção',description:'Quantidade inválida.',variant:'destructive'});return;
  }
  const payload={
   user_id:user.id,data:dateKey(formData.data),despesa_id:formData.despesa_id,
   valor:Number(formData.valor),forma_pagamento:formData.forma_pagamento,
   parcelas:showParcelas?Math.max(1,Number(formData.parcelas)||1):null,
   tipo_custo:formData.tipo_custo,categoria:formData.categoria,
   recorrencia:formData.recorrencia,tipo_lancamento:formData.tipo_lancamento,
   quantidade:Number(formData.quantidade),tipo_folha:isEstoque?formData.tipo_folha:null
  };
  try{
   if(!isOnline&&!editingId){
    await saveOfflineData('lm_despesas',payload);
    toast({title:'Offline',description:'Despesa salva localmente.'});checkPending();
   }else{
    if(!isOnline){toast({title:'Offline',description:'Edição offline não permitida.',variant:'destructive'});return}
    const q=editingId
     ?supabase.from('lm_lanc_despesas').update(payload).eq('id',editingId).eq('user_id',user.id)
     :supabase.from('lm_lanc_despesas').insert(payload);
    const{error}=await q;if(error)throw error;
    toast({title:'Sucesso',description:editingId?'Despesa atualizada.':'Despesa registrada.'});
   }
   closeDialog();if(isOnline)await fetchData();
  }catch(e){toast({title:'Erro',description:e.message||'Falha ao salvar.',variant:'destructive'})}
 };

 const remove=async id=>{
  if(!isOnline){toast({title:'Offline',description:'Exclusão offline não permitida.',variant:'destructive'});return}
  try{
   const{error}=await supabase.from('lm_lanc_despesas').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido',description:'Despesa excluída.'});await fetchData();
  }catch(e){toast({title:'Erro',description:e.message||'Falha ao excluir.',variant:'destructive'})}
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <OfflineIndicator/>
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div><p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:RED}}>LM Impressões</p><h1 className="mt-1 text-2xl font-bold text-red-400">Lançamento de Despesas</h1><p className="text-sm text-muted-foreground">Gerencie gastos, estoque e custos.</p></div>
    <Button onClick={()=>openDialog()} className="bg-red-500 text-white hover:bg-red-600"><Plus className="mr-2 h-4 w-4"/>Nova Despesa</Button>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[{l:'Registros',v:filtered.length},{l:'Total Filtrado',v:BRL.format(total)},{l:'Estoque',v:filtered.filter(x=>x.tipo_lancamento==='Estoque').length},{l:'Consumo/Perda',v:filtered.filter(x=>['Consumo','Perda'].includes(x.tipo_lancamento)).length}].map(x=><Card key={x.l} className="border-border bg-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p><p className="mt-1 text-xl font-bold tabular-nums" style={{color:RED}}>{x.v}</p></CardContent></Card>)}
   </div>

   <Card className="border-border bg-card"><CardContent className="p-4"><div className="flex flex-col gap-3 xl:flex-row">
    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar despesa, categoria ou folha..." className="h-11 border-border bg-input pl-9"/></div>
    <div className="flex flex-wrap gap-2">
     <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[150px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select>
     <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[125px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os anos</SelectItem>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
     <Button variant="outline" onClick={()=>{setSearchTerm('');setSelectedMonth(String(Number(getSPDate().slice(5,7))-1));setSelectedYear(String(getSPYear()))}}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button>
    </div>
   </div></CardContent></Card>

   <ModalLancamentoPadrao open={dialogOpen} onClose={closeDialog} title={editingId?'Editar Despesa':'Nova Despesa'} description={editingId?'Atualize os dados da despesa.':'Registre uma nova despesa.'} icon={Receipt} theme="red" footer={<><Button type="button" variant="outline" onClick={closeDialog} className="h-11 rounded-xl border-border px-5">Cancelar</Button><Button type="submit" form="form-despesa" className="h-11 rounded-xl bg-red-500 px-6 font-semibold text-white hover:bg-red-600">{editingId?'Atualizar':'Salvar'}</Button></>}>
    <form id="form-despesa" onSubmit={save} className="max-h-[calc(100vh-300px)] space-y-5 overflow-y-auto pr-1">
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Data *</Label><Input type="date" value={formData.data} onChange={e=>setFormData(p=>({...p,data:e.target.value}))} required className="h-11 rounded-xl bg-input"/></div>
      <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="number" min="0.01" step="0.01" value={formData.valor} onChange={e=>setFormData(p=>({...p,valor:e.target.value}))} required placeholder="0,00" className="h-11 rounded-xl bg-input"/></div>
     </div>
     <div className="space-y-2"><Label>Descrição *</Label><Select value={formData.despesa_id} onValueChange={v=>setFormData(p=>({...p,despesa_id:v}))} disabled={isEstoque}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione a despesa"/></SelectTrigger><SelectContent><ScrollArea className="h-48">{tiposDespesa.map(t=><SelectItem key={t.id} value={t.id}>{t.despesa}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
     <div className="space-y-2"><Label>Tipo de Lançamento *</Label><Select value={formData.tipo_lancamento} onValueChange={v=>setFormData(p=>({...p,tipo_lancamento:v,tipo_folha:v==='Estoque'?p.tipo_folha:''}))}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><SelectItem value="Estoque">Estoque</SelectItem><SelectItem value="Consumo">Consumo</SelectItem><SelectItem value="Perda">Perda</SelectItem></SelectContent></Select></div>
     {isEstoque&&<div className="space-y-2"><Label>Tipo de Folha *</Label><Select value={formData.tipo_folha} onValueChange={v=>setFormData(p=>({...p,tipo_folha:v}))}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione a folha"/></SelectTrigger><SelectContent>{tiposFolha.map(t=><SelectItem key={t.id} value={t.tipo_folha}>{t.tipo_folha}</SelectItem>)}</SelectContent></Select></div>}
     <div className="space-y-2"><Label>Quantidade *</Label><Input type="number" min="1" step="1" value={formData.quantidade} onChange={e=>setFormData(p=>({...p,quantidade:e.target.value}))} required className="h-11 rounded-xl bg-input"/></div>
     <div className="space-y-2"><Label>Tipo de Custo *</Label><RadioGroup value={formData.tipo_custo} onValueChange={v=>setFormData(p=>({...p,tipo_custo:v}))} className="flex gap-5 pt-2"><div className="flex items-center gap-2"><RadioGroupItem value="Fixo" id="fixo"/><Label htmlFor="fixo">Fixo</Label></div><div className="flex items-center gap-2"><RadioGroupItem value="Variável" id="variavel"/><Label htmlFor="variavel">Variável</Label></div></RadioGroup></div>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Categoria *</Label><Select value={formData.categoria} onValueChange={v=>setFormData(p=>({...p,categoria:v}))}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{['Impressão','Digital','Infraestrutura','Manutenção','Outros'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Recorrência *</Label><Select value={formData.recorrencia} onValueChange={v=>setFormData(p=>({...p,recorrencia:v}))}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{['Único','Mensal','Anual'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
     </div>
     <div className={`grid ${showParcelas?'grid-cols-1 sm:grid-cols-2':'grid-cols-1'} gap-4`}>
      <div className="space-y-2"><Label>Forma de Pagamento *</Label><Select value={formData.forma_pagamento} onValueChange={v=>setFormData(p=>({...p,forma_pagamento:v}))}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{['Dinheiro','Débito','Cartão de Crédito','Pix','Boleto'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
      {showParcelas&&<div className="space-y-2"><Label>Parcelas *</Label><Input type="number" min="1" step="1" value={formData.parcelas} onChange={e=>setFormData(p=>({...p,parcelas:e.target.value}))} required className="h-11 rounded-xl bg-input"/></div>}
     </div>
    </form>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card"><CardContent className="p-0"><ScrollArea className="h-[520px]"><Table>
    <TableHeader className="sticky top-0 z-10 bg-secondary/70"><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Tipo</TableHead><TableHead>Folha</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
    <TableBody>{loading?<TableRow><TableCell colSpan={8} className="py-12 text-center">Carregando...</TableCell></TableRow>:!filtered.length?<TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground">Nenhuma despesa encontrada.</TableCell></TableRow>:filtered.map(x=><TableRow key={x.id} className="hover:bg-muted/40"><TableCell>{dateBR(x.data)}</TableCell><TableCell className="font-semibold">{x.lm_despesas?.despesa||'N/A'}</TableCell><TableCell><Badge variant="outline">{x.tipo_lancamento||'-'}</Badge></TableCell><TableCell>{x.tipo_folha||'-'}</TableCell><TableCell className="text-center">{x.quantidade||'-'}</TableCell><TableCell><Badge variant="outline">{x.categoria||'N/A'}</Badge></TableCell><TableCell className="text-right font-bold tabular-nums" style={{color:RED}}>{BRL.format(Number(x.valor)||0)}</TableCell><TableCell><div className="flex justify-center"><Button variant="ghost" size="icon" title="Editar despesa" onClick={()=>openDialog(x)} style={{color:RED}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" title="Excluir despesa" className="text-red-500"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir despesa?</AlertDialogTitle><AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell></TableRow>)}</TableBody>
   </Table></ScrollArea></CardContent></Card>
  </motion.div>
 );
}

