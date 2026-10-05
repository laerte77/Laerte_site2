import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash2,FileText,RefreshCw,Search,ArrowUp,ArrowDown,Package}from'lucide-react';
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
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const C='hsl(var(--neon-lanhouse))';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const anoAtual=new Date().getFullYear();
const anos=[anoAtual,anoAtual-1,anoAtual-2];

export default function LancamentoFolhas(){
 const{user}=useAuth(),{toast}=useToast();
 const[folhas,setFolhas]=useState([]),[tipos,setTipos]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[month,setMonth]=useState('all'),[year,setYear]=useState(String(anoAtual));
 const[open,setOpen]=useState(false),[editId,setEditId]=useState(null);
 const[form,setForm]=useState({data:new Date().toISOString().split('T')[0],tipo_folha:'',tipo_movimento:'ENTRADA',quantidade:'',valor:''});

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('lm_folhas').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_tipos_folha').select('*').eq('user_id',user.id).order('tipo_folha')
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   setFolhas(a.data||[]);setTipos(b.data||[]);
  }catch(e){toast({title:'Erro ao carregar folhas',description:e.message,variant:'destructive'})}
  finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>load(),[load]);
 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('lm_folhas_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_folhas',filter:`user_id=eq.${user.id}`},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const reset=()=>{setForm({data:new Date().toISOString().split('T')[0],tipo_folha:'',tipo_movimento:'ENTRADA',quantidade:'',valor:''});setEditId(null)};
 const openForm=x=>{
  setEditId(x?.id||null);
  setForm(x?{
   data:x.data||new Date().toISOString().split('T')[0],
   tipo_folha:x.tipo_folha||'',
   tipo_movimento:x.tipo_movimento||'ENTRADA',
   quantidade:x.quantidade??'',
   valor:x.valor??''
  }:{data:new Date().toISOString().split('T')[0],tipo_folha:'',tipo_movimento:'ENTRADA',quantidade:'',valor:''});
  setOpen(true);
 };

 const save=async e=>{
  e.preventDefault();
  if(!form.data||!form.tipo_folha||!form.quantidade)return toast({title:'Campos obrigatórios',description:'Preencha data, tipo de folha e quantidade.',variant:'destructive'});
  const payload={user_id:user.id,data:form.data,tipo_folha:form.tipo_folha,tipo_movimento:form.tipo_movimento,quantidade:Number(form.quantidade),valor:form.valor?Number(form.valor):null};
  const q=editId?await supabase.from('lm_folhas').update(payload).eq('id',editId).eq('user_id',user.id):await supabase.from('lm_folhas').insert(payload);
  if(q.error)return toast({title:'Erro ao salvar',description:q.error.message,variant:'destructive'});
  toast({title:'Sucesso',description:editId?'Lançamento atualizado.':'Lançamento registrado.'});
  setOpen(false);reset();load();
 };

 const remove=async id=>{
  const{error}=await supabase.from('lm_folhas').delete().eq('id',id).eq('user_id',user.id);
  if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});
  else{toast({title:'Registro excluído'});load()}
 };

 const list=folhas.filter(x=>{
  const d=new Date(x.data);
  const texto=`${x.tipo_folha||''} ${x.tipo_movimento||''}`.toLowerCase();
  return(month==='all'||d.getMonth()===Number(month))&&(year==='all'||d.getFullYear()===Number(year))&&(!search||texto.includes(search.toLowerCase()));
 });
 const entradas=folhas.filter(x=>x.tipo_movimento==='ENTRADA').reduce((a,x)=>a+Number(x.quantidade||0),0);
 const saidas=folhas.filter(x=>x.tipo_movimento==='SAÍDA').reduce((a,x)=>a+Number(x.quantidade||0),0);
 const perdas=folhas.filter(x=>x.tipo_movimento==='PERDA').reduce((a,x)=>a+Number(x.quantidade||0),0);

 const badge=x=>x==='ENTRADA'?<Badge className="bg-green-500/15 text-green-400 border border-green-500/20">Entrada</Badge>:x==='SAÍDA'?<Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/20">Saída</Badge>:<Badge className="bg-red-500/15 text-red-400 border border-red-500/20">Perda</Badge>;

 return <div className="dark-lm-impressoes space-y-4">

  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]"><FileText className="h-5 w-5" style={{color:C}}/></div><div><p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Lançamentos</p><h1 className="text-2xl font-bold">Controle de Folhas</h1><p className="text-sm text-muted-foreground">Entrada e saída de material do estoque.</p></div></div>
   <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button><Button onClick={()=>openForm()} className="text-slate-950" style={{background:C}}><Plus className="mr-2 h-4 w-4"/>Novo Lançamento</Button></div>
  </div>

  <Card><CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between"><div className="relative w-full lg:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar folha ou movimento..." className="pl-9"/></div><div className="flex flex-wrap gap-2"><Select value={month} onValueChange={setMonth}><SelectTrigger className="w-[150px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem>{meses.map((m,i)=><SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select><Select value={year} onValueChange={setYear}><SelectTrigger className="w-[110px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os anos</SelectItem>{anos.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div></CardContent></Card>

  <div className="grid gap-4 md:grid-cols-4">
   {[['Registros',list.length,FileText],['Entradas',entradas,ArrowUp],['Saídas',saidas,ArrowDown],['Perdas',perdas,Package]].map(([t,v,I],i)=><Card key={t}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t}</CardTitle></CardHeader><CardContent className="flex items-center justify-between"><p className="text-2xl font-bold" style={i===0?{color:C}:undefined}>{v}</p><I className="h-5 w-5 opacity-60" style={{color:i===0?C:undefined}}/></CardContent></Card>)}
  </div>

  <ModalLancamentoPadrao open={open} onClose={()=>{setOpen(false);reset()}} title={editId?'Editar Lançamento':'Novo Lançamento'} description="Registre a movimentação de folhas." icon={FileText} theme="cyan" footer={<><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button type="submit" form="f-folhas" className="text-slate-950" style={{background:C}}>Salvar</Button></>}>
   <form id="f-folhas" onSubmit={save} className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Data</Label><Input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} required/></div><div className="space-y-2"><Label>Quantidade</Label><Input type="number" min="1" value={form.quantidade} onChange={e=>setForm({...form,quantidade:e.target.value})} required/></div></div>
    <div className="space-y-2"><Label>Tipo de Folha</Label><Select value={form.tipo_folha} onValueChange={v=>setForm({...form,tipo_folha:v})}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{tipos.map(x=><SelectItem key={x.id||x.tipo_folha} value={x.tipo_folha}>{x.tipo_folha}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><Label>Movimento</Label><Select value={form.tipo_movimento} onValueChange={v=>setForm({...form,tipo_movimento:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ENTRADA">Entrada</SelectItem><SelectItem value="SAÍDA">Saída</SelectItem><SelectItem value="PERDA">Perda</SelectItem></SelectContent></Select></div>
    {form.tipo_movimento==='ENTRADA'&&<div className="space-y-2"><Label>Valor Total</Label><Input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})}/></div>}
   </form>
  </ModalLancamentoPadrao>

  <Card><CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:C}}>Movimentações</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b bg-muted/30"><th className="p-4 text-left text-sm text-muted-foreground">Data</th><th className="p-4 text-left text-sm text-muted-foreground">Tipo Folha</th><th className="p-4 text-left text-sm text-muted-foreground">Movimento</th><th className="p-4 text-right text-sm text-muted-foreground">Qtd</th><th className="p-4 text-right text-sm text-muted-foreground">Ações</th></tr></thead><tbody>{loading?<tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:!list.length?<tr><td colSpan={5} className="p-10 text-center text-muted-foreground"><FileText className="mx-auto mb-2 h-10 w-10 opacity-40"/>{folhas.length?'Nenhum resultado.':'Nenhuma movimentação cadastrada.'}</td></tr>:list.map(x=><tr key={x.id} className="border-b last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]"><td className="p-4">{new Date(x.data).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</td><td className="p-4 font-medium">{x.tipo_folha}</td><td className="p-4">{badge(x.tipo_movimento)}</td><td className="p-4 text-right font-semibold">{x.quantidade}</td><td className="p-4 text-right"><Button variant="ghost" size="icon" onClick={()=>openForm(x)} style={{color:C}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir movimentação?</AlertDialogTitle><AlertDialogDescription>Deseja excluir este registro?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></td></tr>)}</tbody></table></div></CardContent></Card>
 </div>;
}
