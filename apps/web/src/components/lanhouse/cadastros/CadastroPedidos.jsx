import React,{useState,useEffect,useCallback,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Trash2,ShoppingCart,Package,CalendarDays}from'lucide-react';
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
const hojeLocal=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const novoFormulario=()=>({data_pedido:hojeLocal(),cliente_id:'',data_entrega:'',sem_data_prevista:false,status:'Pendente'});
const moeda=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);

export default function CadastroPedidos(){
 const{user}=useAuth(),{toast}=useToast(),isMountedRef=useRef(true);
 const[isModalOpen,setIsModalOpen]=useState(false);
 const[clientes,setClientes]=useState([]);
 const[servicos,setServicos]=useState([]);
 const[loading,setLoading]=useState(false);
 const[saving,setSaving]=useState(false);
 const[formData,setFormData]=useState(novoFormulario);
 const[items,setItems]=useState([{servico_id:'',quantidade:'1'}]);

 useEffect(()=>{isMountedRef.current=true;return()=>{isMountedRef.current=false}},[]);

 const fetchData=useCallback(async()=>{
  if(!user){setClientes([]);setServicos([]);return}
  setLoading(true);
  try{
   const[cr,sr]=await Promise.all([
    supabase.from('lm_clientes').select('id,nome').eq('user_id',user.id).order('nome',{ascending:true}),
    supabase.from('lm_servicos').select('id,servico,valor').eq('user_id',user.id).order('servico',{ascending:true})
   ]);
   if(cr.error)throw cr.error;
   if(sr.error)throw sr.error;
   if(isMountedRef.current){setClientes(cr.data||[]);setServicos(sr.data||[])}
  }catch(error){
   toast({title:'Erro ao carregar dados',description:error.message||'Não foi possível carregar clientes e serviços.',variant:'destructive'});
  }finally{if(isMountedRef.current)setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const closeModal=()=>{
  if(saving)return;
  setIsModalOpen(false);
  setFormData(novoFormulario());
  setItems([{servico_id:'',quantidade:'1'}]);
 };

 const addItem=()=>setItems(prev=>[...prev,{servico_id:'',quantidade:'1'}]);

 const removeItem=index=>{
  if(items.length===1)return toast({title:'Atenção',description:'O pedido precisa ter pelo menos um item.',variant:'destructive'});
  setItems(prev=>prev.filter((_,i)=>i!==index));
 };

 const changeItem=(index,field,value)=>setItems(prev=>prev.map((item,i)=>i===index?{...item,[field]:value}:item));

 const validItems=items.filter(i=>i.servico_id&&Number.isInteger(Number(i.quantidade))&&Number(i.quantidade)>0);
 const total=validItems.reduce((sum,item)=>{
  const service=servicos.find(s=>String(s.id)===String(item.servico_id));
  return sum+(Number(service?.valor)||0)*Number(item.quantidade);
 },0);

 const handleSubmit=async e=>{
  e.preventDefault();
  if(!user)return;
  if(!formData.cliente_id)return toast({title:'Campo obrigatório',description:'Selecione um cliente.',variant:'destructive'});
  if(!validItems.length)return toast({title:'Itens obrigatórios',description:'Adicione pelo menos um serviço com quantidade válida.',variant:'destructive'});
  if(!formData.sem_data_prevista&&formData.data_entrega&&formData.data_entrega<formData.data_pedido)return toast({title:'Data inválida',description:'A data de entrega não pode ser anterior à data do pedido.',variant:'destructive'});

  setSaving(true);
  let pedidoCriado=null;
  try{
   const{data:pedido,error}=await supabase.from('lm_pedidos').insert([{
    user_id:user.id,
    data_pedido:formData.data_pedido,
    cliente_id:formData.cliente_id,
    data_entrega:formData.sem_data_prevista?null:(formData.data_entrega||null),
    status:formData.status
   }]).select().single();

   if(error)throw error;
   pedidoCriado=pedido;

   const{error:itemsError}=await supabase.from('lm_pedido_itens').insert(validItems.map(item=>({
    pedido_id:pedido.id,
    servico_id:item.servico_id,
    quantidade:Number(item.quantidade)
   })));

   if(itemsError){
    const{error:cleanupError}=await supabase.from('lm_pedidos').delete().eq('id',pedido.id).eq('user_id',user.id);
    if(cleanupError)throw new Error(`Os itens não foram salvos e não foi possível remover o pedido incompleto. ID: ${pedido.id}. Detalhe: ${itemsError.message}`);
    throw new Error(`O pedido não foi concluído porque os itens não foram salvos. O pedido incompleto foi removido. Detalhe: ${itemsError.message}`);
   }

   toast({title:'Sucesso',description:'Pedido cadastrado com sucesso!'});
   setIsModalOpen(false);
   setFormData(novoFormulario());
   setItems([{servico_id:'',quantidade:'1'}]);
  }catch(error){
   console.error('Erro ao salvar pedido:',{error,pedidoId:pedidoCriado?.id});
   toast({title:'Erro ao cadastrar pedido',description:error.message||'Não foi possível concluir o cadastro.',variant:'destructive'});
  }finally{if(isMountedRef.current)setSaving(false)}
 };

 return <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="dark-lm-impressoes space-y-4">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 sm:flex-row sm:items-center sm:justify-between">
   <div className="flex items-center gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.2)] bg-[hsl(var(--neon-lanhouse)/.08)]">
     <ShoppingCart className="h-5 w-5" style={{color:C}}/>
    </div>
    <div>
     <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Cadastros</p>
     <h1 className="text-2xl font-bold tracking-tight">Cadastro de Pedidos</h1>
     <p className="text-sm text-muted-foreground">Registre pedidos, serviços e datas de entrega.</p>
    </div>
   </div>
   <Button onClick={()=>{fetchData();setIsModalOpen(true)}} className="text-slate-950 hover:opacity-90" style={{background:C}}>
    <Plus className="mr-2 h-4 w-4"/>Novo Pedido
   </Button>
  </div>

  <Card className="border-border bg-card">
   <CardHeader>
    <CardTitle className="flex items-center gap-2" style={{color:C}}><Package className="h-5 w-5"/>Gerenciar Pedidos</CardTitle>
    <CardDescription>Inicie um novo pedido e vincule o cliente aos serviços desejados.</CardDescription>
   </CardHeader>
   <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-muted-foreground">Clientes cadastrados: <strong className="text-foreground">{clientes.length}</strong> · Serviços disponíveis: <strong className="text-foreground">{servicos.length}</strong></p>
    <Button variant="outline" onClick={fetchData} disabled={loading}><CalendarDays className="mr-2 h-4 w-4"/>{loading?'Atualizando...':'Atualizar dados'}</Button>
   </CardContent>
  </Card>

  <Dialog open={isModalOpen} onOpenChange={open=>{if(!open)closeModal();else setIsModalOpen(true)}}>
   <DialogContent className="max-h-[90dvh] overflow-y-auto border-border bg-card p-0 sm:max-w-2xl" onInteractOutside={e=>{if(saving)e.preventDefault()}} onEscapeKeyDown={e=>{if(saving)e.preventDefault()}}>
    <DialogHeader className="border-b border-border p-5 pr-12">
     <DialogTitle className="flex items-center gap-2 text-lg" style={{color:C}}><ShoppingCart className="h-5 w-5"/>Novo Pedido</DialogTitle>
     <p className="text-sm text-muted-foreground">Preencha os dados e adicione um ou mais serviços.</p>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-5 p-5">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label htmlFor="data-pedido">Data do Pedido <span className="text-red-500">*</span></Label>
       <Input id="data-pedido" type="date" value={formData.data_pedido} onChange={e=>setFormData(p=>({...p,data_pedido:e.target.value}))} className="h-11 rounded-xl bg-input" required/>
      </div>
      <div className="space-y-2">
       <Label>Cliente <span className="text-red-500">*</span></Label>
       <Select value={formData.cliente_id} onValueChange={v=>setFormData(p=>({...p,cliente_id:v}))}>
        <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder={loading?'Carregando clientes...':'Selecione o cliente'}/></SelectTrigger>
        <SelectContent>
         {clientes.map(cliente=><SelectItem key={cliente.id} value={String(cliente.id)}>{cliente.nome}</SelectItem>)}
         {!clientes.length&&<div className="p-3 text-sm text-muted-foreground">Nenhum cliente cadastrado.</div>}
        </SelectContent>
       </Select>
      </div>
     </div>

     <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
       <div><h3 className="font-semibold">Itens do Pedido <span className="text-red-500">*</span></h3><p className="text-xs text-muted-foreground">Selecione o serviço e a quantidade.</p></div>
       <Button type="button" size="sm" variant="outline" onClick={addItem}><Plus className="mr-1 h-4 w-4"/>Adicionar item</Button>
      </div>
      <ScrollArea className="max-h-[280px]">
       <div className="space-y-3 pr-3">
        {items.map((item,index)=><div key={index} className="grid grid-cols-[minmax(0,1fr)_88px_36px] items-end gap-2 rounded-lg border border-border/70 bg-card p-3">
         <div className="min-w-0 space-y-2">
          <Label className="text-xs">Serviço {index+1}</Label>
          <Select value={item.servico_id} onValueChange={v=>changeItem(index,'servico_id',v)}>
           <SelectTrigger className="h-10 rounded-lg bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
           <SelectContent>{servicos.map(s=><SelectItem key={s.id} value={String(s.id)}>{s.servico} — {moeda(s.valor)}</SelectItem>)}</SelectContent>
          </Select>
         </div>
         <div className="space-y-2">
          <Label className="text-xs">Quantidade</Label>
          <Input type="number" min="1" step="1" value={item.quantidade} onChange={e=>changeItem(index,'quantidade',e.target.value)} className="h-10 rounded-lg bg-input" required/>
         </div>
         <Button type="button" variant="ghost" size="icon" onClick={()=>removeItem(index)} className="h-10 w-9 text-red-400 hover:bg-red-500/10" title="Remover item" aria-label={`Remover item ${index+1}`}><Trash2 className="h-4 w-4"/></Button>
        </div>)}
       </div>
      </ScrollArea>
      <div className="flex items-center justify-between border-t border-border pt-3">
       <span className="text-sm text-muted-foreground">Subtotal estimado</span>
       <strong className="text-lg" style={{color:C}}>{moeda(total)}</strong>
      </div>
      <p className="text-xs text-muted-foreground">Estimativa calculada pelos valores atuais dos serviços e suas quantidades.</p>
     </div>

     <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label htmlFor="data-entrega">Data da Entrega</Label>
        <Input id="data-entrega" type="date" min={formData.data_pedido||undefined} value={formData.data_entrega} onChange={e=>setFormData(p=>({...p,data_entrega:e.target.value}))} disabled={formData.sem_data_prevista} className="h-11 rounded-xl bg-input disabled:opacity-50"/>
       </div>
       <div className="space-y-2">
        <Label>Status do Pedido <span className="text-red-500">*</span></Label>
        <Select value={formData.status} onValueChange={v=>setFormData(p=>({...p,status:v}))}>
         <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue/></SelectTrigger>
         <SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Entregue">Entregue</SelectItem><SelectItem value="Atrasado">Atrasado</SelectItem></SelectContent>
        </Select>
       </div>
      </div>
      <div className="flex items-start gap-2 rounded-lg border border-border p-3">
       <Checkbox id="sem-data-prevista" checked={formData.sem_data_prevista} onCheckedChange={checked=>setFormData(p=>({...p,sem_data_prevista:checked===true,data_entrega:checked===true?'':p.data_entrega}))}/>
       <div className="space-y-1"><Label htmlFor="sem-data-prevista" className="cursor-pointer">Sem data prevista</Label><p className="text-xs text-muted-foreground">Marque se ainda não houver previsão de entrega.</p></div>
      </div>
     </div>

     <DialogFooter className="gap-2 border-t border-border pt-4">
      <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>Cancelar</Button>
      <Button type="submit" disabled={saving||loading} className="text-slate-950 hover:opacity-90" style={{background:C}}>{saving?'Salvando...':'Salvar Pedido'}</Button>
     </DialogFooter>
    </form>
   </DialogContent>
  </Dialog>
 </motion.div>;
}
