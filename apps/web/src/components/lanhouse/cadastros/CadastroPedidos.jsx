import React,{useState,useEffect,useCallback,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Trash2,ShoppingCart,Package}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle,CardDescription}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{useToast}from'@/components/ui/use-toast';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{Checkbox}from'@/components/ui/checkbox';

const C='hsl(var(--neon-lanhouse))';

export default function CadastroPedidos(){
 const{user}=useAuth(),{toast}=useToast(),isMountedRef=useRef(true);
 const[isModalOpen,setIsModalOpen]=useState(false),[clientes,setClientes]=useState([]),[servicos,setServicos]=useState([]);

 const initialFormData={
  data_pedido:new Date().toISOString().split('T')[0],
  cliente_id:'',
  data_entrega:'',
  sem_data_prevista:false,
  status:'Pendente'
 };

 const[formData,setFormData]=useState(initialFormData);
 const[items,setItems]=useState([{servico_id:'',quantidade:1}]);

 useEffect(()=>{
  isMountedRef.current=true;
  return()=>{isMountedRef.current=false};
 },[]);

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

 useEffect(()=>{fetchData()},[fetchData]);

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

 const handleSubmit=async e=>{
  e.preventDefault();

  if(!formData.cliente_id){
   toast({title:'Campo obrigatório',description:'Selecione um cliente.',variant:'destructive'});
   return;
  }

  const validItems=items.filter(item=>item.servico_id&&item.quantidade>0);

  if(!validItems.length){
   toast({title:'Itens obrigatórios',description:'Adicione pelo menos um item ao pedido.',variant:'destructive'});
   return;
  }

  try{
   const pedidoPayload={
    user_id:user.id,
    data_pedido:formData.data_pedido,
    cliente_id:formData.cliente_id,
    data_entrega:formData.sem_data_prevista?null:(formData.data_entrega||null),
    status:formData.status
   };

   const{data:pedido,error:pedidoError}=await supabase
    .from('lm_pedidos')
    .insert([pedidoPayload])
    .select()
    .single();

   if(pedidoError)throw pedidoError;

   const itemsPayload=validItems.map(item=>({
    pedido_id:pedido.id,
    servico_id:item.servico_id,
    quantidade:parseInt(item.quantidade)
   }));

   const{error:itemsError}=await supabase
    .from('lm_pedido_itens')
    .insert(itemsPayload);

   if(itemsError)throw itemsError;

   toast({title:'Sucesso',description:'Pedido cadastrado com sucesso!'});

   setFormData({...initialFormData,data_pedido:formData.data_pedido});
   setItems([{servico_id:'',quantidade:1}]);
  }catch(error){
   console.error('Erro ao salvar pedido:',error);
   toast({title:'Erro',description:'Falha ao cadastrar pedido.',variant:'destructive'});
  }
 };

 const handleCloseModal=()=>{
  setIsModalOpen(false);
  setFormData(initialFormData);
  setItems([{servico_id:'',quantidade:1}]);
 };

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
       <ShoppingCart className="h-5 w-5" style={{color:C}}/>
      </div>

      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Pedidos</p>
       <h1 className="text-2xl font-bold">Cadastro de Pedidos</h1>
       <p className="text-sm text-muted-foreground">Registre novos pedidos de clientes.</p>
      </div>
     </div>

     <Button onClick={()=>setIsModalOpen(true)} className="text-slate-950" style={{background:C}}>
      <Plus className="mr-2 h-4 w-4"/>Novo Pedido
     </Button>
    </div>
   </div>

   <Card className="border-border">
    <CardHeader>
     <CardTitle className="flex items-center gap-2" style={{color:C}}>
      <Package className="h-5 w-5"/>
      Gerenciar Pedidos
     </CardTitle>
     <CardDescription>Clique no botão para iniciar o cadastro de um pedido.</CardDescription>
    </CardHeader>

    <CardContent>
     <Button onClick={()=>setIsModalOpen(true)} className="text-slate-950" style={{background:C}}>
      <Plus className="mr-2 h-4 w-4"/>Novo Pedido
     </Button>
    </CardContent>
   </Card>

   <Dialog open={isModalOpen} onOpenChange={open=>{if(!open)handleCloseModal()}}>
    <DialogContent className="max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-[600px]">
     <DialogHeader>
      <DialogTitle className="flex items-center gap-2" style={{color:C}}>
       <ShoppingCart className="h-5 w-5"/>
       Novo Pedido
      </DialogTitle>
     </DialogHeader>

     <form onSubmit={handleSubmit} className="space-y-5 py-4">
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
       <div className="mb-2 flex items-center justify-between">
        <Label className="text-base font-semibold">
         Itens do Pedido <span className="text-red-500">*</span>
        </Label>

        <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
         <Plus className="mr-1 h-4 w-4"/>Adicionar Item
        </Button>
       </div>

       <ScrollArea className="max-h-[300px]">
        <div className="space-y-3 pr-2">
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

      <div className="space-y-4">
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
       <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
       <Button type="submit" className="text-slate-950" style={{background:C}}>Salvar Pedido</Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>
  </motion.div>
 );
}
