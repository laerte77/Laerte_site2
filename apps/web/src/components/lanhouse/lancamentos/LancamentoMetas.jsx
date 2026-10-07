import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,Search,RotateCcw,CheckCircle,XCircle}from'lucide-react';
import{format}from'date-fns';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CYAN='hsl(190 90% 50%)';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
const hoje=()=>new Date().toISOString().split('T')[0];
const fmt=d=>d?new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR'):'—';

export default function LancamentoMetas(){
 const{user}=useAuth(),{toast}=useToast(),mounted=useRef(true);
 const[metas,setMetas]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[month,setMonth]=useState(String(new Date().getMonth())),[year,setYear]=useState(String(new Date().getFullYear()));
 const[dialogOpen,setDialogOpen]=useState(false),[current,setCurrent]=useState(null),[deleteId,setDeleteId]=useState(null);

 const initial={
  data_inicio:hoje(),
  data_fim:hoje(),
  descricao:'',
  valor_meta:'',
  valor_atingido:'',
  status:'nao_atingida'
 };
 const[form,setForm]=useState(initial);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const{data,error}=await supabase
    .from('lm_lancamentos_metas')
    .select('*')
    .eq('user_id',user.id)
    .order('data_inicio',{ascending:false});
   if(error)throw error;
   if(mounted.current)setMetas(data||[]);
  }catch(e){
   if(mounted.current)toast({title:'Erro',description:e.message||'Não foi possível carregar as metas.',variant:'destructive'});
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  mounted.current=true;
  fetchData();
  const channel=user&&supabase.channel('lm_metas_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_lancamentos_metas'},fetchData)
   .subscribe();
  return()=>{mounted.current=false;if(channel)supabase.removeChannel(channel)};
 },[user,fetchData]);

 const years=useMemo(()=>[...new Set([
  ...metas.map(x=>new Date(x.data_inicio).getFullYear()),
  new Date().getFullYear()
])].sort((a,b)=>b-a),[metas]);

 const filtered=useMemo(()=>metas.filter(x=>{
  const d=new Date(x.data_inicio);
  const texto=`${x.descricao||''} ${x.status||''}`.toLowerCase();
  return(
   (year==='all'||String(d.getFullYear())===year)&&
   (month==='all'||String(d.getMonth())===month)&&
   (!search||texto.includes(search.toLowerCase()))
  );
 }),[metas,year,month,search]);

 const totalMeta=filtered.reduce((s,x)=>s+Number(x.valor_meta||0),0);
 const totalAtingido=filtered.reduce((s,x)=>s+Number(x.valor_atingido||0),0);
 const atingidas=filtered.filter(x=>x.status==='atingida').length;

 const openDialog=item=>{
  if(item){
   setCurrent(item);
   setForm({
    data_inicio:item.data_inicio||hoje(),
    data_fim:item.data_fim||item.data_inicio||hoje(),
    descricao:item.descricao||'',
    valor_meta:item.valor_meta??'',
    valor_atingido:item.valor_atingido??0,
    status:item.status||'nao_atingida'
   });
  }else{
   setCurrent(null);
   setForm(initial);
  }
  setDialogOpen(true);
 };

 const closeDialog=()=>{
  setDialogOpen(false);
  setCurrent(null);
  setForm(initial);
 };

 const save=async e=>{
  e.preventDefault();

  if(!form.data_inicio||!form.data_fim||!form.descricao||!form.valor_meta){
   toast({title:'Atenção',description:'Preencha período, descrição e valor da meta.',variant:'destructive'});
   return;
  }

  if(form.data_fim<form.data_inicio){
   toast({title:'Período inválido',description:'A data final não pode ser anterior à data inicial.',variant:'destructive'});
   return;
  }

  try{
   const payload={
    user_id:user.id,
    data_inicio:form.data_inicio,
    data_fim:form.data_fim,
    descricao:form.descricao,
    valor_meta:Number(form.valor_meta),
    valor_atingido:Number(form.valor_atingido||0),
    status:form.status
   };

   const q=current
    ?supabase.from('lm_lancamentos_metas').update(payload).eq('id',current.id).eq('user_id',user.id)
    :supabase.from('lm_lancamentos_metas').insert(payload);

   const{error}=await q;
   if(error)throw error;

   toast({title:'Sucesso',description:current?'Meta atualizada.':'Meta cadastrada.'});
   closeDialog();
   fetchData();
  }catch(e){
   toast({title:'Erro ao salvar',description:e.message||'Não foi possível salvar.',variant:'destructive'});
  }
 };

 const remove=async()=>{
  if(!deleteId)return;
  try{
   const{error}=await supabase.from('lm_lancamentos_metas').delete().eq('id',deleteId).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removida',description:'Meta excluída com sucesso.'});
   setDeleteId(null);
   fetchData();
  }catch(e){
   toast({title:'Erro',description:e.message||'Não foi possível excluir.',variant:'destructive'});
  }
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p>
     <h1 className="mt-1 text-2xl font-bold">Acompanhamento de Metas</h1>
     <p className="text-sm text-muted-foreground">Defina e acompanhe suas metas financeiras.</p>
    </div>
    <Button onClick={()=>openDialog()} className="text-white" style={{background:CYAN}}>
     <Plus className="mr-2 h-4 w-4"/>Nova Meta
    </Button>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[
     {l:'Registros',v:filtered.length},
     {l:'Valor Meta',v:BRL.format(totalMeta)},
     {l:'Atingido',v:BRL.format(totalAtingido)},
     {l:'Atingidas',v:atingidas}
    ].map(x=>
     <Card key={x.l} className="border-border bg-card">
      <CardContent className="p-4">
       <p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p>
       <p className="mt-1 text-xl font-bold" style={{color:CYAN}}>{x.v}</p>
      </CardContent>
     </Card>
    )}
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">
     <div className="flex flex-col gap-3 xl:flex-row">
      <div className="relative flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar meta ou status..." className="h-10 pl-9"/>
      </div>

      <div className="flex flex-wrap gap-2">
       <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className="w-[140px]"><SelectValue/></SelectTrigger>
        <SelectContent>
         <SelectItem value="all">Todos os meses</SelectItem>
         {meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
        </SelectContent>
       </Select>

       <Select value={year} onValueChange={setYear}>
        <SelectTrigger className="w-[110px]"><SelectValue/></SelectTrigger>
        <SelectContent>
         {years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
        </SelectContent>
       </Select>

       <Button variant="outline" onClick={()=>{
        setSearch('');
        setMonth(String(new Date().getMonth()));
        setYear(String(new Date().getFullYear()));
       }}>
        <RotateCcw className="mr-2 h-4 w-4"/>Limpar
       </Button>
      </div>
     </div>
    </CardContent>
   </Card>

   <Dialog open={dialogOpen} onOpenChange={o=>o?setDialogOpen(true):closeDialog()}>
    <DialogContent className="bg-card border-border sm:max-w-[550px]">
     <DialogHeader>
      <DialogTitle style={{color:CYAN}}>{current?'Editar Meta':'Nova Meta'}</DialogTitle>
     </DialogHeader>

     <form onSubmit={save} className="space-y-4 py-3">
      <div className="grid grid-cols-2 gap-4">
       <div>
        <Label>Data Inicial *</Label>
        <Input type="date" value={form.data_inicio} onChange={e=>setForm(p=>({...p,data_inicio:e.target.value}))}/>
       </div>
       <div>
        <Label>Data Final *</Label>
        <Input type="date" value={form.data_fim} onChange={e=>setForm(p=>({...p,data_fim:e.target.value}))}/>
       </div>
      </div>

      <div>
       <Label>Descrição da Meta *</Label>
       <Input value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} placeholder="Ex: Faturamento mensal"/>
      </div>

      <div className="grid grid-cols-2 gap-4">
       <div>
        <Label>Valor da Meta *</Label>
        <Input type="number" step="0.01" min="0" value={form.valor_meta} onChange={e=>setForm(p=>({...p,valor_meta:e.target.value}))}/>
       </div>
       <div>
        <Label>Valor Atingido</Label>
        <Input type="number" step="0.01" min="0" value={form.valor_atingido} onChange={e=>setForm(p=>({...p,valor_atingido:e.target.value}))}/>
       </div>
      </div>

      <div>
       <Label>Status</Label>
       <Select value={form.status} onValueChange={v=>setForm(p=>({...p,status:v}))}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>
         <SelectItem value="atingida">Atingida</SelectItem>
         <SelectItem value="nao_atingida">Não Atingida</SelectItem>
        </SelectContent>
       </Select>
      </div>

      <DialogFooter>
       <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
       <Button type="submit" className="text-white" style={{background:CYAN}}>Salvar</Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <ScrollArea className="h-[520px]">
      <Table>
       <TableHeader className="sticky top-0 z-10 bg-secondary/70">
        <TableRow>
         <TableHead>Período</TableHead>
         <TableHead>Meta</TableHead>
         <TableHead className="text-right">Valor Meta</TableHead>
         <TableHead className="text-right">Atingido</TableHead>
         <TableHead className="text-center">Progresso</TableHead>
         <TableHead className="text-center">Status</TableHead>
         <TableHead className="text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow><TableCell colSpan={7} className="py-12 text-center">Carregando...</TableCell></TableRow>
        ):!filtered.length?(
         <TableRow>
          <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
           Nenhuma meta encontrada.
          </TableCell>
         </TableRow>
        ):filtered.map(x=>{
         const percentual=x.valor_meta>0?Math.round((Number(x.valor_atingido||0)/Number(x.valor_meta))*100):0;
         const atingida=x.status==='atingida';

         return(
          <TableRow key={x.id} className="hover:bg-muted/40">
           <TableCell className="font-medium">
            <div>{fmt(x.data_inicio)}</div>
            <div className="text-xs text-muted-foreground">até {fmt(x.data_fim)}</div>
           </TableCell>

           <TableCell className="font-semibold">{x.descricao}</TableCell>

           <TableCell className="text-right">{BRL.format(Number(x.valor_meta)||0)}</TableCell>

           <TableCell className="text-right font-semibold">{BRL.format(Number(x.valor_atingido)||0)}</TableCell>

           <TableCell>
            <div className="flex items-center justify-center gap-2">
             <div className="h-2 w-20 overflow-hidden rounded-full bg-secondary">
              <div className="h-full" style={{width:`${Math.min(percentual,100)}%`,background:CYAN}}/>
             </div>
             <span className="text-xs">{percentual}%</span>
            </div>
           </TableCell>

           <TableCell className="text-center">
            <Badge variant="outline" className={atingida?'text-green-500':'text-orange-500'}>
             {atingida?<CheckCircle className="mr-1 h-3 w-3"/>:<XCircle className="mr-1 h-3 w-3"/>}
             {atingida?'Atingida':'Pendente'}
            </Badge>
           </TableCell>

           <TableCell>
            <div className="flex justify-center">
             <Button variant="ghost" size="icon" onClick={()=>openDialog(x)} style={{color:CYAN}}>
              <Edit className="h-4 w-4"/>
             </Button>

             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button variant="ghost" size="icon" className="text-red-500">
                <Trash2 className="h-4 w-4"/>
               </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
               <AlertDialogHeader>
                <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={()=>setDeleteId(x.id)} className="bg-red-600">Excluir</AlertDialogAction>
               </AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>
            </div>
           </TableCell>
          </TableRow>
         )
        })}
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>

   <AlertDialog open={!!deleteId} onOpenChange={()=>setDeleteId(null)}>
    <AlertDialogContent>
     <AlertDialogHeader>
      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
      <AlertDialogDescription>Deseja realmente excluir esta meta?</AlertDialogDescription>
     </AlertDialogHeader>
     <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={remove} className="bg-red-600">Excluir</AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>

  </motion.div>
 );
}
