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
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const TZ='America/Sao_Paulo';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CATEGORIAS=['Impressão','Digital','Infraestrutura','Manutenção','Outros'];
const RED='hsl(0 84% 60%)';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const getSPDate=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`};
const dateKey=v=>String(v||'').slice(0,10);
const monthKey=v=>dateKey(v).slice(0,7);
const monthLabel=v=>{const k=monthKey(v);if(!/^\d{4}-\d{2}$/.test(k))return'mês selecionado';const[y,m]=k.split('-');return`${meses[Number(m)-1]} de ${y}`};
const dateBR=v=>{const m=dateKey(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:'-'};
const moneyInput=v=>{const d=String(v??'').replace(/\D/g,'');return d?BRL.format(Number(d)/100):''};
const moneyNumber=v=>{const d=String(v??'').replace(/\D/g,'');return d?Number(d)/100:0};
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const isReposicaoFolhaName=v=>/reposi.{0,8}de folha/i.test(String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''));
const tipoLabel=v=>v==='Estoque'?'Entrada no estoque':v==='Despesa operacional'?'Despesa operacional':v||'—';

export default function LancamentoDespesas(){
 const{user}=useAuth(),{toast}=useToast(),{isOnline}=useOnlineStatus(),mounted=useRef(true);
 const[despesas,setDespesas]=useState([]),[despesasPrevistas,setDespesasPrevistas]=useState([]),[tiposDespesa,setTiposDespesa]=useState([]),[tiposFolha,setTiposFolha]=useState([]),[insumos,setInsumos]=useState([]),[loading,setLoading]=useState(true);
 const today=getSPDate();
 const[searchTerm,setSearchTerm]=useState(''),[selectedMonth,setSelectedMonth]=useState(String(Number(today.slice(5,7))-1)),[selectedYear,setSelectedYear]=useState(today.slice(0,4));
 const[dialogOpen,setDialogOpen]=useState(false),[editingId,setEditingId]=useState(null);
 const initialForm={data:getSPDate(),despesa_id:'',despesa_prevista_id:'',valor:'',forma_pagamento:'',parcelas:1,tipo_custo:'Fixo',categoria:'',recorrencia:'',quantidade:'',tipo_folha:'',insumo_id:''};
 const[formData,setFormData]=useState(initialForm);
 const selectedDespesa=tiposDespesa.find(d=>String(d.id)===String(formData.despesa_id));
 const tipoLancamento=selectedDespesa?.tipo_lancamento||'';
 const isEstoque=tipoLancamento==='Estoque';
 const tipoLancamentoLabel=tipoLabel(tipoLancamento);
 const categoriaAutomatica=selectedDespesa?.categoria||'';
 const isReposicaoFolha=isEstoque&&isReposicaoFolhaName(selectedDespesa?.despesa);
 const selectedInsumo=insumos.find(i=>String(i.id)===String(formData.insumo_id));
 const selectedFolha=tiposFolha.find(t=>String(t.tipo_folha)===String(formData.tipo_folha));
 const showParcelas=formData.forma_pagamento==='Cartão de Crédito';

 const contasPrevistasDoMes=useMemo(()=>{
  const k=monthKey(formData.data);
  return k?despesasPrevistas.filter(p=>monthKey(p.data_vencimento)===k):[];
 },[despesasPrevistas,formData.data]);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const fetchData=useCallback(async()=>{
  if(!user){setLoading(false);return}
  setLoading(true);
  try{
   const[a,b,c,d,e]=await Promise.all([
    supabase.from('lm_lanc_despesas').select('*,lm_despesas(despesa,categoria,tipo_lancamento)').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_despesas').select('id,despesa,categoria,tipo_lancamento').eq('user_id',user.id).order('despesa',{ascending:true}),
    supabase.from('lm_tipos_folha').select('id,tipo_folha,insumo_id').eq('user_id',user.id).order('tipo_folha',{ascending:true}),
    supabase.from('lm_insumos').select('id,nome,unidade,estoque_minimo').eq('user_id',user.id).eq('ativo',true).order('nome',{ascending:true}),
    supabase.from('lm_despesas_previstas').select('id,descricao,data_vencimento,valor,categoria,status').eq('user_id',user.id).order('data_vencimento',{ascending:true})
   ]);
   for(const r of[a,b,c,d,e])if(r.error)throw r.error;
   if(mounted.current){
    setDespesas(a.data||[]);setTiposDespesa(b.data||[]);setTiposFolha(c.data||[]);setInsumos(d.data||[]);setDespesasPrevistas(e.data||[]);
   }
  }catch(e){
   if(mounted.current)toast({title:'Erro',description:e.message||'Não foi possível carregar os dados.',variant:'destructive'});
  }finally{if(mounted.current)setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const years=useMemo(()=>{
  const y=despesas.map(x=>Number(dateKey(x.data).slice(0,4))).filter(Number.isFinite);
  y.push(Number(getSPDate().slice(0,4)));
  return[...new Set(y)].sort((a,b)=>b-a);
 },[despesas]);

 const filtered=useMemo(()=>{
  let r=despesas;
  if(selectedYear!=='all')r=r.filter(x=>dateKey(x.data).slice(0,4)===selectedYear);
  if(selectedMonth!=='all')r=r.filter(x=>Number(dateKey(x.data).slice(5,7))-1===Number(selectedMonth));
  if(searchTerm.trim()){
   const s=normalize(searchTerm);
   r=r.filter(x=>
    normalize(x.lm_despesas?.despesa).includes(s)||
    normalize(x.lm_despesas?.categoria).includes(s)||
    normalize(x.tipo_folha).includes(s)||
    normalize(insumos.find(i=>String(i.id)===String(x.insumo_id))?.nome).includes(s)||
    normalize(despesasPrevistas.find(p=>String(p.id)===String(x.despesa_prevista_id))?.descricao).includes(s)
   );
  }
  return r;
 },[despesas,selectedYear,selectedMonth,searchTerm,insumos,despesasPrevistas]);

 const total=filtered.reduce((s,x)=>s+Number(x.valor||0),0);

 const openDialog=item=>{
  if(item){
   const folha=tiposFolha.find(t=>normalize(t.tipo_folha)===normalize(item.tipo_folha));
   const insumoId=item.insumo_id||folha?.insumo_id||insumos.find(i=>normalize(i.nome)===normalize(item.tipo_folha||item.lm_despesas?.despesa))?.id||'';
   const linkId=String(item.despesa_prevista_id||'');
   const link=despesasPrevistas.find(p=>String(p.id)===linkId);
   const linkValido=!!link&&monthKey(link.data_vencimento)===monthKey(item.data);
   if(linkId&&!linkValido)toast({title:'Vínculo fora do período',description:'A conta anteriormente vinculada pertence a outro mês/ano ou não está disponível. Selecione uma conta do período do lançamento.',variant:'destructive'});
   setEditingId(item.id);
   setFormData({
    data:dateKey(item.data),despesa_id:String(item.despesa_id||''),
    despesa_prevista_id:linkValido?linkId:'',
    valor:moneyInput(Math.round(Number(item.valor||0)*100)),
    forma_pagamento:item.forma_pagamento||'',parcelas:item.parcelas||1,
    tipo_custo:item.tipo_custo||'Fixo',
    categoria:item.lm_despesas?.categoria||item.categoria||'',
    recorrencia:item.recorrencia||'',quantidade:item.quantidade??'',
    tipo_folha:item.tipo_folha||'',insumo_id:String(insumoId||'')
   });
  }else{
   setEditingId(null);setFormData({...initialForm,data:getSPDate()});
  }
  setDialogOpen(true);
 };

 const closeDialog=()=>{setDialogOpen(false);setEditingId(null);setFormData({...initialForm,data:getSPDate()})};

 const changeData=v=>{
  const id=formData.despesa_prevista_id;
  const link=despesasPrevistas.find(p=>String(p.id)===String(id));
  if(id&&(!link||monthKey(link.data_vencimento)!==monthKey(v))){
   setFormData(p=>({...p,data:v,despesa_prevista_id:''}));
   toast({title:'Vínculo removido',description:`A data mudou de mês/ano. Selecione uma conta prevista de ${monthLabel(v)}.`});
  }else setFormData(p=>({...p,data:v}));
 };

 const changeDespesa=id=>{
  const item=tiposDespesa.find(d=>String(d.id)===String(id));
  setFormData(p=>({...p,despesa_id:id,despesa_prevista_id:'',categoria:item?.categoria||'',quantidade:'',tipo_folha:'',insumo_id:''}));
 };

 const save=async e=>{
  e.preventDefault();
  const valorNumerico=moneyNumber(formData.valor);

  if(!formData.despesa_id||!selectedDespesa?.tipo_lancamento||!categoriaAutomatica||!formData.valor||!formData.data||!formData.forma_pagamento||!formData.tipo_custo||!formData.recorrencia){
   toast({title:'Atenção',description:'Preencha os campos obrigatórios e configure a classificação e categoria da descrição no cadastro.',variant:'destructive'});
   return;
  }
  if(!CATEGORIAS.includes(categoriaAutomatica)){
   toast({title:'Categoria inválida',description:'Corrija a categoria desta descrição no cadastro antes de continuar.',variant:'destructive'});
   return;
  }
  if(!Number.isFinite(valorNumerico)||valorNumerico<=0){
   toast({title:'Valor inválido',description:'Informe um valor maior que zero.',variant:'destructive'});return;
  }
  if(isEstoque&&(!formData.quantidade||!Number.isFinite(Number(formData.quantidade))||Number(formData.quantidade)<=0)){
   toast({title:'Quantidade inválida',description:'Informe uma quantidade maior que zero para a entrada no estoque.',variant:'destructive'});return;
  }

  const contaSelecionada=formData.despesa_prevista_id?despesasPrevistas.find(p=>String(p.id)===String(formData.despesa_prevista_id)):null;
  if(formData.despesa_prevista_id&&(!contaSelecionada||monthKey(contaSelecionada.data_vencimento)!==monthKey(formData.data))){
   toast({title:'Conta prevista fora do período',description:'Selecione uma conta prevista do mesmo mês e ano da data do lançamento.',variant:'destructive'});return;
  }

  let insumoId=null;
  if(isEstoque&&isReposicaoFolha){
   const folha=tiposFolha.find(t=>String(t.tipo_folha)===String(formData.tipo_folha));
   if(!folha){toast({title:'Atenção',description:'Selecione o tipo de folha que será abastecido.',variant:'destructive'});return}
   insumoId=folha.insumo_id||null;
   if(!insumoId){toast({title:'Insumo não vinculado',description:`A folha "${folha.tipo_folha}" ainda não está vinculada a um insumo. Confira o cadastro de Insumos antes de continuar.`,variant:'destructive'});return}
  }else if(isEstoque){
   if(!formData.insumo_id){toast({title:'Atenção',description:'Selecione o insumo que receberá a entrada no estoque.',variant:'destructive'});return}
   insumoId=formData.insumo_id;
  }

  const payload={
   user_id:user.id,data:dateKey(formData.data),despesa_id:formData.despesa_id,
   despesa_prevista_id:formData.despesa_prevista_id||null,
   valor:valorNumerico,forma_pagamento:formData.forma_pagamento,
   parcelas:showParcelas?Math.max(1,Number(formData.parcelas)||1):null,
   tipo_custo:formData.tipo_custo,categoria:categoriaAutomatica,
   recorrencia:formData.recorrencia,tipo_lancamento:selectedDespesa.tipo_lancamento,
   quantidade:isEstoque?Number(formData.quantidade):null,
   tipo_folha:isEstoque&&isReposicaoFolha?formData.tipo_folha:null,insumo_id:insumoId
  };

  try{
   if(!isOnline){toast({title:'Offline',description:'É necessário estar online para salvar ou editar lançamentos.',variant:'destructive'});return}
   const q=editingId
    ?supabase.from('lm_lanc_despesas').update(payload).eq('id',editingId).eq('user_id',user.id)
    :supabase.from('lm_lanc_despesas').insert(payload);
   const{error}=await q;
   if(error)throw error;
   toast({title:'Sucesso',description:editingId?'Despesa atualizada.':'Despesa registrada.'});
   closeDialog();await fetchData();
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
    <div><p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:RED}}>LM Impressões</p><h1 className="mt-1 text-2xl font-bold text-red-400">Lançamento de Despesas</h1><p className="text-sm text-muted-foreground">Gerencie gastos e entradas de materiais.</p></div>
    <Button onClick={()=>openDialog()} className="bg-red-500 text-white hover:bg-red-600"><Plus className="mr-2 h-4 w-4"/>Nova Despesa</Button>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[{l:'Registros',v:filtered.length},{l:'Total Filtrado',v:BRL.format(total)},{l:'Entradas no estoque',v:filtered.filter(x=>x.tipo_lancamento==='Estoque').length},{l:'Despesas operacionais',v:filtered.filter(x=>x.tipo_lancamento==='Despesa operacional').length}].map(x=><Card key={x.l} className="border-border bg-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p><p className="mt-1 text-xl font-bold tabular-nums" style={{color:RED}}>{x.v}</p></CardContent></Card>)}
   </div>

   <Card className="border-border bg-card"><CardContent className="p-4"><div className="flex flex-col gap-3 xl:flex-row">
    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar despesa, categoria, folha ou insumo..." className="h-11 border-border bg-input pl-9"/></div>
    <div className="flex flex-wrap gap-2">
     <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[150px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select>
     <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[125px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os anos</SelectItem>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
     <Button variant="outline" onClick={()=>{setSearchTerm('');setSelectedMonth(String(Number(getSPDate().slice(5,7))-1));setSelectedYear(getSPDate().slice(0,4))}}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button>
    </div>
   </div></CardContent></Card>

   <ModalLancamentoPadrao open={dialogOpen} onClose={closeDialog} title={editingId?'Editar Despesa':'Nova Despesa'} description={editingId?'Atualize os dados da despesa.':'Registre uma nova despesa.'} icon={Receipt} theme="red" footer={<><Button type="button" variant="outline" onClick={closeDialog} className="h-11 rounded-xl border-border px-5">Cancelar</Button><Button type="submit" form="form-despesa" className="h-11 rounded-xl bg-red-500 px-6 font-semibold text-white hover:bg-red-600">{editingId?'Atualizar':'Salvar'}</Button></>}>
    <form id="form-despesa" onSubmit={save} className="max-h-[calc(100vh-300px)] space-y-5 overflow-y-auto pr-1">
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Data *</Label><Input type="date" value={formData.data} onChange={e=>changeData(e.target.value)} required className="h-11 rounded-xl bg-input"/></div>
      <div className="space-y-2"><Label>Valor (R$) *</Label><Input type="text" inputMode="numeric" autoComplete="off" value={formData.valor} onChange={e=>setFormData(p=>({...p,valor:moneyInput(e.target.value)}))} required placeholder="R$ 0,00" className="h-11 rounded-xl bg-input tabular-nums"/></div>
     </div>

     <div className="space-y-2"><Label>Descrição *</Label><Select value={formData.despesa_id} onValueChange={changeDespesa}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione a despesa"/></SelectTrigger><SelectContent><ScrollArea className="h-48">{tiposDespesa.map(t=><SelectItem key={t.id} value={String(t.id)}>{t.despesa}</SelectItem>)}</ScrollArea></SelectContent></Select></div>

     <div className="space-y-2">
      <Label>Conta prevista vinculada — {monthLabel(formData.data)} (opcional)</Label>
      <Select value={formData.despesa_prevista_id||'nenhuma'} onValueChange={v=>setFormData(p=>({...p,despesa_prevista_id:v==='nenhuma'?'':v}))}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Sem vínculo"/></SelectTrigger>
       <SelectContent className="max-h-72">
        <SelectItem value="nenhuma">Sem vínculo</SelectItem>
        {contasPrevistasDoMes.map(p=><SelectItem key={p.id} value={String(p.id)}>{`${p.descricao||'Conta'} • Venc. ${dateBR(p.data_vencimento)} • ${BRL.format(Number(p.valor)||0)}`}</SelectItem>)}
       </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Somente contas com vencimento no mesmo mês e ano da data do lançamento aparecem aqui. O vínculo pode ficar vazio.</p>
      {!contasPrevistasDoMes.length&&<p className="text-sm text-amber-400">Não há contas previstas para {monthLabel(formData.data)}. A despesa pode ser salva sem vínculo.</p>}
     </div>

     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label>Classificação automática</Label>
       <div className="flex min-h-11 items-center rounded-xl border border-border bg-muted/30 px-3"><Badge variant="outline" className={tipoLancamento==='Estoque'?'border-emerald-500/30 bg-emerald-500/10 text-emerald-400':'border-red-500/30 bg-red-500/10 text-red-400'}>{tipoLancamentoLabel}</Badge></div>
      </div>
      <div className="space-y-2">
       <Label>Categoria automática</Label>
       <div className="flex min-h-11 items-center rounded-xl border border-border bg-muted/30 px-3"><Badge variant="outline">{categoriaAutomatica||'Configure no cadastro'}</Badge></div>
      </div>
     </div>
     <p className="text-xs text-muted-foreground">Classificação e categoria são definidas em Cadastros → Tipos de Despesa.</p>

     {isEstoque&&isReposicaoFolha&&<div className="space-y-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <Label>Tipo de folha a abastecer *</Label>
      <Select value={formData.tipo_folha} onValueChange={v=>setFormData(p=>({...p,tipo_folha:v,insumo_id:tiposFolha.find(t=>String(t.tipo_folha)===String(v))?.insumo_id||''}))}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione a folha"/></SelectTrigger>
       <SelectContent className="max-h-60 overflow-y-auto">{tiposFolha.map(t=><SelectItem key={t.id} value={t.tipo_folha}>{t.tipo_folha}</SelectItem>)}</SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">O tipo de folha precisa estar vinculado a um insumo cadastrado.</p>
      {formData.tipo_folha&&!selectedFolha?.insumo_id&&<p className="text-sm text-red-400">Esta folha ainda não possui um insumo vinculado. Verifique o cadastro antes de salvar.</p>}
     </div>}

     {isEstoque&&!isReposicaoFolha&&<div className="space-y-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
      <Label>Insumo a abastecer *</Label>
      <Select value={formData.insumo_id} onValueChange={v=>setFormData(p=>({...p,insumo_id:v}))}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione um insumo"/></SelectTrigger>
       <SelectContent className="max-h-60 overflow-y-auto">{insumos.map(i=><SelectItem key={i.id} value={String(i.id)}>{i.nome} — {i.unidade}</SelectItem>)}</SelectContent>
      </Select>
      {selectedInsumo&&<p className="text-xs text-muted-foreground">Unidade: {selectedInsumo.unidade}{selectedInsumo.estoque_minimo!=null?` • Estoque mínimo: ${Number(selectedInsumo.estoque_minimo).toLocaleString('pt-BR')}`:''}</p>}
      {!insumos.length&&<p className="text-sm text-red-400">Nenhum insumo ativo cadastrado. Cadastre primeiro em Cadastros → Insumos.</p>}
     </div>}

     {isEstoque&&<div className="space-y-2"><Label>Quantidade de material *</Label><Input type="number" min="0.001" step="0.001" value={formData.quantidade} onChange={e=>setFormData(p=>({...p,quantidade:e.target.value}))} required className="h-11 rounded-xl bg-input"/></div>}

     <div className="space-y-2">
      <Label>Tipo de Custo *</Label>
      <RadioGroup value={formData.tipo_custo} onValueChange={v=>setFormData(p=>({...p,tipo_custo:v}))} className="flex gap-5 pt-2">
       <div className="flex items-center gap-2"><RadioGroupItem value="Fixo" id="fixo"/><Label htmlFor="fixo">Fixo</Label></div>
       <div className="flex items-center gap-2"><RadioGroupItem value="Variável" id="variavel"/><Label htmlFor="variavel">Variável</Label></div>
      </RadioGroup>
     </div>

     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Recorrência *</Label><Select value={formData.recorrencia} onValueChange={v=>setFormData(p=>({...p,recorrencia:v}))}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{['Único','Mensal','Anual'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-2"><Label>Forma de Pagamento *</Label><Select value={formData.forma_pagamento} onValueChange={v=>setFormData(p=>({...p,forma_pagamento:v}))}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{['Dinheiro','Débito','Cartão de Crédito','Pix','Boleto'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
     </div>

     {showParcelas&&<div className="space-y-2"><Label>Parcelas *</Label><Input type="number" min="1" step="1" value={formData.parcelas} onChange={e=>setFormData(p=>({...p,parcelas:e.target.value}))} required className="h-11 rounded-xl bg-input"/></div>}
    </form>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card"><CardContent className="p-0"><ScrollArea className="h-[520px]"><Table>
    <TableHeader className="sticky top-0 z-10 bg-secondary/70"><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Conta prevista</TableHead><TableHead>Classificação</TableHead><TableHead>Categoria</TableHead><TableHead>Folha/Insumo</TableHead><TableHead className="text-center">Qtd</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
    <TableBody>
     {loading?<TableRow><TableCell colSpan={9} className="py-12 text-center">Carregando...</TableCell></TableRow>:!filtered.length?<TableRow><TableCell colSpan={9} className="py-12 text-center text-muted-foreground">Nenhuma despesa encontrada.</TableCell></TableRow>:filtered.map(x=><TableRow key={x.id} className="hover:bg-muted/40">
      <TableCell>{dateBR(x.data)}</TableCell><TableCell className="font-semibold">{x.lm_despesas?.despesa||'N/A'}</TableCell>
      <TableCell className="text-sm">{despesasPrevistas.find(p=>String(p.id)===String(x.despesa_prevista_id))?.descricao||'—'}</TableCell>
      <TableCell><Badge variant="outline">{tipoLabel(x.tipo_lancamento)}</Badge></TableCell>
      <TableCell>{x.lm_despesas?.categoria||x.categoria||'Não configurada'}</TableCell>
      <TableCell>{x.tipo_folha||insumos.find(i=>String(i.id)===String(x.insumo_id))?.nome||x.lm_despesas?.despesa||'—'}</TableCell>
      <TableCell className="text-center">{x.quantidade??'—'}</TableCell>
      <TableCell className="text-right font-bold tabular-nums" style={{color:RED}}>{BRL.format(Number(x.valor)||0)}</TableCell>
      <TableCell><div className="flex justify-center">
       <Button variant="ghost" size="icon" title="Editar despesa" onClick={()=>openDialog(x)} style={{color:RED}}><Edit className="h-4 w-4"/></Button>
       <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" title="Excluir despesa" className="text-red-500"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir despesa?</AlertDialogTitle><AlertDialogDescription>Essa ação não poderá ser desfeita. A movimentação vinculada também deixará de contar no cálculo do estoque.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div></TableCell>
     </TableRow>)}
    </TableBody>
   </Table></ScrollArea></CardContent></Card>
  </motion.div>
 );
}
