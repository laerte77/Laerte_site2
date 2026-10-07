import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,Search,Download,RotateCcw,DollarSign}from'lucide-react';
import{getMonth,getYear}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import * as XLSX from'xlsx';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CYAN='hsl(190 90% 50%)';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2});
const tipos=['DÍZIMO','OFERTA','VOTO'];

export default function LancamentoDizimosOfertas(){
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);
 const[lancamentos,setLancamentos]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[month,setMonth]=useState(String(new Date().getMonth())),[year,setYear]=useState(String(new Date().getFullYear()));
 const[dialogOpen,setDialogOpen]=useState(false),[exportOpen,setExportOpen]=useState(false),[current,setCurrent]=useState(null);
 const[exportFilters,setExportFilters]=useState({month:new Date().getMonth(),year:new Date().getFullYear()});
 const initial={data:new Date().toISOString().split('T')[0],valor:'',tipo_movimento:''};
 const[form,setForm]=useState(initial);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const{data,error}=await supabase.from('lm_dizimos_ofertas').select('*').eq('user_id',user.id).order('data',{ascending:false});
   if(error)throw error;
   if(mounted.current)setLancamentos(data||[]);
  }catch(e){
   if(mounted.current)toast({title:'Erro',description:e.message,variant:'destructive'});
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  mounted.current=true;
  fetchData();
  if(!user)return;
  const ch=supabase.channel('lm_dizimos_ofertas_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_dizimos_ofertas'},fetchData)
   .subscribe();
  return()=>{mounted.current=false;supabase.removeChannel(ch)};
 },[user,fetchData]);

 const years=[...new Set([...lancamentos.map(x=>new Date(x.data).getFullYear()),new Date().getFullYear()])].sort((a,b)=>b-a);

 const filtered=useMemo(()=>lancamentos.filter(x=>
  (year==='all'||String(getYear(new Date(x.data)))===year)&&
  (month==='all'||String(getMonth(new Date(x.data)))===month)&&
  (!search||String(x.tipo_movimento||'').toLowerCase().includes(search.toLowerCase()))
 ),[lancamentos,year,month,search]);

 const total=filtered.reduce((s,x)=>s+Number(x.valor||0),0);

 const openDialog=item=>{
  if(item){
   setCurrent(item);
   setForm({data:item.data||initial.data,valor:item.valor??'',tipo_movimento:item.tipo_movimento||''});
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
  if(!form.data||!form.valor||!form.tipo_movimento){
   toast({title:'Atenção',description:'Preencha todos os campos.',variant:'destructive'});
   return;
  }
  try{
   const payload={data:form.data,valor:Number(form.valor),tipo_movimento:form.tipo_movimento,user_id:user.id};
   const q=current
    ?supabase.from('lm_dizimos_ofertas').update(payload).eq('id',current.id).eq('user_id',user.id)
    :supabase.from('lm_dizimos_ofertas').insert(payload);
   const{error}=await q;
   if(error)throw error;
   toast({title:'Sucesso',description:current?'Lançamento atualizado.':'Lançamento registrado.'});
   closeDialog();
   fetchData();
  }catch(e){
   toast({title:'Erro',description:e.message,variant:'destructive'});
  }
 };

 const remove=async id=>{
  try{
   const{error}=await supabase.from('lm_dizimos_ofertas').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido',description:'Lançamento excluído.'});
   fetchData();
  }catch(e){
   toast({title:'Erro',description:e.message,variant:'destructive'});
  }
 };

 const exportar=()=>{
  const dados=lancamentos.filter(x=>{
   const d=new Date(x.data);
   return d.getMonth()===exportFilters.month&&d.getFullYear()===exportFilters.year;
  });

  if(!dados.length){
   toast({title:'Sem dados',description:'Não há registros para o período.',variant:'destructive'});
   return;
  }

  const data=dados.map(x=>({
   DATA:new Date(x.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}),
   TIPO:x.tipo_movimento,
   VALOR:Number(x.valor||0)
  }));

  const ws=XLSX.utils.json_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Dízimos e Ofertas');
  XLSX.writeFile(wb,`Dizimos_Ofertas_LM_${meses[exportFilters.month]}_${exportFilters.year}.xlsx`);
  setExportOpen(false);
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p>
     <h1 className="mt-1 text-2xl font-bold">Dízimos e Ofertas</h1>
     <p className="text-sm text-muted-foreground">Registre e acompanhe as contribuições.</p>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={()=>setExportOpen(true)}>
      <Download className="mr-2 h-4 w-4"/>Exportar
     </Button>
     <Button onClick={()=>openDialog()} className="text-white" style={{background:CYAN}}>
      <Plus className="mr-2 h-4 w-4"/>Novo Lançamento
     </Button>
    </div>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {[
     {l:'Registros',v:filtered.length},
     {l:'Total Filtrado',v:BRL.format(total)},
     {l:'Média',v:BRL.format(filtered.length?total/filtered.length:0)}
    ].map(x=>
     <Card key={x.l} className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-4">
       <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p>
        <p className="mt-1 text-xl font-bold" style={{color:CYAN}}>{x.v}</p>
       </div>
       <DollarSign className="h-5 w-5" style={{color:CYAN}}/>
      </CardContent>
     </Card>
    )}
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">
     <div className="flex flex-col gap-3 xl:flex-row">
      <div className="relative flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por tipo..." className="h-10 pl-9"/>
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

   <Dialog open={exportOpen} onOpenChange={setExportOpen}>
    <DialogContent className="bg-card border-border sm:max-w-[430px]">
     <DialogHeader>
      <DialogTitle>Exportar Dízimos e Ofertas</DialogTitle>
      <DialogDescription>Selecione o período.</DialogDescription>
     </DialogHeader>

     <div className="grid grid-cols-2 gap-4 py-4">
      <div>
       <Label>Mês</Label>
       <Select value={String(exportFilters.month)} onValueChange={v=>setExportFilters(p=>({...p,month:Number(v)}))}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
       </Select>
      </div>

      <div>
       <Label>Ano</Label>
       <Select value={String(exportFilters.year)} onValueChange={v=>setExportFilters(p=>({...p,year:Number(v)}))}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
       </Select>
      </div>
     </div>

     <DialogFooter>
      <Button variant="outline" onClick={()=>setExportOpen(false)}>Cancelar</Button>
      <Button onClick={exportar} className="text-white" style={{background:CYAN}}>Exportar</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <Dialog open={dialogOpen} onOpenChange={o=>o?setDialogOpen(true):closeDialog()}>
    <DialogContent className="bg-card border-border sm:max-w-[500px]">
     <DialogHeader>
      <DialogTitle style={{color:CYAN}}>{current?'Editar':'Novo'} Lançamento</DialogTitle>
     </DialogHeader>

     <form onSubmit={save} className="space-y-5 py-3">
      <div className="grid grid-cols-2 gap-4">
       <div>
        <Label>Data</Label>
        <Input type="date" value={form.data} onChange={e=>setForm(p=>({...p,data:e.target.value}))}/>
       </div>
       <div>
        <Label>Valor</Label>
        <Input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm(p=>({...p,valor:e.target.value}))}/>
       </div>
      </div>

      <div>
       <Label>Tipo</Label>
       <Select value={form.tipo_movimento} onValueChange={v=>setForm(p=>({...p,tipo_movimento:v}))}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent>{tipos.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader className="sticky top-0 z-10 bg-secondary/70">
        <TableRow>
         <TableHead>Data</TableHead>
         <TableHead>Tipo</TableHead>
         <TableHead className="text-right">Valor</TableHead>
         <TableHead className="text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?
         <TableRow><TableCell colSpan={4} className="py-12 text-center">Carregando...</TableCell></TableRow>:
         !filtered.length?
         <TableRow>
          <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
           <DollarSign className="mx-auto mb-2 h-8 w-8"/>
           Nenhum lançamento encontrado.
          </TableCell>
         </TableRow>:
         filtered.map(x=>
          <TableRow key={x.id} className="hover:bg-muted/40">
           <TableCell>{new Date(`${x.data}T00:00:00`).toLocaleDateString('pt-BR')}</TableCell>
           <TableCell className="font-medium">{x.tipo_movimento}</TableCell>
           <TableCell className="text-right font-bold" style={{color:CYAN}}>{BRL.format(Number(x.valor)||0)}</TableCell>
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
                <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                <AlertDialogDescription>Essa ação não poderá ser desfeita.</AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600">Excluir</AlertDialogAction>
               </AlertDialogFooter>
              </AlertDialogContent>
             </AlertDialog>
            </div>
           </TableCell>
          </TableRow>
         )
        }
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>
  </motion.div>
 )
}
