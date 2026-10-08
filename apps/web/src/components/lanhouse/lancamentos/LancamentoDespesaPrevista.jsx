import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,Search,RotateCcw,CalendarClock,FileText,DollarSign,WalletCards,Loader2}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const C='hsl(var(--neon-lanhouse))';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

const moneyInput=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?(Number(d)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'';
};

const moneyValue=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const today=()=>new Date().toISOString().slice(0,10);
const dateBR=v=>v?new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR'):'—';

const initial=()=>({
 descricao:'',
 data_vencimento:'',
 valor:'',
 categoria:'OUTROS',
 forma_pagamento:'PIX',
 parcelas:1,
 status:'PENDENTE'
});

const Stat=({icon:Icon,label,value})=>(
 <Card>
  <CardContent className="flex items-center justify-between p-4">
   <div>
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 text-xl font-bold" style={{color:C}}>{value}</p>
   </div>
   <Icon className="h-5 w-5" style={{color:C}}/>
  </CardContent>
 </Card>
);

export default function LancamentoDespesaPrevista(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[tipos,setTipos]=useState([]),[loading,setLoading]=useState(true);
 const[search,setSearch]=useState(''),[open,setOpen]=useState(false),[editing,setEditing]=useState(null),[deleteItem,setDeleteItem]=useState(null);
 const[form,setForm]=useState(initial());

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('lm_despesas_previstas').select('*').eq('user_id',user.id).order('data_vencimento',{ascending:true}),
    supabase.from('lm_despesas').select('id,despesa,categoria').eq('user_id',user.id).order('despesa',{ascending:true})
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   setData(a.data||[]);
   setTipos(b.data||[]);
  }catch(e){
   toast({title:'Erro ao carregar',description:e.message||'Não foi possível carregar as despesas previstas.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel('lm_despesas_previstas_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_despesas_previstas',filter:`user_id=eq.${user.id}`},load)
   .subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const filtered=useMemo(()=>{
  const q=search.trim().toLowerCase();
  if(!q)return data;
  return data.filter(x=>
   String(x.descricao||'').toLowerCase().includes(q)||
   String(x.categoria||'').toLowerCase().includes(q)||
   String(x.forma_pagamento||'').toLowerCase().includes(q)||
   String(x.status||'').toLowerCase().includes(q)
  );
 },[data,search]);

 const total=filtered.reduce((s,x)=>s+Number(x.valor||0),0);
 const pendentes=filtered.filter(x=>String(x.status||'').toUpperCase()!=='PAGO').length;
 const pagos=filtered.filter(x=>String(x.status||'').toUpperCase()==='PAGO').length;

 const openForm=item=>{
  if(item){
   setEditing(item);
   setForm({
    descricao:item.descricao||'',
    data_vencimento:String(item.data_vencimento||'').slice(0,10),
    valor:moneyInput(item.valor),
    categoria:item.categoria||'OUTROS',
    forma_pagamento:item.forma_pagamento||'PIX',
    parcelas:item.parcelas||1,
    status:item.status||'PENDENTE'
   });
  }else{
   setEditing(null);
   setForm(initial());
  }
  setOpen(true);
 };

 const close=()=>{
  setOpen(false);
  setEditing(null);
  setForm(initial());
 };

 const save=async()=>{
  const valor=moneyValue(form.valor);

  if(!form.descricao||!form.data_vencimento||valor<=0){
   toast({title:'Campos obrigatórios',description:'Preencha descrição, vencimento e valor.',variant:'destructive'});
   return;
  }

  const payload={
   user_id:user.id,
   descricao:form.descricao,
   data_vencimento:form.data_vencimento,
   valor,
   categoria:form.categoria||'OUTROS',
   forma_pagamento:form.forma_pagamento,
   parcelas:form.forma_pagamento==='CARTÃO DE CRÉDITO'?Number(form.parcelas)||1:null,
   status:form.status||'PENDENTE'
  };

  try{
   const q=editing
    ?supabase.from('lm_despesas_previstas').update(payload).eq('id',editing.id).eq('user_id',user.id)
    :supabase.from('lm_despesas_previstas').insert(payload);

   const{error}=await q;
   if(error)throw error;

   toast({
    title:'Sucesso',
    description:editing?'Despesa prevista atualizada.':'Despesa prevista cadastrada.'
   });

   close();
   load();
  }catch(e){
   toast({title:'Erro ao salvar',description:e.message||'Não foi possível salvar.',variant:'destructive'});
  }
 };

 const remove=async()=>{
  if(!deleteItem)return;

  try{
   const{error}=await supabase
    .from('lm_despesas_previstas')
    .delete()
    .eq('id',deleteItem.id)
    .eq('user_id',user.id);

   if(error)throw error;

   toast({title:'Removido',description:'Despesa prevista excluída.'});
   setDeleteItem(null);
   load();
  }catch(e){
   toast({title:'Erro ao excluir',description:e.message||'Não foi possível excluir.',variant:'destructive'});
  }
 };

 const toggleStatus=async item=>{
  const novo=String(item.status||'').toUpperCase()==='PAGO'?'PENDENTE':'PAGO';

  try{
   const{error}=await supabase
    .from('lm_despesas_previstas')
    .update({status:novo})
    .eq('id',item.id)
    .eq('user_id',user.id);

   if(error)throw error;
   load();
  }catch(e){
   toast({title:'Erro',description:e.message||'Não foi possível atualizar o status.',variant:'destructive'});
  }
 };

 const clear=()=>setSearch('');

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">

   {/* CABEÇALHO */}
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:C}}>LM Impressões</p>
     <h1 className="mt-1 text-2xl font-bold">Despesas Previstas</h1>
     <p className="text-sm text-muted-foreground">Gerencie contas a pagar.</p>
    </div>

    <Button onClick={()=>openForm()} className="text-slate-950" style={{background:C}}>
     <Plus className="mr-2 h-4 w-4"/>
     Nova Despesa
    </Button>
   </div>

   {/* INDICADORES */}
   <div className="grid gap-3 sm:grid-cols-3">
    <Stat icon={FileText} label="Registros" value={filtered.length}/>
    <Stat icon={DollarSign} label="Total" value={BRL.format(total)}/>
    <Stat icon={WalletCards} label="Pendentes" value={pendentes}/>
   </div>

   {/* BUSCA */}
   <Card>
    <CardContent className="p-4">
     <div className="flex gap-2">
      <div className="relative flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input
        value={search}
        onChange={e=>setSearch(e.target.value)}
        placeholder="Buscar despesa ou categoria..."
        className="h-11 pl-9"
       />
      </div>

      <Button variant="outline" onClick={clear} className="h-11">
       <RotateCcw className="mr-2 h-4 w-4"/>
       Limpar
      </Button>
     </div>
    </CardContent>
   </Card>

   {/* TABELA / BANCO DE DADOS */}
   <Card className="overflow-hidden">
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader className="bg-secondary/70">
        <TableRow>
         <TableHead>Descrição</TableHead>
         <TableHead>Vencimento</TableHead>
         <TableHead>Categoria</TableHead>
         <TableHead>Pagamento</TableHead>
         <TableHead>Status</TableHead>
         <TableHead className="text-right">Valor</TableHead>
         <TableHead className="text-right">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?
         <TableRow>
          <TableCell colSpan={7} className="py-12 text-center">
           <Loader2 className="mx-auto h-6 w-6 animate-spin" style={{color:C}}/>
          </TableCell>
         </TableRow>
        :
        !filtered.length?
         <TableRow>
          <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
           Nenhuma despesa prevista encontrada.
          </TableCell>
         </TableRow>
        :
        filtered.map(x=>{
         const pago=String(x.status||'').toUpperCase()==='PAGO';

         return(
          <TableRow key={x.id} className="hover:bg-muted/40">

           <TableCell className="font-semibold">
            {x.descricao||'—'}
           </TableCell>

           <TableCell className="font-medium">
            {dateBR(x.data_vencimento)}
           </TableCell>

           <TableCell>
            <Badge variant="outline">
             {x.categoria||'OUTROS'}
            </Badge>
           </TableCell>

           <TableCell>
            {x.forma_pagamento||'—'}
           </TableCell>

           <TableCell>
            <Badge
             variant="outline"
             className={pago
              ?'border-green-500/30 bg-green-500/10 text-green-400'
              :'border-border bg-transparent text-foreground'
             }
             onClick={()=>toggleStatus(x)}
            >
             {pago?'Pago':'Pendente'}
            </Badge>
           </TableCell>

           <TableCell className="text-right font-bold" style={{color:C}}>
            {BRL.format(Number(x.valor)||0)}
           </TableCell>

           <TableCell>
            <div className="flex justify-end gap-1">

             <Button
              variant="ghost"
              size="icon"
              onClick={()=>openForm(x)}
              title="Editar"
              style={{color:C}}
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <Button
              variant="ghost"
              size="icon"
              onClick={()=>setDeleteItem(x)}
              title="Excluir"
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
             >
              <Trash2 className="h-4 w-4"/>
             </Button>

            </div>
           </TableCell>

          </TableRow>
         );
        })}
       </TableBody>
      </Table>
     </div>

     {!loading&&filtered.length>0&&(
      <div className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
       {filtered.length} registro(s) • {pagos} pago(s) • {pendentes} pendente(s)
      </div>
     )}
    </CardContent>
   </Card>

   {/* MODAL DE LANÇAMENTO */}
   <Dialog open={open} onOpenChange={v=>v?setOpen(true):close()}>
    <DialogContent className="max-h-[90vh] overflow-y-auto bg-card border-border sm:max-w-[620px]">

     <DialogHeader>
      <DialogTitle style={{color:C}}>
       {editing?'Editar Despesa Prevista':'Nova Despesa Prevista'}
      </DialogTitle>
     </DialogHeader>

     <div className="space-y-5 py-2">

      <div className="space-y-2">
       <Label>Descrição</Label>

       <Select
        value={form.descricao}
        onValueChange={v=>{
         const t=tipos.find(x=>x.despesa===v);
         setForm(p=>({
          ...p,
          descricao:v,
          categoria:t?.categoria||p.categoria||'OUTROS'
         }));
        }}
       >
        <SelectTrigger>
         <SelectValue placeholder="Selecione a despesa"/>
        </SelectTrigger>

        <SelectContent>
         {tipos.map(x=>
          <SelectItem key={x.id} value={x.despesa}>
           {x.despesa}
          </SelectItem>
         )}
        </SelectContent>
       </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">

       <div className="space-y-2">
        <Label>Vencimento</Label>
        <Input
         type="date"
         value={form.data_vencimento}
         onChange={e=>setForm(p=>({...p,data_vencimento:e.target.value}))}
        />
       </div>

       <div className="space-y-2">
        <Label>Valor</Label>
        <Input
         type="text"
         inputMode="numeric"
         placeholder="R$ 0,00"
         value={form.valor}
         onChange={e=>setForm(p=>({...p,valor:moneyInput(e.target.value)}))}
        />
       </div>

      </div>

      <div className="space-y-2">
       <Label>Categoria</Label>
       <Input
        value={form.categoria}
        onChange={e=>setForm(p=>({...p,categoria:e.target.value.toUpperCase()}))}
        placeholder="OUTROS"
       />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">

       <div className="space-y-2">
        <Label>Pagamento</Label>

        <Select
         value={form.forma_pagamento}
         onValueChange={v=>setForm(p=>({...p,forma_pagamento:v}))}
        >
         <SelectTrigger>
          <SelectValue/>
         </SelectTrigger>

         <SelectContent>
          <SelectItem value="PIX">PIX</SelectItem>
          <SelectItem value="DINHEIRO">DINHEIRO</SelectItem>
          <SelectItem value="CARTÃO DE CRÉDITO">CARTÃO DE CRÉDITO</SelectItem>
          <SelectItem value="BOLETO">BOLETO</SelectItem>
         </SelectContent>
        </Select>
       </div>

       <div className="space-y-2">
        <Label>Parcelas</Label>
        <Input
         type="number"
         min="1"
         value={form.parcelas}
         disabled={form.forma_pagamento!=='CARTÃO DE CRÉDITO'}
         onChange={e=>setForm(p=>({...p,parcelas:Number(e.target.value)||1}))}
        />
       </div>

      </div>

      <div className="space-y-2">
       <Label>Status</Label>

       <Select
        value={form.status}
        onValueChange={v=>setForm(p=>({...p,status:v}))}
       >
        <SelectTrigger>
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="PENDENTE">PENDENTE</SelectItem>
         <SelectItem value="PAGO">PAGO</SelectItem>
        </SelectContent>
       </Select>
      </div>

     </div>

     <DialogFooter>
      <Button variant="outline" onClick={close}>
       Cancelar
      </Button>

      <Button
       onClick={save}
       className="text-slate-950"
       style={{background:C}}
      >
       {editing?'Salvar Alterações':'Salvar Despesa'}
      </Button>
     </DialogFooter>

    </DialogContent>
   </Dialog>

   {/* EXCLUSÃO */}
   <AlertDialog
    open={!!deleteItem}
    onOpenChange={v=>{if(!v)setDeleteItem(null)}}
   >
    <AlertDialogContent className="bg-card border-border">
     <AlertDialogHeader>
      <AlertDialogTitle>Excluir despesa prevista?</AlertDialogTitle>
      <AlertDialogDescription>
       Esta ação removerá o registro do banco de dados. A consulta e o relatório deixarão de considerar este lançamento.
      </AlertDialogDescription>
     </AlertDialogHeader>

     <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
       onClick={remove}
       className="bg-red-600 text-white hover:bg-red-700"
      >
       Excluir
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>

  </motion.div>
 );
}
