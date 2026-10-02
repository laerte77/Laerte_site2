import React,{useState,useEffect,useCallback,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,TrendingUp}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'../ModalLancamentoPadrao';

const TZ='America/Sao_Paulo';

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const moeda=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));

const Rendimentos=()=>{
 const{toast}=useToast();
 const{user}=useAuth();
 const mounted=useRef(true);

 const[rendimentos,setRendimentos]=useState([]);
 const[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false);
 const[currentRendimento,setCurrentRendimento]=useState(null);

 const[formData,setFormData]=useState({
  data:getBRDate(),
  banco:'',
  rendimento_bruto:'',
  iof:'',
  ir:''
 });

 useEffect(()=>{
  mounted.current=true;
  return()=>{mounted.current=false};
 },[]);

 const resetForm=useCallback(()=>{
  setFormData({
   data:getBRDate(),
   banco:'',
   rendimento_bruto:'',
   iof:'',
   ir:''
  });
  setCurrentRendimento(null);
 },[]);

 const closeDialog=useCallback(()=>{
  setIsDialogOpen(false);
  resetForm();
 },[resetForm]);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const{data,error}=await supabase
   .from('rendimentos')
   .select('*')
   .eq('user_id',user.id)
   .order('data',{ascending:false});

  if(!mounted.current)return;

  if(error){
   toast({
    title:'Erro ao buscar rendimentos',
    description:error.message,
    variant:'destructive'
   });
  }else{
   setRendimentos(data||[]);
  }

  setLoading(false);
 },[user,toast]);

 useEffect(()=>{
  fetchData();

  if(!user)return;

  const channel=supabase
   .channel('pessoal_rendimentos_changes')
   .on('postgres_changes',{event:'*',schema:'public',table:'rendimentos'},fetchData)
   .subscribe();

  return()=>{supabase.removeChannel(channel)};
 },[user,fetchData]);

 const openDialog=rendimento=>{
  if(rendimento){
   setCurrentRendimento(rendimento);

   setFormData({
    data:String(rendimento.data||'').slice(0,10)||getBRDate(),
    banco:rendimento.banco||'',
    rendimento_bruto:money(Number(rendimento.rendimento_bruto||0)*100),
    iof:money(Number(rendimento.iof||0)*100),
    ir:money(Number(rendimento.ir||0)*100)
   });
  }else{
   resetForm();
  }

  setIsDialogOpen(true);
 };

 const handleSave=async e=>{
  e.preventDefault();

  const rendimentoBruto=moneyNum(formData.rendimento_bruto);
  const iof=moneyNum(formData.iof);
  const ir=moneyNum(formData.ir);
  const rendimentoLiquido=rendimentoBruto-iof-ir;

  if(!formData.data||!formData.banco.trim()||rendimentoBruto<=0){
   toast({
    title:'Campos obrigatórios',
    description:'Data, banco e rendimento bruto são obrigatórios.',
    variant:'destructive'
   });
   return;
  }

  if(iof+rendimentoBruto*0<0||ir<0){
   toast({
    title:'Valores inválidos',
    description:'IOF e IR não podem ser negativos.',
    variant:'destructive'
   });
   return;
  }

  if(rendimentoLiquido<0){
   toast({
    title:'Valores inválidos',
    description:'O rendimento líquido não pode ser negativo.',
    variant:'destructive'
   });
   return;
  }

  const dataToSave={
   data:formData.data,
   banco:formData.banco.trim(),
   rendimento_bruto:rendimentoBruto,
   iof,
   ir,
   rendimento_liquido:rendimentoLiquido,
   user_id:user.id
  };

  try{
   if(currentRendimento){
    const{error}=await supabase
     .from('rendimentos')
     .update(dataToSave)
     .eq('id',currentRendimento.id);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Rendimento atualizado.'
    });
   }else{
    const{error}=await supabase
     .from('rendimentos')
     .insert(dataToSave);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Novo rendimento registrado.'
    });
   }

   resetForm();
   fetchData();
  }catch(error){
   toast({
    title:'Erro',
    description:error.message||'Não foi possível salvar o rendimento.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async id=>{
  const{error}=await supabase
   .from('rendimentos')
   .delete()
   .eq('id',id);

  if(error){
   toast({
    title:'Erro ao remover',
    description:error.message,
    variant:'destructive'
   });
  }else{
   toast({
    title:'Removido',
    description:'Rendimento removido.'
   });

   fetchData();
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
     <h2 className="text-3xl font-bold text-[hsl(var(--neon-pessoal))]">
      Rendimentos
     </h2>

     <p className="text-muted-foreground">
      Registre os rendimentos dos seus investimentos.
     </p>
    </div>

    <Button
     onClick={()=>openDialog()}
     className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]"
    >
     <Plus className="mr-2 h-4 w-4"/>
     Novo Rendimento
    </Button>
   </div>

   <ModalLancamentoPadrao
    open={isDialogOpen}
    onClose={closeDialog}
    title={currentRendimento?'Editar Rendimento':'Novo Rendimento'}
    description="Preencha os dados do rendimento."
    icon={TrendingUp}
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
       form="form-rendimento"
       className="h-11 rounded-xl bg-[hsl(var(--neon-pessoal))] px-6 font-semibold text-white shadow-[0_0_18px_hsl(var(--neon-pessoal)/.22)] hover:bg-[hsl(var(--neon-pessoal)/.88)]"
      >
       {currentRendimento?'Salvar Alterações':'Salvar Rendimento'}
      </Button>
     </>
    }
   >
    <form
     id="form-rendimento"
     onSubmit={handleSave}
     className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
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
         required
        />
       </div>

       <div className="space-y-2">
        <Label>Banco/Corretora</Label>

        <Input
         value={formData.banco}
         onChange={e=>setFormData(p=>({...p,banco:e.target.value}))}
         className="h-11 rounded-xl bg-input"
         placeholder="Ex: Nubank, Inter"
         required
        />
       </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
       <div className="space-y-2">
        <Label>Rendimento Bruto</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.rendimento_bruto}
         onChange={e=>setFormData(p=>({...p,rendimento_bruto:money(e.target.value)}))}
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         placeholder="R$ 0,00"
         required
        />
       </div>

       <div className="space-y-2">
        <Label>IOF</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.iof}
         onChange={e=>setFormData(p=>({...p,iof:money(e.target.value)}))}
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         placeholder="R$ 0,00"
        />
       </div>

       <div className="space-y-2">
        <Label>IR</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.ir}
         onChange={e=>setFormData(p=>({...p,ir:money(e.target.value)}))}
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
         placeholder="R$ 0,00"
        />
       </div>
      </div>

      <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-3">
       <div className="text-sm text-muted-foreground">
        Rendimento líquido
       </div>

       <div className="mt-1 text-xl font-bold text-green-400">
        {moeda(
         Math.max(
          0,
          moneyNum(formData.rendimento_bruto)-
          moneyNum(formData.iof)-
          moneyNum(formData.ir)
         )
        )}
       </div>
      </div>

     </div>
    </form>
   </ModalLancamentoPadrao>

   <div className="overflow-hidden rounded-xl border border-blue-500/10 bg-card/80 shadow-lg shadow-blue-500/5 backdrop-blur-sm">
    <div className="overflow-x-auto">
     <table className="w-full text-sm">
      <thead>
       <tr className="border-b border-blue-500/10">
        <th className="p-4 text-left font-semibold text-muted-foreground">
         Data
        </th>
        <th className="p-4 text-left font-semibold text-muted-foreground">
         Banco
        </th>
        <th className="p-4 text-right font-semibold text-muted-foreground">
         Rend. Líquido
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
       ):rendimentos.length===0?(
        <tr>
         <td colSpan="4" className="p-8 text-center text-muted-foreground">
          <TrendingUp className="mx-auto mb-2 h-10 w-10"/>
          Nenhum rendimento registrado.
         </td>
        </tr>
       ):(
        rendimentos.map(item=>(
         <tr
          key={item.id}
          className="border-b border-blue-500/10 transition-colors last:border-b-0 hover:bg-accent/50"
         >
          <td className="p-4 text-foreground">
           {String(item.data||'').slice(0,10).split('-').reverse().join('/')}
          </td>

          <td className="p-4 text-foreground">
           {item.banco}
          </td>

          <td className="p-4 text-right font-semibold text-green-400">
           {moeda(item.rendimento_liquido)}
          </td>

          <td className="p-4">
           <div className="flex justify-end gap-2">
            <Button
             variant="ghost"
             size="icon"
             onClick={()=>openDialog(item)}
            >
             <Edit className="h-4 w-4 text-[hsl(var(--neon-pessoal))]"/>
            </Button>

            <AlertDialog>
             <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
               <Trash className="h-4 w-4 text-red-500"/>
              </Button>
             </AlertDialogTrigger>

             <AlertDialogContent className="dark-pessoal border-border bg-card">
              <AlertDialogHeader>
               <AlertDialogTitle>
                Confirmar Exclusão
               </AlertDialogTitle>

               <AlertDialogDescription>
                Deseja remover este rendimento?
               </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
               <AlertDialogCancel>
                Cancelar
               </AlertDialogCancel>

               <AlertDialogAction
                onClick={()=>handleDelete(item.id)}
                className="bg-red-600 text-white hover:bg-red-700"
               >
                Deletar
               </AlertDialogAction>
              </AlertDialogFooter>
             </AlertDialogContent>
            </AlertDialog>
           </div>
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

export default Rendimentos;
