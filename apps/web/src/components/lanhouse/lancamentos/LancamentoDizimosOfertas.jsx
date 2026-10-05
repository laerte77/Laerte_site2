import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{Plus,Edit,Trash2,Coins,Search,Download,RefreshCw}from'lucide-react';
import{format,getMonth,getYear}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import*as XLSX from'xlsx';

const C='hsl(var(--neon-lanhouse))';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const moeda=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));

const cleanupChannel=channel=>{
 try{
  if(typeof supabase.removeChannel==='function'){
   const r=supabase.removeChannel(channel);
   if(r&&typeof r.catch==='function')r.catch(()=>{});
   return;
  }
  if(channel&&typeof channel.unsubscribe==='function'){
   const r=channel.unsubscribe();
   if(r&&typeof r.catch==='function')r.catch(()=>{});
  }
 }catch{}
};

export default function LancamentoDizimosOfertas(){
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);
 const[lancamentos,setLancamentos]=useState([]),[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState(''),[selectSearch,setSelectSearch]=useState('');
 const[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[formOpen,setFormOpen]=useState(false),[selectOpen,setSelectOpen]=useState(false),[exportOpen,setExportOpen]=useState(false);
 const[currentId,setCurrentId]=useState(null),[selectedItem,setSelectedItem]=useState(null);
 const[exportFilters,setExportFilters]=useState({month:new Date().getMonth(),year:new Date().getFullYear()});
 const[form,setForm]=useState({data:format(new Date(),'yyyy-MM-dd'),valor:'',tipo_movimento:''});
 const tipos=['DÍZIMO','OFERTA','VOTO'];

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const{data,error}=await supabase.from('lm_dizimos_ofertas').select('*').eq('user_id',user.id).order('data',{ascending:false});
   if(error)throw error;
   if(mounted.current)setLancamentos(data||[]);
  }catch(e){
   if(mounted.current)toast({title:'Erro ao buscar lançamentos',description:e.message,variant:'destructive'});
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>load(),[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('lm_dizimos_ofertas_changes_v4')
   .on('postgres_changes',{
    event:'*',
    schema:'public',
    table:'lm_dizimos_ofertas',
    filter:`user_id=eq.${user.id}`
   },load)
   .subscribe();
  return()=>cleanupChannel(ch);
 },[user,load]);

 const years=useMemo(()=>{
  const y=lancamentos.map(x=>new Date(x.data).getFullYear());
  y.push(new Date().getFullYear());
  return[...new Set(y)].sort((a,b)=>b-a);
 },[lancamentos]);

 const filtered=useMemo(()=>{
  let r=lancamentos;

  if(selectedYear!=='all')r=r.filter(x=>getYear(new Date(x.data)).toString()===selectedYear);
  if(selectedMonth!=='all')r=r.filter(x=>getMonth(new Date(x.data)).toString()===selectedMonth);

  if(searchTerm){
   const s=searchTerm.toLowerCase();
   r=r.filter(x=>String(x.tipo_movimento||'').toLowerCase().includes(s));
  }

  return r;
 },[lancamentos,selectedYear,selectedMonth,searchTerm]);

 const selectList=useMemo(()=>{
  const s=selectSearch.toLowerCase().trim();
  return lancamentos.filter(x=>!s||`${x.tipo_movimento||''}`.toLowerCase().includes(s));
 },[lancamentos,selectSearch]);

 const total=useMemo(()=>filtered.reduce((a,x)=>a+Number(x.valor||0),0),[filtered]);
 const totalDizimos=useMemo(()=>filtered.filter(x=>x.tipo_movimento==='DÍZIMO').reduce((a,x)=>a+Number(x.valor||0),0),[filtered]);
 const totalOfertas=useMemo(()=>filtered.filter(x=>x.tipo_movimento==='OFERTA').reduce((a,x)=>a+Number(x.valor||0),0),[filtered]);
 const totalVotos=useMemo(()=>filtered.filter(x=>x.tipo_movimento==='VOTO').reduce((a,x)=>a+Number(x.valor||0),0),[filtered]);

 const reset=()=>{
  setForm({
   data:format(new Date(),'yyyy-MM-dd'),
   valor:'',
   tipo_movimento:''
  });
  setCurrentId(null);
 };

 const openForm=item=>{
  if(item){
   setCurrentId(item.id);
   setForm({
    data:item.data||format(new Date(),'yyyy-MM-dd'),
    valor:item.valor??'',
    tipo_movimento:item.tipo_movimento||''
   });
  }else reset();

  setFormOpen(true);
 };

 const closeForm=()=>{
  setFormOpen(false);
  reset();
 };

 const save=async e=>{
  e.preventDefault();

  if(!form.data||!form.valor||!form.tipo_movimento){
   return toast({
    title:'Campos obrigatórios',
    description:'Preencha todos os campos.',
    variant:'destructive'
   });
  }

  const payload={
   data:form.data,
   valor:Number(form.valor),
   tipo_movimento:form.tipo_movimento,
   user_id:user.id
  };

  const q=currentId
   ?await supabase.from('lm_dizimos_ofertas').update(payload).eq('id',currentId).eq('user_id',user.id)
   :await supabase.from('lm_dizimos_ofertas').insert(payload);

  if(q.error){
   return toast({
    title:'Erro ao salvar',
    description:q.error.message,
    variant:'destructive'
   });
  }

  toast({
   title:'Sucesso',
   description:currentId?'Lançamento atualizado.':'Lançamento registrado.'
  });

  closeForm();
  load();
 };

 const remove=async id=>{
  const{error}=await supabase
   .from('lm_dizimos_ofertas')
   .delete()
   .eq('id',id)
   .eq('user_id',user.id);

  if(error){
   return toast({
    title:'Erro ao remover',
    description:error.message,
    variant:'destructive'
   });
  }

  toast({
   title:'Removido',
   description:'Lançamento removido.'
  });

  load();
 };

 const exportData=()=>{
  const rows=lancamentos.filter(x=>{
   const d=new Date(x.data);
   return d.getMonth()===exportFilters.month&&d.getFullYear()===exportFilters.year;
  });

  if(!rows.length){
   return toast({
    title:'Nenhum dado para exportar',
    description:'Não há registros para o período selecionado.',
    variant:'destructive'
   });
  }

  const sheet=XLSX.utils.json_to_sheet(
   rows.map(x=>({
    DATA:new Date(x.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}),
    TIPO:x.tipo_movimento,
    VALOR:Number(x.valor||0)
   }))
  );

  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,sheet,'Dízimos e Ofertas');
  XLSX.writeFile(
   wb,
   `Dizimos_Ofertas_LM_${meses[exportFilters.month]}_${exportFilters.year}.xlsx`
  );

  setExportOpen(false);
 };

 return(
  <div className="dark-lm-impressoes space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]">
      <Coins className="h-5 w-5" style={{color:C}}/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Lançamentos</p>
      <h1 className="text-2xl font-bold">Dízimos e Ofertas</h1>
      <p className="text-sm text-muted-foreground">Registre e gerencie as contribuições.</p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button>
     <Button variant="outline" onClick={()=>{setSelectSearch('');setSelectedItem(null);setSelectOpen(true)}}><Search className="mr-2 h-4 w-4"/>Selecionar</Button>
     <Button variant="outline" onClick={()=>setExportOpen(true)}><Download className="mr-2 h-4 w-4"/>Exportar</Button>
     <Button onClick={()=>openForm()} className="text-slate-950" style={{background:C}}><Plus className="mr-2 h-4 w-4"/>Novo Lançamento</Button>
    </div>
   </div>

   <Card>
    <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
     <div className="relative w-full lg:max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Pesquisar por tipo..." className="pl-9"/>
     </div>

     <div className="flex flex-wrap gap-2">
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
       <SelectTrigger className="w-[150px]"><SelectValue/></SelectTrigger>
       <SelectContent>
        <SelectItem value="all">Todos os meses</SelectItem>
        {meses.map((m,i)=><SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
       </SelectContent>
      </Select>

      <Select value={selectedYear} onValueChange={setSelectedYear}>
       <SelectTrigger className="w-[120px]"><SelectValue/></SelectTrigger>
       <SelectContent>
        <SelectItem value="all">Todos os anos</SelectItem>
        {years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
       </SelectContent>
      </Select>
     </div>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-4">
    {[
     ['Total',total],
     ['Dízimos',totalDizimos],
     ['Ofertas',totalOfertas],
     ['Votos',totalVotos]
    ].map(([label,value])=>
     <Card key={label}>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><p className="text-2xl font-bold" style={{color:C}}>{moeda(value)}</p></CardContent>
     </Card>
    )}
   </div>

   <Dialog open={selectOpen} onOpenChange={v=>{if(!v){setSelectOpen(false);setSelectedItem(null)}}}>
    <DialogContent className="dark-lm-impressoes bg-card text-foreground sm:max-w-2xl">
     <DialogHeader>
      <DialogTitle>Selecionar Lançamento</DialogTitle>
      <DialogDescription>Escolha um registro para editar.</DialogDescription>
     </DialogHeader>

     <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input value={selectSearch} onChange={e=>setSelectSearch(e.target.value)} placeholder="Pesquisar por tipo..." className="pl-9"/>
     </div>

     <ScrollArea className="h-[420px] rounded-lg border">
      <div className="space-y-2 p-4">
       {selectList.length===0?
        <p className="py-10 text-center text-muted-foreground">Nenhum registro encontrado.</p>:
        selectList.map(item=>
         <button
          type="button"
          key={item.id}
          onClick={()=>setSelectedItem(item)}
          className={`w-full rounded-lg border p-4 text-left ${selectedItem?.id===item.id?'border-[hsl(var(--neon-lanhouse))] bg-[hsl(var(--neon-lanhouse)/.08)]':'border-border bg-card hover:bg-muted/50'}`}
         >
          <div className="flex items-center justify-between gap-4">
           <div>
            <p className="font-semibold">{item.tipo_movimento}</p>
            <p className="text-sm text-muted-foreground">{new Date(item.data).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</p>
           </div>
           <p className="font-semibold" style={{color:C}}>{moeda(item.valor)}</p>
          </div>
         </button>
        )
       }
      </div>
     </ScrollArea>

     <DialogFooter>
      <Button variant="outline" onClick={()=>{setSelectOpen(false);setSelectedItem(null)}}>Cancelar</Button>
      <Button disabled={!selectedItem} onClick={()=>{openForm(selectedItem);setSelectOpen(false);setSelectedItem(null)}} className="text-slate-950" style={{background:C}}>Confirmar</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <Dialog open={exportOpen} onOpenChange={setExportOpen}>
    <DialogContent className="dark-lm-impressoes bg-card text-foreground">
     <DialogHeader>
      <DialogTitle>Exportar Dízimos e Ofertas</DialogTitle>
      <DialogDescription>Selecione o mês e o ano para exportar.</DialogDescription>
     </DialogHeader>

     <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label>Mês</Label>
       <Select value={String(exportFilters.month)} onValueChange={v=>setExportFilters(p=>({...p,month:Number(v)}))}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>{meses.map((m,i)=><SelectItem key={m} value={String(i)}>{m}</SelectItem>)}</SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label>Ano</Label>
       <Select value={String(exportFilters.year)} onValueChange={v=>setExportFilters(p=>({...p,year:Number(v)}))}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>{years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
       </Select>
      </div>
     </div>

     <DialogFooter>
      <Button variant="outline" onClick={()=>setExportOpen(false)}>Cancelar</Button>
      <Button onClick={exportData} className="text-slate-950" style={{background:C}}>
       <Download className="mr-2 h-4 w-4"/>Exportar
      </Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <Dialog open={formOpen} onOpenChange={v=>{if(!v)closeForm()}}>
    <DialogContent className="dark-lm-impressoes bg-card text-foreground sm:max-w-lg">
     <DialogHeader>
      <DialogTitle style={{color:C}}>{currentId?'Editar Lançamento':'Novo Lançamento'}</DialogTitle>
      <DialogDescription>Registre uma contribuição.</DialogDescription>
     </DialogHeader>

     <form onSubmit={save} className="space-y-5 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Data</Label>
        <Input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} required/>
       </div>

       <div className="space-y-2">
        <Label>Valor (R$)</Label>
        <Input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} placeholder="0,00" required/>
       </div>
      </div>

      <div className="space-y-2">
       <Label>Tipo de Movimento</Label>
       <Select value={form.tipo_movimento} onValueChange={v=>setForm({...form,tipo_movimento:v})}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent>{tipos.map(t=><SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
       </Select>
      </div>

      <DialogFooter>
       <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
       <Button type="submit" className="text-slate-950" style={{background:C}}>Salvar</Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

   <Card className="overflow-hidden">
    <CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:C}}>Lançamentos</CardTitle></CardHeader>
    <CardContent className="p-0">
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur">
        <TableRow>
         <TableHead>Data</TableHead>
         <TableHead>Tipo</TableHead>
         <TableHead className="text-right">Valor</TableHead>
         <TableHead className="text-right">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?
         <TableRow><TableCell colSpan={4} className="py-12 text-center text-muted-foreground">Carregando...</TableCell></TableRow>:
         filtered.length===0?
         <TableRow>
          <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
           <Coins className="mx-auto mb-2 h-10 w-10 opacity-40"/>
           Nenhum lançamento encontrado.
          </TableCell>
         </TableRow>:
         filtered.map(item=>
          <TableRow key={item.id} className="hover:bg-[hsl(var(--neon-lanhouse)/.04)]">
           <TableCell>{new Date(item.data).toLocaleDateString('pt-BR',{timeZone:'UTC'})}</TableCell>
           <TableCell><span className="font-semibold">{item.tipo_movimento}</span></TableCell>
           <TableCell className="text-right font-semibold" style={{color:C}}>{moeda(item.valor)}</TableCell>
           <TableCell className="text-right">
            <div className="flex justify-end gap-1">
             <Button variant="ghost" size="icon" onClick={()=>openForm(item)} style={{color:C}}><Edit className="h-4 w-4"/></Button>

             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button variant="ghost" size="icon" className="text-red-400"><Trash2 className="h-4 w-4"/></Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
               <AlertDialogHeader>
                <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
                <AlertDialogDescription>Deseja realmente excluir este registro?</AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={()=>remove(item.id)} className="bg-red-600">Excluir</AlertDialogAction>
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

  </div>
 );
}
