import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,CalendarClock,Search,AlertTriangle,WalletCards,Download,FileText,DollarSign,ArrowDownRight,Filter,ChevronLeft,ChevronRight,CalendarDays}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import{Badge}from'@/components/ui/badge';
import{format,isSameMonth,parseISO}from'date-fns';
import{normalizeString}from'@/lib/gastoRealUtils';
import{exportToExcel}from'@/lib/ExportUtils';
import ModalLancamentoPadrao from'@/components/pessoal/ModalLancamentoPadrao';

const TZ='America/Sao_Paulo',RED='hsl(0 84% 60%)';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const years=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];

const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const moneyInput=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?money.format(Number(d)/100):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const brDate=v=>{
 if(!v)return'-';
 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
 return m?`${m[3]}/${m[2]}/${m[1]}`:new Intl.DateTimeFormat('pt-BR',{timeZone:TZ}).format(new Date(v));
};

const initial=()=>({
 data_compra:getBRDate(),
 descricao:'',
 data_vencimento:'',
 valor:'',
 forma_pagamento:'Boleto',
 parcelas:1,
 categoria:'',
 status:'Pendente'
});

const StatCard=({icon:Icon,label,value})=>(
 <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
  <div className="flex items-center gap-3">
   <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
    <Icon className="h-5 w-5 text-red-400"/>
   </div>
   <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-1 truncate text-xl font-bold text-red-400">{value}</p>
   </div>
  </div>
 </div>
);

const DespesaPrevista=()=>{
 const{toast}=useToast();
 const{user}=useAuth();
 const isMounted=useRef(true);

 const[despesas,setDespesas]=useState([]);
 const[tiposDespesa,setTiposDespesa]=useState([]);
 const[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[isSearchModalOpen,setIsSearchModalOpen]=useState(false);
 const[currentDespesa,setCurrentDespesa]=useState(null);
 const[itemToDelete,setItemToDelete]=useState(null);
 const[duplicateWarning,setDuplicateWarning]=useState(null);
 const[formData,setFormData]=useState(initial);

 const[search,setSearch]=useState('');
 const[month,setMonth]=useState('all');
 const[year,setYear]=useState(String(new Date().getFullYear()));
 const[category,setCategory]=useState('all');
 const[status,setStatus]=useState('all');
 const[currentPage,setCurrentPage]=useState(1);

 const pageSize=10;

 useEffect(()=>{
  isMounted.current=true;
  return()=>{isMounted.current=false};
 },[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  try{
   const[a,b]=await Promise.all([
    supabase
     .from('despesas_previstas')
     .select('*')
     .eq('user_id',user.id)
     .order('data_vencimento',{ascending:false}),
    supabase
     .from('tipos_despesa')
     .select('nome_despesa,categoria')
     .eq('user_id',user.id)
     .order('nome_despesa',{ascending:true})
   ]);

   if(!isMounted.current)return;
   if(a.error)throw a.error;
   if(b.error)throw b.error;

   setDespesas(a.data||[]);
   setTiposDespesa(b.data||[]);
  }catch(e){
   if(isMounted.current){
    toast({
     title:'Erro ao buscar dados',
     description:e.message,
     variant:'destructive'
    });
   }
  }finally{
   if(isMounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const ch=supabase
   .channel('despesas_previstas_changes_v1')
   .on('postgres_changes',{event:'*',schema:'public',table:'despesas_previstas'},fetchData)
   .on('postgres_changes',{event:'*',schema:'public',table:'tipos_despesa'},fetchData)
   .subscribe();

  return()=>supabase.removeChannel(ch);
 },[user,fetchData]);

 useEffect(()=>{
  if(formData.descricao&&formData.data_vencimento&&!currentDespesa){
   const n=normalizeString(formData.descricao);
   const d=parseISO(formData.data_vencimento);

   const dup=despesas.find(x=>
    n===normalizeString(x.descricao)&&
    isSameMonth(d,parseISO(x.data_vencimento))
   );

   setDuplicateWarning(
    dup?`Atenção: Já existe uma despesa "${dup.descricao}" vencendo em ${brDate(dup.data_vencimento)}.`:null
   );
  }else{
   setDuplicateWarning(null);
  }
 },[formData.descricao,formData.data_vencimento,despesas,currentDespesa]);

 const categories=useMemo(
  ()=>['all',...tiposDespesa.map(t=>t.categoria).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i)],
  [tiposDespesa]
 );

 const filtered=useMemo(()=>{
  const q=search.trim().toLowerCase();

  return despesas.filter(item=>{
   const raw=String(item.data_vencimento||'');
   const itemYear=raw.length>=4?raw.slice(0,4):'';
   const itemMonth=raw.length>=7?String(Number(raw.slice(5,7))-1):'';

   const searchMatch=!q||
    item.descricao?.toLowerCase().includes(q)||
    item.categoria?.toLowerCase().includes(q);

   const monthMatch=month==='all'||itemMonth===month;
   const yearMatch=year==='all'||itemYear===year;
   const categoryMatch=category==='all'||item.categoria===category;
   const statusMatch=status==='all'||item.status===status;

   return searchMatch&&monthMatch&&yearMatch&&categoryMatch&&statusMatch;
  });
 },[despesas,search,month,year,category,status]);

 useEffect(()=>setCurrentPage(1),[search,month,year,category,status]);

 const totalPrevisto=filtered.reduce((a,x)=>a+Number(x.valor||0),0);
 const totalPago=filtered.filter(x=>x.status==='Pago').reduce((a,x)=>a+Number(x.valor||0),0);
 const totalPendente=filtered.filter(x=>x.status==='Pendente').reduce((a,x)=>a+Number(x.valor||0),0);
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));

 const paginated=useMemo(()=>{
  const start=(currentPage-1)*pageSize;
  return filtered.slice(start,start+pageSize);
 },[filtered,currentPage]);

 const resetForm=useCallback(()=>{
  setFormData(initial());
  setCurrentDespesa(null);
  setDuplicateWarning(null);
 },[]);

 const closeModal=useCallback(()=>{
  setIsDialogOpen(false);
  resetForm();
 },[resetForm]);

 const openDialog=despesa=>{
  if(despesa){
   setCurrentDespesa(despesa);
   setFormData({
    data_compra:String(despesa.data_compra||getBRDate()).slice(0,10),
    descricao:despesa.descricao||'',
    data_vencimento:String(despesa.data_vencimento||'').slice(0,10),
    valor:moneyInput(Number(despesa.valor||0)*100),
    forma_pagamento:despesa.forma_pagamento||'Boleto',
    parcelas:despesa.parcelas||1,
    categoria:despesa.categoria||'',
    status:despesa.status||'Pendente'
   });
  }else{
   resetForm();
  }

  setIsDialogOpen(true);
 };

 const save=async()=>{
  const valor=moneyNum(formData.valor);

  if(!formData.descricao||!formData.data_vencimento||valor<=0){
   toast({
    title:'Erro',
    description:'Descrição, vencimento e valor são obrigatórios.',
    variant:'destructive'
   });
   return;
  }

  const dataToSave={
   ...formData,
   user_id:user.id,
   valor,
   parcelas:formData.forma_pagamento==='Cartão'?formData.parcelas:null
  };

  try{
   if(currentDespesa){
    const{error}=await supabase
     .from('despesas_previstas')
     .update(dataToSave)
     .eq('id',currentDespesa.id);

    if(error)throw error;

    toast({title:'Sucesso!',description:'Despesa prevista atualizada.'});
   }else{
    const{error}=await supabase
     .from('despesas_previstas')
     .insert(dataToSave);

    if(error)throw error;

    toast({title:'Sucesso!',description:'Despesa prevista registrada.'});
   }

   resetForm();
   fetchData();
  }catch(e){
   toast({
    title:'Erro ao salvar',
    description:e.message,
    variant:'destructive'
   });
  }
 };

 const del=async()=>{
  if(!itemToDelete)return;

  try{
   const{error}=await supabase
    .from('despesas_previstas')
    .delete()
    .eq('id',itemToDelete.id);

   if(error)throw error;

   toast({title:'Removido',description:'Despesa removida com sucesso.'});
   setItemToDelete(null);
   fetchData();
  }catch(e){
   toast({
    title:'Erro ao remover',
    description:e.message,
    variant:'destructive'
   });
  }
 };

 const toggleStatus=async(id,currentStatus)=>{
  const novo=currentStatus==='Pendente'?'Pago':'Pendente';

  try{
   const{error}=await supabase
    .from('despesas_previstas')
    .update({status:novo})
    .eq('id',id);

   if(error)throw error;
   fetchData();
  }catch(e){
   toast({
    title:'Erro',
    description:'Erro ao atualizar status.',
    variant:'destructive'
   });
  }
 };

 const handleExport=()=>{
  if(!filtered.length){
   toast({
    title:'Aviso',
    description:'Nenhum dado para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   filtered.map(item=>({
    'Data da Compra':brDate(item.data_compra),
    Vencimento:brDate(item.data_vencimento),
    Descrição:item.descricao,
    Categoria:item.categoria||'OUTROS',
    Pagamento:item.forma_pagamento,
    Parcelas:item.parcelas||'-',
    Status:item.status||'Pendente',
    Valor:Number(item.valor||0)
   })),
   'Despesas_Previstas',
   'Despesas Previstas'
  );
 };

 const clearFilters=()=>{
  setSearch('');
  setMonth('all');
  setYear(String(new Date().getFullYear()));
  setCategory('all');
  setStatus('all');
 };

 return(
  <React.Fragment>

   <motion.div
    initial={{opacity:0,y:20}}
    animate={{opacity:1,y:0}}
    className="dark-pessoal space-y-4"
   >

    <div className="rounded-xl border border-border bg-card/70">
     <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex items-center gap-4">
       <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-red-500/25 bg-red-500/10">
        <CalendarClock className="h-7 w-7 text-red-400"/>
       </div>

       <div>
        <h1 className="text-2xl font-bold tracking-tight text-red-400">
         Lançamento de Despesas Previstas
        </h1>
        <p className="text-sm text-muted-foreground">
         Planeje e acompanhe suas contas a pagar.
        </p>
       </div>
      </div>

      <div className="flex flex-wrap gap-2">

       <Button
        variant="outline"
        onClick={handleExport}
        className="border-border bg-transparent"
       >
        <Download className="mr-2 h-4 w-4"/>Excel
       </Button>

       <Button
        variant="outline"
        onClick={()=>setIsSearchModalOpen(true)}
        className="border-border bg-transparent"
       >
        <Search className="mr-2 h-4 w-4"/>Selecionar
       </Button>

       <Button
        onClick={()=>openDialog()}
        className="bg-red-500 text-white hover:bg-red-600"
       >
        <Plus className="mr-2 h-4 w-4"/>Novo Lançamento
       </Button>

      </div>
     </div>
    </div>

    <div className="rounded-xl border border-border bg-card/70 p-3">
     <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.5fr_.6fr_.45fr_.8fr_.75fr_auto]">

      <div className="relative">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input
        placeholder="Buscar por descrição ou categoria..."
        value={search}
        onChange={e=>setSearch(e.target.value)}
        className="h-11 border-border bg-input pl-10"
       />
      </div>

      <Select value={month} onValueChange={setMonth}>
       <SelectTrigger className="h-11 border-border bg-input">
        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>
        <SelectValue placeholder="Mês"/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal border-border bg-card">
        <SelectItem value="all">Todos os Meses</SelectItem>
        {meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
       </SelectContent>
      </Select>

      <Select value={year} onValueChange={setYear}>
       <SelectTrigger className="h-11 border-border bg-input">
        <SelectValue placeholder="Ano"/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal border-border bg-card">
        {years.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
       </SelectContent>
      </Select>

      <Select value={category} onValueChange={setCategory}>
       <SelectTrigger className="h-11 border-border bg-input">
        <SelectValue placeholder="Categoria"/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal border-border bg-card">
        <SelectItem value="all">Todas as Categorias</SelectItem>
        {categories.filter(c=>c!=='all').map(c=>(
         <SelectItem key={c} value={c}>{c}</SelectItem>
        ))}
       </SelectContent>
      </Select>

      <Select value={status} onValueChange={setStatus}>
       <SelectTrigger className="h-11 border-border bg-input">
        <SelectValue placeholder="Status"/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal border-border bg-card">
        <SelectItem value="all">Todos os Status</SelectItem>
        <SelectItem value="Pendente">Pendente</SelectItem>
        <SelectItem value="Pago">Pago</SelectItem>
       </SelectContent>
      </Select>

      <Button
       variant="outline"
       onClick={clearFilters}
       className="h-11 border-border"
      >
       <Filter className="mr-2 h-4 w-4"/>Limpar
      </Button>

     </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
     <StatCard icon={FileText} label="Total de Registros" value={filtered.length}/>
     <StatCard icon={DollarSign} label="Total Previsto" value={money.format(totalPrevisto)}/>
     <StatCard icon={ArrowDownRight} label="Total Pago" value={money.format(totalPago)}/>
     <StatCard icon={WalletCards} label="Total Pendente" value={money.format(totalPendente)}/>
    </div>

    <div className="overflow-hidden rounded-xl border border-border bg-card/70">
     <div className="overflow-x-auto">

      <table className="w-full text-sm">

       <thead>
        <tr className="border-b border-border bg-secondary/30">

         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Vencimento</th>
         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Descrição</th>
         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Categoria</th>
         <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Valor</th>
         <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Status</th>
         <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Ações</th>

        </tr>
       </thead>

       <tbody>

        {loading?(
         <tr>
          <td colSpan="6" className="px-4 py-10 text-center text-muted-foreground">
           Carregando lançamentos...
          </td>
         </tr>
        ):paginated.length===0?(
         <tr>
          <td colSpan="6" className="px-4 py-12">
           <div className="flex flex-col items-center justify-center gap-2 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground"/>
            <p className="font-semibold text-foreground">Nenhum lançamento encontrado</p>
            <p className="text-sm text-muted-foreground">Não existem despesas previstas para os filtros selecionados.</p>

            <Button
             variant="outline"
             size="sm"
             onClick={clearFilters}
             className="mt-2"
            >
             <Filter className="mr-2 h-4 w-4"/>Limpar Filtros
            </Button>
           </div>
          </td>
         </tr>
        ):(
         paginated.map(d=>(
          <tr
           key={d.id}
           className="border-b border-border transition-colors last:border-b-0 hover:bg-secondary/30"
          >

           <td className="px-4 py-4 font-medium">
            {brDate(d.data_vencimento)}
           </td>

           <td className="px-4 py-4 font-medium">
            {d.descricao}
           </td>

           <td className="px-4 py-4">
            <Badge
             variant="outline"
             className="border-red-500/20 bg-red-500/10 text-red-400"
            >
             {d.categoria||'OUTROS'}
            </Badge>
           </td>

           <td className="px-4 py-4 text-right font-bold text-red-400">
            {money.format(Number(d.valor||0))}
           </td>

           <td className="px-4 py-4 text-center">
            <Badge
             className={`cursor-pointer ${
              d.status==='Pago'
               ?'border-green-500/30 bg-green-500/10 text-green-400'
               :'border-red-500/30 bg-red-500/10 text-red-400'
             }`}
             variant="outline"
             onClick={()=>toggleStatus(d.id,d.status)}
            >
             {d.status}
            </Badge>
           </td>

           <td className="px-4 py-4">
            <div className="flex justify-end gap-1">

             <Button
              variant="ghost"
              size="icon"
              title="Editar lançamento"
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={()=>openDialog(d)}
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <Button
              variant="ghost"
              size="icon"
              title="Excluir lançamento"
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={()=>setItemToDelete(d)}
             >
              <Trash className="h-4 w-4"/>
             </Button>

            </div>
           </td>

          </tr>
         ))
        )}

       </tbody>
      </table>
     </div>

     {!loading&&filtered.length>0&&(
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

       <div className="text-sm text-muted-foreground">
        Mostrando {Math.min((currentPage-1)*pageSize+1,filtered.length)} a {Math.min(currentPage*pageSize,filtered.length)} de {filtered.length} registros
       </div>

       <div className="flex items-center gap-2">

        <Button
         variant="outline"
         size="sm"
         disabled={currentPage===1}
         onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}
        >
         <ChevronLeft className="mr-1 h-4 w-4"/>Anterior
        </Button>

        <div className="flex h-9 min-w-9 items-center justify-center rounded-md bg-red-500 px-3 text-sm font-semibold text-white">
         {currentPage}
        </div>

        <Button
         variant="outline"
         size="sm"
         disabled={currentPage>=totalPages}
         onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}
        >
         Próxima<ChevronRight className="ml-1 h-4 w-4"/>
        </Button>

       </div>
      </div>
     )}
    </div>

   </motion.div>

   <SearchableModal
    isOpen={isSearchModalOpen}
    onClose={()=>setIsSearchModalOpen(false)}
    onSelect={item=>{
     openDialog(item);
     setIsSearchModalOpen(false);
    }}
    tableName="despesas_previstas"
    searchField="descricao"
    displayFields={[
     {key:'descricao',label:'Descrição'},
     {key:'data_vencimento',label:'Vencimento',format:brDate},
     {key:'valor',label:'Valor',format:money.format}
    ]}
    title="Buscar Despesa Prevista"
   />

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeModal}
    title={currentDespesa?'Editar Despesa Prevista':'Nova Despesa Prevista'}
    description="Preencha as informações da conta a pagar."
    icon={WalletCards}
    theme="red"
    footer={
     <>
      <Button
       variant="outline"
       onClick={closeModal}
       className="h-10 rounded-xl border-border"
      >
       Cancelar
      </Button>

      <Button
       onClick={save}
       className="h-10 rounded-xl bg-red-600 px-7 font-semibold text-white shadow-lg shadow-red-500/20 hover:bg-red-700"
      >
       {currentDespesa?'Salvar Alterações':'Salvar Despesa'}
      </Button>
     </>
    }
   >

    {duplicateWarning&&(
     <div className="flex items-start gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-400">
      <AlertTriangle className="h-5 w-5 shrink-0"/>
      <p>{duplicateWarning}</p>
     </div>
    )}

    <div className="space-y-2">
     <Label>Descrição</Label>

     <Select
      value={formData.descricao}
      onValueChange={v=>{
       const t=tiposDespesa.find(x=>x.nome_despesa===v);

       setFormData(p=>({
        ...p,
        descricao:v,
        categoria:t?.categoria||'OUTROS'
       }));
      }}
     >
      <SelectTrigger className="h-11 rounded-xl bg-input">
       <SelectValue placeholder="Selecione..."/>
      </SelectTrigger>

      <SelectContent className="dark-pessoal rounded-xl bg-card">
       <ScrollArea className="h-48">
        {tiposDespesa.map((t,i)=>(
         <SelectItem key={i} value={t.nome_despesa}>
          {t.nome_despesa}
         </SelectItem>
        ))}
       </ScrollArea>
      </SelectContent>
     </Select>
    </div>

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
     <div className="space-y-2">
      <Label>Categoria</Label>
      <Input
       value={formData.categoria}
       readOnly
       disabled
       className="h-11 rounded-xl bg-muted text-muted-foreground"
      />
     </div>

     <div className="space-y-2">
      <Label>Data Compra</Label>
      <Input
       type="date"
       value={formData.data_compra}
       onChange={e=>setFormData({...formData,data_compra:e.target.value})}
       className="h-11 rounded-xl bg-input"
      />
     </div>
    </div>

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
     <div className="space-y-2">
      <Label>Vencimento</Label>
      <Input
       type="date"
       value={formData.data_vencimento}
       onChange={e=>setFormData({...formData,data_vencimento:e.target.value})}
       className="h-11 rounded-xl bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label>Valor</Label>
      <Input
       type="text"
       inputMode="numeric"
       value={formData.valor}
       onChange={e=>setFormData({...formData,valor:moneyInput(e.target.value)})}
       placeholder="R$ 0,00"
       className="h-11 rounded-xl bg-input font-semibold tabular-nums"
      />
     </div>
    </div>

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
     <div className="space-y-2">
      <Label>Pagamento</Label>

      <Select
       value={formData.forma_pagamento}
       onValueChange={v=>setFormData({...formData,forma_pagamento:v})}
      >
       <SelectTrigger className="h-11 rounded-xl bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal rounded-xl bg-card">
        <SelectItem value="Boleto">Boleto</SelectItem>
        <SelectItem value="Cartão">Cartão</SelectItem>
        <SelectItem value="Pix">Pix</SelectItem>
        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
       </SelectContent>
      </Select>
     </div>

     <div className="space-y-2">
      <Label>Parcelas</Label>

      <Input
       type="number"
       min="1"
       value={formData.parcelas}
       onChange={e=>setFormData({...formData,parcelas:parseInt(e.target.value,10)||1})}
       disabled={formData.forma_pagamento!=='Cartão'}
       className="h-11 rounded-xl bg-input"
      />
     </div>
    </div>

   </ModalLancamentoPadrao>

   <AlertDialog
    open={!!itemToDelete}
    onOpenChange={open=>{
     if(!open)setItemToDelete(null);
    }}
   >
    <AlertDialogContent className="dark-pessoal bg-card border-border">
     <AlertDialogHeader>
      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
      <AlertDialogDescription>
       Deseja remover esta despesa?
      </AlertDialogDescription>
     </AlertDialogHeader>

     <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>

      <AlertDialogAction
       onClick={del}
       className="bg-red-600 text-white hover:bg-red-700"
      >
       Deletar
      </AlertDialogAction>
     </AlertDialogFooter>
    </AlertDialogContent>
   </AlertDialog>

  </React.Fragment>
 );
};

export default DespesaPrevista;
