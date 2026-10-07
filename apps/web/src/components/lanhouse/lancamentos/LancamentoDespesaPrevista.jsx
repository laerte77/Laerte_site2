import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,Search,RotateCcw,CalendarClock}from'lucide-react';
import{format}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';

const CYAN='hsl(190 90% 50%)',BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

export default function LancamentoDespesaPrevista(){
 const{toast}=useToast(),{user}=useAuth();
 const[despesas,setDespesas]=useState([]),[tiposDespesa,setTiposDespesa]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[dialogOpen,setDialogOpen]=useState(false),[current,setCurrent]=useState(null),[deleteItem,setDeleteItem]=useState(null);
 const initial={data_compra:new Date().toISOString().split('T')[0],descricao:'',data_vencimento:'',valor:'',forma_pagamento:'',parcelas:1,categoria:'',status:'Pendente'};
 const[form,setForm]=useState(initial);

 const fetchData=useCallback(async()=>{
  if(!user)return;setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('lm_despesas_previstas').select('*').eq('user_id',user.id).order('data_vencimento',{ascending:false}),
    supabase.from('lm_despesas').select('despesa,categoria').eq('user_id',user.id).order('despesa',{ascending:true})
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;setDespesas(a.data||[]);setTiposDespesa(b.data||[]);
  }catch(e){toast({title:'Erro',description:e.message,variant:'destructive'})}finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData();if(!user)return;const ch=supabase.channel('lm_despesas_previstas_changes').on('postgres_changes',{event:'*',schema:'public',table:'lm_despesas_previstas'},fetchData).subscribe();return()=>supabase.removeChannel(ch)},[user,fetchData]);

 const filtered=useMemo(()=>despesas.filter(x=>(x.descricao||'').toLowerCase().includes(search.toLowerCase())||(x.categoria||'').toLowerCase().includes(search.toLowerCase())),[despesas,search]);
 const total=filtered.reduce((s,x)=>s+Number(x.valor||0),0);
 const openDialog=item=>{if(item){setCurrent(item);setForm({data_compra:item.data_compra||initial.data_compra,descricao:item.descricao||'',data_vencimento:item.data_vencimento||'',valor:item.valor||'',forma_pagamento:item.forma_pagamento||'',parcelas:item.parcelas||1,categoria:item.categoria||'',status:item.status||'Pendente'})}else{setCurrent(null);setForm(initial)}setDialogOpen(true)};
 const closeDialog=()=>{setDialogOpen(false);setCurrent(null);setForm(initial)};

 const save=async()=>{
  if(!form.descricao||!form.data_vencimento||!form.valor){toast({title:'Atenção',description:'Descrição, vencimento e valor são obrigatórios.',variant:'destructive'});return}
  try{
   const payload={...form,user_id:user.id,valor:Number(form.valor),parcelas:form.forma_pagamento==='CARTÃO DE CRÉDITO'?Number(form.parcelas)||1:null};
   const q=current?supabase.from('lm_despesas_previstas').update(payload).eq('id',current.id).eq('user_id',user.id):supabase.from('lm_despesas_previstas').insert(payload);
   const{error}=await q;if(error)throw error;toast({title:'Sucesso',description:current?'Despesa prevista atualizada.':'Despesa registrada.'});closeDialog();fetchData();
  }catch(e){toast({title:'Erro',description:e.message,variant:'destructive'})}
 };

 const remove=async()=>{if(!deleteItem)return;try{const{error}=await supabase.from('lm_despesas_previstas').delete().eq('id',deleteItem.id).eq('user_id',user.id);if(error)throw error;toast({title:'Removido'});setDeleteItem(null);fetchData()}catch(e){toast({title:'Erro',description:e.message,variant:'destructive'})}};

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p><h1 className="mt-1 text-2xl font-bold">Despesas Previstas</h1><p className="text-sm text-muted-foreground">Gerencie contas a pagar.</p></div><Button onClick={()=>openDialog()} className="text-white" style={{background:CYAN}}><Plus className="mr-2 h-4 w-4"/>Nova Despesa</Button></div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[{l:'Registros',v:filtered.length},{l:'Total',v:BRL.format(total)},{l:'Pendentes',v:filtered.filter(x=>(x.status||'Pendente')==='Pendente').length}].map(x=><Card key={x.l} className="border-border bg-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p><p className="mt-1 text-xl font-bold" style={{color:CYAN}}>{x.v}</p></CardContent></Card>)}</div>

   <Card className="border-border bg-card"><CardContent className="p-4"><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar despesa ou categoria..." className="h-10 pl-9"/></div><Button variant="outline" onClick={()=>setSearch('')}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button></div></CardContent></Card>

   <Dialog open={dialogOpen} onOpenChange={o=>o?setDialogOpen(true):closeDialog()}><DialogContent className="bg-card border-border sm:max-w-[600px]"><DialogHeader><DialogTitle style={{color:CYAN}}>{current?'Editar':'Nova'} Despesa Prevista</DialogTitle></DialogHeader><div className="space-y-4 py-3">
    <div><Label>Descrição *</Label><Select value={form.descricao} onValueChange={v=>{const c=tiposDespesa.find(x=>x.despesa===v);setForm(p=>({...p,descricao:v,categoria:c?.categoria||''}))}}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><ScrollArea className="h-48">{tiposDespesa.map(d=><SelectItem key={d.despesa} value={d.despesa}>{d.despesa}</SelectItem>)}</ScrollArea></SelectContent></Select></div>
    <div className="grid grid-cols-2 gap-4"><div><Label>Categoria</Label><Input value={form.categoria} readOnly disabled/></div><div><Label>Data Compra</Label><Input type="date" value={form.data_compra} onChange={e=>setForm(p=>({...p,data_compra:e.target.value}))}/></div></div>
    <div className="grid grid-cols-2 gap-4"><div><Label>Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e=>setForm(p=>({...p,data_vencimento:e.target.value}))}/></div><div><Label>Valor *</Label><Input type="number" step="0.01" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/></div></div>
    <div className="grid grid-cols-2 gap-4"><div><Label>Pagamento</Label><Select value={form.forma_pagamento} onValueChange={v=>setForm(p=>({...p,forma_pagamento:v}))}><SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent>{['BOLETO','CARTÃO DE CRÉDITO','PIX','DINHEIRO'].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div><div><Label>Parcelas</Label><Input type="number" min="1" value={form.parcelas} disabled={form.forma_pagamento!=='CARTÃO DE CRÉDITO'} onChange={e=>setForm(p=>({...p,parcelas:e.target.value}))}/></div></div>
    <DialogFooter><Button variant="outline" onClick={closeDialog}>Cancelar</Button><Button onClick={save} className="text-white" style={{background:CYAN}}>Salvar</Button></DialogFooter>
   </div></DialogContent></Dialog>

   <Card className="border-border bg-card"><CardContent className="p-0"><ScrollArea className="h-[500px]"><Table><TableHeader className="sticky top-0 z-10 bg-secondary/70"><TableRow><TableHead>Descrição</TableHead><TableHead>Vencimento</TableHead><TableHead>Categoria</TableHead><TableHead>Pagamento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader><TableBody>{loading?<TableRow><TableCell colSpan={7} className="py-12 text-center">Carregando...</TableCell></TableRow>:!filtered.length?<TableRow><TableCell colSpan={7} className="py-12 text-center text-muted-foreground"><CalendarClock className="mx-auto mb-2 h-8 w-8"/>Nenhuma despesa encontrada.</TableCell></TableRow>:filtered.map(x=><TableRow key={x.id} className="hover:bg-muted/40"><TableCell className="font-semibold">{x.descricao}</TableCell><TableCell>{format(new Date(`${x.data_vencimento}T00:00:00`),'dd/MM/yyyy')}</TableCell><TableCell><Badge variant="outline">{x.categoria||'OUTROS'}</Badge></TableCell><TableCell>{x.forma_pagamento||'-'}</TableCell><TableCell><Badge variant="outline">{x.status||'Pendente'}</Badge></TableCell><TableCell className="text-right font-bold" style={{color:CYAN}}>{BRL.format(Number(x.valor)||0)}</TableCell><TableCell><div className="flex justify-center"><Button variant="ghost" size="icon" onClick={()=>openDialog(x)} style={{color:CYAN}}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="icon" className="text-red-500" onClick={()=>setDeleteItem(x)}><Trash2 className="h-4 w-4"/></Button></div></TableCell></TableRow>)}</TableBody></Table></ScrollArea></CardContent></Card>

   <AlertDialog open={!!deleteItem} onOpenChange={()=>setDeleteItem(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir despesa?</AlertDialogTitle><AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={remove} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </motion.div>
 )
}
