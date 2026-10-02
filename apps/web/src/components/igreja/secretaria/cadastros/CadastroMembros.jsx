import React,{useState,useEffect,useCallback}from'react';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import{Helmet}from'react-helmet';
import{motion,AnimatePresence}from'framer-motion';
import{Input}from'@/components/ui/input';
import{Button}from'@/components/ui/button';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogFooter}from'@/components/ui/dialog';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Edit,Trash2,UserPlus,Droplets,Flame,Search,Shield,History}from'lucide-react';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{RadioGroup,RadioGroupItem}from'@/components/ui/radio-group';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Badge}from'@/components/ui/badge';
import{Card,CardHeader,CardTitle,CardContent}from'@/components/ui/card';
import ConsultaHistoricoMembro from'@/components/igreja/secretaria/consultas/ConsultaHistoricoMembro';

const CadastroMembros=()=>{
 const{user}=useAuth(),{toast}=useToast();
 const[membros,setMembros]=useState([]),[filteredMembros,setFilteredMembros]=useState([]),[conjuntos,setConjuntos]=useState([]),[classes,setClasses]=useState([]),[cargos,setCargos]=useState([]),[funcoes,setFuncoes]=useState([]);
 const[loading,setLoading]=useState(true),[isModalOpen,setIsModalOpen]=useState(false),[editingMembro,setEditingMembro]=useState(null),[searchTerm,setSearchTerm]=useState('');
 const[isConfirmOpen,setIsConfirmOpen]=useState(false),[pendingSubmitData,setPendingSubmitData]=useState(null),[historicoMembro,setHistoricoMembro]=useState(null);

 const[formState,setFormState]=useState({
  nome_completo:'',data_nascimento:'',estado_civil:'',data_entrada:'',classe_id:'none',
  tem_multiplas_funcoes:'nao',quantas_funcoes:'',funcoes_selecionadas:[],funcao_unica:'none',cargo_id:'none',
  participa_conjunto:'nao',conjunto_id:'none',
  is_dirigente:'nao',dirige_mais_de_um:'nao',quantos_conjuntos_dirige:'',conjuntos_dirigidos:[],
  is_batizado_aguas:'nao',is_batizado_espirito:'nao',status:'ATIVO'
 });

 const fetchInitialData=useCallback(async()=>{
  try{
   const[a,b,c,d]=await Promise.all([
    supabase.from('igreja_conjuntos').select('id,nome_conjunto').order('nome_conjunto',{ascending:true}),
    supabase.from('igreja_classes').select('id,nome_classe').order('nome_classe',{ascending:true}),
    supabase.from('cargos_igreja').select('id,nome_cargo').order('nome_cargo',{ascending:true}),
    supabase.from('igreja_funcoes').select('id,nome_funcao').order('nome_funcao',{ascending:true})
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;if(d.error)throw d.error;
   setConjuntos(a.data||[]);setClasses(b.data||[]);setCargos(c.data||[]);setFuncoes(d.data||[]);
  }catch(error){toast({title:'Erro ao buscar dados de apoio',description:error.message,variant:'destructive'})}
 },[toast]);

 const fetchMembros=useCallback(async()=>{
  setLoading(true);
  try{
   const{data,error}=await supabase.from('igreja_membros').select(`
    *,
    conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto),
    dirige_conjunto:igreja_conjuntos!igreja_membros_dirige_conjunto_id_fkey(nome_conjunto),
    cargo:cargos_igreja(nome_cargo)
   `).order('nome_completo',{ascending:true});
   if(error)throw error;
   setMembros(data||[]);
  }catch(error){toast({title:'Erro ao buscar membros',description:error.message,variant:'destructive'})}
  finally{setLoading(false)}
 },[toast]);

 useEffect(()=>{fetchInitialData();fetchMembros()},[fetchInitialData,fetchMembros]);

 useEffect(()=>{
  if(!user)return;
  const channel=supabase.channel('public:igreja_membros')
   .on('postgres_changes',{event:'*',schema:'public',table:'igreja_membros'},fetchMembros)
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchMembros]);

 useEffect(()=>{
  const f=searchTerm.toLowerCase();
  setFilteredMembros(membros.filter(item=>
   (item.nome_completo&&item.nome_completo.toLowerCase().includes(f))||
   (item.cargo&&item.cargo.nome_cargo.toLowerCase().includes(f))
  ));
 },[searchTerm,membros]);

 const resetForm=()=>{
  setFormState({
   nome_completo:'',data_nascimento:'',estado_civil:'',data_entrada:'',classe_id:'none',
   tem_multiplas_funcoes:'nao',quantas_funcoes:'',funcoes_selecionadas:[],funcao_unica:'none',cargo_id:'none',
   participa_conjunto:'nao',conjunto_id:'none',
   is_dirigente:'nao',dirige_mais_de_um:'nao',quantos_conjuntos_dirige:'',conjuntos_dirigidos:[],
   is_batizado_aguas:'nao',is_batizado_espirito:'nao',status:'ATIVO'
  });
  setEditingMembro(null);
 };

 const handleOpenModal=(membro=null)=>{
  if(!membro){
   resetForm();
   setIsModalOpen(true);
   return;
  }

  const multiIds=Array.isArray(membro.dirige_conjuntos_multiplos?.conjuntos_ids)?membro.dirige_conjuntos_multiplos.conjuntos_ids:[];
  const legacyId=membro.dirige_conjunto_id||null;
  const directedIds=multiIds.length?multiIds:(legacyId?[legacyId]:[]);
  const directedQty=Number(membro.dirige_conjuntos_multiplos?.quantidade)||directedIds.length||0;

  setEditingMembro(membro);
  setFormState({
   nome_completo:membro.nome_completo||'',
   data_nascimento:membro.data_nascimento||'',
   estado_civil:membro.estado_civil||'',
   data_entrada:membro.data_entrada||'',
   classe_id:membro.classe_id||'none',
   tem_multiplas_funcoes:membro.funcoes_multiplas?.quantidade>1?'sim':'nao',
   quantas_funcoes:membro.funcoes_multiplas?.quantidade>1?String(membro.funcoes_multiplas.quantidade):'',
   funcao_unica:(()=>{
    if(Number(membro.funcoes_multiplas?.quantidade)===1){
     if(Array.isArray(membro.funcoes_multiplas?.funcoes_ids)&&membro.funcoes_multiplas.funcoes_ids[0])return membro.funcoes_multiplas.funcoes_ids[0];
     if(membro.funcoes_exercidas){
      const found=funcoes.find(f=>f.nome_funcao.toLowerCase()===membro.funcoes_exercidas.trim().toLowerCase());
      return found?.id||'none';
     }
    }
    return'none';
   })(),
   funcoes_selecionadas:(()=>{
    const q=Number(membro.funcoes_multiplas?.quantidade);
    if(!q||q===1)return[];
    const ids=Array.isArray(membro.funcoes_multiplas?.funcoes_ids)?membro.funcoes_multiplas.funcoes_ids:
     membro.funcoes_exercidas?membro.funcoes_exercidas.split(',').map(n=>funcoes.find(f=>f.nome_funcao.toLowerCase()===n.trim().toLowerCase())?.id||'none'):[];
    return Array.from({length:q},(_,i)=>ids[i]||'none');
   })(),
   cargo_id:membro.cargo_id||'none',
   participa_conjunto:membro.participa_conjunto?'sim':'nao',
   conjunto_id:membro.conjunto_id||'none',
   is_dirigente:membro.is_dirigente?'sim':'nao',
   dirige_mais_de_um:directedIds.length>1?'sim':'nao',
   quantos_conjuntos_dirige:directedIds.length>1?String(directedQty||directedIds.length):'',
   conjuntos_dirigidos:directedIds,
   is_batizado_aguas:membro.is_batizado_aguas?'sim':'nao',
   is_batizado_espirito:membro.is_batizado_espirito?'sim':'nao',
   status:membro.status||'ATIVO'
  });
  setIsModalOpen(true);
 };

 const handleCloseModal=()=>{setIsModalOpen(false);resetForm()};
 const handleInputChange=(key,value)=>setFormState(prev=>({...prev,[key]:value}));

 const handleQuantidadeChange=value=>{
  const q=parseInt(value,10)||0;
  setFormState(prev=>({...prev,quantas_funcoes:value,funcoes_selecionadas:Array.from({length:q},(_,i)=>prev.funcoes_selecionadas?.[i]||'none')}));
 };

 const handleFuncaoChange=(index,value)=>setFormState(prev=>{
  const arr=[...(prev.funcoes_selecionadas||[])];arr[index]=value;
  return{...prev,funcoes_selecionadas:arr};
 });

 const handleQuantidadeConjuntosChange=value=>{
  const q=parseInt(value,10)||0;
  setFormState(prev=>({...prev,quantos_conjuntos_dirige:value,conjuntos_dirigidos:Array.from({length:q},(_,i)=>prev.conjuntos_dirigidos?.[i]||'none')}));
 };

 const handleConjuntoDirigidoChange=(index,value)=>setFormState(prev=>{
  const arr=[...(prev.conjuntos_dirigidos||[])];arr[index]=value;
  return{...prev,conjuntos_dirigidos:arr};
 });

 const handleDirigenteMultipleChange=value=>setFormState(prev=>({
  ...prev,
  dirige_mais_de_um:value,
  quantos_conjuntos_dirige:value==='sim'?prev.quantos_conjuntos_dirige:'',
  conjuntos_dirigidos:value==='sim'?prev.conjuntos_dirigidos:(prev.conjuntos_dirigidos?.length?[prev.conjuntos_dirigidos[0]]:[])
 }));

 const handleStatusChangeList=async(id,newStatus)=>{
  try{
   const{error}=await supabase.from('igreja_membros').update({status:newStatus}).eq('id',id);
   if(error)throw error;
   toast({title:'Sucesso',description:`Status atualizado para ${newStatus}`});
   fetchMembros();
  }catch(error){toast({title:'Erro',description:error.message,variant:'destructive'})}
 };

 const prepareSubmitData=()=>{
  const uuid=v=>!v||v==='none'||v===''?null:v;
  let funcoes_multiplas=null,funcoes_exercidas=null;

  if(formState.tem_multiplas_funcoes==='sim'&&formState.quantas_funcoes){
   const ids=(formState.funcoes_selecionadas||[]).filter(v=>v&&v!=='none');
   funcoes_multiplas={quantidade:parseInt(formState.quantas_funcoes,10),funcoes_ids:ids};
   funcoes_exercidas=ids.map(id=>funcoes.find(f=>f.id===id)?.nome_funcao).filter(Boolean).join(', ');
  }else if(formState.tem_multiplas_funcoes==='nao'&&formState.funcao_unica&&formState.funcao_unica!=='none'){
   const nome=funcoes.find(f=>f.id===formState.funcao_unica)?.nome_funcao||null;
   funcoes_multiplas={quantidade:1,funcoes_ids:[formState.funcao_unica]};
   funcoes_exercidas=nome;
  }

  const directedIds=formState.is_dirigente==='sim'?(formState.conjuntos_dirigidos||[]).filter(v=>v&&v!=='none'):[];

  return{
   nome_completo:formState.nome_completo.trim(),
   data_nascimento:formState.data_nascimento,
   estado_civil:formState.estado_civil,
   data_entrada:formState.data_entrada,
   classe_id:uuid(formState.classe_id),
   funcoes_multiplas,
   funcoes_exercidas,
   cargo_id:uuid(formState.cargo_id),
   participa_conjunto:formState.participa_conjunto==='sim',
   conjunto_id:formState.participa_conjunto==='sim'?uuid(formState.conjunto_id):null,
   is_dirigente:formState.is_dirigente==='sim',
   dirige_conjunto_id:formState.is_dirigente==='sim'?uuid(directedIds[0]):null,
   dirige_conjuntos_multiplos:formState.is_dirigente==='sim'?{quantidade:directedIds.length,conjuntos_ids:directedIds}:null,
   is_batizado_aguas:formState.is_batizado_aguas==='sim',
   is_batizado_espirito:formState.is_batizado_espirito==='sim',
   status:formState.status||'ATIVO',
   user_id:user.id
  };
 };

 const executeSubmit=async data=>{
  setLoading(true);
  try{
   if(editingMembro){
    const{error}=await supabase.from('igreja_membros').update(data).eq('id',editingMembro.id);
    if(error)throw error;
    toast({title:'Sucesso!',description:'Membro atualizado com sucesso.'});
   }else{
    const{error}=await supabase.from('igreja_membros').insert([data]);
    if(error)throw error;
    toast({title:'Sucesso!',description:'Membro adicionado com sucesso.'});
   }
   handleCloseModal();
   fetchMembros();
  }catch(error){toast({title:'Erro ao salvar',description:error.message,variant:'destructive'})}
  finally{setLoading(false);setIsConfirmOpen(false)}
 };

 const handleSubmit=async e=>{
  e.preventDefault();

  if(!formState.nome_completo.trim()||!formState.data_nascimento||!formState.estado_civil||!formState.data_entrada||formState.cargo_id==='none'){
   toast({title:'Campos obrigatórios',description:'Preencha todos os campos marcados com *',variant:'destructive'});return;
  }

  if(formState.tem_multiplas_funcoes==='sim'){
   if(!formState.quantas_funcoes){toast({title:'Atenção',description:'Informe quantas funções o membro possui.',variant:'destructive'});return}
   if((formState.funcoes_selecionadas||[]).some(v=>!v||v==='none')){
    toast({title:'Atenção',description:'Selecione todas as funções exercidas pelo membro.',variant:'destructive'});return;
   }
  }else if(!formState.funcao_unica||formState.funcao_unica==='none'){
   toast({title:'Atenção',description:'Selecione a função exercida pelo membro.',variant:'destructive'});return;
  }

  if(formState.participa_conjunto==='sim'&&formState.conjunto_id==='none'){
   toast({title:'Atenção',description:'Selecione o conjunto.',variant:'destructive'});return;
  }

  if(formState.is_dirigente==='sim'){
   if(formState.dirige_mais_de_um==='sim'){
    const q=parseInt(formState.quantos_conjuntos_dirige,10)||0;
    const ids=(formState.conjuntos_dirigidos||[]).filter(v=>v&&v!=='none');
    if(q<2){toast({title:'Atenção',description:'Informe pelo menos 2 conjuntos.',variant:'destructive'});return}
    if(ids.length!==q){toast({title:'Atenção',description:'Selecione todos os conjuntos dirigidos pelo membro.',variant:'destructive'});return}
    if(new Set(ids).size!==ids.length){toast({title:'Atenção',description:'Não é permitido selecionar o mesmo conjunto mais de uma vez.',variant:'destructive'});return}
   }else{
    const id=formState.conjuntos_dirigidos?.[0];
    if(!id||id==='none'){toast({title:'Atenção',description:'Selecione qual conjunto o membro dirige.',variant:'destructive'});return}
   }
  }

  if(!user)return;
  setLoading(true);

  try{
   const{data:existingData,error:duplicateError}=await supabase.from('igreja_membros').select('id,nome_completo').ilike('nome_completo',formState.nome_completo.trim());
   if(duplicateError)throw duplicateError;

   const duplicateExists=existingData?.some(m=>
    (!editingMembro||m.id!==editingMembro.id)&&
    m.nome_completo.toLowerCase()===formState.nome_completo.trim().toLowerCase()
   );

   const data=prepareSubmitData();

   if(duplicateExists){
    setPendingSubmitData(data);
    setIsConfirmOpen(true);
    setLoading(false);
    return;
   }

   await executeSubmit(data);
  }catch(error){
   toast({title:'Erro ao salvar',description:error.message,variant:'destructive'});
   setLoading(false);
  }
 };

 const handleDelete=async id=>{
  try{
   const{error}=await supabase.from('igreja_membros').delete().eq('id',id);
   if(error)throw error;
   toast({title:'Membro excluído',description:'O membro foi removido com sucesso.'});
   fetchMembros();
  }catch(error){toast({title:'Erro ao excluir',description:error.message,variant:'destructive'})}
 };

 return <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen">
  <Helmet><title>Cadastro de Membros | Secretaria Digital</title></Helmet>

  <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
   <div><h1 className="text-3xl font-bold tracking-tight">Membros</h1><p className="text-muted-foreground">Gerencie o rol de membros e informações ministeriais</p></div>
   <Button onClick={()=>handleOpenModal()} className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"><UserPlus className="mr-2 h-4 w-4"/>Novo Membro</Button>
  </header>

  <Card className="shadow-sm border-muted glass-card">
   <CardHeader className="pb-3">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
     <CardTitle className="text-lg">Listagem Geral</CardTitle>
     <div className="relative w-full md:w-72"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Buscar por nome..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="pl-9 h-9"/></div>
    </div>
   </CardHeader>

   <CardContent className="p-0 overflow-x-auto">
    {loading&&membros.length===0?
     <div className="flex items-center justify-center p-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"/></div>:
     <Table>
      <TableHeader><TableRow><TableHead className="w-[300px]">Nome Completo</TableHead><TableHead>Cargo Ministerial</TableHead><TableHead>Batismos</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
      <TableBody>
       <AnimatePresence mode="popLayout">
        {filteredMembros.length?
         filteredMembros.map(m=><motion.tr key={m.id} initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:.95}} className="group hover:bg-muted/30 transition-colors">
          <TableCell className="font-medium"><div>{m.nome_completo}{m.is_dirigente&&<Badge variant="secondary" className="ml-2 scale-90 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">Dirigente</Badge>}</div></TableCell>
          <TableCell><div className="flex flex-col gap-1"><span className="text-sm font-semibold text-primary flex items-center"><Shield className="h-3 w-3 mr-1"/>{m.cargo?.nome_cargo||'Nenhum Cargo'}</span>{m.funcoes_multiplas?.quantidade&&<span className="text-[10px] text-muted-foreground">{m.funcoes_multiplas.quantidade} Função(ões)</span>}</div></TableCell>
          <TableCell><div className="flex gap-2"><Badge variant="outline" className={m.is_batizado_aguas?'text-blue-600 border-blue-200 bg-blue-50':'text-muted-foreground opacity-40'}><Droplets className="h-3 w-3 mr-1"/>Águas</Badge><Badge variant="outline" className={m.is_batizado_espirito?'text-orange-600 border-orange-200 bg-orange-50':'text-muted-foreground opacity-40'}><Flame className="h-3 w-3 mr-1"/>Espírito</Badge></div></TableCell>
          <TableCell><Select value={m.status||'ATIVO'} onValueChange={val=>handleStatusChangeList(m.id,val)}><SelectTrigger className={`h-8 w-28 text-xs ${m.status==='ATIVO'?'border-green-500 text-green-500 bg-green-500/10':'border-red-500 text-red-500 bg-red-500/10'}`}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ATIVO" className="text-green-500 font-semibold">Ativo</SelectItem><SelectItem value="INATIVO" className="text-red-500 font-semibold">Inativo</SelectItem></SelectContent></Select></TableCell>
          <TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" title="Histórico do membro" onClick={()=>setHistoricoMembro(m)}><History className="h-4 w-4 text-blue-400"/></Button><Button variant="ghost" size="icon" title="Editar membro" onClick={()=>handleOpenModal(m)}><Edit className="h-4 w-4 text-primary"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="hover:text-destructive"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Deseja realmente remover {m.nome_completo}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>handleDelete(m.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell>
         </motion.tr>):
         <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Nenhum membro encontrado.</TableCell></TableRow>}
       </AnimatePresence>
      </TableBody>
     </Table>}
   </CardContent>
  </Card>

  <Dialog open={isModalOpen} onOpenChange={open=>{if(!open)handleCloseModal()}}>
   <DialogContent className="max-w-3xl max-h-[90vh] bg-card border-border text-foreground p-0 flex flex-col gap-0 overflow-hidden">
    <DialogHeader className="px-6 py-4 border-b border-border shrink-0"><DialogTitle className="text-xl flex items-center gap-2 text-primary">{editingMembro?<Edit className="h-5 w-5"/>:<UserPlus className="h-5 w-5"/>}{editingMembro?'Editar Membro':'Cadastrar Novo Membro'}</DialogTitle></DialogHeader>

    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
     <div className="flex-1 overflow-y-auto px-6 py-4 modal-form-scroll">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pb-2">

       <div className="md:col-span-2 space-y-2"><Label>1. Nome Completo <span className="text-red-500">*</span></Label><Input value={formState.nome_completo} onChange={e=>handleInputChange('nome_completo',e.target.value)} placeholder="Digite o nome completo" required className="bg-input"/></div>
       <div className="space-y-2"><Label>2. Data de Nascimento <span className="text-red-500">*</span></Label><Input type="date" value={formState.data_nascimento} onChange={e=>handleInputChange('data_nascimento',e.target.value)} required className="bg-input [color-scheme:dark]"/></div>
       <div className="space-y-2"><Label>3. Estado Civil <span className="text-red-500">*</span></Label><Select value={formState.estado_civil} onValueChange={v=>handleInputChange('estado_civil',v)}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem><SelectItem value="Casado(a)">Casado(a)</SelectItem><SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem><SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem></SelectContent></Select></div>
       <div className="space-y-2"><Label>4. Data de Entrada no Ministério <span className="text-red-500">*</span></Label><Input type="date" value={formState.data_entrada} onChange={e=>handleInputChange('data_entrada',e.target.value)} required className="bg-input [color-scheme:dark]"/></div>
       <div className="space-y-2"><Label>5. Classe da EBD (Opcional)</Label><Select value={formState.classe_id} onValueChange={v=>handleInputChange('classe_id',v)}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione a classe"/></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{classes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome_classe}</SelectItem>)}</SelectContent></Select></div>

       <div className="md:col-span-2 p-4 bg-muted/30 rounded-lg border border-border mt-2 space-y-4">
        <div className="space-y-2"><Label>6. O Membro Tem Mais de Uma Função? <span className="text-red-500">*</span></Label><RadioGroup value={formState.tem_multiplas_funcoes} onValueChange={v=>handleInputChange('tem_multiplas_funcoes',v)} className="flex gap-6 mt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="mult-sim"/><Label htmlFor="mult-sim" className="cursor-pointer">Sim</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="mult-nao"/><Label htmlFor="mult-nao" className="cursor-pointer">Não</Label></div></RadioGroup></div>

        {formState.tem_multiplas_funcoes==='sim'&&<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} className="space-y-4 pt-4 border-t border-border">
         <div className="space-y-2"><Label>Quantas Funções? <span className="text-red-500">*</span></Label><Select value={formState.quantas_funcoes||''} onValueChange={handleQuantidadeChange}><SelectTrigger className="bg-input md:w-1/2"><SelectValue placeholder="Selecione a quantidade"/></SelectTrigger><SelectContent>{[2,3,4,5,6,7,8,9,10].map(n=><SelectItem key={n} value={String(n)}>{n} funções</SelectItem>)}</SelectContent></Select></div>
         {formState.quantas_funcoes&&<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{formState.funcoes_selecionadas.map((id,i)=><div className="space-y-2" key={i}><Label>Função {i+1} <span className="text-red-500">*</span></Label><Select value={id||'none'} onValueChange={v=>handleFuncaoChange(i,v)}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger><SelectContent><SelectItem value="none">Nenhuma</SelectItem>{funcoes.map(f=><SelectItem key={f.id} value={f.id}>{f.nome_funcao}</SelectItem>)}</SelectContent></Select></div>)}</div>}
        </motion.div>}

        {formState.tem_multiplas_funcoes==='nao'&&<div className="space-y-2 pt-4 border-t border-border"><Label>Qual Função Exercida? <span className="text-red-500">*</span></Label><Select value={formState.funcao_unica} onValueChange={v=>handleInputChange('funcao_unica',v)}><SelectTrigger className="bg-input md:w-1/2"><SelectValue placeholder="Selecione a função"/></SelectTrigger><SelectContent><SelectItem value="none" disabled>Selecione...</SelectItem>{funcoes.map(f=><SelectItem key={f.id} value={f.id}>{f.nome_funcao}</SelectItem>)}</SelectContent></Select></div>}
       </div>

       <div className="md:col-span-2 space-y-2 mt-2"><Label>7. Cargo Ministerial <span className="text-red-500">*</span></Label><Select value={formState.cargo_id} onValueChange={v=>handleInputChange('cargo_id',v)}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione o cargo"/></SelectTrigger><SelectContent><SelectItem value="none" disabled>Selecione um cargo...</SelectItem>{cargos.map(c=><SelectItem key={c.id} value={c.id}>{c.nome_cargo}</SelectItem>)}</SelectContent></Select></div>

       <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border border-border mt-2">
        <div className="space-y-4">
         <div className="space-y-2"><Label>8. Participa de Conjunto? <span className="text-red-500">*</span></Label><RadioGroup value={formState.participa_conjunto} onValueChange={v=>handleInputChange('participa_conjunto',v)} className="flex gap-6 mt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="part-sim"/><Label htmlFor="part-sim" className="cursor-pointer">Sim</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="part-nao"/><Label htmlFor="part-nao" className="cursor-pointer">Não</Label></div></RadioGroup></div>
         {formState.participa_conjunto==='sim'&&<div className="space-y-2 pt-2 border-t border-border"><Label>Qual Conjunto? <span className="text-red-500">*</span></Label><Select value={formState.conjunto_id} onValueChange={v=>handleInputChange('conjunto_id',v)}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione o conjunto"/></SelectTrigger><SelectContent><SelectItem value="none">Selecione...</SelectItem>{conjuntos.map(c=><SelectItem key={c.id} value={c.id}>{c.nome_conjunto}</SelectItem>)}</SelectContent></Select></div>}
        </div>

        <div className="space-y-4">
         <div className="space-y-2"><Label>9. É Dirigente? <span className="text-red-500">*</span></Label><RadioGroup value={formState.is_dirigente} onValueChange={v=>setFormState(prev=>({...prev,is_dirigente:v,dirige_mais_de_um:v==='sim'?prev.dirige_mais_de_um:'nao',quantos_conjuntos_dirige:v==='sim'?prev.quantos_conjuntos_dirige:'',conjuntos_dirigidos:v==='sim'?prev.conjuntos_dirigidos:[]}))} className="flex gap-6 mt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="dir-sim"/><Label htmlFor="dir-sim" className="cursor-pointer">Sim</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="dir-nao"/><Label htmlFor="dir-nao" className="cursor-pointer">Não</Label></div></RadioGroup></div>

         {formState.is_dirigente==='sim'&&<motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-4 pt-3 border-t border-border">
          <div className="space-y-2"><Label>Dirige mais de 1 conjunto? <span className="text-red-500">*</span></Label><RadioGroup value={formState.dirige_mais_de_um} onValueChange={handleDirigenteMultipleChange} className="flex gap-6 mt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="dir-multi-sim"/><Label htmlFor="dir-multi-sim" className="cursor-pointer">Sim</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="dir-multi-nao"/><Label htmlFor="dir-multi-nao" className="cursor-pointer">Não</Label></div></RadioGroup></div>

          {formState.dirige_mais_de_um==='nao'&&<div className="space-y-2"><Label>Qual Conjunto que Dirige? <span className="text-red-500">*</span></Label><Select value={formState.conjuntos_dirigidos?.[0]||'none'} onValueChange={v=>handleConjuntoDirigidoChange(0,v)}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione o conjunto"/></SelectTrigger><SelectContent><SelectItem value="none">Selecione...</SelectItem>{conjuntos.map(c=><SelectItem key={c.id} value={c.id}>{c.nome_conjunto}</SelectItem>)}</SelectContent></Select></div>}

          {formState.dirige_mais_de_um==='sim'&&<div className="space-y-4">
           <div className="space-y-2"><Label>Quantos conjuntos? <span className="text-red-500">*</span></Label><Select value={formState.quantos_conjuntos_dirige||''} onValueChange={handleQuantidadeConjuntosChange}><SelectTrigger className="bg-input md:w-1/2"><SelectValue placeholder="Selecione a quantidade"/></SelectTrigger><SelectContent>{[2,3,4,5,6,7,8,9,10].map(n=><SelectItem key={n} value={String(n)}>{n} conjuntos</SelectItem>)}</SelectContent></Select></div>

           {formState.quantos_conjuntos_dirige&&<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{formState.conjuntos_dirigidos.map((id,i)=><div key={i} className="space-y-2"><Label>Conjunto {i+1} <span className="text-red-500">*</span></Label><Select value={id||'none'} onValueChange={v=>handleConjuntoDirigidoChange(i,v)}><SelectTrigger className="bg-input"><SelectValue placeholder="Selecione o conjunto"/></SelectTrigger><SelectContent><SelectItem value="none">Selecione...</SelectItem>{conjuntos.map(c=><SelectItem key={c.id} value={c.id}>{c.nome_conjunto}</SelectItem>)}</SelectContent></Select></div>)}</div>}
          </div>}
         </motion.div>}
        </div>
       </div>

       <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-border rounded-lg mt-2">
        <div className="space-y-2"><Label>10. Batizado nas Águas?</Label><RadioGroup value={formState.is_batizado_aguas} onValueChange={v=>handleInputChange('is_batizado_aguas',v)} className="flex gap-6 mt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="aguas-sim"/><Label htmlFor="aguas-sim" className="cursor-pointer text-blue-500 font-medium">Sim</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="aguas-nao"/><Label htmlFor="aguas-nao" className="cursor-pointer">Não</Label></div></RadioGroup></div>
        <div className="space-y-2"><Label>11. Batizado no Espírito Santo?</Label><RadioGroup value={formState.is_batizado_espirito} onValueChange={v=>handleInputChange('is_batizado_espirito',v)} className="flex gap-6 mt-2"><div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="espirito-sim"/><Label htmlFor="espirito-sim" className="cursor-pointer text-orange-500 font-medium">Sim</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="espirito-nao"/><Label htmlFor="espirito-nao" className="cursor-pointer">Não</Label></div></RadioGroup></div>
       </div>

      </div>
     </div>

     <DialogFooter className="gap-2 sm:gap-0 border-t border-border px-6 py-4 mt-auto shrink-0 bg-card">
      <Button type="button" variant="outline" onClick={handleCloseModal} disabled={loading}>Cancelar</Button>
      <Button type="submit" disabled={loading} className="min-w-[120px] bg-primary text-primary-foreground hover:bg-primary/90">{loading?<div className="mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"/>:null}{editingMembro?'Salvar Alterações':'Salvar Membro'}</Button>
     </DialogFooter>
    </form>
   </DialogContent>
  </Dialog>

  <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
   <AlertDialogContent className="bg-card text-foreground border-border">
    <AlertDialogHeader><AlertDialogTitle>Possível Duplicidade</AlertDialogTitle><AlertDialogDescription>O nome "{formState.nome_completo}" já está registrado no sistema. Deseja cadastrar mesmo assim?</AlertDialogDescription></AlertDialogHeader>
    <AlertDialogFooter><AlertDialogCancel onClick={()=>setIsConfirmOpen(false)}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>executeSubmit(pendingSubmitData)} className="bg-primary text-primary-foreground hover:bg-primary/90">Sim, Cadastrar</AlertDialogAction></AlertDialogFooter>
   </AlertDialogContent>
  </AlertDialog>

  <ConsultaHistoricoMembro membro={historicoMembro} open={!!historicoMembro} onOpenChange={v=>{if(!v)setHistoricoMembro(null)}}/>
 </div>;
};

export default CadastroMembros;
