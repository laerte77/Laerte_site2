import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,CreditCard,Wallet}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const BANDEIRAS=['Visa','Mastercard','Elo','American Express','Hipercard','Maestro','Outra'];

const formatBRL=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const initialForm=()=>({
 nome:'',
 bandeira:'Visa',
 limite:'',
 dia_fechamento:'1',
 dia_vencimento:'10'
});

const CartoesCredito=()=>{
 const{user}=useAuth();
 const{toast}=useToast();

 const[cartoes,setCartoes]=useState([]);
 const[lancamentos,setLancamentos]=useState([]);
 const[pagamentos,setPagamentos]=useState([]);
 const[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[editingId,setEditingId]=useState(null);
 const[formData,setFormData]=useState(initialForm);

 const fetchCartoes=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const{data,error}=await supabase
   .from('pessoal_cartoes')
   .select('*')
   .eq('user_id',user.id)
   .order('nome',{ascending:true});

  if(error){
   toast({
    title:'Erro ao buscar cartões',
    description:error.message,
    variant:'destructive'
   });
  }else{
   setCartoes(data||[]);
  }

  setLoading(false);
 },[user,toast]);

 const fetchLancamentos=useCallback(async()=>{
  if(!user)return;

  const{data}=await supabase
   .from('pessoal_cartao_lancamentos')
   .select('cartao_id,valor,parcelas,parcela_atual')
   .eq('user_id',user.id);

  setLancamentos(data||[]);
 },[user]);

 const fetchPagamentos=useCallback(async()=>{
  if(!user)return;

  const{data:faturas}=await supabase
   .from('pessoal_faturas')
   .select('id,cartao_id')
   .eq('user_id',user.id);

  const faturaIds=(faturas||[]).map(f=>f.id);

  if(faturaIds.length===0){
   setPagamentos([]);
   return;
  }

  const{data:pagamentosData}=await supabase
   .from('pessoal_cartao_pagamentos')
   .select('fatura_id,valor')
   .in('fatura_id',faturaIds);

  const pagamentosPorCartao=(pagamentosData||[]).map(pagamento=>{
   const fatura=(faturas||[]).find(f=>f.id===pagamento.fatura_id);

   return{
    cartao_id:fatura?.cartao_id,
    valor:Number(pagamento.valor||0)
   };
  });

  setPagamentos(pagamentosPorCartao);
 },[user]);

 useEffect(()=>{
  fetchCartoes();
  fetchLancamentos();
  fetchPagamentos();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_cartoes_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'pessoal_cartoes'},()=>{
    fetchCartoes();
    fetchLancamentos();
   })
   .on('postgres_changes',{event:'*',schema:'public',table:'pessoal_cartao_lancamentos'},fetchLancamentos)
   .on('postgres_changes',{event:'*',schema:'public',table:'pessoal_cartao_pagamentos'},fetchPagamentos)
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchCartoes,fetchLancamentos,fetchPagamentos]);

 const valorUtilizado=cartaoId=>{
  const totalLancado=lancamentos
   .filter(l=>l.cartao_id===cartaoId)
   .reduce((acc,l)=>acc+(Number(l.valor||0)/Math.max(1,l.parcelas)),0);

  const totalPago=pagamentos
   .filter(p=>p.cartao_id===cartaoId)
   .reduce((acc,p)=>acc+Number(p.valor||0),0);

  return Math.max(0,totalLancado-totalPago);
 };

 const resetForm=useCallback(()=>{
  setFormData(initialForm());
  setEditingId(null);
 },[]);

 const closeDialog=useCallback(()=>{
  setIsDialogOpen(false);
  resetForm();
 },[resetForm]);

 const openDialog=cartao=>{
  if(cartao){
   setFormData({
    nome:cartao.nome||'',
    bandeira:cartao.bandeira||'Visa',
    limite:money(Number(cartao.limite||0)*100),
    dia_fechamento:String(cartao.dia_fechamento??1),
    dia_vencimento:String(cartao.dia_vencimento??10)
   });
   setEditingId(cartao.id);
  }else{
   resetForm();
  }

  setIsDialogOpen(true);
 };

 const handleSave=async e=>{
  e.preventDefault();

  const limite=moneyNum(formData.limite);
  const diaFech=parseInt(formData.dia_fechamento,10);
  const diaVenc=parseInt(formData.dia_vencimento,10);

  if(!formData.nome.trim()||limite<=0){
   toast({
    title:'Campos obrigatórios',
    description:'Preencha o nome e o limite do cartão.',
    variant:'destructive'
   });
   return;
  }

  if(
   Number.isNaN(diaFech)||
   diaFech<1||
   diaFech>31||
   Number.isNaN(diaVenc)||
   diaVenc<1||
   diaVenc>31
  ){
   toast({
    title:'Dados inválidos',
    description:'Os dias de fechamento e vencimento devem estar entre 1 e 31.',
    variant:'destructive'
   });
   return;
  }

  const payload={
   user_id:user.id,
   nome:formData.nome.trim(),
   bandeira:formData.bandeira,
   limite,
   dia_fechamento:diaFech,
   dia_vencimento:diaVenc
  };

  try{
   if(editingId){
    const{error}=await supabase
     .from('pessoal_cartoes')
     .update(payload)
     .eq('id',editingId);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Cartão atualizado.'
    });
   }else{
    const{error}=await supabase
     .from('pessoal_cartoes')
     .insert(payload);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Cartão cadastrado.'
    });
   }

   resetForm();
   fetchCartoes();
  }catch(error){
   toast({
    title:'Erro',
    description:error.message||'Não foi possível salvar o cartão.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async id=>{
  const{error}=await supabase
   .from('pessoal_cartoes')
   .delete()
   .eq('id',id);

  if(error){
   toast({
    title:'Erro',
    description:'Não foi possível excluir o cartão.',
    variant:'destructive'
   });
  }else{
   toast({
    title:'Sucesso',
    description:'Cartão excluído.'
   });
   fetchCartoes();
  }
 };

 return(
  <div className="dark-pessoal space-y-6">

   <motion.div
    initial={{opacity:0,y:-20}}
    animate={{opacity:1,y:0}}
   >
    <div className="flex items-center justify-between">
     <div>
      <h2 className="mb-2 text-3xl font-bold text-[hsl(var(--neon-pessoal))]">
       Cartões de Crédito
      </h2>
      <p className="text-muted-foreground">
       Cadastre seus cartões e acompanhe o limite (A-Z)
      </p>
     </div>

     <Button
      className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      onClick={()=>openDialog()}
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Cartão
     </Button>
    </div>
   </motion.div>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={editingId?'Editar Cartão':'Novo Cartão'}
    description="Preencha os dados do cartão de crédito."
    icon={CreditCard}
    theme="blue"
    footer={
     <>
      <Button
       type="button"
       variant="outline"
       onClick={closeDialog}
       className="h-11 rounded-xl border-border px-5"
      >
       Cancelar
      </Button>

      <Button
       type="submit"
       form="form-cartao-credito"
       className="h-11 rounded-xl bg-[hsl(var(--neon-pessoal))] px-6 font-semibold text-white shadow-[0_0_18px_hsl(var(--neon-pessoal)/.22)] hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      >
       {editingId?'Salvar Alterações':'Salvar Cartão'}
      </Button>
     </>
    }
   >
    <form
     id="form-cartao-credito"
     onSubmit={handleSave}
     className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
    >
     <div className="space-y-5">

      <div className="space-y-2">
       <Label>Nome / Apelido do Cartão</Label>

       <Input
        value={formData.nome}
        onChange={e=>setFormData(p=>({...p,nome:e.target.value}))}
        placeholder="Ex: Cartão Nubank"
        className="h-11 rounded-xl bg-input"
        required
       />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Bandeira</Label>

        <Select
         value={formData.bandeira}
         onValueChange={v=>setFormData(p=>({...p,bandeira:v}))}
        >
         <SelectTrigger className="h-11 rounded-xl bg-input">
          <SelectValue/>
         </SelectTrigger>

         <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
          {BANDEIRAS.map(b=>(
           <SelectItem key={b} value={b}>{b}</SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>

       <div className="space-y-2">
        <Label>Limite (R$)</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.limite}
         onChange={e=>setFormData(p=>({...p,limite:money(e.target.value)}))}
         placeholder="R$ 0,00"
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         required
        />
       </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Dia de Fechamento</Label>

        <Input
         type="number"
         min="1"
         max="31"
         value={formData.dia_fechamento}
         onChange={e=>setFormData(p=>({...p,dia_fechamento:e.target.value}))}
         className="h-11 rounded-xl bg-input"
        />
       </div>

       <div className="space-y-2">
        <Label>Dia de Vencimento</Label>

        <Input
         type="number"
         min="1"
         max="31"
         value={formData.dia_vencimento}
         onChange={e=>setFormData(p=>({...p,dia_vencimento:e.target.value}))}
         className="h-11 rounded-xl bg-input"
        />
       </div>
      </div>

      <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 p-3 text-sm text-muted-foreground">
       O limite é salvo no banco como valor numérico, mesmo sendo exibido no formulário no formato brasileiro.
      </div>

     </div>
    </form>
   </ModalLancamentoPadrao>

   {loading?(
    <div className="py-12 text-center text-muted-foreground">
     Carregando...
    </div>
   ):cartoes.length===0?(
    <Card className="border-border bg-card">
     <CardContent className="p-12 text-center text-muted-foreground">
      <CreditCard className="mx-auto mb-3 h-12 w-12 opacity-50"/>
      <p>Nenhum cartão cadastrado.</p>
      <p className="mt-1 text-sm">Clique em "Novo Cartão" para começar.</p>
     </CardContent>
    </Card>
   ):(
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
     {cartoes.map(cartao=>{
      const utilizado=valorUtilizado(cartao.id);
      const limite=Number(cartao.limite||0);
      const disponivel=Math.max(0,limite-utilizado);
      const pct=limite>0?Math.min(100,(utilizado/limite)*100):0;

      return(
       <motion.div
        key={cartao.id}
        initial={{opacity:0,y:10}}
        animate={{opacity:1,y:0}}
       >
        <Card className="overflow-hidden border-blue-500/30 bg-gradient-to-br from-blue-600/10 to-blue-900/20">
         <CardContent className="space-y-4 p-5">

          <div className="flex items-start justify-between">
           <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20">
             <CreditCard className="h-5 w-5 text-blue-400"/>
            </div>

            <div>
             <h3 className="font-bold leading-tight text-foreground">
              {cartao.nome}
             </h3>

             <span className="text-xs text-muted-foreground">
              {cartao.bandeira||'—'}
             </span>
            </div>
           </div>

           <div className="flex gap-1">
            <Button
             variant="ghost"
             size="icon"
             className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"
             onClick={()=>openDialog(cartao)}
            >
             <Edit className="h-4 w-4"/>
            </Button>

            <AlertDialog>
             <AlertDialogTrigger asChild>
              <Button
               variant="ghost"
               size="icon"
               className="h-8 w-8 text-red-500 hover:bg-red-500/10"
              >
               <Trash2 className="h-4 w-4"/>
              </Button>
             </AlertDialogTrigger>

             <AlertDialogContent className="dark-pessoal border-border bg-card">
              <AlertDialogHeader>
               <AlertDialogTitle>Excluir Cartão</AlertDialogTitle>
               <AlertDialogDescription>
                Isso removerá o cartão e seus lançamentos. Deseja continuar?
               </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
               <AlertDialogCancel>Cancelar</AlertDialogCancel>

               <AlertDialogAction
                onClick={()=>handleDelete(cartao.id)}
                className="bg-red-600 hover:bg-red-700"
               >
                Excluir
               </AlertDialogAction>
              </AlertDialogFooter>
             </AlertDialogContent>
            </AlertDialog>
           </div>
          </div>

          <div className="space-y-1">
           <div className="flex justify-between text-xs text-muted-foreground">
            <span>Utilizado</span>
            <span>{pct.toFixed(0)}%</span>
           </div>

           <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
             className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
             style={{width:`${pct}%`}}
            />
           </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
           <div>
            <p className="text-xs text-muted-foreground">Limite</p>
            <p className="font-semibold text-foreground">{formatBRL(limite)}</p>
           </div>

           <div>
            <p className="text-xs text-muted-foreground">Utilizado</p>
            <p className="font-semibold text-red-400">{formatBRL(utilizado)}</p>
           </div>

           <div>
            <p className="text-xs text-muted-foreground">Disponível</p>
            <p className="font-semibold text-emerald-400">{formatBRL(disponivel)}</p>
           </div>

           <div>
            <p className="text-xs text-muted-foreground">Fech./Venc.</p>
            <p className="flex items-center gap-1 font-semibold text-foreground">
             <Wallet className="h-3 w-3"/>
             {cartao.dia_fechamento}/{cartao.dia_vencimento}
            </p>
           </div>
          </div>

         </CardContent>
        </Card>
       </motion.div>
      );
     })}
    </div>
   )}

  </div>
 );
};

export default CartoesCredito;
