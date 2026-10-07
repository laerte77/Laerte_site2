import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,Search,RotateCcw,UserX}from'lucide-react';
import{format,getMonth,getYear}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';

const CYAN='hsl(190 90% 50%)',BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function LancamentoClientesDebito(){
 const{toast}=useToast(),{user}=useAuth();
 const[debitos,setDebitos]=useState([]),[clientes,setClientes]=useState([]),[servicos,setServicos]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[month,setMonth]=useState('all'),[year,setYear]=useState(String(new Date().getFullYear())),[dialogOpen,setDialogOpen]=useState(false),[current,setCurrent]=useState(null),[deleteItem,setDeleteItem]=useState(null);
 const initial={data:new Date().toISOString().split('T')[0],cliente:'',servico:'',valor:'',status:'DEVENDO'};
 const[form,setForm]=useState(initial);

 const fetchData=useCallback(async()=>{
  if(!user)return;setLoading(true);
  try{
   const[a,b,c]=await Promise.all([
    supabase.from('lm_clientes_debito').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_clientes').select('nome').eq('user_id',user.id).order('nome',{ascending:true}),
    supabase.from('lm_servicos').select('servico').eq('user_id',user.id).order('servico',{ascending:true})
   ]);
   if(a.error)throw a.error;setDebitos(a.data||[]);setClientes(b.data||[]);setServicos(c.data||[]);
  }catch(e){toast({title:'Erro',description:e.message,variant:'destructive'})}finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData();if(!user)return;const ch=supabase.channel('lm_clientes_debito_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_clientes_debito'},fetchData).subscribe();return()=>supabase.removeChannel(ch)},[user,fetchData]);

 const years=[...new Set([...debitos.map(x=>new Date(x.data).getFullYear()),new Date().getFullYear()])].sort((a,b)=>b-a);
 const filtered=useMemo(()=>debitos.filter(x=>{
  const s=search.toLowerCase();
  return(month==='all'||String(getMonth(new Date(x.data)))===month)&&(String(getYear(new Date(x.data)))===year)&&(!s||`${x.cliente||''} ${x.servico||''} ${x.status||''}`.toLowerCase().includes(s));
 }),[debitos,search,month,year]);

 const total=filtered.reduce((s,x)=>s+Number(x.valor||0),0);
 const openDialog=item=>{if(item){setCurrent(item);setForm({data:item.data||initial.data,cliente:item.cliente||'',servico:item.servico||'',valor:item.valor||'',status:item.status||'DEVENDO'})}else{setCurrent(null);setForm(initial)}setDialogOpen(true)};
 const closeDialog=()=>{setDialogOpen(false);setCurrent(null);setForm(initial)};

 const save=async()=>{
  if(!form.data||!form.cliente||!form.servico||!form.valor){toast({title:'Atenção',description:'Preencha todos os campos.',variant:'destructive'});return}
  try{
   const payload={...form,user_id:user.id,valor:Number(form.valor)};
   const q=current?supabase.from('lm_clientes_debito').update(payload).eq('id',current.id).eq('user_id',user.id):supabase.from('lm_clientes_debito').insert(payload);
   const{error}=await q;if(error)throw error;toast({title:'Sucesso',description:current?'Débito atualizado.':'Débito registrado.'});closeDialog();fetchData();
  }catch(e){toast({title:'Erro',description:e.message,variant:'destructive'})}
 };

 const remove=async()=>{if(!deleteItem)return;try{const{error}=await supabase.from('lm_clientes_debito').delete().eq('id',deleteItem.id).eq('user_id',user.id);if(error)throw error;toast({title:'Removido',description:'Débito excluído.'});setDeleteItem(null);fetchData()}catch(e){toast({title:'Erro',description:e.message,variant:'destructive'})}};

 const status=x=>x==='PAGO'?<Badge className="bg-green-500">Pago</Badge>:x==='DEVENDO'?<Badge variant="destructive">Devendo</Badge>:<Badge className="bg-yellow-500">Parcial</Badge>;

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p><h1 className="mt-1 text-2xl font-bold">Clientes com Débito</h1><p className="text-sm text-muted-foreground">Controle de clientes pendentes.</p></div><Button onClick={()=>openDialog()} className="text-white" style={{background:CYAN}}><Plus className="mr-2 h-4 w-4"/>Novo Débito</Button></div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{l:'Registros',v:filtered.length},{l:'Total',v:BRL.format(total)},{l:'Devendo',v:filtered.filter(x=>x.status==='DEVENDO').length},{l:'Pagos',v:filtered.filter(x=>x.status==='PAGO').length}].map(x=><Card key={x.l} className="border-border bg-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p><p className="mt-1 text-xl font-bold" style={{color:CYAN}}>{x.v}</p></CardContent></Card>)}</div>

   <Card className="border-border bg-card"><CardContent className="p-4"><div className="flex flex-col gap-3 xl:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente, serviço ou status..." className="h-10 pl-9"/></div><div className="flex flex-wrap gap-2"><Select value={month} onValueChange={setMonth}><SelectTrigger className="w-[140px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select><Select value={year} onValueChange={setYear}><SelectTrigger className="w-[110px]"><SelectValue/></SelectTrigger><SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={()=>{setSearch('');setMonth('all');setYear(String(new Date().getFullYear()))}}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button></div></div></CardContent></Card>

   <Dialog open={dialogOpen} onOpenChange={o=>o?setDialogOpen(true):closeDialog()}><DialogContent className="bg-card border-border sm:max-w-[550px]"><DialogHeader><DialogTitle style={{color:CYAN}}>{current?'Editar':'Registrar'} Débito</DialogTitle></DialogHeader><div className="space-y-4 py-3">
    <div className="grid grid-cols-2 gap-4"><div><Label>Data</Label><Input type="date" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))}/></div><div><Label>Valor</Label><Input type="number" step="0.01" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/></div></div>
    <div><Label>Cliente</Label><Select value={form.cliente} onValueChange={v=>setForm(p=>({...p,cliente:v}))}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><ScrollArea className="h-48">{clientes.map(c=><SelectItem key={c.nome} value={c.nome}>{c.nome}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
    <div><Label>Serviço</Label><Select value={form.servico} onValueChange={v=>setForm(p=>({...p,servico:v}))}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><ScrollArea className="h-48">{servicos.map(s=><SelectItem key={s.servico} value={s.servico}>{s.servico}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
    <div><Label>Status</Label><Select value={form.status} onValueChange={v=>setForm(p=>({...p,status:v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="DEVENDO">Devendo</SelectItem><SelectItem value="PAGO">Pago</SelectItem><SelectItem value="PARCIAL">Parcial</SelectItem></SelectContent></Select></div>
    <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={save} className="text-white" style={{background:CYAN}}>Salvar</Button></DialogFooter>
   </div></DialogContent></Dialog>

   <Card className="border-border bg-card"><CardContent className="p-0"><ScrollArea className="h-[500px]"><Table><TableHeader className="sticky top-0 z-10 bg-secondary/70"><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Serviço</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader><TableBody>{loading?<TableRow><TableCell colSpan={6} className="py-12 text-center">Carregando...</TableCell></TableRow>:!filtered.length?<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground"><UserX className="mx-auto mb-2 h-8 w-8"/>Nenhum débito encontrado.</TableCell></TableRow>:filtered.map(x=><TableRow key={x.id} className="hover:bg-muted/40"><TableCell>{format(new Date(`${x.data}T00:00:00`),'dd/MM/yyyy')}</TableCell><TableCell className="font-semibold">{x.cliente}</TableCell><TableCell>{x.servico}</TableCell><TableCell>{status(x.status)}</TableCell><TableCell className="text-right font-bold" style={{color:CYAN}}>{BRL.format(Number(x.valor)||0)}</TableCell><TableCell><div className="flex justify-center"><Button variant="ghost" size="icon" onClick={()=>openDialog(x)} style={{color:CYAN}}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="icon" className="text-red-500" onClick={()=>setDeleteItem(x)}><Trash2 className="h-4 w-4"/></Button></div></TableCell></TableRow>)}</TableBody></Table></ScrollArea></CardContent></Card>

   <AlertDialog open={!!deleteItem} onOpenChange={()=>setDeleteItem(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir débito?</AlertDialogTitle><AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </motion.div>
 )
}
