import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{Search,Edit,Trash2,Package,Plus,AlertCircle}from'lucide-react';
import{format,parse}from'date-fns';
import{ptBR}from'date-fns/locale';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{useToast}from'@/components/ui/use-toast';
import{Badge}from'@/components/ui/badge';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{Checkbox}from'@/components/ui/checkbox';

const C='hsl(var(--neon-lanhouse))';

export default function ConsultaPedidos(){
 const{user}=useAuth(),{toast}=useToast(),isMountedRef=useRef(true);
 const[loading,setLoading]=useState(true),[pedidos,setPedidos]=useState([]),[searchTerm,setSearchTerm]=useState(''),[statusFilter,setStatusFilter]=useState('all');
 const[clientes,setClientes]=useState([]),[servicos,setServicos]=useState([]);
 const[isEditModalOpen,setIsEditModalOpen]=useState(false),[editingPedido,setEditingPedido]=useState(null);
 const[formData,setFormData]=useState({
  data_pedido:'',
  cliente_id:'',
  data_entrega:'',
  sem_data_prevista:false,
  status:'Pendente'
 });
 const[items,setItems]=useState([{servico_id:'',quantidade:1}]);

 useEffect(()=>{
  isMountedRef.current=true;
  return()=>{isMountedRef.current=false};
 },[]);

 const fetchPedidos=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const{data,error}=await supabase
    .from('lm_pedidos')
    .select('*,lm_clientes(nome),lm_pedido_itens(*,lm_servicos(servico,valor))')
    .eq('user_id',user.id)
    .order('data_pedido',{ascending:false});

   if(!isMountedRef.current)return;
   if(error)throw error;
   setPedidos(data||[]);
  }catch(error){
   if(!isMountedRef.current)return;
   console.error('Erro ao buscar pedidos:',error);
   toast({title:'Erro',description:'Não foi possível carregar os pedidos.',variant:'destructive'});
  }finally{
   if(isMountedRef.current)setLoading(false);
  }
 },[user,toast]);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  try{
   const[clientesRes,servicosRes]=await Promise.all([
    supabase.from('lm_clientes').select('id,nome').eq('user_id',user.id).order('nome',{ascending:true}),
    supabase.from('lm_servicos').select('id,servico,valor').eq('user_id',user.id).order('servico',{ascending:true})
   ]);

   if(!isMountedRef.current)return;
   if(clientesRes.error)throw clientesRes.error;
   if(servicosRes.error)throw servicosRes.error;

   setClientes(clientesRes.data||[]);
   setServicos(servicosRes.data||[]);
  }catch(error){
   console.error('Erro ao buscar dados:',error);
  }
 },[user]);

 useEffect(()=>{
  fetchPedidos();
  fetchData();
 },[fetchPedidos,fetchData]);

 const filteredPedidos=useMemo(()=>{
  return pedidos.filter(pedido=>{
   const statusMatch=statusFilter==='all'||pedido.status===statusFilter;
   if(!searchTerm)return statusMatch;

   const search=searchTerm.toLowerCase();
   const clienteMatch=pedido.lm_clientes?.nome?.toLowerCase().includes(search);
   const servicosMatch=pedido.lm_pedido_itens?.some(item=>item.lm_servicos?.servico?.toLowerCase().includes(search));

   return statusMatch&&(clienteMatch||servicosMatch);
  });
 },[pedidos,searchTerm,statusFilter]);

 const handleEdit=pedido=>{
  setEditingPedido(pedido);
  setFormData({
   data_pedido:pedido.data_pedido,
   cliente_id:pedido.cliente_id,
   data_entrega:pedido.data_entrega||'',
   sem_data_prevista:!pedido.data_entrega,
   status:pedido.status
  });
  setItems(
   pedido.lm_pedido_itens?.map(item=>({
    servico_id:item.servico_id,
    quantidade:item.quantidade
   }))||[{servico_id:'',quantidade:1}]
  );
  setIsEditModalOpen(true);
 };

 const handleAddItem=()=>setItems(prev=>[...prev,{servico_id:'',quantidade:1}]);

 const handleRemoveItem=index=>{
  if(items.length===1){
   toast({
    title:'Atenção',
    description:'É necessário pelo menos um item no pedido.',
    variant:'destructive'
   });
   return;
  }
  setItems(prev=>prev.filter((_,i)=>i!==index));
 };

 const handleItemChange=(index,field,value)=>{
  setItems(prev=>{
   const next=[...prev];
   next[index]={...next[index],[field]:value};
   return next;
  });
 };

 const handleUpdate=async e=>{
  e.preventDefault();

  if(!formData.cliente_id){
   toast({title:'Campo obrigatório',description:'Selecione um cliente.',variant:'destructive'});
   return;
  }

  const validItems=items.filter(item=>item.servico_id&&item.quantidade>0);

  if(!validItems.length){
   toast({
    title:'Itens obrigatórios',
    description:'Adicione pelo menos um item ao pedido.',
    variant:'destructive'
   });
   return;
  }

  try{
   const pedidoPayload={
    data_pedido:formData.data_pedido,
    cliente_id:formData.cliente_id,
    data_entrega:formData.sem_data_prevista?null:(formData.data_entrega||null),
    status:formData.status
   };

   const{error:pedidoError}=await supabase
    .from('lm_pedidos')
    .update(pedidoPayload)
    .eq('id',editingPedido.id);

   if(pedidoError)throw pedidoError;

   const{error:deleteError}=await supabase
    .from('lm_pedido_itens')
    .delete()
    .eq('pedido_id',editingPedido.id);

   if(deleteError)throw deleteError;

   const itemsPayload=validItems.map(item=>({
    pedido_id:editingPedido.id,
    servico_id:item.servico_id,
    quantidade:parseInt(item.quantidade)
   }));

   const{error:itemsError}=await supabase
    .from('lm_pedido_itens')
    .insert(itemsPayload);

   if(itemsError)throw itemsError;

   toast({title:'Sucesso',description:'Pedido atualizado com sucesso!'});
   setIsEditModalOpen(false);
   setEditingPedido(null);
   fetchPedidos();
  }catch(error){
   console.error('Erro ao atualizar pedido:',error);
   toast({title:'Erro',description:'Falha ao atualizar pedido.',variant:'destructive'});
  }
 };

 const handleDelete=async id=>{
  try{
   const{error}=await supabase.from('lm_pedidos').delete().eq('id',id);
   if(error)throw error;

   toast({title:'Sucesso',description:'Pedido removido.'});
   fetchPedidos();
  }catch(error){
   console.error('Erro ao deletar:',error);
   toast({title:'Erro',description:'Falha ao remover pedido.',variant:'destructive'});
  }
 };

 const formatDate=dateString=>{
  if(!dateString)return'Sem Data Prevista';
  try{
   return format(parse(dateString,'yyyy-MM-dd',new Date()),'dd/MM/yyyy',{locale:ptBR});
  }catch{
   return dateString;
  }
 };

 const getStatusBadge=status=>{
  const colors={
   Pendente:'border-yellow-500/20 bg-yellow-500/10 text-yellow-500',
   Entregue:'border-green-500/20 bg-green-500/10 text-green-500',
   Atrasado:'border-red-500/20 bg-red-500/10 text-red-500'
  };
  return <Badge variant="outline" className={colors[status]||''}>{status}</Badge>;
 };

 const getTotalQuantidade=itens=>itens?.reduce((acc,item)=>acc+(item.quantidade||0),0)||0;

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-lm-impressoes space-y-4"
  >

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]">
       <Package className="h-5 w-5" style={{color:C}}/>
      </div>
      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Pedidos</p>
       <h1 className="text-2xl font-bold">Consulta de Pedidos</h1>
       <p className="text-sm text-muted-foreground">Gerencie e acompanhe os pedidos.</p>
      </div>
     </div>
    </div>
   </div>

   <Card>
    <CardContent className="flex flex-col items-center gap-4 p-4 md:flex-row">
     <div className="relative flex w-full flex-1 items-center">
      <Search className="absolute left-3 h-4 w-4 text-muted-foreground"/>
      <Input
       placeholder="Buscar por cliente ou serviço..."
       value={searchTerm}
       onChange={e=>setSearchTerm(e.target.value)}
       className="pl-9"
      />
     </div>

     <div className="w-full md:w-[200px]">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
       <SelectTrigger><SelectValue/></SelectTrigger>
       <SelectContent>
        <SelectItem value="all">Todos os Status</SelectItem>
        <SelectItem value="Pendente">Pendente</SelectItem>
        <SelectItem value="Entregue">Entregue</SelectItem>
        <SelectItem value="Atrasado">Atrasado</SelectItem>
       </SelectContent>
      </Select>
     </div>
    </CardContent>
   </Card>

   <Card className="overflow-hidden border-border">
    <CardContent className="p-0">
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader className="bg-muted/50">
        <TableRow>
         <TableHead className="w-[120px]">Data Pedido</TableHead>
         <TableHead>Cliente</TableHead>
         <TableHead>Itens</TableHead>
         <TableHead className="text-center">Qtd Total</TableHead>
         <TableHead>Data Entrega</TableHead>
         <TableHead>Status</TableHead>
         <TableHead className="w-[100px] text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?
         <TableRow>
          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Carregando dados...</TableCell>
         </TableRow>:
         filteredPedidos.length===0?
         <TableRow>
          <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
           <div className="flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8 opacity-60"/>
            <p>Nenhum pedido encontrado.</p>
           </div>
          </TableCell>
         </TableRow>:
         filteredPedidos.map(pedido=>
          <TableRow key={pedido.id} className="transition-colors hover:bg-[hsl(var(--neon-lanhouse)/.04)]">
           <TableCell className="font-medium">{formatDate(pedido.data_pedido)}</TableCell>
           <TableCell className="font-semibold">{pedido.lm_clientes?.nome||'N/A'}</TableCell>
           <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
            {pedido.lm_pedido_itens?.map(item=>item.lm_servicos?.servico).join(', ')||'N/A'}
           </TableCell>
           <TableCell className="text-center font-bold">{getTotalQuantidade(pedido.lm_pedido_itens)}</TableCell>
           <TableCell>{formatDate(pedido.data_entrega)}</TableCell>
           <TableCell>{getStatusBadge(pedido.status)}</TableCell>

           <TableCell className="text-center">
            <div className="flex items-center justify-center gap-1">
             <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={()=>handleEdit(pedido)}
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <AlertDialog>
              <AlertDialogTrigger asChild>
               <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:bg-red-500/10 hover:text-red-600"
               >
                <Trash2 className="h-4 w-4"/>
               </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
               <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                 Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
               </AlertDialogHeader>

               <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={()=>handleDelete(pedido.id)} className="bg-red-500 hover:bg-red-600">
                 Excluir
                </AlertDialogAction>
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

   <Dialog open={isEditModalOpen} onOpenChange={open=>{if(!open){setIsEditModalOpen(false);setEditingPedido(null)}}}>
    <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-[600px]">
     <DialogHeader>
      <DialogTitle className="flex items-center gap-2" style={{color:C}}>
       <Package className="h-5 w-5"/>
       Editar Pedido
      </DialogTitle>
     </DialogHeader>

     <form onSubmit={handleUpdate} className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
       <div className="space-y-2">
        <Label>Data do Pedido <span className="text-red-500">*</span></Label>
        <Input
         type="date"
         value={formData.data_pedido}
         onChange={e=>setFormData({...formData,data_pedido:e.target.value})}
         required
        />
       </div>

       <div className="space-y-2">
        <Label>Cliente <span className="text-red-500">*</span></Label>
        <Select value={formData.cliente_id} onValueChange={v=>setFormData({...formData,cliente_id:v})}>
         <SelectTrigger><SelectValue placeholder="Selecione o cliente"/></SelectTrigger>
         <SelectContent>
          <ScrollArea className="h-48">
           {clientes.map(cliente=><SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>)}
          </ScrollArea>
         </SelectContent>
        </Select>
       </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
       <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
         Itens do Pedido <span className="text-red-500">*</span>
        </Label>

        <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
         <Plus className="mr-1 h-4 w-4"/>Adicionar Item
        </Button>
       </div>

       <ScrollArea className="max-h-[200px]">
        <div className="space-y-3">
         {items.map((item,index)=>
          <div key={index} className="flex items-end gap-2">
           <div className="flex-1 space-y-2">
            <Label className="text-xs">Serviço</Label>
            <Select
             value={item.servico_id}
             onValueChange={v=>handleItemChange(index,'servico_id',v)}
            >
             <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
             <SelectContent>
              {servicos.map(servico=>
               <SelectItem key={servico.id} value={servico.id}>
                {servico.servico} - R$ {parseFloat(servico.valor||0).toFixed(2)}
               </SelectItem>
              )}
             </SelectContent>
            </Select>
           </div>

           <div className="w-24 space-y-2">
            <Label className="text-xs">Quantidade</Label>
            <Input
             type="number"
             min="1"
             value={item.quantidade}
             onChange={e=>handleItemChange(index,'quantidade',e.target.value)}
            />
           </div>

           <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={()=>handleRemoveItem(index)}
            className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
           >
            <Trash2 className="h-4 w-4"/>
           </Button>
          </div>
         )}
        </div>
       </ScrollArea>
      </div>

      <div className="space-y-3">
       <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
         <Label>Data da Entrega</Label>
         <Input
          type="date"
          value={formData.data_entrega}
          onChange={e=>setFormData({...formData,data_entrega:e.target.value})}
          disabled={formData.sem_data_prevista}
         />
        </div>

        <div className="space-y-2">
         <Label>Status do Pedido <span className="text-red-500">*</span></Label>
         <Select value={formData.status} onValueChange={v=>setFormData({...formData,status:v})}>
          <SelectTrigger><SelectValue/></SelectTrigger>
          <SelectContent>
           <SelectItem value="Pendente">Pendente</SelectItem>
           <SelectItem value="Entregue">Entregue</SelectItem>
           <SelectItem value="Atrasado">Atrasado</SelectItem>
          </SelectContent>
         </Select>
        </div>
       </div>

       <div className="flex items-center space-x-2">
        <Checkbox
         id="sem_data"
         checked={formData.sem_data_prevista}
         onCheckedChange={checked=>setFormData({...formData,sem_data_prevista:checked,data_entrega:''})}
        />
        <Label htmlFor="sem_data" className="cursor-pointer text-sm">Sem Data Prevista</Label>
       </div>
      </div>

      <DialogFooter className="gap-2">
       <Button type="button" variant="outline" onClick={()=>setIsEditModalOpen(false)}>Cancelar</Button>
       <Button type="submit" className="text-slate-950" style={{background:C}}>Salvar Alterações</Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

  </motion.div>
 );
}
