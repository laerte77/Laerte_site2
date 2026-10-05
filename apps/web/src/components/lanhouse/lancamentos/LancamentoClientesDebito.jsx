import React,{useState,useEffect,useCallback,useMemo}from'react';
import{Plus,Edit,Trash2,UserX,Search,RefreshCw,CreditCard}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const C='hsl(var(--neon-lanhouse))';
const moeda=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const hoje=()=>new Date().toISOString().split('T')[0];

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

export default function LancamentoClientesDebito(){
 const{user}=useAuth(),{toast}=useToast();
 const[debitos,setDebitos]=useState([]),[clientes,setClientes]=useState([]),[servicos,setServicos]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[selectSearch,setSelectSearch]=useState(''),[statusFilter,setStatusFilter]=useState('all');
 const[formOpen,setFormOpen]=useState(false),[selectOpen,setSelectOpen]=useState(false),[editId,setEditId]=useState(null),[selectedItem,setSelectedItem]=useState(null);
 const[form,setForm]=useState({data:hoje(),cliente:'',servico:'',valor:'',status:'DEVENDO'});

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b,c]=await Promise.all([
    supabase.from('lm_clientes_debito').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_clientes').select('nome').eq('user_id',user.id).order('nome'),
    supabase.from('lm_servicos').select('servico').eq('user_id',user.id).order('servico')
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   if(c.error)throw c.error;
   setDebitos(a.data||[]);
   setClientes(b.data||[]);
   setServicos(c.data||[]);
  }catch(e){
   toast({title:'Erro ao carregar débitos',description:e.message,variant:'destructive'});
  }finally{
   setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>load(),[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('lm_clientes_debito_changes_v2').on('postgres_changes',{
   event:'*',
   schema:'public',
   table:'lm_clientes_debito',
   filter:`user_id=eq.${user.id}`
  },load).subscribe();
  return()=>cleanupChannel(ch);
 },[user,load]);

 const reset=()=>{
  setForm({data:hoje(),cliente:'',servico:'',valor:'',status:'DEVENDO'});
  setEditId(null);
 };

 const openForm=item=>{
  if(item){
   setEditId(item.id);
   setForm({
    data:item.data||hoje(),
    cliente:item.cliente||'',
    servico:item.servico||'',
    valor:item.valor??'',
    status:item.status||'DEVENDO'
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

  if(!form.data||!form.cliente||!form.servico||!form.valor){
   return toast({
    title:'Campos obrigatórios',
    description:'Preencha data, cliente, serviço e valor.',
    variant:'destructive'
   });
  }

  const payload={...form,user_id:user.id,valor:Number(form.valor)};

  const q=editId
   ?await supabase.from('lm_clientes_debito').update(payload).eq('id',editId).eq('user_id',user.id)
   :await supabase.from('lm_clientes_debito').insert(payload);

  if(q.error){
   return toast({
    title:'Erro ao salvar',
    description:q.error.message,
    variant:'destructive'
   });
  }

  toast({
   title:'Sucesso',
   description:editId?'Débito atualizado.':'Débito registrado.'
  });

  closeForm();
  load();
 };

 const remove=async id=>{
  const{error}=await supabase.from('lm_clientes_debito').delete().eq('id',id).eq('user_id',user.id);

  if(error){
   return toast({
    title:'Erro ao excluir',
    description:error.message,
    variant:'destructive'
   });
  }

  toast({title:'Débito excluído'});
  load();
 };

 const list=useMemo(()=>{
  const s=search.toLowerCase().trim();

  return debitos.filter(x=>{
   const text=`${x.cliente||''} ${x.servico||''}`.toLowerCase();
   return(!s||text.includes(s))&&(statusFilter==='all'||x.status===statusFilter);
  });
 },[debitos,search,statusFilter]);

 const selectList=useMemo(()=>{
  const s=selectSearch.toLowerCase().trim();

  return debitos.filter(x=>{
   const text=`${x.cliente||''} ${x.servico||''} ${x.status||''}`.toLowerCase();
   return!s||text.includes(s);
  });
 },[debitos,selectSearch]);

 const total=useMemo(()=>list.reduce((a,x)=>a+Number(x.valor||0),0),[list]);
 const devendo=useMemo(()=>list.filter(x=>x.status==='DEVENDO').length,[list]);
 const pago=useMemo(()=>list.filter(x=>x.status==='PAGO').length,[list]);
 const valorDevendo=useMemo(()=>list.filter(x=>x.status==='DEVENDO').reduce((a,x)=>a+Number(x.valor||0),0),[list]);

 const badge=s=>s==='PAGO'
  ?<Badge className="border border-green-500/20 bg-green-500/15 text-green-400">Pago</Badge>
  :s==='PARCIAL'
   ?<Badge className="border border-yellow-500/20 bg-yellow-500/15 text-yellow-400">Parcial</Badge>
   :<Badge className="border border-red-500/20 bg-red-500/15 text-red-400">Devendo</Badge>;

 return(
  <div className="dark-lm-impressoes space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]">
      <UserX className="h-5 w-5" style={{color:C}}/>
     </div>
     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Lançamentos</p>
      <h1 className="text-2xl font-bold">Clientes com Débito</h1>
      <p className="text-sm text-muted-foreground">Controle dos valores pendentes dos clientes.</p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button>
     <Button variant="outline" onClick={()=>{setSelectSearch('');setSelectedItem(null);setSelectOpen(true)}}><Search className="mr-2 h-4 w-4"/>Selecionar</Button>
     <Button onClick={()=>openForm()} className="text-slate-950" style={{background:C}}><Plus className="mr-2 h-4 w-4"/>Novo Débito</Button>
    </div>
   </div>

   <Card>
    <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
     <div className="relative w-full lg:max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar cliente ou serviço..." className="pl-9"/>
     </div>

     <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-full lg:w-[160px]"><SelectValue/></SelectTrigger>
      <SelectContent>
       <SelectItem value="all">Todos</SelectItem>
       <SelectItem value="DEVENDO">Devendo</SelectItem>
       <SelectItem value="PARCIAL">Parcial</SelectItem>
       <SelectItem value="PAGO">Pago</SelectItem>
      </SelectContent>
     </Select>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-4">
    {[
     ['Valor filtrado',moeda(total)],
     ['Devendo',devendo],
     ['Pagos',pago],
     ['Valor pendente',moeda(valorDevendo)]
    ].map(([t,v],i)=>
     <Card key={t}>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t}</CardTitle></CardHeader>
      <CardContent>
       <p className="text-2xl font-bold" style={i===0?{color:C}:i===3?{color:'hsl(var(--destructive))'}:undefined}>{v}</p>
      </CardContent>
     </Card>
    )}
   </div>

   <Dialog open={selectOpen} onOpenChange={v=>{if(!v){setSelectOpen(false);setSelectedItem(null)}}}>
    <DialogContent className="dark-lm-impressoes bg-card text-foreground sm:max-w-2xl">
     <DialogHeader>
      <DialogTitle>Selecionar Débito</DialogTitle>
      <DialogDescription>Escolha um registro para editar.</DialogDescription>
     </DialogHeader>

     <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input value={selectSearch} onChange={e=>setSelectSearch(e.target.value)} placeholder="Pesquisar cliente, serviço ou status..." className="pl-9"/>
     </div>

     <div className="max-h-[55vh] overflow-y-auto rounded-lg border">
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
            <p className="font-semibold">{item.cliente}</p>
            <p className="text-sm text-muted-foreground">
             {item.servico} • {item.data?new Date(item.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—'}
            </p>
           </div>

           <div className="text-right">
            <p className="font-semibold" style={{color:C}}>{moeda(item.valor)}</p>
            <div className="mt-1">{badge(item.status)}</div>
           </div>
          </div>
         </button>
        )
       }
      </div>
     </div>

     <DialogFooter>
      <Button variant="outline" onClick={()=>{setSelectOpen(false);setSelectedItem(null)}}>Cancelar</Button>
      <Button disabled={!selectedItem} onClick={()=>{openForm(selectedItem);setSelectOpen(false);setSelectedItem(null)}} className="text-slate-950" style={{background:C}}>Confirmar</Button>
     </DialogFooter>
    </DialogContent>
   </Dialog>

   <Dialog open={formOpen} onOpenChange={v=>{if(!v)closeForm()}}>
    <DialogContent className="dark-lm-impressoes bg-card text-foreground sm:max-w-lg">
     <DialogHeader>
      <DialogTitle style={{color:C}}>{editId?'Editar Débito':'Novo Débito'}</DialogTitle>
      <DialogDescription>Registre um valor pendente de cliente.</DialogDescription>
     </DialogHeader>

     <form onSubmit={save} className="space-y-5 py-2">
      <div className="grid gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Data</Label>
        <Input type="date" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} required/>
       </div>

       <div className="space-y-2">
        <Label>Valor</Label>
        <Input type="number" step="0.01" min="0" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} required/>
       </div>
      </div>

      <div className="space-y-2">
       <Label>Cliente</Label>
       <Select value={form.cliente} onValueChange={v=>setForm({...form,cliente:v})}>
        <SelectTrigger><SelectValue placeholder="Selecione o cliente"/></SelectTrigger>
        <SelectContent>
         {clientes.map(x=><SelectItem key={x.nome} value={x.nome}>{x.nome}</SelectItem>)}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label>Serviço</Label>
       <Select value={form.servico} onValueChange={v=>setForm({...form,servico:v})}>
        <SelectTrigger><SelectValue placeholder="Selecione o serviço"/></SelectTrigger>
        <SelectContent>
         {servicos.map(x=><SelectItem key={x.servico} value={x.servico}>{x.servico}</SelectItem>)}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label>Status</Label>
       <Select value={form.status} onValueChange={v=>setForm({...form,status:v})}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>
         <SelectItem value="DEVENDO">Devendo</SelectItem>
         <SelectItem value="PARCIAL">Parcial</SelectItem>
         <SelectItem value="PAGO">Pago</SelectItem>
        </SelectContent>
       </Select>
      </div>

      <DialogFooter>
       <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
       <Button type="submit" className="text-slate-950" style={{background:C}}>
        <CreditCard className="mr-2 h-4 w-4"/>Salvar
       </Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

   <Card className="overflow-hidden">
    <CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:C}}>Débitos cadastrados</CardTitle></CardHeader>
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full">
       <thead>
        <tr className="border-b bg-muted/30">
         <th className="p-4 text-left text-sm text-muted-foreground">Data</th>
         <th className="p-4 text-left text-sm text-muted-foreground">Cliente</th>
         <th className="p-4 text-left text-sm text-muted-foreground">Serviço</th>
         <th className="p-4 text-left text-sm text-muted-foreground">Status</th>
         <th className="p-4 text-right text-sm text-muted-foreground">Valor</th>
         <th className="p-4 text-right text-sm text-muted-foreground">Ações</th>
        </tr>
       </thead>

       <tbody>
        {loading?
         <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>:
         !list.length?
         <tr>
          <td colSpan={6} className="p-10 text-center text-muted-foreground">
           <UserX className="mx-auto mb-2 h-10 w-10 opacity-40"/>
           {debitos.length?'Nenhum resultado.':'Nenhum débito cadastrado.'}
          </td>
         </tr>:
         list.map(item=>
          <tr key={item.id} className="border-b last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]">
           <td className="p-4">{item.data?new Date(item.data).toLocaleDateString('pt-BR',{timeZone:'UTC'}):'—'}</td>
           <td className="p-4 font-medium">{item.cliente}</td>
           <td className="p-4">{item.servico}</td>
           <td className="p-4">{badge(item.status)}</td>
           <td className="p-4 text-right font-semibold" style={{color:C}}>{moeda(item.valor)}</td>
           <td className="p-4 text-right">
            <Button variant="ghost" size="icon" onClick={()=>openForm(item)} style={{color:C}}><Edit className="h-4 w-4"/></Button>

            <AlertDialog>
             <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-red-400"><Trash2 className="h-4 w-4"/></Button>
             </AlertDialogTrigger>

             <AlertDialogContent>
              <AlertDialogHeader>
               <AlertDialogTitle>Excluir débito?</AlertDialogTitle>
               <AlertDialogDescription>Deseja realmente excluir este lançamento?</AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
               <AlertDialogCancel>Cancelar</AlertDialogCancel>
               <AlertDialogAction onClick={()=>remove(item.id)} className="bg-red-600">Excluir</AlertDialogAction>
              </AlertDialogFooter>
             </AlertDialogContent>
            </AlertDialog>
           </td>
          </tr>
         )
        }
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>

  </div>
 );
}
