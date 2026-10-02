import React,{useState,useEffect,useCallback}from'react';
import{
 Plus,Edit,Trash2,CreditCard,Wallet,RefreshCw,Search
}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{useToast}from'@/components/ui/use-toast';
import{
 AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,
 AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,
 AlertDialogTitle,AlertDialogTrigger
}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const BANDEIRAS=[
 'Visa','Mastercard','Elo','American Express',
 'Hipercard','Maestro','Outra'
];

const moneyBRL=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL'
}).format(Number(v||0));

const moneyInput=v=>{
 const digits=String(v??'').replace(/\D/g,'');
 return digits
  ?new Intl.NumberFormat('pt-BR',{
   style:'currency',
   currency:'BRL'
  }).format(Number(digits)/100)
  :'';
};

const moneyNum=v=>{
 const digits=String(v??'').replace(/\D/g,'');
 return digits?Number(digits)/100:0;
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
 const[search,setSearch]=useState('');

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

  const ids=(faturas||[]).map(f=>f.id);

  if(!ids.length){
   setPagamentos([]);
   return;
  }

  const{data}=await supabase
   .from('pessoal_cartao_pagamentos')
   .select('fatura_id,valor')
   .in('fatura_id',ids);

  setPagamentos(
   (data||[]).map(p=>({
    cartao_id:faturas.find(f=>f.id===p.fatura_id)?.cartao_id,
    valor:Number(p.valor||0)
   }))
  );
 },[user]);

 useEffect(()=>{
  fetchCartoes();
  fetchLancamentos();
  fetchPagamentos();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_cartoes_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'pessoal_cartoes'
    },
    ()=>{
     fetchCartoes();
     fetchLancamentos();
    }
   )
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'pessoal_cartao_lancamentos'
    },
    fetchLancamentos
   )
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'pessoal_cartao_pagamentos'
    },
    fetchPagamentos
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchCartoes,fetchLancamentos,fetchPagamentos]);

 const valorUtilizado=cartaoId=>{
  const lancado=lancamentos
   .filter(l=>l.cartao_id===cartaoId)
   .reduce(
    (sum,l)=>
     sum+
     Number(l.valor||0)/
     Math.max(1,Number(l.parcelas)||1),
    0
   );

  const pago=pagamentos
   .filter(p=>p.cartao_id===cartaoId)
   .reduce(
    (sum,p)=>sum+Number(p.valor||0),
    0
   );

  return Math.max(0,lancado-pago);
 };

 const resetForm=()=>{
  setFormData(initialForm());
  setEditingId(null);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  resetForm();
 };

 const openDialog=cartao=>{
  if(cartao){
   setFormData({
    nome:cartao.nome||'',
    bandeira:cartao.bandeira||'Visa',
    limite:moneyInput(Number(cartao.limite||0)*100),
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
  const diaFech=Number(formData.dia_fechamento);
  const diaVenc=Number(formData.dia_vencimento);

  if(!formData.nome.trim()||limite<=0){
   toast({
    title:'Campos obrigatórios',
    description:'Informe o nome e o limite do cartão.',
    variant:'destructive'
   });
   return;
  }

  if(
   diaFech<1||diaFech>31||
   diaVenc<1||diaVenc>31||
   Number.isNaN(diaFech)||
   Number.isNaN(diaVenc)
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
     .eq('id',editingId)
     .eq('user_id',user.id);

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

   closeDialog();
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
   .eq('id',id)
   .eq('user_id',user.id);

  if(error){
   toast({
    title:'Erro',
    description:'Não foi possível excluir o cartão.',
    variant:'destructive'
   });
   return;
  }

  toast({
   title:'Sucesso',
   description:'Cartão excluído.'
  });

  fetchCartoes();
 };

 const cartoesFiltrados=cartoes.filter(cartao=>{
  const termo=search.trim().toLowerCase();

  if(!termo)return true;

  return(
   String(cartao.nome||'').toLowerCase().includes(termo)||
   String(cartao.bandeira||'').toLowerCase().includes(termo)
  );
 });

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">

    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
      <CreditCard className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
       Cadastros
      </p>

      <h1 className="text-2xl font-bold tracking-tight">
       Cartões de Crédito
      </h1>

      <p className="text-sm text-muted-foreground">
       Cadastre cartões, limites e ciclos de fechamento.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={()=>{
       fetchCartoes();
       fetchLancamentos();
       fetchPagamentos();
      }}
     >
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="bg-[hsl(var(--neon-pessoal))] text-slate-950 hover:opacity-90"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Cartão
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
     <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

      <Input
       value={search}
       onChange={e=>setSearch(e.target.value)}
       placeholder="Pesquisar cartão ou bandeira..."
       className="bg-input pl-9"
      />
     </div>

     <div className="text-sm text-muted-foreground">
      {cartoesFiltrados.length} cartão(ões)
     </div>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-3">
    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Cartões cadastrados
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold text-[hsl(var(--neon-pessoal))]">
       {cartoes.length}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Limite total
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold text-[hsl(var(--neon-pessoal))]">
       {moneyBRL(
        cartoes.reduce(
         (sum,c)=>sum+Number(c.limite||0),
         0
        )
       )}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
       Limite utilizado
      </CardTitle>
     </CardHeader>
     <CardContent>
      <p className="text-2xl font-bold text-red-400">
       {moneyBRL(
        cartoes.reduce(
         (sum,c)=>sum+valorUtilizado(c.id),
         0
        )
       )}
      </p>
     </CardContent>
    </Card>
   </div>

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
      >
       Cancelar
      </Button>

      <Button
       type="submit"
       form="form-cartao-credito"
       className="bg-[hsl(var(--neon-pessoal))] text-white hover:opacity-90"
      >
       {editingId?'Salvar Alterações':'Salvar Cartão'}
      </Button>
     </>
    }
   >
    <form
     id="form-cartao-credito"
     onSubmit={handleSave}
     className="space-y-5"
    >
     <div className="space-y-2">
      <Label>Nome / Apelido do Cartão</Label>

      <Input
       value={formData.nome}
       onChange={e=>setFormData(prev=>({
        ...prev,
        nome:e.target.value
       }))}
       placeholder="Ex: Cartão Nubank"
       className="h-11 rounded-xl bg-input"
       required
      />
     </div>

     <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label>Bandeira</Label>

       <Select
        value={formData.bandeira}
        onValueChange={value=>setFormData(prev=>({
         ...prev,
         bandeira:value
        }))}
       >
        <SelectTrigger className="h-11 rounded-xl bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
         {BANDEIRAS.map(bandeira=>(
          <SelectItem
           key={bandeira}
           value={bandeira}
          >
           {bandeira}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-2">
       <Label>Limite</Label>

       <Input
        type="text"
        inputMode="numeric"
        value={formData.limite}
        onChange={e=>setFormData(prev=>({
         ...prev,
         limite:moneyInput(e.target.value)
        }))}
        placeholder="R$ 0,00"
        className="h-11 rounded-xl bg-input font-semibold tabular-nums"
        required
       />
      </div>
     </div>

     <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label>Dia de Fechamento</Label>

       <Input
        type="number"
        min="1"
        max="31"
        value={formData.dia_fechamento}
        onChange={e=>setFormData(prev=>({
         ...prev,
         dia_fechamento:e.target.value
        }))}
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
        onChange={e=>setFormData(prev=>({
         ...prev,
         dia_vencimento:e.target.value
        }))}
        className="h-11 rounded-xl bg-input"
       />
      </div>
     </div>
    </form>
   </ModalLancamentoPadrao>

   {loading?(
    <Card className="border-border bg-card">
     <CardContent className="p-12 text-center text-muted-foreground">
      Carregando...
     </CardContent>
    </Card>
   ):cartoesFiltrados.length===0?(
    <Card className="border-border bg-card">
     <CardContent className="p-12 text-center text-muted-foreground">
      <CreditCard className="mx-auto mb-3 h-12 w-12 opacity-50"/>

      <p>
       {cartoes.length
        ?'Nenhum cartão corresponde à pesquisa.'
        :'Nenhum cartão cadastrado.'}
      </p>

      {!cartoes.length&&(
       <p className="mt-1 text-sm">
        Clique em "Novo Cartão" para começar.
       </p>
      )}
     </CardContent>
    </Card>
   ):(
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
     {cartoesFiltrados.map(cartao=>{
      const limite=Number(cartao.limite||0);
      const utilizado=valorUtilizado(cartao.id);
      const disponivel=Math.max(0,limite-utilizado);
      const percentual=limite>0
       ?Math.min(100,(utilizado/limite)*100)
       :0;

      return(
       <Card
        key={cartao.id}
        className="border-border bg-gradient-to-br from-blue-500/10 to-blue-900/20"
       >
        <CardContent className="space-y-4 p-5">

         <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
           <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <CreditCard className="h-5 w-5 text-blue-400"/>
           </div>

           <div>
            <h3 className="font-bold">
             {cartao.nome}
            </h3>

            <p className="text-xs text-muted-foreground">
             {cartao.bandeira||'—'}
            </p>
           </div>
          </div>

          <div className="flex gap-1">
           <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"
            onClick={()=>openDialog(cartao)}
            title="Editar"
           >
            <Edit className="h-4 w-4"/>
           </Button>

           <AlertDialog>
            <AlertDialogTrigger asChild>
             <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-400 hover:bg-red-500/10"
              title="Excluir"
             >
              <Trash2 className="h-4 w-4"/>
             </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="dark-pessoal border-border bg-card">
             <AlertDialogHeader>
              <AlertDialogTitle>
               Excluir Cartão
              </AlertDialogTitle>

              <AlertDialogDescription>
               Isso removerá o cartão e poderá afetar os
               lançamentos relacionados. Deseja continuar?
              </AlertDialogDescription>
             </AlertDialogHeader>

             <AlertDialogFooter>
              <AlertDialogCancel>
               Cancelar
              </AlertDialogCancel>

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

         <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
           <span>Utilizado</span>
           <span>{percentual.toFixed(0)}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted">
           <div
            className="h-full rounded-full bg-blue-500"
            style={{width:`${percentual}%`}}
           />
          </div>
         </div>

         <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
           <p className="text-xs text-muted-foreground">Limite</p>
           <p className="font-semibold">{moneyBRL(limite)}</p>
          </div>

          <div>
           <p className="text-xs text-muted-foreground">Utilizado</p>
           <p className="font-semibold text-red-400">
            {moneyBRL(utilizado)}
           </p>
          </div>

          <div>
           <p className="text-xs text-muted-foreground">Disponível</p>
           <p className="font-semibold text-emerald-400">
            {moneyBRL(disponivel)}
           </p>
          </div>

          <div>
           <p className="text-xs text-muted-foreground">Fechamento / Venc.</p>
           <p className="flex items-center gap-1 font-semibold">
            <Wallet className="h-3 w-3"/>
            {cartao.dia_fechamento}/{cartao.dia_vencimento}
           </p>
          </div>
         </div>

        </CardContent>
       </Card>
      );
     })}
    </div>
   )}
  </div>
 );
};

export default CartoesCredito;
