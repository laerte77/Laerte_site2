import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,Search,UserMinus,Download,Users,DollarSign,TrendingUp,CalendarDays,RotateCcw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/pessoal/ModalLancamentoPadrao';
import{exportToExcel}from'@/lib/ExportUtils';

const TZ='America/Sao_Paulo';
const BLUE='hsl(var(--neon-pessoal))';

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{
  timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'
 }).formatToParts(new Date()),v={};

 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d
  ?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100)
  :'';
};

const moneyShow=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL'
}).format(Number(v)||0);

const brDate=d=>d
 ?new Date(d).toLocaleDateString('pt-BR',{timeZone:'UTC'})
 :'—';

const LancamentoDevedores=()=>{
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);

 const[devedores,setDevedores]=useState([]);
 const[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[isSearchModalOpen,setIsSearchModalOpen]=useState(false);
 const[currentDevedor,setCurrentDevedor]=useState(null);
 const[searchTerm,setSearchTerm]=useState('');
 const[currentPage,setCurrentPage]=useState(1);

 const[formData,setFormData]=useState({
  data:getBRDate(),
  valor:'',
  pessoa:'',
  data_vencimento:''
 });

 const pageSize=10;

 useEffect(()=>{
  mounted.current=true;
  return()=>{mounted.current=false};
 },[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  try{
   const{data,error}=await supabase
    .from('pessoal_devedores')
    .select('*')
    .eq('user_id',user.id)
    .order('data',{ascending:false});

   if(error)throw error;
   if(!mounted.current)return;

   setDevedores(data||[]);
  }catch(error){
   if(!mounted.current)return;

   toast({
    title:'Erro',
    variant:'destructive',
    description:error.message||'Não foi possível carregar os devedores.'
   });
  }finally{
   if(mounted.current)setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_devedores_changes')
   .on(
    'postgres_changes',
    {
     event:'*',
     schema:'public',
     table:'pessoal_devedores'
    },
    fetchData
   )
   .subscribe();

  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const filtered=useMemo(()=>{
  const term=searchTerm.trim().toLowerCase();

  if(!term)return devedores;

  return devedores.filter(item=>
   (item.pessoa||'').toLowerCase().includes(term)
  );
 },[devedores,searchTerm]);

 useEffect(()=>{setCurrentPage(1)},[searchTerm]);

 const total=useMemo(
  ()=>filtered.reduce((sum,item)=>sum+Number(item.valor||0),0),
  [filtered]
 );

 const average=filtered.length?total/filtered.length:0;

 const biggest=filtered.length
  ?Math.max(...filtered.map(item=>Number(item.valor||0)))
  :0;

 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));

 const paginated=filtered.slice(
  (currentPage-1)*pageSize,
  currentPage*pageSize
 );

 const resetForm=()=>{
  setFormData({
   data:getBRDate(),
   valor:'',
   pessoa:'',
   data_vencimento:''
  });
  setCurrentDevedor(null);
 };

 const openDialog=item=>{
  if(item){
   setCurrentDevedor(item);

   setFormData({
    data:item.data||getBRDate(),
    valor:money(item.valor),
    pessoa:item.pessoa||'',
    data_vencimento:item.data_vencimento||''
   });
  }else{
   resetForm();
  }

  setIsDialogOpen(true);
 };

 const closeDialog=()=>{
  setIsDialogOpen(false);
  resetForm();
 };

 const handleSave=async()=>{
  if(
   !formData.data||
   !formData.valor||
   !formData.pessoa||
   !formData.data_vencimento
  ){
   toast({
    title:'Campos obrigatórios',
    description:'Preencha todos os campos.',
    variant:'destructive'
   });
   return;
  }

  const valor=Number(String(formData.valor).replace(/\D/g,''))/100;

  if(!valor||valor<=0){
   toast({
    title:'Valor inválido',
    description:'Informe um valor válido.',
    variant:'destructive'
   });
   return;
  }

  const dataToSave={
   data:formData.data,
   valor,
   pessoa:formData.pessoa,
   data_vencimento:formData.data_vencimento,
   user_id:user.id
  };

  try{
   const result=currentDevedor
    ?await supabase
      .from('pessoal_devedores')
      .update(dataToSave)
      .eq('id',currentDevedor.id)
      .eq('user_id',user.id)
    :await supabase
      .from('pessoal_devedores')
      .insert(dataToSave);

   if(result.error)throw result.error;
   if(!mounted.current)return;

   toast({
    title:'Sucesso',
    description:currentDevedor
     ?'Devedor atualizado.'
     :'Novo devedor registrado.'
   });

   closeDialog();
   fetchData();
  }catch(error){
   if(!mounted.current)return;

   toast({
    title:'Erro',
    variant:'destructive',
    description:error.message||'Não foi possível salvar.'
   });
  }
 };

 const handleDelete=async id=>{
  try{
   const{error}=await supabase
    .from('pessoal_devedores')
    .delete()
    .eq('id',id)
    .eq('user_id',user.id);

   if(error)throw error;
   if(!mounted.current)return;

   toast({
    title:'Removido',
    description:'Devedor removido.'
   });

   fetchData();
  }catch(error){
   if(!mounted.current)return;

   toast({
    title:'Erro ao remover',
    variant:'destructive',
    description:error.message||'Não foi possível remover.'
   });
  }
 };

 const handleExport=()=>{
  if(!filtered.length){
   toast({
    title:'Sem dados',
    description:'Não há devedores para exportar.',
    variant:'destructive'
   });
   return;
  }

  exportToExcel(
   filtered.map(item=>({
    Pessoa:item.pessoa,
    Data:brDate(item.data),
    Vencimento:brDate(item.data_vencimento),
    Valor:Number(item.valor||0)
   })),
   'Banco_Devedores',
   'Devedores'
  );
 };

 const limpar=()=>{
  setSearchTerm('');
 };

 const stats=[
  {label:'Devedores',value:filtered.length,icon:Users},
  {label:'Total a Receber',value:moneyShow(total),icon:DollarSign},
  {label:'Média',value:moneyShow(average),icon:TrendingUp},
  {label:'Maior Valor',value:moneyShow(biggest),icon:CalendarDays}
 ];

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-pessoal space-y-5"
  >

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
      Finanças Pessoais
     </p>

     <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
      Banco de Devedores
     </h1>

     <p className="text-sm text-muted-foreground">
      Controle dos valores que você tem a receber.
     </p>
    </div>

    <div className="flex flex-wrap gap-2">

     <Button
      variant="outline"
      onClick={handleExport}
      className="border-border hover:border-[hsl(var(--neon-pessoal)/.5)] hover:text-[hsl(var(--neon-pessoal))]"
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      variant="outline"
      onClick={()=>setIsSearchModalOpen(true)}
      className="border-border hover:border-[hsl(var(--neon-pessoal)/.5)] hover:text-[hsl(var(--neon-pessoal))]"
     >
      <Search className="mr-2 h-4 w-4"/>
      Buscar
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="bg-[hsl(var(--neon-pessoal))] text-white shadow-lg shadow-[hsl(var(--neon-pessoal)/.2)] hover:opacity-90"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Devedor
     </Button>

    </div>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {stats.map(({label,value,icon:Icon})=>(
     <Card key={label} className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-4">

       <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
         {label}
        </p>

        <p className="mt-1 text-xl font-bold text-[hsl(var(--neon-pessoal))] tabular-nums">
         {value}
        </p>
       </div>

       <div className="rounded-xl bg-[hsl(var(--neon-pessoal)/.1)] p-2.5 text-[hsl(var(--neon-pessoal))]">
        <Icon className="h-5 w-5"/>
       </div>

      </CardContent>
     </Card>
    ))}
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">

     <div className="flex flex-col gap-3 sm:flex-row sm:items-center">

      <div className="relative min-w-0 flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

       <Input
        placeholder="Buscar por nome da pessoa..."
        value={searchTerm}
        onChange={e=>setSearchTerm(e.target.value)}
        className="h-10 bg-input pl-9"
       />
      </div>

      <Button
       variant="outline"
       onClick={limpar}
       className="h-10 border-border"
      >
       <RotateCcw className="mr-2 h-4 w-4"/>
       Limpar
      </Button>

     </div>
    </CardContent>
   </Card>

   <SearchableModal
    isOpen={isSearchModalOpen}
    onClose={()=>setIsSearchModalOpen(false)}
    onSelect={item=>{
     openDialog(item);
     setIsSearchModalOpen(false);
    }}
    tableName="pessoal_devedores"
    searchField="pessoa"
    displayFields={[
     {key:'pessoa',label:'Pessoa'},
     {key:'data_vencimento',label:'Vencimento',format:brDate},
     {key:'valor',label:'Valor',format:moneyShow}
    ]}
    title="Buscar Devedor"
   />

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={currentDevedor?'Editar Devedor':'Novo Devedor'}
    description="Preencha os dados da pessoa e do valor devido."
    icon={UserMinus}
    theme="blue"
    footer={
     <>
      <Button
       variant="outline"
       onClick={closeDialog}
       className="h-10 rounded-xl"
      >
       Cancelar
      </Button>

      <Button
       onClick={handleSave}
       className="h-10 rounded-xl bg-[hsl(var(--neon-pessoal))] px-7 font-semibold text-white hover:opacity-90"
      >
       {currentDevedor?'Salvar Alterações':'Salvar'}
      </Button>
     </>
    }
   >

    <div className="space-y-5">

     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

      <div className="space-y-2">
       <Label>Data</Label>

       <Input
        type="date"
        value={formData.data}
        onChange={e=>setFormData(p=>({...p,data:e.target.value}))}
        className="h-11 rounded-xl bg-input"
       />
      </div>

      <div className="space-y-2">
       <Label>Valor</Label>

       <Input
        type="text"
        inputMode="numeric"
        value={formData.valor}
        onChange={e=>setFormData(p=>({...p,valor:money(e.target.value)}))}
        placeholder="R$ 0,00"
        className="h-11 rounded-xl bg-input font-semibold tabular-nums"
       />
      </div>

     </div>

     <div className="space-y-2">
      <Label>Pessoa</Label>

      <Input
       value={formData.pessoa}
       onChange={e=>setFormData(p=>({...p,pessoa:e.target.value}))}
       placeholder="Nome da pessoa"
       className="h-11 rounded-xl bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label>Vencimento</Label>

      <Input
       type="date"
       value={formData.data_vencimento}
       onChange={e=>setFormData(p=>({...p,data_vencimento:e.target.value}))}
       className="h-11 rounded-xl bg-input"
      />
     </div>

    </div>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardContent className="p-0">

     <div className="overflow-x-auto">
      <table className="w-full text-sm">

       <thead>
        <tr className="border-b border-border bg-secondary/30">

         <th className="p-4 text-left font-semibold text-muted-foreground">
          Pessoa
         </th>

         <th className="p-4 text-left font-semibold text-muted-foreground">
          Data
         </th>

         <th className="p-4 text-left font-semibold text-muted-foreground">
          Vencimento
         </th>

         <th className="p-4 text-right font-semibold text-muted-foreground">
          Valor
         </th>

         <th className="p-4 text-center font-semibold text-muted-foreground">
          Ações
         </th>

        </tr>
       </thead>

       <tbody>

        {loading?(
         <tr>
          <td colSpan={5} className="p-12 text-center text-muted-foreground">
           Carregando devedores...
          </td>
         </tr>
        ):paginated.length===0?(
         <tr>
          <td colSpan={5} className="p-12 text-center">

           <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Users className="h-8 w-8 opacity-40"/>
            <span>Nenhum devedor encontrado.</span>
           </div>

          </td>
         </tr>
        ):(
         paginated.map(item=>(
          <tr
           key={item.id}
           className="border-b border-border transition-colors hover:bg-muted/40"
          >

           <td className="p-4 font-medium">
            {item.pessoa}
           </td>

           <td className="p-4 text-muted-foreground">
            {brDate(item.data)}
           </td>

           <td className="p-4 text-muted-foreground">
            {brDate(item.data_vencimento)}
           </td>

           <td className="p-4 text-right font-bold text-[hsl(var(--neon-pessoal))] tabular-nums">
            {moneyShow(item.valor)}
           </td>

           <td className="p-4">
            <div className="flex justify-center gap-1">

             <Button
              variant="ghost"
              size="icon"
              onClick={()=>openDialog(item)}
              className="text-[hsl(var(--neon-pessoal))] hover:bg-[hsl(var(--neon-pessoal)/.1)]"
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <Button
              variant="ghost"
              size="icon"
              onClick={()=>handleDelete(item.id)}
              className="text-red-500 hover:bg-red-500/10"
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
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">

       <span>
        Mostrando {((currentPage-1)*pageSize)+1}–{Math.min(currentPage*pageSize,filtered.length)} de {filtered.length}
       </span>

       <div className="flex items-center gap-1">

        <Button
         variant="outline"
         size="sm"
         disabled={currentPage===1}
         onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}
         className="h-8"
        >
         Anterior
        </Button>

        <span className="px-2 text-xs">
         {currentPage} / {totalPages}
        </span>

        <Button
         variant="outline"
         size="sm"
         disabled={currentPage===totalPages}
         onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}
         className="h-8"
        >
         Próxima
        </Button>

       </div>
      </div>
     )}

    </CardContent>
   </Card>

  </motion.div>
 );
};

export default LancamentoDevedores;
