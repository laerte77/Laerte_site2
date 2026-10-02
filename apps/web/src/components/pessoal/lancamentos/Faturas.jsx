import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{Plus,Lock,DollarSign,CalendarClock,Receipt,WalletCards,Trash2}from'lucide-react';
import{format,addMonths,setDate,subDays}from'date-fns';
import{ptBR}from'date-fns/locale';
import{supabase}from'@/lib/customSupabaseClient';
import{getInstallmentValue}from'@/lib/cartaoParcelas';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{ScrollArea}from'@/components/ui/scroll-area';
import{useToast}from'@/components/ui/use-toast';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';

const TZ='America/Sao_Paulo',GREEN='hsl(142 71% 45%)';
const moeda=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const getBRDate=()=>{const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});return`${v.year}-${v.month}-${v.day}`};
const money=v=>{const d=String(v??'').replace(/\D/g,'');return d?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100):''};
const moneyNum=v=>{const d=String(v??'').replace(/\D/g,'');return d?Number(d)/100:0};
const brDate=v=>{if(!v)return'-';const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]}/${m[2]}/${m[1]}`:new Intl.DateTimeFormat('pt-BR',{timeZone:TZ}).format(new Date(v))};
const cicloFatura=(dia,mes,ano)=>{const ref=new Date(ano,mes,1),diaF=Math.min(dia||1,28),inicio=addMonths(setDate(ref,diaF),-1),fim=subDays(setDate(ref,diaF),1);return{inicio:format(inicio,'yyyy-MM-dd'),fim:format(fim,'yyyy-MM-dd')}};
const STATUS_STYLE={aberta:'bg-amber-500/20 text-amber-400 border-amber-500/40',fechada:'bg-blue-500/20 text-blue-400 border-blue-500/40',paga:'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'};

const Faturas=()=>{
 const{user}=useAuth(),{toast}=useToast(),mounted=useRef(true);
 const[loading,setLoading]=useState(true),[cartoes,setCartoes]=useState([]),[lancamentos,setLancamentos]=useState([]),[fatura,setFatura]=useState(null),[pagamentos,setPagamentos]=useState([]);
 const[selectedCartao,setSelectedCartao]=useState(''),[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth())),[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[isPagamentoOpen,setIsPagamentoOpen]=useState(false),[meses]=useState(Array.from({length:12},(_,i)=>i));
 const initialPagamento=()=>({valor:'',data:getBRDate(),forma_pagamento:'Pix'}),[pagForm,setPagForm]=useState(initialPagamento);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const fetchCartoes=useCallback(async()=>{
  if(!user)return;
  const{data}=await supabase.from('pessoal_cartoes').select('*').eq('user_id',user.id).order('nome',{ascending:true});
  if(mounted.current){setCartoes(data||[]);if(data?.length&&!selectedCartao)setSelectedCartao(data[0].id)}
 },[user,selectedCartao]);

 const cartao=useMemo(()=>cartoes.find(c=>c.id===selectedCartao)||null,[cartoes,selectedCartao]);
 const mes=Number(selectedMonth),ano=Number(selectedYear);
 const ciclo=useMemo(()=>cartao?cicloFatura(cartao.dia_fechamento,mes,ano):null,[cartao,mes,ano]);

 const fetchDados=useCallback(async()=>{
  if(!user||!selectedCartao||!ciclo)return;
  setLoading(true);
  const[lancRes,fatRes]=await Promise.all([
   supabase.from('pessoal_cartao_lancamentos').select('*').eq('user_id',user.id).eq('cartao_id',selectedCartao).gte('data',ciclo.inicio).lte('data',ciclo.fim).order('data',{ascending:false}),
   supabase.from('pessoal_faturas').select('*').eq('user_id',user.id).eq('cartao_id',selectedCartao).eq('mes',mes).eq('ano',ano).maybeSingle()
  ]);
  if(!mounted.current)return;
  setLancamentos(lancRes.data||[]);setFatura(fatRes.data||null);
  if(fatRes.data){
   const{data:pags}=await supabase.from('pessoal_cartao_pagamentos').select('*').eq('fatura_id',fatRes.data.id).order('data',{ascending:false});
   if(mounted.current)setPagamentos(pags||[]);
  }else setPagamentos([]);
  setLoading(false);
 },[user,selectedCartao,ciclo,mes,ano]);

 useEffect(()=>{fetchCartoes()},[fetchCartoes]);
 useEffect(()=>{if(selectedCartao)fetchDados()},[selectedCartao,selectedMonth,selectedYear,fetchDados]);

 const totalFatura=lancamentos.reduce((a,l)=>a+getInstallmentValue(l.valor,l.parcelas,l.parcela_atual),0);
 const totalPago=pagamentos.reduce((a,p)=>a+Number(p.valor||0),0);
 const saldoRestante=Math.max(0,totalFatura-totalPago);
 const dataVencimento=useMemo(()=>{if(!cartao)return null;return format(setDate(new Date(ano,mes,1),Math.min(cartao.dia_vencimento||1,28)),'yyyy-MM-dd')},[cartao,mes,ano]);

 const fecharFatura=async()=>{
  if(!cartao||!ciclo)return;
  if(!lancamentos.length){toast({title:'Aviso',description:'Não há lançamentos neste ciclo para fechar a fatura.',variant:'destructive'});return}
  const payload={user_id:user.id,cartao_id:cartao.id,mes,ano,data_fechamento:ciclo.fim,data_vencimento:dataVencimento,valor_total:totalFatura,status:'fechada'};
  const r=fatura?await supabase.from('pessoal_faturas').update({...payload,updated_at:new Date().toISOString()}).eq('id',fatura.id):await supabase.from('pessoal_faturas').insert(payload);
  if(r.error)toast({title:'Erro',description:'Não foi possível fechar a fatura.',variant:'destructive'});else toast({title:'Sucesso',description:'Fatura fechada.'});
  fetchDados();
 };

 const reabrir=async()=>{
  if(!fatura)return;
  const{error}=await supabase.from('pessoal_faturas').update({status:'aberta',updated_at:new Date().toISOString()}).eq('id',fatura.id);
  if(error)toast({title:'Erro',description:'Não foi possível reabrir a fatura.',variant:'destructive'});else toast({title:'Sucesso',description:'Fatura reaberta.'});
  fetchDados();
 };

 const openPagamento=()=>{setPagForm({valor:money(saldoRestante*100),data:getBRDate(),forma_pagamento:'Pix'});setIsPagamentoOpen(true)};
 const closePagamento=()=>{setIsPagamentoOpen(false);setPagForm(initialPagamento())};

 const salvarPagamento=async()=>{
  if(!fatura){toast({title:'Erro',description:'Feche a fatura antes de registrar pagamentos.',variant:'destructive'});return}
  const valor=moneyNum(pagForm.valor);
  if(valor<=0){toast({title:'Erro',description:'Informe um valor válido.',variant:'destructive'});return}
  try{
   const{error}=await supabase.from('pessoal_cartao_pagamentos').insert({user_id:user.id,fatura_id:fatura.id,valor,data:pagForm.data,forma_pagamento:pagForm.forma_pagamento});
   if(error)throw error;
   const novoTotal=totalPago+valor,novoStatus=novoTotal>=totalFatura?'paga':'fechada',updatePayload={status:novoStatus,updated_at:new Date().toISOString()};
   if(novoStatus==='paga')updatePayload.data_pagamento=pagForm.data;
   const{error:updateError}=await supabase.from('pessoal_faturas').update(updatePayload).eq('id',fatura.id);
   if(updateError)throw updateError;
   toast({title:'Sucesso',description:'Pagamento registrado com sucesso.'});
   setPagForm(initialPagamento());
   fetchDados();
  }catch(e){toast({title:'Erro',description:e.message||'Não foi possível registrar o pagamento.',variant:'destructive'})}
 };

 const excluirPagamento=async id=>{
  const{error}=await supabase.from('pessoal_cartao_pagamentos').delete().eq('id',id);
  if(error){toast({title:'Erro',description:'Falha ao remover pagamento.',variant:'destructive'});return}
  if(fatura){
   const pagamento=pagamentos.find(p=>p.id===id),novoTotal=totalPago-Number(pagamento?.valor||0);
   await supabase.from('pessoal_faturas').update({status:novoTotal>=totalFatura?'paga':'fechada',data_pagamento:null,updated_at:new Date().toISOString()}).eq('id',fatura.id);
  }
  toast({title:'Sucesso',description:'Pagamento removido.'});fetchDados();
 };

 const status=fatura?.status||'aberta';

 return(
  <div className="dark-pessoal space-y-6">
   <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">Finanças Pessoais</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Faturas do Cartão</h1><p className="text-muted-foreground">Acompanhe fechamento, vencimento e pagamentos.</p></div>

   {cartoes.length===0?
    <Card className="border-border bg-card"><CardContent className="p-12 text-center text-muted-foreground"><Receipt className="mx-auto mb-3 h-12 w-12 opacity-50"/><p>Cadastre um cartão para gerenciar faturas.</p></CardContent></Card>
    :
    <>
     <Card className="border-border bg-card">
      <CardContent className="flex flex-col items-center gap-4 p-4 md:flex-row">
       <div className="w-full md:w-auto"><Label className="text-xs">Cartão</Label><Select value={selectedCartao} onValueChange={setSelectedCartao}><SelectTrigger className="w-full bg-input md:w-[200px]"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border">{cartoes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
       <div className="w-full md:w-auto"><Label className="text-xs">Mês</Label><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-full bg-input md:w-[140px]"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border">{meses.map(i=><SelectItem key={i} value={String(i)}>{format(new Date(2024,i,1),'MMMM',{locale:ptBR})}</SelectItem>)}</SelectContent></Select></div>
       <div className="w-full md:w-auto"><Label className="text-xs">Ano</Label><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-full bg-input md:w-[100px]"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal bg-card border-border">{[2024,2025,2026].map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
       <div className="w-full md:ml-auto md:text-right"><Label className="text-xs">Status</Label><div className="pt-1"><Badge className={STATUS_STYLE[status]} variant="outline">{status.toUpperCase()}</Badge></div></div>
      </CardContent>
     </Card>

     {cartao&&ciclo&&<div className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarClock className="h-4 w-4"/>Ciclo: {brDate(ciclo.inicio)} a {brDate(ciclo.fim)} • Vencimento: {brDate(dataVencimento)}</div>}

     <div className="grid gap-4 md:grid-cols-4">
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-700/10 border-blue-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-400">Total da Fatura</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{moeda(totalFatura)}</div></CardContent></Card>
      <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-700/10 border-emerald-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400">Total Pago</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-emerald-400">{moeda(totalPago)}</div></CardContent></Card>
      <Card className="bg-gradient-to-br from-red-500/10 to-red-700/10 border-red-500/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400">Saldo Restante</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-400">{moeda(saldoRestante)}</div></CardContent></Card>
      <Card className="flex items-center justify-center border-border bg-card"><CardContent className="flex w-full flex-col gap-2 p-4">
       {status==='aberta'&&<Button className="w-full bg-blue-600 text-white hover:bg-blue-700" onClick={fecharFatura}><Lock className="mr-2 h-4 w-4"/>Fechar Fatura</Button>}
       {status==='fechada'&&<><Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={openPagamento}><DollarSign className="mr-2 h-4 w-4"/>Registrar Pagamento</Button><Button variant="outline" className="w-full" onClick={reabrir}>Reabrir Fatura</Button></>}
       {status==='paga'&&<><Button variant="outline" className="w-full" onClick={openPagamento}><Plus className="mr-2 h-4 w-4"/>Novo Pagamento</Button><Button variant="outline" className="w-full" onClick={reabrir}>Reabrir Fatura</Button></>}
      </CardContent></Card>
     </div>

     <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border bg-card"><CardHeader><CardTitle className="text-lg text-blue-500">Lançamentos do Ciclo</CardTitle></CardHeader><CardContent className="p-0"><ScrollArea className="h-[360px]"><Table><TableHeader><TableRow><TableHead>Descrição</TableHead><TableHead>Data</TableHead><TableHead>Parc.</TableHead><TableHead className="text-right">Valor/Parc.</TableHead></TableRow></TableHeader><TableBody>
       {loading?<TableRow><TableCell colSpan={4} className="py-8 text-center">Carregando...</TableCell></TableRow>:lancamentos.length===0?<TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum lançamento no ciclo.</TableCell></TableRow>:lancamentos.map(l=><TableRow key={l.id} className="hover:bg-muted/50"><TableCell className="p-4 font-medium">{l.descricao}</TableCell><TableCell className="p-4 text-sm">{brDate(l.data)}</TableCell><TableCell className="p-4 text-sm text-muted-foreground">{l.parcela_atual}/{l.parcelas}</TableCell><TableCell className="p-4 text-right font-semibold text-red-400">{moeda(getInstallmentValue(l.valor,l.parcelas,l.parcela_atual))}</TableCell></TableRow>)}
      </TableBody></Table></ScrollArea></CardContent></Card>

      <Card className="border-border bg-card"><CardHeader><CardTitle className="text-lg text-emerald-500">Pagamentos</CardTitle></CardHeader><CardContent className="p-0"><ScrollArea className="h-[360px]"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Forma</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader><TableBody>
       {pagamentos.length===0?<TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum pagamento registrado.</TableCell></TableRow>:pagamentos.map(p=><TableRow key={p.id} className="hover:bg-muted/50"><TableCell className="p-4 text-sm">{brDate(p.data)}</TableCell><TableCell className="p-4 text-sm text-muted-foreground">{p.forma_pagamento||'—'}</TableCell><TableCell className="p-4 text-right font-semibold text-emerald-400">{moeda(p.valor)}</TableCell><TableCell className="p-4 text-center"><Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={()=>excluirPagamento(p.id)}><Trash2 className="h-4 w-4"/></Button></TableCell></TableRow>)}
      </TableBody></Table></ScrollArea></CardContent></Card>
     </div>
    </>
   )}

   <Dialog open={isPagamentoOpen} onOpenChange={open=>open?setIsPagamentoOpen(true):closePagamento()}>
    <DialogContent onInteractOutside={e=>e.preventDefault()} onPointerDownOutside={e=>e.preventDefault()} onEscapeKeyDown={e=>e.preventDefault()} className="dark-pessoal w-[calc(100%-2rem)] max-w-[560px] overflow-hidden rounded-2xl border-0 bg-[hsl(var(--card-bg))] p-0 text-foreground shadow-[0_24px_80px_rgba(0,0,0,.58)]" style={{border:'1px solid hsl(142 71% 45% / .28)'}}>
     <DialogHeader className="px-6 py-5 pr-14" style={{borderBottom:'1px solid hsl(142 71% 45% / .15)',background:'hsl(142 71% 45% / .045)'}}>
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{border:'1px solid hsl(142 71% 45% / .24)',background:'hsl(142 71% 45% / .10)'}}><WalletCards className="h-5 w-5" style={{color:GREEN}}/></div><div><DialogTitle className="text-xl font-bold">Registrar Pagamento</DialogTitle><DialogDescription className="mt-1 text-sm text-muted-foreground">Registre um pagamento da fatura atual.</DialogDescription></div></div>
     </DialogHeader>
     <div className="space-y-5 px-6 py-6">
      <div className="space-y-2"><Label>Valor</Label><Input type="text" inputMode="numeric" value={pagForm.valor} onChange={e=>setPagForm(p=>({...p,valor:money(e.target.value)}))} placeholder="R$ 0,00" className="h-11 rounded-xl bg-input font-semibold tabular-nums"/></div>
      <div className="space-y-2"><Label>Data</Label><Input type="date" value={pagForm.data} onChange={e=>setPagForm(p=>({...p,data:e.target.value}))} className="h-11 rounded-xl bg-input"/></div>
      <div className="space-y-2"><Label>Forma de Pagamento</Label><Select value={pagForm.forma_pagamento} onValueChange={v=>setPagForm(p=>({...p,forma_pagamento:v}))}><SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal rounded-xl bg-card border-border"><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Débito">Débito</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Boleto">Boleto</SelectItem></SelectContent></Select></div>
      <div className="rounded-xl border border-red-500/15 bg-red-500/5 p-3 text-sm text-muted-foreground">Saldo restante: <span className="font-semibold text-red-400">{moeda(saldoRestante)}</span></div>
     </div>
     <DialogFooter className="border-t border-border/70 bg-background/20 px-6 py-4"><Button variant="outline" onClick={closePagamento} className="h-10 rounded-xl">Cancelar</Button><Button onClick={salvarPagamento} className="h-10 rounded-xl px-6 font-semibold text-white hover:opacity-90" style={{background:GREEN,boxShadow:'0 0 18px hsl(142 71% 45% / .22)'}}>Salvar Pagamento</Button></DialogFooter>
    </DialogContent>
   </Dialog>
  </div>
 );
};

export default Faturas;
