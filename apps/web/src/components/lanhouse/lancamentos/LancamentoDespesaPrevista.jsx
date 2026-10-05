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
import{isSameMonth,parseISO}from'date-fns';
import{normalizeString}from'@/lib/gastoRealUtils';
import{exportToExcel}from'@/lib/ExportUtils';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const TZ='America/Sao_Paulo';
const C='hsl(var(--neon-lanhouse))';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const years=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];
const money=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const roundMoney=v=>fromCents(toCents(v));

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{
  timeZone:TZ,
  year:'numeric',
  month:'2-digit',
  day:'2-digit'
 }).formatToParts(new Date());

 const v={};
 p.forEach(x=>{
  if(x.type!=='literal')v[x.type]=x.value;
 });

 return`${v.year}-${v.month}-${v.day}`;
};

const moneyInput=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?money.format(fromCents(Number(d))):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?fromCents(Number(d)):0;
};

const brDate=v=>{
 if(!v)return'-';

 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);

 if(m)return`${m[3]}/${m[2]}/${m[1]}`;

 const d=new Date(v);

 return Number.isNaN(d.getTime())
  ?'-'
  :new Intl.DateTimeFormat('pt-BR',{timeZone:TZ}).format(d);
};

const initial=()=>({
 data_compra:getBRDate(),
 descricao:'',
 data_vencimento:'',
 valor:'',
 forma_pagamento:'BOLETO',
 parcelas:1,
 categoria:'',
 status:'Pendente'
});

const StatCard=({icon:Icon,label,value})=>(
 <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
  <div className="flex items-center gap-3">
   <div
    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
    style={{
     border:'1px solid hsl(var(--neon-lanhouse) / .20)',
     background:'hsl(var(--neon-lanhouse) / .10)'
    }}
   >
    <Icon className="h-5 w-5" style={{color:C}}/>
   </div>

   <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
     {label}
    </p>

    <p className="mt-1 truncate text-xl font-bold" style={{color:C}}>
     {value}
    </p>
   </div>
  </div>
 </div>
);

export default function LancamentoDespesaPrevista(){
 const{toast}=useToast();
 const{user}=useAuth();

 const mounted=useRef(true);

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
  mounted.current=true;

  return()=>{
   mounted.current=false;
  };
 },[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  try{
   const[a,b]=await Promise.all([
    supabase
     .from('lm_despesas_previstas')
     .select('*')
     .eq('user_id',user.id)
     .order('data_vencimento',{ascending:false}),

    supabase
     .from('lm_despesas')
     .select('despesa,categoria')
     .eq('user_id',user.id)
     .order('despesa',{ascending:true})
   ]);

   if(!mounted.current)return;

   if(a.error)throw a.error;
   if(b.error)throw b.error;

   setDespesas(a.data||[]);
   setTiposDespesa(b.data||[]);
  }catch(e){
   if(mounted.current){
    toast({
     title:'Erro ao buscar dados',
     description:e.message,
     variant:'destructive'
    });
   }
  }finally{
   if(mounted.current){
    setLoading(false);
   }
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('lm_despesas_previstas_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'lm_despesas_previstas'
    },
    ()=>fetchData()
   )
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'lm_despesas'
    },
    ()=>fetchData()
   )
   .subscribe();

  return()=>{
   try{
    supabase.removeChannel(channel);
   }catch{}
  };
 },[user,fetchData]);

 useEffect(()=>{
  if(
   formData.descricao&&
   formData.data_vencimento&&
   !currentDespesa
  ){
   const n=normalizeString(formData.descricao);
   const d=parseISO(formData.data_vencimento);

   const dup=despesas.find(x=>
    n===normalizeString(x.descricao)&&
    x.data_vencimento&&
    isSameMonth(d,parseISO(x.data_vencimento))
   );

   setDuplicateWarning(
    dup
     ?`Atenção: Já existe uma despesa "${dup.descricao}" vencendo em ${brDate(dup.data_vencimento)}.`
     :null
   );
  }else{
   setDuplicateWarning(null);
  }
 },[
  formData.descricao,
  formData.data_vencimento,
  despesas,
  currentDespesa
 ]);

 const categories=useMemo(
  ()=>[
   'all',
   ...tiposDespesa
    .map(t=>t.categoria)
    .filter(Boolean)
    .filter((v,i,a)=>a.indexOf(v)===i)
  ],
  [tiposDespesa]
 );

 const filtered=useMemo(()=>{
  const q=search.trim().toLowerCase();

  return despesas.filter(item=>{
   const raw=String(item.data_vencimento||'');
   const itemYear=raw.slice(0,4);
   const itemMonth=
    raw.length>=7
     ?String(Number(raw.slice(5,7))-1)
     :'';

   const searchMatch=
    !q||
    item.descricao?.toLowerCase().includes(q)||
    item.categoria?.toLowerCase().includes(q);

   return(
    searchMatch&&
    (month==='all'||itemMonth===month)&&
    (year==='all'||itemYear===year)&&
    (category==='all'||item.categoria===category)&&
    (status==='all'||item.status===status)
   );
  });
 },[
  despesas,
  search,
  month,
  year,
  category,
  status
 ]);

 useEffect(()=>{
  setCurrentPage(1);
 },[
  search,
  month,
  year,
  category,
  status
 ]);

 const totalPrevistoC=filtered.reduce(
  (s,x)=>s+toCents(x.valor),
  0
 );

 const totalPagoC=filtered
  .filter(x=>x.status==='Pago')
  .reduce((s,x)=>s+toCents(x.valor),0);

 const totalPendenteC=filtered
  .filter(x=>x.status==='Pendente')
  .reduce((s,x)=>s+toCents(x.valor),0);

 const totalPrevisto=fromCents(totalPrevistoC);
 const totalPago=fromCents(totalPagoC);
 const totalPendente=fromCents(totalPendenteC);

 const totalPages=Math.max(
  1,
  Math.ceil(filtered.length/pageSize)
 );

 const paginated=useMemo(()=>{
  const start=(currentPage-1)*pageSize;

  return filtered.slice(
   start,
   start+pageSize
  );
 },[
  filtered,
  currentPage
 ]);

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
    data_compra:String(
     despesa.data_compra||getBRDate()
    ).slice(0,10),

    descricao:despesa.descricao||'',

    data_vencimento:String(
     despesa.data_vencimento||''
    ).slice(0,10),

    valor:moneyInput(despesa.valor),

    forma_pagamento:
     despesa.forma_pagamento||'BOLETO',

    parcelas:
     despesa.parcelas||1,

    categoria:
     despesa.categoria||'',

    status:
     despesa.status||'Pendente'
   });
  }else{
   resetForm();
  }

  setIsDialogOpen(true);
 };

 const save=async()=>{
  const valor=roundMoney(
   moneyNum(formData.valor)
  );

  if(
   !formData.descricao||
   !formData.data_vencimento||
   valor<=0
  ){
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
   parcelas:
    formData.forma_pagamento==='CARTÃO DE CRÉDITO'
     ?Number(formData.parcelas||1)
     :null
  };

  try{
   if(currentDespesa){
    const{error}=await supabase
     .from('lm_despesas_previstas')
     .update(dataToSave)
     .eq('id',currentDespesa.id)
     .eq('user_id',user.id);

    if(error)throw error;

    toast({
     title:'Sucesso!',
     description:'Despesa prevista atualizada.'
    });
   }else{
    const{error}=await supabase
     .from('lm_despesas_previstas')
     .insert(dataToSave);

    if(error)throw error;

    toast({
     title:'Sucesso!',
     description:'Despesa prevista registrada.'
    });
   }

   closeModal();
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
    .from('lm_despesas_previstas')
    .delete()
    .eq('id',itemToDelete.id)
    .eq('user_id',user.id);

   if(error)throw error;

   toast({
    title:'Removido',
    description:'Despesa removida com sucesso.'
   });

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
  const novo=
   currentStatus==='Pendente'
    ?'Pago'
    :'Pendente';

  try{
   const{error}=await supabase
    .from('lm_despesas_previstas')
    .update({status:novo})
    .eq('id',id)
    .eq('user_id',user.id);

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
    Valor:roundMoney(item.valor)
   })),
   'Despesas_Previstas_LM',
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
    className="dark-lm-impressoes space-y-4"
   >

    <div className="rounded-xl border border-border bg-card/70">
     <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex items-center gap-4">
       <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
        style={{
         border:'1px solid hsl(var(--neon-lanhouse) / .25)',
         background:'hsl(var(--neon-lanhouse) / .10)'
        }}
       >
        <CalendarClock
         className="h-7 w-7"
         style={{color:C}}
        />
       </div>

       <div>
        <p
         className="text-xs font-semibold uppercase tracking-[.2em]"
         style={{color:C}}
        >
         LM Impressões
        </p>

        <h1
         className="text-2xl font-bold tracking-tight"
         style={{color:C}}
        >
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
        style={{color:C}}
       >
        <Download className="mr-2 h-4 w-4"/>
        Excel
       </Button>

       <Button
        variant="outline"
        onClick={()=>setIsSearchModalOpen(true)}
        className="border-border bg-transparent"
        style={{color:C}}
       >
        <Search className="mr-2 h-4 w-4"/>
        Selecionar
       </Button>

       <Button
        onClick={()=>openDialog()}
        className="text-slate-950"
        style={{background:C}}
       >
        <Plus className="mr-2 h-4 w-4"/>
        Novo Lançamento
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

      <Select
       value={month}
       onValueChange={setMonth}
      >
       <SelectTrigger className="h-11 border-border bg-input">
        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground"/>
        <SelectValue placeholder="Mês"/>
       </SelectTrigger>

       <SelectContent className="dark-lm-impressoes border-border bg-card">
        <SelectItem value="all">
         Todos os Meses
        </SelectItem>

        {meses.map((m,i)=>(
         <SelectItem
          key={i}
          value={String(i)}
         >
          {m}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>

      <Select
       value={year}
       onValueChange={setYear}
      >
       <SelectTrigger className="h-11 border-border bg-input">
        <SelectValue placeholder="Ano"/>
       </SelectTrigger>

       <SelectContent className="dark-lm-impressoes border-border bg-card">
        {years.map(y=>(
         <SelectItem
          key={y}
          value={String(y)}
         >
          {y}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>

      <Select
       value={category}
       onValueChange={setCategory}
      >
       <SelectTrigger className="h-11 border-border bg-input">
        <SelectValue placeholder="Categoria"/>
       </SelectTrigger>

       <SelectContent className="dark-lm-impressoes border-border bg-card">
        <SelectItem value="all">
         Todas as Categorias
        </SelectItem>

        {categories
         .filter(c=>c!=='all')
         .map(c=>(
          <SelectItem
           key={c}
           value={c}
          >
           {c}
          </SelectItem>
         ))}
       </SelectContent>
      </Select>

      <Select
       value={status}
       onValueChange={setStatus}
      >
       <SelectTrigger className="h-11 border-border bg-input">
        <SelectValue placeholder="Status"/>
       </SelectTrigger>

       <SelectContent className="dark-lm-impressoes border-border bg-card">
        <SelectItem value="all">
         Todos os Status
        </SelectItem>

        <SelectItem value="Pendente">
         Pendente
        </SelectItem>

        <SelectItem value="Pago">
         Pago
        </SelectItem>
       </SelectContent>
      </Select>

      <Button
       variant="outline"
       onClick={clearFilters}
       className="h-11 border-border"
      >
       <Filter className="mr-2 h-4 w-4"/>
       Limpar
      </Button>
     </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
     <StatCard
      icon={FileText}
      label="Total de Registros"
      value={filtered.length}
     />

     <StatCard
      icon={DollarSign}
      label="Total Previsto"
      value={money.format(totalPrevisto)}
     />

     <StatCard
      icon={ArrowDownRight}
      label="Total Pago"
      value={money.format(totalPago)}
     />

     <StatCard
      icon={WalletCards}
      label="Total Pendente"
      value={money.format(totalPendente)}
     />
    </div>

    <div className="overflow-hidden rounded-xl border border-border bg-card/70">
     <div className="overflow-x-auto">
      <table className="w-full text-sm">
       <thead>
        <tr className="border-b border-border bg-secondary/30">
         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
          Vencimento
         </th>

         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
          Descrição
         </th>

         <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
          Categoria
         </th>

         <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
          Valor
         </th>

         <th className="px-4 py-3 text-center font-semibold text-muted-foreground">
          Status
         </th>

         <th className="px-4 py-3 text-right font-semibold text-muted-foreground">
          Ações
         </th>
        </tr>
       </thead>

       <tbody>
        {loading?(
         <tr>
          <td
           colSpan="6"
           className="px-4 py-10 text-center text-muted-foreground"
          >
           Carregando lançamentos...
          </td>
         </tr>
        ):paginated.length===0?(
         <tr>
          <td colSpan="6" className="px-4 py-12">
           <div className="flex flex-col items-center justify-center gap-2 text-center">

            <CalendarClock
             className="h-10 w-10"
             style={{color:C}}
            />

            <p className="font-semibold text-foreground">
             Nenhum lançamento encontrado
            </p>

            <p className="text-sm text-muted-foreground">
             Não existem despesas previstas para os filtros selecionados.
            </p>

            <Button
             variant="outline"
             size="sm"
             onClick={clearFilters}
             className="mt-2"
            >
             <Filter className="mr-2 h-4 w-4"/>
             Limpar Filtros
            </Button>
           </div>
          </td>
         </tr>
        ):(
         paginated.map(d=>(
          <tr
           key={d.id}
           className="border-b border-border transition-colors last:border-b-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]"
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
             className="border-[hsl(var(--neon-lanhouse)/.25)] bg-[hsl(var(--neon-lanhouse)/.08)]"
             style={{color:C}}
            >
             {d.categoria||'OUTROS'}
            </Badge>
           </td>

           <td
            className="px-4 py-4 text-right font-bold"
            style={{color:C}}
           >
            {money.format(roundMoney(d.valor))}
           </td>

           <td className="px-4 py-4 text-center">
            <Badge
             variant="outline"
             className={`cursor-pointer ${
              d.status==='Pago'
               ?'border-green-500/30 bg-green-500/10 text-green-400'
               :'border-[hsl(var(--neon-lanhouse)/.30)] bg-[hsl(var(--neon-lanhouse)/.08)]'
             }`}
             onClick={()=>toggleStatus(d.id,d.status)}
             style={
              d.status==='Pago'
               ?undefined
               :{color:C}
             }
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
              className="hover:bg-[hsl(var(--neon-lanhouse)/.10)]"
              style={{color:C}}
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
        Mostrando{' '}
        {Math.min(
         (currentPage-1)*pageSize+1,
         filtered.length
        )}{' '}
        a{' '}
        {Math.min(
         currentPage*pageSize,
         filtered.length
        )}{' '}
        de {filtered.length} registros
       </div>

       <div className="flex items-center gap-2">

        <Button
         variant="outline"
         size="sm"
         disabled={currentPage===1}
         onClick={()=>
          setCurrentPage(p=>Math.max(1,p-1))
         }
        >
         <ChevronLeft className="mr-1 h-4 w-4"/>
         Anterior
        </Button>

        <div
         className="flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-semibold text-slate-950"
         style={{background:C}}
        >
         {currentPage}
        </div>

        <Button
         variant="outline"
         size="sm"
         disabled={currentPage>=totalPages}
         onClick={()=>
          setCurrentPage(p=>Math.min(totalPages,p+1))
         }
        >
         Próxima
         <ChevronRight className="ml-1 h-4 w-4"/>
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
    tableName="lm_despesas_previstas"
    searchField="descricao"
    displayFields={[
     {
      key:'descricao',
      label:'Descrição'
     },
     {
      key:'data_vencimento',
      label:'Vencimento',
      format:brDate
     },
     {
      key:'valor',
      label:'Valor',
      format:v=>money.format(roundMoney(v))
     }
    ]}
    title="Buscar Despesa Prevista"
   />

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeModal}
    title={
     currentDespesa
      ?'Editar Despesa Prevista'
      :'Nova Despesa Prevista'
    }
    description="Preencha as informações da conta a pagar."
    icon={WalletCards}
    theme="cyan"
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
       className="h-10 rounded-xl px-7 font-semibold text-slate-950"
       style={{background:C}}
      >
       {currentDespesa
        ?'Salvar Alterações'
        :'Salvar Despesa'}
      </Button>
     </>
    }
   >

    {duplicateWarning&&(
     <div
      className="flex items-start gap-2 rounded-xl border p-3 text-sm"
      style={{
       borderColor:'hsl(45 100% 50% / .40)',
       background:'hsl(45 100% 50% / .10)',
       color:'hsl(45 100% 65%)'
      }}
     >
      <AlertTriangle className="h-5 w-5 shrink-0"/>
      <p>{duplicateWarning}</p>
     </div>
    )}

    <div className="space-y-2">
     <Label>Descrição</Label>

     <Select
      value={formData.descricao}
      onValueChange={v=>{
       const t=tiposDespesa.find(
        x=>x.despesa===v
       );

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

      <SelectContent className="dark-lm-impressoes rounded-xl bg-card">
       <ScrollArea className="h-48">
        {tiposDespesa.map((t,i)=>(
         <SelectItem
          key={`${t.despesa}-${t.categoria||i}`}
          value={t.despesa}
         >
          {t.despesa}
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
       onChange={e=>
        setFormData({
         ...formData,
         data_compra:e.target.value
        })
       }
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
       onChange={e=>
        setFormData({
         ...formData,
         data_vencimento:e.target.value
        })
       }
       className="h-11 rounded-xl bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label>Valor</Label>

      <Input
       type="text"
       inputMode="numeric"
       value={formData.valor}
       onChange={e=>
        setFormData({
         ...formData,
         valor:moneyInput(e.target.value)
        })
       }
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
       onValueChange={v=>
        setFormData({
         ...formData,
         forma_pagamento:v
        })
       }
      >
       <SelectTrigger className="h-11 rounded-xl bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-lm-impressoes rounded-xl bg-card">
        <SelectItem value="BOLETO">
         Boleto
        </SelectItem>

        <SelectItem value="CARTÃO DE CRÉDITO">
         Cartão de Crédito
        </SelectItem>

        <SelectItem value="PIX">
         PIX
        </SelectItem>

        <SelectItem value="DINHEIRO">
         Dinheiro
        </SelectItem>
       </SelectContent>
      </Select>
     </div>

     <div className="space-y-2">
      <Label>Parcelas</Label>

      <Input
       type="number"
       min="1"
       value={formData.parcelas}
       onChange={e=>
        setFormData({
         ...formData,
         parcelas:parseInt(
          e.target.value,
          10
         )||1
        })
       }
       disabled={
        formData.forma_pagamento!=='CARTÃO DE CRÉDITO'
       }
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
    <AlertDialogContent className="dark-lm-impressoes bg-card border-border">
     <AlertDialogHeader>
      <AlertDialogTitle>
       Confirmar Exclusão
      </AlertDialogTitle>

      <AlertDialogDescription>
       Deseja remover esta despesa?
      </AlertDialogDescription>
     </AlertDialogHeader>

     <AlertDialogFooter>
      <AlertDialogCancel>
       Cancelar
      </AlertDialogCancel>

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
}
