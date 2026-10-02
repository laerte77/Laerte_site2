import React,{useState,useEffect,useCallback,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,Search,UserMinus}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import ModalLancamentoPadrao from'@/components/pessoal/ModalLancamentoPadrao';

const TZ='America/Sao_Paulo';

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{
  timeZone:TZ,
  year:'numeric',
  month:'2-digit',
  day:'2-digit'
 }).formatToParts(new Date()),v={};

 p.forEach(x=>{
  if(x.type!=='literal')v[x.type]=x.value;
 });

 return`${v.year}-${v.month}-${v.day}`;
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d
  ?new Intl.NumberFormat('pt-BR',{
    style:'currency',
    currency:'BRL'
   }).format(Number(d)/100)
  :'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const moneyShow=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL'
}).format(Number(v)||0);

const brDate=d=>new Date(d).toLocaleDateString('pt-BR',{
 timeZone:'UTC'
});

const LancamentoDevedores=()=>{
 const{toast}=useToast();
 const{user}=useAuth();
 const isMountedRef=useRef(true);

 const[devedores,setDevedores]=useState([]);
 const[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[isSearchModalOpen,setIsSearchModalOpen]=useState(false);
 const[currentDevedor,setCurrentDevedor]=useState(null);

 const[formData,setFormData]=useState({
  data:getBRDate(),
  valor:'',
  pessoa:'',
  data_vencimento:''
 });

 useEffect(()=>{
  isMountedRef.current=true;
  return()=>{
   isMountedRef.current=false;
  };
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

   if(!isMountedRef.current)return;
   if(error)throw error;

   setDevedores(data||[]);
  }catch(error){
   if(!isMountedRef.current)return;

   toast({
    title:'Erro',
    variant:'destructive',
    description:error.message||'Não foi possível carregar os devedores.'
   });
  }finally{
   if(isMountedRef.current)setLoading(false);
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

 const resetForm=()=>{
  setFormData({
   data:getBRDate(),
   valor:'',
   pessoa:'',
   data_vencimento:''
  });

  setCurrentDevedor(null);
 };

 const handleSave=async()=>{
  if(
   !formData.data||
   !formData.valor||
   !formData.pessoa||
   !formData.data_vencimento
  ){
   toast({
    title:'Erro',
    description:'Todos os campos são obrigatórios.',
    variant:'destructive'
   });
   return;
  }

  const valor=moneyNum(formData.valor);

  if(valor<=0){
   toast({
    title:'Erro',
    description:'Informe um valor válido.',
    variant:'destructive'
   });
   return;
  }

  const dataToSave={
   ...formData,
   valor,
   user_id:user.id
  };

  try{
   const{error}=currentDevedor
    ?await supabase
      .from('pessoal_devedores')
      .update(dataToSave)
      .eq('id',currentDevedor.id)
    :await supabase
      .from('pessoal_devedores')
      .insert(dataToSave);

   if(!isMountedRef.current)return;
   if(error)throw error;

   toast({
    title:'Sucesso',
    description:currentDevedor
     ?'Devedor atualizado.'
     :'Novo devedor registrado.'
   });

   resetForm();
   fetchData();
  }catch(error){
   if(!isMountedRef.current)return;

   toast({
    title:'Erro',
    variant:'destructive',
    description:error.message||'Não foi possível salvar.'
   });
  }
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

 const handleDelete=async id=>{
  try{
   const{error}=await supabase
    .from('pessoal_devedores')
    .delete()
    .eq('id',id);

   if(error)throw error;
   if(!isMountedRef.current)return;

   toast({
    title:'Removido',
    description:'Devedor removido.'
   });

   fetchData();
  }catch(error){
   if(!isMountedRef.current)return;

   toast({
    title:'Erro ao remover',
    variant:'destructive',
    description:error.message||'Não foi possível remover.'
   });
  }
 };

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-pessoal space-y-6"
  >

   <div className="flex items-center justify-between">

    <div>
     <h2 className="bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-3xl font-bold text-transparent">
      Banco de Devedores
     </h2>
    </div>

    <div className="flex gap-2">

     <Button
      onClick={()=>setIsSearchModalOpen(true)}
      variant="outline"
      className="border-blue-500 text-blue-500 hover:bg-blue-500/10"
     >
      <Search className="mr-2 h-4 w-4"/>
      Buscar
     </Button>

     <Button
      onClick={()=>openDialog()}
      className="bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Devedor
     </Button>

    </div>
   </div>

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
     {
      key:'pessoa',
      label:'Pessoa'
     },
     {
      key:'data_vencimento',
      label:'Vencimento',
      format:brDate
     },
     {
      key:'valor',
      label:'Valor',
      format:moneyShow
     }
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
       className="h-10 rounded-xl bg-blue-600 px-7 font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700"
      >
       Salvar
      </Button>
     </>
    }
   >

    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

     <div className="space-y-2">
      <Label>Data</Label>

      <Input
       type="date"
       value={formData.data}
       onChange={e=>setFormData({
        ...formData,
        data:e.target.value
       })}
       className="h-11 rounded-xl bg-input"
      />
     </div>

     <div className="space-y-2">
      <Label>Valor</Label>

      <Input
       type="text"
       inputMode="decimal"
       value={formData.valor}
       onChange={e=>setFormData({
        ...formData,
        valor:money(e.target.value)
       })}
       placeholder="R$ 0,00"
       className="h-11 rounded-xl bg-input font-semibold tabular-nums"
      />
     </div>

    </div>

    <div className="space-y-2">
     <Label>Pessoa</Label>

     <Input
      type="text"
      value={formData.pessoa}
      onChange={e=>setFormData({
       ...formData,
       pessoa:e.target.value
      })}
      placeholder="Nome"
      className="h-11 rounded-xl bg-input"
     />
    </div>

    <div className="space-y-2">
     <Label>Vencimento</Label>

     <Input
      type="date"
      value={formData.data_vencimento}
      onChange={e=>setFormData({
       ...formData,
       data_vencimento:e.target.value
      })}
      className="h-11 rounded-xl bg-input"
     />
    </div>

   </ModalLancamentoPadrao>

   <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">

    <div className="overflow-x-auto">

     <table className="w-full text-sm">

      <thead>
       <tr className="border-b border-border bg-secondary/50">

        <th className="p-4 text-left font-semibold text-muted-foreground">
         Pessoa
        </th>

        <th className="p-4 text-left font-semibold text-muted-foreground">
         Vencimento
        </th>

        <th className="p-4 text-right font-semibold text-muted-foreground">
         Valor
        </th>

        <th className="p-4 text-right font-semibold text-muted-foreground">
         Ações
        </th>

       </tr>
      </thead>

      <tbody>

       {loading?(
        <tr>
         <td colSpan="4" className="p-8 text-center">
          Carregando...
         </td>
        </tr>
       ):devedores.length===0?(
        <tr>
         <td
          colSpan="4"
          className="p-8 text-center text-muted-foreground"
         >
          Nenhum devedor registrado.
         </td>
        </tr>
       ):(
        devedores.map(item=>(
         <tr
          key={item.id}
          className="border-b border-border hover:bg-secondary/50"
         >

          <td className="p-4">
           {item.pessoa}
          </td>

          <td className="p-4">
           {brDate(item.data_vencimento)}
          </td>

          <td className="p-4 text-right font-semibold text-green-400">
           {moneyShow(item.valor)}
          </td>

          <td className="flex justify-end gap-2 p-4">

           <Button
            variant="ghost"
            size="icon"
            onClick={()=>openDialog(item)}
           >
            <Edit className="h-4 w-4 text-blue-500"/>
           </Button>

           <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            onClick={()=>handleDelete(item.id)}
           >
            <Trash className="h-4 w-4 text-red-500"/>
           </Button>

          </td>

         </tr>
        ))
       )}

      </tbody>
     </table>

    </div>
   </div>

  </motion.div>
 );
};

export default LancamentoDevedores;
