import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Trash2,Search,Edit,WalletCards,Download,FileText,DollarSign,ArrowDownRight,CalendarDays,Filter,ChevronLeft,ChevronRight}from'lucide-react';
import{format,addMonths,setDate,subDays}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{Badge}from'@/components/ui/badge';
import{ScrollArea}from'@/components/ui/scroll-area';
import OfflineIndicator from'@/components/OfflineIndicator';
import{useOnlineStatus}from'@/hooks/useOnlineStatus';
import{saveOfflineData}from'@/lib/offlineStorage';
import{exportToExcel}from'@/lib/ExportUtils';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import{competenciaFatura}from'@/lib/cartaoCompetencia';
import{getInstallmentValue}from'@/lib/cartaoParcelas';

const TZ='America/Sao_Paulo';
const RED='hsl(0 84% 60%)';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const years=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];

const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const roundMoney=v=>fromCents(toCents(v));
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const formatDateDisplay=v=>{
 if(!v)return'-';
 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(m)return`${m[3]}/${m[2]}/${m[1]}`;
 const d=new Date(v);
 return Number.isNaN(d.getTime())?'-':new Intl.DateTimeFormat('pt-BR',{timeZone:TZ}).format(d);
};

const formatMoney=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?money.format(fromCents(Number(d))):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?fromCents(Number(d)):0;
};

const initial=()=>({
 data:getBRDate(),
 despesa:'',
 valor:'',
 categoria:'',
 forma_pagamento:'Débito',
 parcelas:1,
 cartao_id:'',
 responsavel_id:'',
 despesa_prevista_id:'',
 lancamento_id:''
});

const cicloFatura=(dia,mes,ano)=>{
 const ref=new Date(ano,mes,1);
 const diaF=Math.min(Math.max(parseInt(dia,10)||1,1),28);
 const inicio=addMonths(setDate(ref,diaF),-1);
 const fim=subDays(setDate(ref,diaF),1);
 return{
  inicio:format(inicio,'yyyy-MM-dd'),
  fim:format(fim,'yyyy-MM-dd')
 };
};

const StatCard=({icon:Icon,label,value})=>(
 <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
  <div className="flex items-center gap-3">
   <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
    <Icon className="h-5 w-5 text-red-400"/>
   </div>
   <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 truncate text-xl font-bold text-red-400">{value}</p>
   </div>
  </div>
 </div>
);

const Despesas=()=>{
 const{user}=useAuth();
 const{toast}=useToast();
 const{isOnline,checkPending}=useOnlineStatus();
 const mounted=useRef(true);

 const[loading,setLoading]=useState(true);
 const[despesas,setDespesas]=useState([]);
 const[tipos,setTipos]=useState([]);
 const[cartoes,setCartoes]=useState([]);
 const[usuarios,setUsuarios]=useState([]);
 const[contasPrevistas,setContasPrevistas]=useState([]);
 const[comprasCartao,setComprasCartao]=useState([]);
 const[search,setSearch]=useState('');
 const[month,setMonth]=useState(String(new Date().getMonth()));
 const[year,setYear]=useState(String(new Date().getFullYear()));
 const[category,setCategory]=useState('all');
 const[payment,setPayment]=useState('all');
 const[open,setOpen]=useState(false);
 const[editing,setEditing]=useState(null);
 const[form,setForm]=useState(initial);
 const[currentPage,setCurrentPage]=useState(1);

 const pageSize=10;

 useEffect(()=>{
  mounted.current=true;
  return()=>{mounted.current=false};
 },[]);

 const fetchTipos=useCallback(async()=>{
  if(!user)return;
  const{data,error}=await supabase.from('tipos_despesa')
   .select('nome_despesa,categoria').eq('user_id',user.id).order('nome_despesa');
  if(!error&&mounted.current)setTipos(data||[]);
 },[user]);

 const fetchCartoes=useCallback(async()=>{
  if(!user)return;
  const{data,error}=await supabase.from('pessoal_cartoes')
   .select('id,nome,dia_fechamento,dia_vencimento').eq('user_id',user.id).order('nome');
  if(!error&&mounted.current)setCartoes(data||[]);
 },[user]);

 const fetchUsuarios=useCallback(async()=>{
  if(!user)return;
  const{data,error}=await supabase.from('pessoal_cartao_usuarios')
   .select('id,nome').eq('user_id',user.id).order('nome');
  if(!error&&mounted.current)setUsuarios(data||[]);
 },[user]);

 const fetchContasPrevistas=useCallback(async()=>{
  if(!user)return;
  const{data,error}=await supabase.from('despesas_previstas')
   .select('id,descricao,data_vencimento,valor,matched_transaction_id')
   .eq('user_id',user.id).order('data_vencimento',{ascending:true});
  if(error){console.error('Erro ao carregar contas previstas:',error);return;}
  if(mounted.current)setContasPrevistas(data||[]);
 },[user]);

 const fetchComprasCartao=useCallback(async()=>{
  if(!user)return;
  const{data,error}=await supabase.from('pessoal_cartao_lancamentos')
   .select('*').eq('user_id',user.id).order('data',{ascending:false});
  if(error){console.error('Erro ao carregar compras dos cartões:',error);return;}
  if(mounted.current)setComprasCartao(data||[]);
 },[user]);

 const fetchDespesas=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const ini=format(new Date(+year,+month,1),'yyyy-MM-dd');
   const fim=format(new Date(+year,+month+1,0),'yyyy-MM-dd');
   const{data,error}=await supabase.from('despesas').select('*')
    .eq('user_id',user.id).gte('data',ini).lte('data',fim)
    .order('data',{ascending:false});
   if(error)throw error;
   if(mounted.current)setDespesas(data||[]);
  }catch{
   if(mounted.current)toast({title:'Erro',description:'Não foi possível carregar as despesas.',variant:'destructive'});
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,month,year,toast]);

 useEffect(()=>{
  fetchDespesas();
  fetchTipos();
  fetchCartoes();
  fetchUsuarios();
  fetchContasPrevistas();
  fetchComprasCartao();
 },[fetchDespesas,fetchTipos,fetchCartoes,fetchUsuarios,fetchContasPrevistas,fetchComprasCartao]);

 const categories=useMemo(()=>[
  'all',...tipos.map(t=>t.categoria).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)
 ],[tipos]);

 const filtered=useMemo(()=>{
  const q=search.trim().toLowerCase();
  return despesas.filter(item=>{
   const searchMatch=!q||item.despesa?.toLowerCase().includes(q)||
    item.categoria?.toLowerCase().includes(q)||item.forma_pagamento?.toLowerCase().includes(q);
   return searchMatch&&(category==='all'||item.categoria===category)&&
    (payment==='all'||item.forma_pagamento===payment);
  });
 },[despesas,search,category,payment]);

 useEffect(()=>{setCurrentPage(1)},[search,category,payment,month,year]);

 const totalC=filtered.reduce((a,x)=>a+toCents(x.valor),0);
 const mediaC=filtered.length?Math.round(totalC/filtered.length):0;
 const maiorC=filtered.reduce((max,x)=>Math.max(max,toCents(x.valor)),0);
 const total=fromCents(totalC);
 const media=fromCents(mediaC);
 const maior=fromCents(maiorC);
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));

 const paginated=useMemo(()=>{
  const start=(currentPage-1)*pageSize;
  return filtered.slice(start,start+pageSize);
 },[filtered,currentPage]);

 const responsavel=id=>usuarios.find(x=>String(x.id)===String(id))?.nome||'';
 const monthKey=value=>String(value||'').slice(0,7);

 const contasPrevistasDoMes=useMemo(()=>contasPrevistas.filter(p=>
  (monthKey(p.data_vencimento)===monthKey(form.data)||
   String(p.matched_transaction_id||'')===String(editing||''))&&
  (!p.matched_transaction_id||String(p.matched_transaction_id)===String(editing||''))
 ),[contasPrevistas,form.data,editing]);

 const comprasDisponiveis=useMemo(()=>comprasCartao.filter(c=>
  !form.cartao_id||String(c.cartao_id)===String(form.cartao_id)
 ),[comprasCartao,form.cartao_id]);

 const reset=useCallback(()=>{
  setForm(initial());
  setEditing(null);
 },[]);

 const closeModal=useCallback(()=>{
  setOpen(false);
  reset();
 },[reset]);

 const openDialog=async item=>{
  if(item){
   setEditing(item.id);
   let linked=contasPrevistas.find(p=>String(p.matched_transaction_id||'')===String(item.id))||null;

   if(!linked){
    const{data,error}=await supabase.from('despesas_previstas')
     .select('id,descricao,data_vencimento,valor,matched_transaction_id')
     .eq('user_id',user.id).eq('matched_transaction_id',item.id).maybeSingle();
    if(!error&&data){
     linked=data;
     setContasPrevistas(prev=>[...prev.filter(p=>p.id!==data.id),data]);
    }
   }

   const{data:pagamento,error:pagamentoError}=await supabase.from('pessoal_cartao_pagamentos')
    .select('id,lancamento_id,responsavel_id')
    .eq('user_id',user.id).eq('despesa_id',item.id).maybeSingle();

   if(pagamentoError)console.error('Erro ao recuperar vínculo do pagamento:',pagamentoError);

   setForm({
    data:String(item.data||'').slice(0,10)||getBRDate(),
    despesa:item.despesa||'',
    valor:formatMoney(toCents(item.valor)),
    categoria:item.categoria||'',
    forma_pagamento:item.forma_pagamento||'Débito',
    parcelas:item.parcelas||1,
    cartao_id:item.cartao_id||'',
    responsavel_id:pagamento?.responsavel_id||item.responsavel_id||'',
    despesa_prevista_id:linked?.id||'',
    lancamento_id:pagamento?.lancamento_id||''
   });
  }else reset();

  setOpen(true);
 };

 const changeData=value=>{
  const linked=contasPrevistas.find(p=>String(p.id)===String(form.despesa_prevista_id));
  if(linked&&monthKey(linked.data_vencimento)!==monthKey(value)){
   setForm(prev=>({...prev,data:value,despesa_prevista_id:''}));
   toast({title:'Vínculo removido',description:'A conta prevista pertence a outro mês. Selecione outra conta para este período.'});
   return;
  }
  setForm(prev=>({...prev,data:value}));
 };

 const selecionarCompra=value=>{
  const compra=comprasCartao.find(c=>String(c.id)===String(value));
  if(!compra){
   setForm(prev=>({...prev,lancamento_id:''}));
   return;
  }
  setForm(prev=>({
   ...prev,
   forma_pagamento:'Crédito',
   cartao_id:compra.cartao_id||prev.cartao_id,
   responsavel_id:compra.responsavel_id||prev.responsavel_id,
   lancamento_id:String(compra.id)
  }));
 };

 const obterFaturaId=async(cartaoId,dataReferencia,compra)=>{
  if(compra?.fatura_id)return compra.fatura_id;

  const cartao=cartoes.find(c=>String(c.id)===String(cartaoId));
  if(!cartao)throw new Error('Cartão selecionado não foi encontrado.');

  const competencia=competenciaFatura(dataReferencia,cartao.dia_fechamento);
  if(!competencia)throw new Error('Não foi possível determinar a competência da fatura.');

  const{data:existente,error}=await supabase.from('pessoal_faturas')
   .select('id').eq('user_id',user.id).eq('cartao_id',cartaoId)
   .eq('mes',competencia.mes).eq('ano',competencia.ano).maybeSingle();

  if(error)throw error;
  if(existente?.id)return existente.id;

  const ciclo=cicloFatura(cartao.dia_fechamento,competencia.mes,competencia.ano);
  const vencimento=format(setDate(new Date(competencia.ano,competencia.mes,1),
   Math.min(cartao.dia_vencimento||1,28)),'yyyy-MM-dd');

  const{data:nova,error:erroInsert}=await supabase.from('pessoal_faturas')
   .insert({
    user_id:user.id,
    cartao_id:cartaoId,
    mes:competencia.mes,
    ano:competencia.ano,
    data_fechamento:ciclo.fim,
    data_vencimento:vencimento,
    valor_total:0,
    status:'aberta',
    data_pagamento:null
   }).select('id').single();

  if(erroInsert)throw erroInsert;
  return nova.id;
 };

 const sincronizarPagamento=async(despesaId,payload)=>{
  const{data:existente,error:consultaError}=await supabase.from('pessoal_cartao_pagamentos')
   .select('id').eq('user_id',user.id).eq('despesa_id',despesaId).maybeSingle();

  if(consultaError)throw consultaError;

  if(payload.forma_pagamento!=='Crédito'){
   if(existente?.id){
    const{error}=await supabase.from('pessoal_cartao_pagamentos')
     .delete().eq('id',existente.id).eq('user_id',user.id);
    if(error)throw error;
   }
   return;
  }

  const compra=payload.lancamento_id
   ?comprasCartao.find(c=>String(c.id)===String(payload.lancamento_id))
   :null;

  if(payload.lancamento_id&&!compra)throw new Error('A compra vinculada não foi encontrada. Atualize a lista e tente novamente.');

  if(compra&&String(compra.cartao_id)!==String(payload.cartao_id)){
   throw new Error('O cartão da despesa precisa ser o mesmo cartão da compra vinculada.');
  }

  const faturaId=await obterFaturaId(payload.cartao_id,compra?.data||payload.data,compra);

  const pagamentoPayload={
   user_id:user.id,
   fatura_id:faturaId,
   despesa_id:despesaId,
   lancamento_id:compra?.id||null,
   responsavel_id:compra?.responsavel_id||payload.responsavel_id||null,
   valor:roundMoney(payload.valor),
   data:payload.data,
   forma_pagamento:'Crédito'
  };

  if(existente?.id){
   const{error}=await supabase.from('pessoal_cartao_pagamentos')
    .update(pagamentoPayload).eq('id',existente.id).eq('user_id',user.id);
   if(error)throw error;
  }else{
   const{error}=await supabase.from('pessoal_cartao_pagamentos').insert(pagamentoPayload);
   if(error)throw error;
  }
 };

 const save=async e=>{
  e.preventDefault();
  const valor=roundMoney(moneyNum(form.valor));

  if(!form.data||!form.despesa||valor<=0){
   toast({title:'Campos obrigatórios',description:'Preencha todos os campos obrigatórios.',variant:'destructive'});
   return;
  }

  if(form.forma_pagamento==='Crédito'&&!form.cartao_id){
   toast({title:'Cartão obrigatório',description:'Selecione o cartão de crédito utilizado.',variant:'destructive'});
   return;
  }

  if(form.despesa_prevista_id&&!isOnline){
   toast({title:'Conexão necessária',description:'Conecte-se à internet para vincular uma conta prevista.',variant:'destructive'});
   return;
  }

  if(form.forma_pagamento==='Crédito'&&!isOnline){
   toast({title:'Conexão necessária',description:'Conecte-se à internet para sincronizar o pagamento do cartão.',variant:'destructive'});
   return;
  }

  try{
   let conta=null;

   if(form.despesa_prevista_id){
    const{data,error}=await supabase.from('despesas_previstas')
     .select('id,data_vencimento,matched_transaction_id')
     .eq('id',form.despesa_prevista_id).eq('user_id',user.id).maybeSingle();

    if(error)throw error;
    if(!data)throw new Error('Conta prevista não encontrada.');
    if(monthKey(data.data_vencimento)!==monthKey(form.data)){
     throw new Error('A conta prevista precisa pertencer ao mesmo mês da despesa.');
    }
    if(data.matched_transaction_id&&String(data.matched_transaction_id)!==String(editing||'')){
     throw new Error('Essa conta já está vinculada a outra despesa.');
    }
    conta=data;
   }

   const compraSelecionada=form.lancamento_id
    ?comprasCartao.find(c=>String(c.id)===String(form.lancamento_id))
    :null;

   if(form.lancamento_id&&!compraSelecionada)throw new Error('Compra vinculada não encontrada.');
   if(form.lancamento_id&&form.forma_pagamento!=='Crédito'){
    throw new Error('Uma compra do cartão só pode ser vinculada a uma despesa no crédito.');
   }
   if(compraSelecionada&&String(compraSelecionada.cartao_id)!==String(form.cartao_id)){
    throw new Error('Selecione o mesmo cartão utilizado na compra vinculada.');
   }

   const payload={
    user_id:user.id,
    data:form.data,
    despesa:form.despesa,
    valor,
    categoria:form.categoria,
    forma_pagamento:form.forma_pagamento,
    parcelas:Math.max(1,parseInt(form.parcelas,10)||1),
    cartao_id:form.forma_pagamento==='Crédito'?form.cartao_id:null,
    responsavel_id:form.forma_pagamento==='Crédito'
     ?(compraSelecionada?.responsavel_id||form.responsavel_id||null):null
   };

   if(!isOnline&&!editing){
    await saveOfflineData('pessoal_despesas',payload);
    if(mounted.current){
     toast({title:'Salvo offline',description:'Despesa salva localmente. O vínculo com cartão poderá ser feito quando estiver online.'});
     reset();
    }
    checkPending();
    return;
   }

   if(editing&&!isOnline){
    toast({title:'Offline',description:'Edição offline não permitida.',variant:'destructive'});
    return;
   }

   let despesaId=editing;

   if(editing){
    const{data,error}=await supabase.from('despesas').update(payload)
     .eq('id',editing).eq('user_id',user.id).select('id').single();
    if(error)throw error;
    despesaId=data.id;
   }else{
    const{data,error}=await supabase.from('despesas').insert([payload])
     .select('id').single();
    if(error)throw error;
    despesaId=data.id;
   }

   const{error:unlinkError}=await supabase.from('despesas_previstas')
    .update({matched_transaction_id:null})
    .eq('user_id',user.id).eq('matched_transaction_id',despesaId);
   if(unlinkError)throw unlinkError;

   if(conta){
    const{error}=await supabase.from('despesas_previstas')
     .update({matched_transaction_id:despesaId})
     .eq('id',conta.id).eq('user_id',user.id);
    if(error)throw error;
   }

   await sincronizarPagamento(despesaId,{
    ...payload,
    lancamento_id:form.lancamento_id||null
   });

   toast({
    title:'Sucesso',
    description:editing?'Despesa atualizada e pagamento sincronizado.':'Despesa registrada e pagamento sincronizado.'
   });

   reset();
   if(mounted.current){
    await Promise.all([fetchDespesas(),fetchContasPrevistas(),fetchComprasCartao()]);
   }
  }catch(e){
   toast({title:'Erro',description:e.message||'Falha ao salvar despesa.',variant:'destructive'});
  }
 };

 const del=async id=>{
  if(!isOnline){
   toast({title:'Offline',description:'Exclusão offline não permitida.',variant:'destructive'});
   return;
  }

  try{
   const{error:pagamentoError}=await supabase.from('pessoal_cartao_pagamentos')
    .delete().eq('user_id',user.id).eq('despesa_id',id);
   if(pagamentoError)throw pagamentoError;

   const{error:unlinkError}=await supabase.from('despesas_previstas')
    .update({matched_transaction_id:null})
    .eq('user_id',user.id).eq('matched_transaction_id',id);
   if(unlinkError)throw unlinkError;

   const{error}=await supabase.from('despesas').delete()
    .eq('id',id).eq('user_id',user.id);
   if(error)throw error;

   toast({title:'Sucesso',description:'Despesa removida, pagamento excluído e vínculo liberado.'});
   await Promise.all([fetchDespesas(),fetchContasPrevistas(),fetchComprasCartao()]);
  }catch(e){
   toast({title:'Erro',description:e.message||'Falha ao remover despesa.',variant:'destructive'});
  }
 };

 const handleExport=()=>{
  if(!filtered.length){
   toast({title:'Aviso',description:'Nenhum dado para exportar.',variant:'destructive'});
   return;
  }
  exportToExcel(filtered.map(item=>({
   Data:formatDateDisplay(item.data),
   Descrição:item.despesa,
   Categoria:item.categoria||'OUTROS',
   Pagamento:item.forma_pagamento,
   Responsável:responsavel(item.responsavel_id)||'-',
   Valor:roundMoney(item.valor)
  })),'Lançamento_Despesas','Despesas');
 };

 const clearFilters=()=>{
  setSearch('');
  setCategory('all');
  setPayment('all');
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="dark-pessoal space-y-4">
   <OfflineIndicator/>

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10">
       <WalletCards className="h-7 w-7 text-red-400"/>
      </div>
      <div>
       <h1 className="text-2xl font-bold tracking-tight text-red-400">Lançamento de Despesas</h1>
       <p className="text-sm text-muted-foreground">Registre e acompanhe suas saídas financeiras.</p>
      </div>
     </div>
     <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleExport} className="border-border bg-transparent">
       <Download className="mr-2 h-4 w-4"/>Excel
      </Button>
      <Button onClick={()=>openDialog()} className="bg-red-500 text-white hover:bg-red-600">
       <Plus className="mr-2 h-4 w-4"/>Novo Lançamento
      </Button>
     </div>
    </div>
   </div>

   <div className="rounded-xl border border-border bg-card/70 p-3">
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_.65fr_.5fr_.8fr_.8fr_auto]">
     <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input placeholder="Buscar por descrição ou categoria..." value={search}
       onChange={e=>setSearch(e.target.value)} className="h-11 border-border bg-input pl-10"/>
     </div>
     <Select value={month} onValueChange={setMonth}>
      <SelectTrigger className="h-11 border-border bg-input"><CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/><SelectValue placeholder="Mês"/></SelectTrigger>
      <SelectContent className="dark-pessoal border-border bg-card">
       {meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
      </SelectContent>
     </Select>
     <Select value={year} onValueChange={setYear}>
      <SelectTrigger className="h-11 border-border bg-input"><SelectValue placeholder="Ano"/></SelectTrigger>
      <SelectContent className="dark-pessoal border-border bg-card">
       {years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
      </SelectContent>
     </Select>
     <Select value={category} onValueChange={setCategory}>
      <SelectTrigger className="h-11 border-border bg-input"><SelectValue placeholder="Categoria"/></SelectTrigger>
      <SelectContent className="dark-pessoal border-border bg-card">
       <SelectItem value="all">Todas as Categorias</SelectItem>
       {categories.filter(c=>c!=='all').map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
      </SelectContent>
     </Select>
     <Select value={payment} onValueChange={setPayment}>
      <SelectTrigger className="h-11 border-border bg-input"><SelectValue placeholder="Pagamento"/></SelectTrigger>
      <SelectContent className="dark-pessoal border-border bg-card">
       <SelectItem value="all">Todos os Pagamentos</SelectItem>
       <SelectItem value="Dinheiro">Dinheiro</SelectItem>
       <SelectItem value="Débito">Débito</SelectItem>
       <SelectItem value="Crédito">Crédito</SelectItem>
       <SelectItem value="Pix">Pix</SelectItem>
       <SelectItem value="Boleto">Boleto</SelectItem>
      </SelectContent>
     </Select>
     <Button variant="outline" onClick={clearFilters} className="h-11 border-border">
      <Filter className="mr-2 h-4 w-4"/>Limpar
     </Button>
    </div>
   </div>

   <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <StatCard icon={FileText} label="Total de Registros" value={filtered.length}/>
    <StatCard icon={DollarSign} label="Total do Período" value={money.format(total)}/>
    <StatCard icon={ArrowDownRight} label="Média por Registro" value={money.format(media)}/>
    <StatCard icon={WalletCards} label="Maior Lançamento" value={money.format(maior)}/>
   </div>

   <div className="overflow-hidden rounded-xl border border-border bg-card/70">
    <div className="overflow-x-auto">
     <Table>
      <TableHeader>
       <TableRow className="border-border bg-secondary/30">
        <TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead>Data</TableHead>
        <TableHead>Pagamento</TableHead><TableHead>Responsável</TableHead>
        <TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Ações</TableHead>
       </TableRow>
      </TableHeader>
      <TableBody>
       {loading?(
        <TableRow><TableCell colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Carregando lançamentos...</TableCell></TableRow>
       ):paginated.length===0?(
        <TableRow><TableCell colSpan={7} className="px-4 py-12">
         <div className="flex flex-col items-center justify-center gap-2 text-center">
          <FileText className="h-10 w-10 text-muted-foreground"/>
          <p className="font-semibold text-foreground">Nenhum lançamento encontrado</p>
          <p className="text-sm text-muted-foreground">Não existem registros para os filtros selecionados.</p>
          <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2"><Filter className="mr-2 h-4 w-4"/>Limpar Filtros</Button>
         </div>
        </TableCell></TableRow>
       ):paginated.map(item=>(
        <TableRow key={item.id} className="border-border transition-colors hover:bg-secondary/30">
         <TableCell className="px-4 py-4 font-medium">{item.despesa}</TableCell>
         <TableCell className="px-4 py-4"><Badge variant="outline" className="border-red-500/20 bg-red-500/10 text-red-400">{item.categoria||'OUTROS'}</Badge></TableCell>
         <TableCell className="px-4 py-4">{formatDateDisplay(item.data)}</TableCell>
         <TableCell className="px-4 py-4 text-sm text-muted-foreground">
          {item.forma_pagamento}{item.cartao_id&&cartoes.find(c=>c.id===item.cartao_id)?` • ${cartoes.find(c=>c.id===item.cartao_id).nome}`:''}
         </TableCell>
         <TableCell className="px-4 py-4">
          {item.responsavel_id?<Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/10 text-indigo-400">{responsavel(item.responsavel_id)}</Badge>:<span className="italic text-muted-foreground">—</span>}
         </TableCell>
         <TableCell className="px-4 py-4 text-right font-bold text-red-400">{money.format(roundMoney(item.valor))}</TableCell>
         <TableCell className="px-4 py-4">
          <div className="flex justify-end gap-1">
           <Button variant="ghost" size="icon" title="Editar lançamento" className="text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={()=>openDialog(item)}><Edit className="h-4 w-4"/></Button>
           <Button variant="ghost" size="icon" title="Excluir lançamento" className="text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={()=>del(item.id)}><Trash2 className="h-4 w-4"/></Button>
          </div>
         </TableCell>
        </TableRow>
       ))}
      </TableBody>
     </Table>
    </div>

    {!loading&&filtered.length>0&&(
     <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-muted-foreground">
       Mostrando {Math.min((currentPage-1)*pageSize+1,filtered.length)} a {Math.min(currentPage*pageSize,filtered.length)} de {filtered.length} registros
      </div>
      <div className="flex items-center gap-2">
       <Button variant="outline" size="sm" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}><ChevronLeft className="mr-1 h-4 w-4"/>Anterior</Button>
       <div className="flex h-9 min-w-9 items-center justify-center rounded-md bg-red-500 px-3 text-sm font-semibold text-white">{currentPage}</div>
       <Button variant="outline" size="sm" disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}>Próxima<ChevronRight className="ml-1 h-4 w-4"/></Button>
      </div>
     </div>
    )}
   </div>

   <ModalLancamentoPadrao
    open={open}
    onClose={closeModal}
    title={editing?'Editar Despesa':'Nova Despesa'}
    description={editing?'Atualize os dados da despesa.':'Preencha os dados da nova despesa.'}
    icon={WalletCards}
    theme="red"
    footer={
     <>
      <Button type="button" variant="outline" onClick={closeModal} className="h-11 rounded-xl border-border px-5">Cancelar</Button>
      <Button type="submit" form="form-lancamento-despesa" className="h-11 rounded-xl px-6 font-semibold text-white transition-all hover:opacity-90" style={{background:RED,boxShadow:'0 0 18px hsl(0 84% 60% / .22)'}}>
       {editing?'Salvar Alterações':'Salvar Despesa'}
      </Button>
     </>
    }
   >
    <form id="form-lancamento-despesa" onSubmit={save} className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
     <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Data</Label>
        <Input type="date" name="data" value={form.data} onChange={e=>changeData(e.target.value)} required className="h-11 rounded-xl bg-input"/>
       </div>
       <div className="space-y-2">
        <Label>Valor</Label>
        <Input type="text" inputMode="numeric" name="valor" value={form.valor} onChange={e=>setForm({...form,valor:formatMoney(e.target.value)})} required placeholder="R$ 0,00" className="h-11 rounded-xl bg-input font-semibold tabular-nums"/>
       </div>
      </div>

      <div className="space-y-2">
       <Label>Descrição (Tipo de Despesa)</Label>
       <Select value={form.despesa} onValueChange={v=>{
        const t=tipos.find(x=>x.nome_despesa===v);
        setForm({...form,despesa:v,categoria:t?.categoria||''});
       }}>
        <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent className="dark-pessoal rounded-xl bg-card">
         <ScrollArea className="h-48">{tipos.map(t=><SelectItem key={t.nome_despesa} value={t.nome_despesa}>{t.nome_despesa}</SelectItem>)}</ScrollArea>
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label>Categoria</Label>
       <Input value={form.categoria||'Selecione um tipo'} readOnly className="h-11 rounded-xl bg-muted text-muted-foreground"/>
      </div>

      <div className="space-y-2">
       <Label>Conta prevista vinculada (opcional)</Label>
       <Select value={form.despesa_prevista_id||'nenhuma'} onValueChange={v=>setForm(prev=>({...prev,despesa_prevista_id:v==='nenhuma'?'':v}))}>
        <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Sem vínculo"/></SelectTrigger>
        <SelectContent className="dark-pessoal rounded-xl bg-card">
         <ScrollArea className="h-56">
          <SelectItem value="nenhuma">Sem vínculo</SelectItem>
          {contasPrevistasDoMes.map(conta=><SelectItem key={conta.id} value={String(conta.id)}>{conta.descricao||'Conta'} • Venc. {formatDateDisplay(conta.data_vencimento)} • {money.format(Number(conta.valor)||0)}</SelectItem>)}
         </ScrollArea>
        </SelectContent>
       </Select>
       <p className="text-xs text-muted-foreground">Escolha a conta específica quitada por esta despesa. Contas com nomes iguais são diferenciadas pelo vínculo individual.</p>
       {!contasPrevistasDoMes.length&&<p className="text-xs text-amber-400">Nenhuma conta prevista disponível para este mês.</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Pagamento</Label>
        <Select value={form.forma_pagamento} onValueChange={v=>setForm(prev=>({...prev,forma_pagamento:v,...(v!=='Crédito'?{lancamento_id:''}:{})}))}>
         <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue/></SelectTrigger>
         <SelectContent className="dark-pessoal rounded-xl bg-card">
          <SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Débito">Débito</SelectItem>
          <SelectItem value="Crédito">Crédito</SelectItem><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Boleto">Boleto</SelectItem>
         </SelectContent>
        </Select>
       </div>
       <div className="space-y-2">
        <Label>Parcelas</Label>
        <Input type="number" name="parcelas" min="1" value={form.parcelas} onChange={e=>setForm({...form,parcelas:e.target.value})} className="h-11 rounded-xl bg-input"/>
       </div>
      </div>

      {form.forma_pagamento==='Crédito'&&(
       <div className="space-y-5 rounded-xl p-4" style={{border:'1px solid hsl(0 84% 60% / .14)',background:'hsl(0 84% 60% / .025)'}}>
        <div className="space-y-2">
         <Label>Cartão de Crédito</Label>
         {cartoes.length===0?(
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">Nenhum cartão cadastrado. Cadastre um cartão em Cadastros → Cartões de Crédito.</p>
         ):(
          <Select value={form.cartao_id||'nenhum'} onValueChange={v=>setForm(prev=>({...prev,cartao_id:v==='nenhum'?'':v,lancamento_id:''}))}>
           <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione o cartão"/></SelectTrigger>
           <SelectContent className="dark-pessoal rounded-xl bg-card">
            <ScrollArea className="h-40">
             <SelectItem value="nenhum">Selecione o cartão</SelectItem>
             {cartoes.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
            </ScrollArea>
           </SelectContent>
          </Select>
         )}
        </div>

        <div className="space-y-2">
         <Label>Compra do cartão vinculada (opcional)</Label>
         <Select value={form.lancamento_id||'nenhuma'} onValueChange={v=>selecionarCompra(v==='nenhuma'?'':v)}>
          <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Sem compra específica"/></SelectTrigger>
          <SelectContent className="dark-pessoal rounded-xl bg-card">
           <ScrollArea className="h-56">
            <SelectItem value="nenhuma">Sem compra específica</SelectItem>
            {comprasDisponiveis.map(c=>{
             const cartao=cartoes.find(x=>String(x.id)===String(c.cartao_id));
             const valorParcela=getInstallmentValue(c.valor,c.parcelas,c.parcela_atual);
             return(
              <SelectItem key={c.id} value={String(c.id)}>
               {(c.descricao||'Compra')} • {cartao?.nome||'Cartão'} • {formatDateDisplay(c.data)} • {money.format(roundMoney(valorParcela))}
              </SelectItem>
             );
            })}
           </ScrollArea>
          </SelectContent>
         </Select>
         <p className="text-xs text-muted-foreground">Vincule esta despesa à compra exata para que o pagamento reduza somente o saldo dessa compra. Sem vínculo específico, o pagamento será considerado para o responsável selecionado.</p>
        </div>

        <div className="space-y-2">
         <Label>Responsável pela Compra</Label>
         {usuarios.length===0?(
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">Nenhuma pessoa cadastrada. Cadastre em Cadastros → Pessoas do Cartão.</p>
         ):(
          <Select value={form.responsavel_id||'nenhum'} onValueChange={v=>setForm(prev=>({...prev,responsavel_id:v==='nenhum'?'':v}))} disabled={!!form.lancamento_id}>
           <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione o responsável"/></SelectTrigger>
           <SelectContent className="dark-pessoal rounded-xl bg-card">
            <ScrollArea className="h-40">
             <SelectItem value="nenhum">— Sem responsável —</SelectItem>
             {usuarios.map(u=><SelectItem key={u.id} value={String(u.id)}>{u.nome}</SelectItem>)}
            </ScrollArea>
           </SelectContent>
          </Select>
         )}
         {form.lancamento_id&&<p className="text-xs text-muted-foreground">O responsável é obtido automaticamente da compra vinculada.</p>}
        </div>
       </div>
      )}
     </div>
    </form>
   </ModalLancamentoPadrao>
  </motion.div>
 );
};

export default Despesas;

