import React,{useState,useEffect,useCallback,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Trash2,Search,Edit,WalletCards}from'lucide-react';
import{format}from'date-fns';
import{ptBR}from'date-fns/locale';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{Badge}from'@/components/ui/badge';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
import OfflineIndicator from'@/components/OfflineIndicator';
import{useOnlineStatus}from'@/hooks/useOnlineStatus';
import{saveOfflineData}from'@/lib/offlineStorage';

const TIME_ZONE='America/Sao_Paulo';

const getBrasiliaDateISO=()=>{
 const parts=new Intl.DateTimeFormat('en-CA',{
  timeZone:TIME_ZONE,
  year:'numeric',
  month:'2-digit',
  day:'2-digit'
 }).formatToParts(new Date());

 const values={};
 parts.forEach(part=>{
  if(part.type!=='literal')values[part.type]=part.value;
 });

 return`${values.year}-${values.month}-${values.day}`;
};

const formatDateDisplay=dateString=>{
 if(!dateString)return'-';

 const match=String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(match)return`${match[3]}/${match[2]}/${match[1]}`;

 const date=new Date(dateString);
 if(Number.isNaN(date.getTime()))return dateString;

 return new Intl.DateTimeFormat('pt-BR',{timeZone:TIME_ZONE}).format(date);
};

const formatCurrencyBRL=value=>{
 const digits=String(value??'').replace(/\D/g,'');

 if(!digits)return'';

 const number=Number(digits)/100;

 return new Intl.NumberFormat('pt-BR',{
  style:'currency',
  currency:'BRL'
 }).format(number);
};

const parseCurrencyBRL=value=>{
 if(value===null||value===undefined||value==='')return 0;

 const digits=String(value).replace(/\D/g,'');

 return digits?Number(digits)/100:0;
};

const createInitialFormData=()=>({
 data:getBrasiliaDateISO(),
 despesa:'',
 valor:'',
 categoria:'',
 forma_pagamento:'Débito',
 parcelas:1,
 cartao_id:'',
 responsavel_id:''
});

const Despesas=()=>{
 const{user}=useAuth();
 const{toast}=useToast();
 const{isOnline,checkPending}=useOnlineStatus();
 const isMountedRef=useRef(true);

 const[loading,setLoading]=useState(true);
 const[despesas,setDespesas]=useState([]);
 const[filteredDespesas,setFilteredDespesas]=useState([]);
 const[searchTerm,setSearchTerm]=useState('');
 const[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[isAddModalOpen,setIsAddModalOpen]=useState(false);
 const[tiposDespesa,setTiposDespesa]=useState([]);
 const[cartoes,setCartoes]=useState([]);
 const[usuarios,setUsuarios]=useState([]);
 const[editingId,setEditingId]=useState(null);
 const[formData,setFormData]=useState(createInitialFormData);

 useEffect(()=>{
  isMountedRef.current=true;
  return()=>{isMountedRef.current=false};
 },[]);

 const fetchTiposDespesa=useCallback(async()=>{
  if(!user)return;

  try{
   const{data,error}=await supabase
    .from('tipos_despesa')
    .select('nome_despesa,categoria')
    .eq('user_id',user.id)
    .order('nome_despesa',{ascending:true});

   if(!isMountedRef.current)return;
   if(error)throw error;

   setTiposDespesa(data||[]);
  }catch(error){
   console.error(error);
  }
 },[user]);

 const fetchCartoes=useCallback(async()=>{
  if(!user)return;

  try{
   const{data,error}=await supabase
    .from('pessoal_cartoes')
    .select('id,nome')
    .eq('user_id',user.id)
    .order('nome',{ascending:true});

   if(!isMountedRef.current)return;
   if(error)throw error;

   setCartoes(data||[]);
  }catch(error){
   console.error(error);
  }
 },[user]);

 const fetchUsuarios=useCallback(async()=>{
  if(!user)return;

  try{
   const{data,error}=await supabase
    .from('pessoal_cartao_usuarios')
    .select('id,nome')
    .eq('user_id',user.id)
    .order('nome',{ascending:true});

   if(!isMountedRef.current)return;
   if(error)throw error;

   setUsuarios(data||[]);
  }catch(error){
   console.error(error);
  }
 },[user]);

 const fetchDespesas=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  try{
   const firstDay=new Date(
    parseInt(selectedYear,10),
    parseInt(selectedMonth,10),
    1
   );

   const lastDay=new Date(
    parseInt(selectedYear,10),
    parseInt(selectedMonth,10)+1,
    0
   );

   const startDate=format(firstDay,'yyyy-MM-dd');
   const endDate=format(lastDay,'yyyy-MM-dd');

   const{data,error}=await supabase
    .from('despesas')
    .select('*')
    .eq('user_id',user.id)
    .gte('data',startDate)
    .lte('data',endDate)
    .order('data',{ascending:false});

   if(!isMountedRef.current)return;
   if(error)throw error;

   setDespesas(data||[]);
   setFilteredDespesas(data||[]);
  }catch(error){
   if(!isMountedRef.current)return;

   toast({
    title:'Erro',
    description:'Não foi possível carregar as despesas.',
    variant:'destructive'
   });
  }finally{
   if(isMountedRef.current)setLoading(false);
  }
 },[user,selectedMonth,selectedYear,toast]);

 useEffect(()=>{
  fetchDespesas();
  fetchTiposDespesa();
  fetchCartoes();
  fetchUsuarios();
 },[fetchDespesas,fetchTiposDespesa,fetchCartoes,fetchUsuarios]);

 useEffect(()=>{
  const normalized=searchTerm.toLowerCase();

  const results=despesas.filter(item=>
   item.despesa?.toLowerCase().includes(normalized)||
   item.categoria?.toLowerCase().includes(normalized)
  );

  setFilteredDespesas(results);
 },[searchTerm,despesas]);

 const handleInputChange=e=>{
  const{name,value}=e.target;

  setFormData(prev=>({
   ...prev,
   [name]:value
  }));
 };

 const handleValueChange=e=>{
  setFormData(prev=>({
   ...prev,
   valor:formatCurrencyBRL(e.target.value)
  }));
 };

 const handleSelectChange=(name,value)=>{
  setFormData(prev=>({
   ...prev,
   [name]:value
  }));
 };

 const handleTipoDespesaChange=value=>{
  const selectedTipo=tiposDespesa.find(
   tipo=>tipo.nome_despesa===value
  );

  setFormData(prev=>({
   ...prev,
   despesa:value,
   categoria:selectedTipo?selectedTipo.categoria:''
  }));
 };

 const resetForm=useCallback(()=>{
  setFormData(createInitialFormData());
  setEditingId(null);
 },[]);

 const handleCloseModal=useCallback(()=>{
  setIsAddModalOpen(false);
  resetForm();
 },[resetForm]);

 const handleOpenDialog=expense=>{
  if(expense){
   setEditingId(expense.id);

   setFormData({
    data:String(expense.data||'').slice(0,10)||getBrasiliaDateISO(),
    despesa:expense.despesa||'',
    valor:formatCurrencyBRL(
     expense.valor!==null&&expense.valor!==undefined
      ?Number(expense.valor)*100
      :''
    ),
    categoria:expense.categoria||'',
    forma_pagamento:expense.forma_pagamento||'Débito',
    parcelas:expense.parcelas||1,
    cartao_id:expense.cartao_id||'',
    responsavel_id:expense.responsavel_id||''
   });
  }else{
   resetForm();
  }

  setIsAddModalOpen(true);
 };

 const handleSubmit=async e=>{
  e.preventDefault();

  const numericValue=parseCurrencyBRL(formData.valor);

  if(
   !formData.despesa||
   numericValue<=0||
   !formData.data
  ){
   toast({
    title:'Campos obrigatórios',
    description:'Preencha todos os campos obrigatórios.',
    variant:'destructive'
   });
   return;
  }

  if(
   formData.forma_pagamento==='Crédito'&&
   !formData.cartao_id
  ){
   toast({
    title:'Cartão obrigatório',
    description:'Selecione o cartão de crédito utilizado.',
    variant:'destructive'
   });
   return;
  }

  try{
   const payload={
    user_id:user.id,
    data:formData.data,
    despesa:formData.despesa,
    valor:numericValue,
    categoria:formData.categoria,
    forma_pagamento:formData.forma_pagamento,
    parcelas:Math.max(
     1,
     parseInt(formData.parcelas,10)||1
    ),
    cartao_id:
     formData.forma_pagamento==='Crédito'
      ?formData.cartao_id
      :null,
    responsavel_id:
     formData.forma_pagamento==='Crédito'
      ?formData.responsavel_id||null
      :null
   };

   if(!isOnline&&!editingId){
    await saveOfflineData(
     'pessoal_despesas',
     payload
    );

    if(isMountedRef.current){
     toast({
      title:'Salvo offline',
      description:'Despesa salva localmente e pronta para sincronização.'
     });

     resetForm();
    }

    checkPending();
    return;
   }

   if(editingId){
    if(!isOnline){
     toast({
      title:'Offline',
      description:'Edição offline não permitida.',
      variant:'destructive'
     });
     return;
    }

    const{error}=await supabase
     .from('despesas')
     .update(payload)
     .eq('id',editingId);

    if(error)throw error;

    if(isMountedRef.current){
     toast({
      title:'Sucesso',
      description:'Despesa atualizada com sucesso.'
     });

     resetForm();
    }
   }else{
    const{error}=await supabase
     .from('despesas')
     .insert([payload]);

    if(error)throw error;

    if(isMountedRef.current){
     toast({
      title:'Sucesso',
      description:'Despesa registrada com sucesso.'
     });

     resetForm();
    }
   }

   if(isOnline)fetchDespesas();
  }catch(error){
   if(isMountedRef.current){
    toast({
     title:'Erro',
     description:error.message||'Falha ao salvar despesa.',
     variant:'destructive'
    });
   }
  }
 };

 const handleDelete=async id=>{
  if(!isOnline){
   toast({
    title:'Offline',
    description:'Exclusão offline não permitida.',
    variant:'destructive'
   });
   return;
  }

  try{
   const{error}=await supabase
    .from('despesas')
    .delete()
    .eq('id',id);

   if(error)throw error;

   toast({
    title:'Sucesso',
    description:'Despesa removida.'
   });

   fetchDespesas();
  }catch(error){
   toast({
    title:'Erro',
    description:'Falha ao remover despesa.',
    variant:'destructive'
   });
  }
 };

 const totalDespesas=filteredDespesas.reduce(
  (acc,current)=>acc+Number(current.valor||0),
  0
 );

 const responsavelNome=id=>
  usuarios.find(usuario=>usuario.id===id)?.nome||'';

 const moeda=new Intl.NumberFormat('pt-BR',{
  style:'currency',
  currency:'BRL'
 });

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-pessoal space-y-6"
  >
   <OfflineIndicator/>

   <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--neon-pessoal))]">
      Finanças Pessoais
     </p>

     <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
      Despesas
     </h1>

     <p className="text-sm text-muted-foreground">
      Gerencie seus gastos mensais (A-Z).
     </p>
    </div>

    <Button
     className="bg-[hsl(var(--neon-pessoal))] text-white shadow-[0_0_16px_hsl(var(--neon-pessoal)/.20)] hover:bg-[hsl(var(--neon-pessoal)/.88)]"
     onClick={()=>handleOpenDialog(null)}
    >
     <Plus className="mr-2 h-4 w-4"/>
     Nova Despesa
    </Button>
   </div>

   <Dialog
    open={isAddModalOpen}
    onOpenChange={open=>{
     if(!open)handleCloseModal();
     else setIsAddModalOpen(true);
    }}
   >
    <DialogContent
     onInteractOutside={e=>e.preventDefault()}
     onPointerDownOutside={e=>e.preventDefault()}
     onEscapeKeyDown={e=>e.preventDefault()}
     className="dark-pessoal w-[calc(100%-2rem)] max-w-[680px] overflow-hidden rounded-2xl border border-[hsl(var(--neon-pessoal)/.26)] bg-[hsl(var(--card-bg))] p-0 text-foreground shadow-[0_24px_80px_rgba(0,0,0,.58)]"
    >
     <DialogHeader className="border-b border-[hsl(var(--neon-pessoal)/.14)] bg-[hsl(var(--neon-pessoal)/.045)] px-6 py-5 pr-14">
      <div className="flex items-center gap-3">
       <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.22)] bg-[hsl(var(--neon-pessoal)/.09)]">
        <WalletCards className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
       </div>

       <div>
        <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
         {editingId?'Editar Despesa':'Nova Despesa'}
        </DialogTitle>

        <DialogDescription className="mt-1 text-sm text-muted-foreground">
         {editingId
          ?'Atualize os dados da despesa.'
          :'Preencha os dados da nova despesa.'}
        </DialogDescription>
       </div>
      </div>
     </DialogHeader>

     <form
      onSubmit={handleSubmit}
      className="max-h-[calc(100vh-180px)] overflow-y-auto"
     >
      <div className="space-y-5 px-6 py-6">
       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
         <Label className="text-sm font-medium">
          Data
         </Label>

         <Input
          type="date"
          name="data"
          value={formData.data}
          onChange={handleInputChange}
          required
          className="h-11 rounded-xl border-border bg-input transition-colors focus:border-[hsl(var(--neon-pessoal)/.65)] focus:ring-[hsl(var(--neon-pessoal)/.25)]"
         />
        </div>

        <div className="space-y-2">
         <Label className="text-sm font-medium">
          Valor
         </Label>

         <Input
          type="text"
          inputMode="numeric"
          name="valor"
          value={formData.valor}
          onChange={handleValueChange}
          required
          placeholder="R$ 0,00"
          className="h-11 rounded-xl border-border bg-input font-semibold tabular-nums transition-colors focus:border-[hsl(var(--neon-pessoal)/.65)] focus:ring-[hsl(var(--neon-pessoal)/.25)]"
         />
        </div>
       </div>

       <div className="space-y-2">
        <Label className="text-sm font-medium">
         Descrição (Tipo de Despesa)
        </Label>

        <Select
         value={formData.despesa}
         onValueChange={handleTipoDespesaChange}
        >
         <SelectTrigger className="h-11 rounded-xl border-border bg-input">
          <SelectValue placeholder="Selecione"/>
         </SelectTrigger>

         <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
          <ScrollArea className="h-48">
           {tiposDespesa.map(tipo=>(
            <SelectItem
             key={tipo.nome_despesa}
             value={tipo.nome_despesa}
            >
             {tipo.nome_despesa}
            </SelectItem>
           ))}
          </ScrollArea>
         </SelectContent>
        </Select>
       </div>

       <div className="space-y-2">
        <Label className="text-sm font-medium">
         Categoria
        </Label>

        <Input
         value={formData.categoria||'Selecione um tipo'}
         readOnly
         className="h-11 rounded-xl border-border bg-muted text-muted-foreground"
        />
       </div>

       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
         <Label className="text-sm font-medium">
          Pagamento
         </Label>

         <Select
          value={formData.forma_pagamento}
          onValueChange={value=>
           handleSelectChange('forma_pagamento',value)
          }
         >
          <SelectTrigger className="h-11 rounded-xl border-border bg-input">
           <SelectValue/>
          </SelectTrigger>

          <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
           <SelectItem value="Dinheiro">Dinheiro</SelectItem>
           <SelectItem value="Débito">Débito</SelectItem>
           <SelectItem value="Crédito">Crédito</SelectItem>
           <SelectItem value="Pix">Pix</SelectItem>
           <SelectItem value="Boleto">Boleto</SelectItem>
          </SelectContent>
         </Select>
        </div>

        <div className="space-y-2">
         <Label className="text-sm font-medium">
          Parcelas
         </Label>

         <Input
          type="number"
          name="parcelas"
          min="1"
          value={formData.parcelas}
          onChange={handleInputChange}
          className="h-11 rounded-xl border-border bg-input transition-colors focus:border-[hsl(var(--neon-pessoal)/.65)] focus:ring-[hsl(var(--neon-pessoal)/.25)]"
         />
        </div>
       </div>

       {formData.forma_pagamento==='Crédito'&&(
        <div className="space-y-5 rounded-xl border border-[hsl(var(--neon-pessoal)/.14)] bg-background/20 p-4">
         <div className="space-y-2">
          <Label className="text-sm font-medium">
           Cartão de Crédito
          </Label>

          {cartoes.length===0?(
           <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">
            Nenhum cartão cadastrado. Cadastre um cartão em Cadastros → Cartões de Crédito.
           </p>
          ):(
           <Select
            value={formData.cartao_id}
            onValueChange={value=>
             handleSelectChange('cartao_id',value)
            }
           >
            <SelectTrigger className="h-11 rounded-xl border-border bg-input">
             <SelectValue placeholder="Selecione o cartão"/>
            </SelectTrigger>

            <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
             <ScrollArea className="h-40">
              {cartoes.map(cartao=>(
               <SelectItem
                key={cartao.id}
                value={cartao.id}
               >
                {cartao.nome}
               </SelectItem>
              ))}
             </ScrollArea>
            </SelectContent>
           </Select>
          )}
         </div>

         <div className="space-y-2">
          <Label className="text-sm font-medium">
           Responsável pela Compra
          </Label>

          {usuarios.length===0?(
           <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">
            Nenhuma pessoa cadastrada. Cadastre em Cadastros → Pessoas do Cartão.
           </p>
          ):(
           <Select
            value={formData.responsavel_id||'nenhum'}
            onValueChange={value=>
             handleSelectChange(
              'responsavel_id',
              value==='nenhum'?'':value
             )
            }
           >
            <SelectTrigger className="h-11 rounded-xl border-border bg-input">
             <SelectValue placeholder="Selecione o responsável"/>
            </SelectTrigger>

            <SelectContent className="dark-pessoal rounded-xl border-border bg-card">
             <ScrollArea className="h-40">
              <SelectItem value="nenhum">
               — Sem responsável —
              </SelectItem>

              {usuarios.map(usuario=>(
               <SelectItem
                key={usuario.id}
                value={usuario.id}
               >
                {usuario.nome}
               </SelectItem>
              ))}
             </ScrollArea>
            </SelectContent>
           </Select>
          )}
         </div>
        </div>
       )}
      </div>

      <DialogFooter className="border-t border-border/70 bg-background/20 px-6 py-4">
       <Button
        type="button"
        variant="outline"
        onClick={handleCloseModal}
        className="h-10 rounded-xl border-border px-5 hover:bg-secondary"
       >
        Cancelar
       </Button>

       <Button
        type="submit"
        className="h-10 rounded-xl bg-[hsl(var(--neon-pessoal))] px-6 font-semibold text-white shadow-[0_0_18px_hsl(var(--neon-pessoal)/.22)] transition-all hover:bg-[hsl(var(--neon-pessoal)/.88)] hover:shadow-[0_0_24px_hsl(var(--neon-pessoal)/.32)]"
       >
        {editingId?'Salvar Alterações':'Salvar Despesa'}
       </Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

   <div className="grid gap-4 md:grid-cols-4">
    <Card className="col-span-1 border-border md:col-span-3">
     <CardContent className="flex flex-col items-center gap-4 p-4 md:flex-row">
      <div className="flex w-full flex-1 items-center gap-2">
       <Search className="h-4 w-4 text-muted-foreground"/>

       <Input
        placeholder="Buscar..."
        value={searchTerm}
        onChange={e=>setSearchTerm(e.target.value)}
        className="flex-1 bg-input"
       />
      </div>

      <div className="flex w-full gap-2 md:w-auto">
       <Select
        value={selectedMonth}
        onValueChange={setSelectedMonth}
       >
        <SelectTrigger className="w-[140px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal border-border bg-card">
         {Array.from({length:12},(_,i)=>(
          <SelectItem
           key={i}
           value={i.toString()}
          >
           {format(new Date(2024,i,1),'MMMM',{locale:ptBR})}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>

       <Select
        value={selectedYear}
        onValueChange={setSelectedYear}
       >
        <SelectTrigger className="w-[100px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal border-border bg-card">
         {[2023,2024,2025,2026].map(year=>(
          <SelectItem
           key={year}
           value={String(year)}
          >
           {year}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>
     </CardContent>
    </Card>

    <Card className="border-red-200/20 bg-gradient-to-br from-red-500/10 to-red-400/10">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-red-500">
       Total no Período
      </CardTitle>
     </CardHeader>

     <CardContent>
      <div className="text-2xl font-bold text-red-500">
       {moeda.format(totalDespesas)}
      </div>
     </CardContent>
    </Card>
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Descrição</TableHead>
         <TableHead>Categoria</TableHead>
         <TableHead>Data</TableHead>
         <TableHead>Pagamento</TableHead>
         <TableHead>Responsável</TableHead>
         <TableHead className="text-right">Valor</TableHead>
         <TableHead className="text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow>
          <TableCell
           colSpan={7}
           className="py-8 text-center"
          >
           Carregando...
          </TableCell>
         </TableRow>
        ):filteredDespesas.length===0?(
         <TableRow>
          <TableCell
           colSpan={7}
           className="py-8 text-center text-muted-foreground"
          >
           Nenhuma despesa encontrada.
          </TableCell>
         </TableRow>
        ):(
         filteredDespesas.map(item=>(
          <TableRow
           key={item.id}
           className="transition-colors hover:bg-muted/50"
          >
           <TableCell className="font-medium text-foreground">
            {item.despesa}
           </TableCell>

           <TableCell>
            <Badge
             variant="outline"
             className="border-blue-500/20 bg-blue-500/10 text-blue-400"
            >
             {item.categoria||'OUTROS'}
            </Badge>
           </TableCell>

           <TableCell>
            {formatDateDisplay(item.data)}
           </TableCell>

           <TableCell className="text-sm text-muted-foreground">
            {item.forma_pagamento}

            {item.cartao_id&&cartoes.find(cartao=>cartao.id===item.cartao_id)
             ?` • ${cartoes.find(cartao=>cartao.id===item.cartao_id).nome}`
             :''
            }
           </TableCell>

           <TableCell className="text-sm">
            {item.responsavel_id
             ?(
              <Badge
               variant="outline"
               className="border-indigo-500/20 bg-indigo-500/10 text-indigo-400"
              >
               {responsavelNome(item.responsavel_id)}
              </Badge>
             )
             :(
              <span className="text-sm italic text-muted-foreground">
               —
              </span>
             )
            }
           </TableCell>

           <TableCell className="text-right font-bold text-red-500">
            {moeda.format(Number(item.valor||0))}
           </TableCell>

           <TableCell className="text-center">
            <div className="flex items-center justify-center gap-2">
             <Button
              variant="ghost"
              size="icon"
              className="text-[hsl(var(--neon-pessoal))] hover:bg-[hsl(var(--neon-pessoal)/.10)]"
              onClick={()=>handleOpenDialog(item)}
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10"
              onClick={()=>handleDelete(item.id)}
             >
              <Trash2 className="h-4 w-4"/>
             </Button>
            </div>
           </TableCell>
          </TableRow>
         ))
        )}
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>
  </motion.div>
 );
};

export default Despesas;
