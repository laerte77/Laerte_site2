import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Search,RotateCcw,UserX,Loader2,Users,Wallet,History,Trash2,Edit,CheckCircle}from'lucide-react';
import{format}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';

const C='hsl(var(--neon-lanhouse))';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const hoje=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
const dataBR=v=>v?format(new Date(`${String(v).slice(0,10)}T00:00:00`),'dd/MM/yyyy'):'—';
const vazio={data:hoje(),cliente:'',servico:'',valor:''};

export default function LancamentoClientesDebito(){
 const{toast}=useToast(),{user}=useAuth();
 const[items,setItems]=useState([]),[recebimentos,setRecebimentos]=useState([]);
 const[clientes,setClientes]=useState([]),[servicos,setServicos]=useState([]);
 const[loading,setLoading]=useState(true),[search,setSearch]=useState('');
 const[month,setMonth]=useState('all'),[year,setYear]=useState(String(new Date().getFullYear()));
 const[formOpen,setFormOpen]=useState(false),[paymentOpen,setPaymentOpen]=useState(false);
 const[current,setCurrent]=useState(null),[deleteItem,setDeleteItem]=useState(null);
 const[payment,setPayment]=useState({data:hoje(),valor:'',forma_pagamento:'PIX'});
 const[form,setForm]=useState(vazio),[historyOpen,setHistoryOpen]=useState(false);
 const[historyItem,setHistoryItem]=useState(null);

 const fetchData=useCallback(async()=>{
  if(!user){setItems([]);setRecebimentos([]);setLoading(false);return}
  setLoading(true);
  try{
   const[a,b,c,d,e]=await Promise.all([
    supabase.from('lm_clientes_debito').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_lanc_servicos').select('id,user_id,data,cliente,cliente_id,valor,status_financeiro,forma_pagamento,lm_servicos(servico),lm_clientes(nome)').eq('user_id',user.id).in('status_financeiro',['DEVENDO','PARCIAL']).order('data',{ascending:false}),
    supabase.from('lm_recebimentos').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_clientes').select('nome').eq('user_id',user.id).order('nome'),
    supabase.from('lm_servicos').select('servico').eq('user_id',user.id).order('servico')
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;if(d.error)throw d.error;if(e.error)throw e.error;

   const manuais=(a.data||[]).map(x=>({...x,origem:'debito',origem_id:x.id,nome_servico:x.servico}));
   const lancamentos=(b.data||[]).map(x=>({...x,origem:'servico',origem_id:x.id,nome_cliente:x.lm_clientes?.nome||x.cliente,nome_servico:x.lm_servicos?.servico||'Serviço'}));
   setItems([...manuais,...lancamentos]);
   setRecebimentos(c.data||[]);
   setClientes(d.data||[]);setServicos(e.data||[]);
  }catch(e){
   console.error(e);
   toast({title:'Erro ao carregar',description:e.message||'Não foi possível carregar os débitos.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel(`debitos_${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes_debito',filter:`user_id=eq.${user.id}`},fetchData)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_lanc_servicos',filter:`user_id=eq.${user.id}`},fetchData)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_recebimentos',filter:`user_id=eq.${user.id}`},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,fetchData]);

 const totalRecebido=item=>recebimentos.filter(r=>item.origem==='servico'?r.lanc_servico_id===item.id:r.debito_id===item.id).reduce((s,r)=>s+Number(r.valor||0),0);
 const saldo=item=>Math.max(0,Number(item.valor||0)-totalRecebido(item));
 const status=item=>saldo(item)<=0.009?'PAGO':totalRecebido(item)>0?'PARCIAL':'DEVENDO';

 const years=[...new Set([...items.map(x=>String(x.data||'').slice(0,4)),String(new Date().getFullYear())])].sort((a,b)=>b.localeCompare(a));

 const filtered=useMemo(()=>items.filter(x=>{
  const dt=String(x.data||'').slice(0,10);
  const q=search.toLowerCase();
  return(month==='all'||String(Number(dt.slice(5,7))-1)===month)&&dt.slice(0,4)===year&&
   (!q||`${x.nome_cliente||x.cliente||''} ${x.nome_servico||''} ${status(x)}`.toLowerCase().includes(q));
 }),[items,search,month,year,recebimentos]);

 const totalPendente=filtered.reduce((s,x)=>s+saldo(x),0);
 const totalRecebidoFiltrado=filtered.reduce((s,x)=>s+totalRecebido(x),0);
 const devendo=filtered.filter(x=>status(x)==='DEVENDO').length;
 const parciais=filtered.filter(x=>status(x)==='PARCIAL').length;

 const abrirCadastro=item=>{
  setCurrent(item||null);
  setForm(item?{data:item.data,cliente:item.cliente||'',servico:item.servico||'',valor:String(item.valor||'')}:{...vazio});
  setFormOpen(true);
 };

 const salvarDebito=async()=>{
  if(!form.data||!form.cliente||!form.servico||!Number(form.valor)||Number(form.valor)<=0){
   toast({title:'Campos obrigatórios',description:'Preencha os dados e informe um valor válido.',variant:'destructive'});return;
  }
  try{
   const payload={data:form.data,cliente:form.cliente,servico:form.servico,valor:Number(form.valor),user_id:user.id};
   const q=current
    ?supabase.from('lm_clientes_debito').update(payload).eq('id',current.id).eq('user_id',user.id)
    :supabase.from('lm_clientes_debito').insert({...payload,status:'DEVENDO'});
   const{error}=await q;if(error)throw error;
   toast({title:'Sucesso',description:current?'Débito atualizado.':'Débito registrado.'});
   setFormOpen(false);setCurrent(null);await fetchData();
  }catch(e){toast({title:'Erro',description:e.message,variant:'destructive'})}
 };

 const abrirPagamento=item=>{
  setCurrent(item);setPayment({data:hoje(),valor:saldo(item).toFixed(2),forma_pagamento:'PIX'});setPaymentOpen(true);
 };

 const salvarPagamento=async()=>{
  const valor=Number(String(payment.valor).replace(',','.'));
  if(!payment.data||!Number.isFinite(valor)||valor<=0||!payment.forma_pagamento){
   toast({title:'Dados inválidos',description:'Informe data, valor e forma de pagamento.',variant:'destructive'});return;
  }
  if(valor>saldo(current)+0.009){
   toast({title:'Valor acima do saldo',description:`O saldo restante é ${BRL.format(saldo(current))}.`,variant:'destructive'});return;
  }
  try{
   const payload={
    user_id:current.user_id||user.id,
    data:payment.data,
    valor,
    forma_pagamento:payment.forma_pagamento,
    ...(current.origem==='servico'?{lanc_servico_id:current.id}:{debito_id:current.id})
   };
   const{error}=await supabase.from('lm_recebimentos').insert(payload);
   if(error)throw error;
   toast({title:'Pagamento registrado',description:'O saldo e o status serão atualizados automaticamente.'});
   setPaymentOpen(false);setCurrent(null);await fetchData();
  }catch(e){
   toast({title:'Erro ao registrar pagamento',description:e.message||'Confira o valor e tente novamente.',variant:'destructive'});
  }
 };

 const abrirHistorico=item=>{setHistoryItem(item);setHistoryOpen(true)};
 const historico=historyItem?recebimentos.filter(r=>historyItem.origem==='servico'?r.lanc_servico_id===historyItem.id:r.debito_id===historyItem.id):[];

 const remover=async()=>{
  if(!deleteItem)return;
  try{
   const tabela=deleteItem.origem==='servico'?'lm_lanc_servicos':'lm_clientes_debito';
   const{error}=await supabase.from(tabela).delete().eq('id',deleteItem.id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Registro excluído'});setDeleteItem(null);await fetchData();
  }catch(e){toast({title:'Não foi possível excluir',description:e.message,variant:'destructive'})}
 };

 const badge=s=>{
  const st=s==='PAGO'?'border-green-500/30 bg-green-500/10 text-green-400':s==='PARCIAL'?'border-yellow-500/30 bg-yellow-500/10 text-yellow-400':'border-red-500/30 bg-red-500/10 text-red-400';
  return <Badge variant="outline" className={st}>{s==='PAGO'?'Pago':s==='PARCIAL'?'Parcial':'Devendo'}</Badge>;
 };

 return <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
   <div><p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:C}}>LM Impressões</p><div className="mt-1 flex items-center gap-2"><Users className="h-6 w-6" style={{color:C}}/><h1 className="text-2xl font-bold">Clientes com Débito</h1></div><p className="text-sm text-muted-foreground">Acompanhe dívidas e registre pagamentos parciais.</p></div>
   <Button onClick={()=>abrirCadastro()} style={{background:C}} className="text-slate-950"><Plus className="mr-2 h-4 w-4"/>Novo Débito</Button>
  </div>

  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   {[['Registros',filtered.length],['Total recebido',BRL.format(totalRecebidoFiltrado)],['Saldo pendente',BRL.format(totalPendente)],['Devendo / Parcial',`${devendo} / ${parciais}`]].map(([l,v])=><Card key={l}><CardContent className="p-4"><p className="text-xs uppercase text-muted-foreground">{l}</p><p className="mt-1 text-xl font-bold" style={{color:C}}>{v}</p></CardContent></Card>)}
  </div>

  <Card><CardContent className="p-4"><div className="flex flex-col gap-3 xl:flex-row">
   <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente, serviço ou status..." className="h-11 pl-9"/></div>
   <div className="flex flex-wrap gap-2">
    <Select value={month} onValueChange={setMonth}><SelectTrigger className="w-[145px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select>
    <Select value={year} onValueChange={setYear}><SelectTrigger className="w-[110px]"><SelectValue/></SelectTrigger><SelectContent>{years.map(y=><SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent></Select>
    <Button variant="outline" onClick={()=>{setSearch('');setMonth('all');setYear(String(new Date().getFullYear()))}}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button>
   </div>
  </div></CardContent></Card>

  <Card><CardHeader><CardTitle className="text-base">Pendências e recebimentos</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto">
   <Table><TableHeader className="bg-secondary/70"><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Serviço</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Recebido</TableHead><TableHead className="text-right">Saldo</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
    <TableBody>
     {loading?<TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
     :!filtered.length?<TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground"><UserX className="mx-auto mb-2 h-8 w-8"/>Nenhuma pendência encontrada.</TableCell></TableRow>
     :filtered.map(x=><TableRow key={`${x.origem}-${x.id}`}>
      <TableCell>{dataBR(x.data)}</TableCell><TableCell className="font-semibold">{x.nome_cliente||x.cliente||'—'}</TableCell><TableCell>{x.nome_servico||'—'}</TableCell><TableCell>{badge(status(x))}</TableCell>
      <TableCell className="text-right">{BRL.format(Number(x.valor)||0)}</TableCell><TableCell className="text-right text-green-400">{BRL.format(totalRecebido(x))}</TableCell><TableCell className="text-right font-bold text-red-400">{BRL.format(saldo(x))}</TableCell>
      <TableCell><div className="flex justify-end gap-1">
       {saldo(x)>0.009&&<Button size="sm" onClick={()=>abrirPagamento(x)} style={{background:C}} className="text-slate-950"><Wallet className="mr-1 h-4 w-4"/>Receber</Button>}
       <Button variant="ghost" size="icon" onClick={()=>abrirHistorico(x)} title="Histórico"><History className="h-4 w-4"/></Button>
       {x.origem==='debito'&&<Button variant="ghost" size="icon" onClick={()=>abrirCadastro(x)} title="Editar"><Edit className="h-4 w-4"/></Button>}
       <Button variant="ghost" size="icon" className="text-red-400" onClick={()=>setDeleteItem(x)} title="Excluir"><Trash2 className="h-4 w-4"/></Button>
      </div></TableCell>
     </TableRow>)}
    </TableBody>
   </Table>
  </div></CardContent></Card>

  <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="bg-card sm:max-w-[520px]"><DialogHeader><DialogTitle>{current?'Editar débito manual':'Novo débito manual'}</DialogTitle></DialogHeader>
   <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3"><div><Label>Data</Label><Input type="date" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))}/></div><div><Label>Valor</Label><Input type="number" min="0.01" step="0.01" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/></div></div>
    <div><Label>Cliente</Label><Select value={form.cliente} onValueChange={v=>setForm(p=>({...p,cliente:v}))}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><ScrollArea className="h-48">{clientes.map(c=><SelectItem key={c.nome} value={c.nome}>{c.nome}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
    <div><Label>Serviço</Label><Select value={form.servico} onValueChange={v=>setForm(p=>({...p,servico:v}))}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><ScrollArea className="h-48">{servicos.map(s=><SelectItem key={s.servico} value={s.servico}>{s.servico}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
   </div>
   <DialogFooter><Button variant="outline" onClick={()=>setFormOpen(false)}>Cancelar</Button><Button onClick={salvarDebito} style={{background:C}} className="text-slate-950">Salvar</Button></DialogFooter>
  </DialogContent></Dialog>

  <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}><DialogContent className="bg-card sm:max-w-[480px]"><DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>
   <div className="space-y-4">
    <div className="rounded-lg bg-muted p-3 text-sm"><p>Cliente: <b>{current?.nome_cliente||current?.cliente}</b></p><p>Valor total: <b>{BRL.format(Number(current?.valor)||0)}</b></p><p>Saldo restante: <b className="text-red-400">{current?BRL.format(saldo(current)):''}</b></p></div>
    <div className="grid grid-cols-2 gap-3"><div><Label>Data do pagamento</Label><Input type="date" value={payment.data} onChange={e=>setPayment(p=>({...p,data:e.target.value}))}/></div><div><Label>Valor recebido</Label><Input type="number" min="0.01" step="0.01" value={payment.valor} onChange={e=>setPayment(p=>({...p,valor:e.target.value}))}/></div></div>
    <div><Label>Forma de pagamento</Label><Select value={payment.forma_pagamento} onValueChange={v=>setPayment(p=>({...p,forma_pagamento:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem><SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem></SelectContent></Select></div>
   </div>
   <DialogFooter><Button variant="outline" onClick={()=>setPaymentOpen(false)}>Cancelar</Button><Button onClick={salvarPagamento} style={{background:C}} className="text-slate-950"><CheckCircle className="mr-2 h-4 w-4"/>Confirmar recebimento</Button></DialogFooter>
  </DialogContent></Dialog>

  <Dialog open={historyOpen} onOpenChange={setHistoryOpen}><DialogContent className="bg-card sm:max-w-[560px]"><DialogHeader><DialogTitle>Histórico de recebimentos</DialogTitle></DialogHeader>
   <div className="space-y-2">
    <p className="text-sm text-muted-foreground">{historyItem?.nome_cliente||historyItem?.cliente} • {historyItem?.nome_servico||historyItem?.servico}</p>
    {!historico.length?<p className="py-6 text-center text-muted-foreground">Nenhum pagamento registrado.</p>:historico.map(r=><div key={r.id} className="flex justify-between gap-3 rounded-lg border p-3 text-sm"><div><b>{dataBR(r.data)}</b><p className="text-muted-foreground">{r.forma_pagamento}</p></div><b className="text-green-400">{BRL.format(Number(r.valor)||0)}</b></div>)}
   </div>
   <DialogFooter><Button variant="outline" onClick={()=>setHistoryOpen(false)}>Fechar</Button></DialogFooter>
  </DialogContent></Dialog>

  <AlertDialog open={!!deleteItem} onOpenChange={v=>{if(!v)setDeleteItem(null)}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir registro?</AlertDialogTitle><AlertDialogDescription>Se houver recebimentos vinculados, o banco impedirá a exclusão.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remover} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialog>
 </motion.div>;
}

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
