import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash2,CalendarClock,Search,RefreshCw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Badge}from'@/components/ui/badge';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const C='hsl(var(--neon-lanhouse))';
const moeda=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const hoje=()=>new Date().toISOString().split('T')[0];

export default function LancamentoDespesaPrevista(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[tipos,setTipos]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[open,setOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),[editId,setEditId]=useState(null);
 const[form,setForm]=useState({data_compra:hoje(),descricao:'',data_vencimento:'',valor:'',forma_pagamento:'',parcelas:1,categoria:'',status:'Pendente'});

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('lm_despesas_previstas').select('*').eq('user_id',user.id).order('data_vencimento',{ascending:false}),
    supabase.from('lm_despesas').select('despesa,categoria').eq('user_id',user.id).order('despesa')
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   setData(a.data||[]);setTipos(b.data||[]);
  }catch(e){toast({title:'Erro ao carregar despesas previstas',description:e.message,variant:'destructive'})}
  finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>load(),[load]);
 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('lm_previstas_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_despesas_previstas',filter:`user_id=eq.${user.id}`},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const reset=()=>{setForm({data_compra:hoje(),descricao:'',data_vencimento:'',valor:'',forma_pagamento:'',parcelas:1,categoria:'',status:'Pendente'});setEditId(null)};
 const openForm=x=>{
  setEditId(x?.id||null);
  setForm(x?{
   data_compra:x.data_compra||hoje(),
   descricao:x.descricao||'',
   data_vencimento:x.data_vencimento||'',
   valor:x.valor??'',
   forma_pagamento:x.forma_pagamento||'',
   parcelas:x.parcelas||1,
   categoria:x.categoria||'',
   status:x.status||'Pendente'
  }:{data_compra:hoje(),descricao:'',data_vencimento:'',valor:'',forma_pagamento:'',parcelas:1,categoria:'',status:'Pendente'});
  setOpen(true);
 };

 const save=async e=>{
  e.preventDefault();
  if(!form.descricao||!form.data_vencimento||!form.valor)return toast({title:'Campos obrigatórios',description:'Descrição, vencimento e valor são obrigatórios.',variant:'destructive'});
  const payload={...form,user_id:user.id,valor:Number(form.valor),parcelas:form.forma_pagamento==='CARTÃO DE CRÉDITO'?Number(form.parcelas||1):null};
  const q=editId?await supabase.from('lm_despesas_previstas').update(payload).eq('id',editId).eq('user_id',user.id):await supabase.from('lm_despesas_previstas').insert(payload);
  if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  toast({title:'Sucesso',description:editId?'Despesa prevista atualizada.':'Despesa prevista registrada.'});
  setOpen(false);reset();load();
 };

 const remove=async id=>{
  const{error}=await supabase.from('lm_despesas_previstas').delete().eq('id',id).eq('user_id',user.id);
  if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});
  else{toast({title:'Despesa prevista excluída'});load()}
 };

 const list=data.filter(x=>`${x.descricao||''} ${x.categoria||''} ${x.forma_pagamento||''}`.toLowerCase().includes(search.toLowerCase()));
 const total=list.reduce((a,x)=>a+Number(x.valor||0),0),pend=list.filter(x=>x.status==='Pendente').length;
 const venc=list.filter(x=>x.data_vencimento&&new Date(x.data_vencimento+'T00:00:00')<new Date()).length;

 return <div className="dark-lm-impressoes space-y-4">

  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]"><CalendarClock className="h-5 w-5" style={{color:C}}/></div><div><p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Lançamentos</p><h1 className="text-2xl font-bold">Despesas Previstas</h1><p className="text-sm text-muted-foreground">Controle das contas e compromissos futuros.</p></div></div>
   <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button><Button variant="outline" onClick={()=>setSearchOpen(true)}><Search className="mr-2 h-4 w-4"/>Selecionar</Button><Button onClick={()=>openForm()} className="text-slate-950" style={{background:C}}><Plus className="mr-2 h-4 w-4"/>Nova Despesa</Button></div>
  </div>

  <Card><CardContent className="flex items-center gap-3 p-4"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar descrição, categoria ou pagamento..." className="pl-9"/></div><span className="text-sm text-muted-foreground">{list.length} registro(s)</span></CardContent></Card>

  <div className="grid gap-4 md:grid-cols-3">
   {[['Valor total',moeda(total)],['Pendentes',pend],['Vencidas',venc]].map(([t,v],i)=><Card key={t}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={i===0?{color:C}:i===2?{color:'hsl(var(--destructive))'}:undefined}>{v}</p></CardContent></Card>)}
  </div>

  <SearchableModal isOpen={searchOpen} onClose={()=>setSearchOpen(false)} onSelect={x=>{setSearchOpen(false);openForm(x)}} tableName="lm_despesas_previstas" searchField="descricao" displayFields={[{key:'descricao',label:'Descrição'},{key:'data_vencimento',label:'Vencimento',format:d=>new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'})},{key:'valor',label:'Valor',format:moeda}]} title="Buscar Despesa Prevista"/>

  <ModalLancamentoPadrao open={open} onClose={()=>{setOpen(false);reset()}} title={editId?'Editar Despesa Prevista':'Nova Despesa Prevista'} description="Registre a conta que deverá ser paga." icon={CalendarClock} theme="cyan" footer={<><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button type="submit" form="f-prevista" className="text-slate-950" style={{background:C}}>Salvar</Button></>}>
   <form id="f-prevista" onSubmit={save} className="space-y-5">
    <div className="space-y-2"><Label>Descrição</Label><Select value={form.descricao} onValueChange={v=>{const x=tipos.find(t=>t.despesa===v);setForm({...form,descricao:v,categoria:x?.categoria||''})}}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{tipos.map(x=><SelectItem key={x.despesa} value={x.despesa}>{x.despesa}</SelectItem>)}</SelectContent></Select></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Data da Compra</Label><Input type="date" value={form.data_compra} onChange={e=>setForm({...form,data_compra:e.target.value})}/></div><div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={form.data_vencimento} onChange={e=>setForm({...form,data_vencimento:e.target.value})} required/></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Categoria</Label><Input value={form.categoria} readOnly disabled/></div><div className="space-y-2"><Label>Valor</Label><Input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} required/></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Pagamento</Label><Select value={form.forma_pagamento} onValueChange={v=>setForm({...form,forma_pagamento:v})}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><SelectItem value="BOLETO">Boleto</SelectItem><SelectItem value="CARTÃO DE CRÉDITO">Cartão de Crédito</SelectItem><SelectItem value="PIX">PIX</SelectItem><SelectItem value="DINHEIRO">Dinheiro</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Parcelas</Label><Input type="number" min="1" value={form.parcelas} onChange={e=>setForm({...form,parcelas:Number(e.target.value)||1})} disabled={form.forma_pagamento!=='CARTÃO DE CRÉDITO'}/></div></div>
   </form>
  </ModalLancamentoPadrao>

  <Card><CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:C}}>Contas previstas</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-muted/30"><th className="p-4 text-left text-sm text-muted-foreground">Descrição</th><th className="p-4 text-left text-sm text-muted-foreground">Vencimento</th><th className="p-4 text-left text-sm text-muted-foreground">Categoria</th><th className="p-4 text-left text-sm text-muted-foreground">Pagamento</th><th className="p-4 text-right text-sm text-muted-foreground">Valor</th><th className="p-4 text-right text-sm text-muted-foreground">Ações</th></tr></thead><tbody>{loading?<tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:!list.length?<tr><td colSpan={6} className="p-10 text-center text-muted-foreground"><CalendarClock className="mx-auto mb-2 h-10 w-10 opacity-40"/>{data.length?'Nenhum resultado.':'Nenhuma despesa prevista.'}</td></tr>:list.map(x=><tr key={x.id} className="border-b last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]"><td className="p-4 font-medium">{x.descricao}</td><td className="p-4">{x.data_vencimento?new Date(x.data_vencimento+'T00:00:00').toLocaleDateString('pt-BR'): '—'}</td><td className="p-4"><Badge variant="outline" className="border-[hsl(var(--neon-lanhouse)/.3)] text-[hsl(var(--neon-lanhouse))]">{x.categoria||'OUTROS'}</Badge></td><td className="p-4">{x.forma_pagamento||'—'}</td><td className="p-4 text-right font-semibold" style={{color:C}}>{moeda(x.valor)}</td><td className="p-4 text-right"><Button variant="ghost" size="icon" onClick={()=>openForm(x)} style={{color:C}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir despesa prevista?</AlertDialogTitle><AlertDialogDescription>Deseja excluir este registro?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>)}</tbody></table></div></CardContent></Card>
 </div>;
}
