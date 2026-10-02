import React,{useState,useEffect,useCallback,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash,CalendarClock,Search,AlertTriangle,WalletCards}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{useToast}from'@/components/ui/use-toast';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle}from'@/components/ui/alert-dialog';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import SearchableModal from'@/components/SearchableModal';
import{Badge}from'@/components/ui/badge';
import{format,isSameMonth,parseISO}from'date-fns';
import{normalizeString}from'@/lib/gastoRealUtils';

const TZ='America/Sao_Paulo';
const RED='hsl(0 84% 60%)';

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

const brDate=v=>{
 if(!v)return'-';
 const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
 return m?`${m[3]}/${m[2]}/${m[1]}`:new Intl.DateTimeFormat('pt-BR',{timeZone:TZ}).format(new Date(v));
};

const initial=()=>({
 data_compra:getBRDate(),descricao:'',data_vencimento:'',valor:'',
 forma_pagamento:'Boleto',parcelas:1,categoria:'',status:'Pendente'
});

const DespesaPrevista=()=>{
 const{toast}=useToast(),{user}=useAuth(),isMounted=useRef(true);
 const[despesas,setDespesas]=useState([]),[tiposDespesa,setTiposDespesa]=useState([]),[loading,setLoading]=useState(true);
 const[isDialogOpen,setIsDialogOpen]=useState(false),[isSearchModalOpen,setIsSearchModalOpen]=useState(false),[currentDespesa,setCurrentDespesa]=useState(null);
 const[itemToDelete,setItemToDelete]=useState(null),[duplicateWarning,setDuplicateWarning]=useState(null),[formData,setFormData]=useState(initial);

 useEffect(()=>{isMounted.current=true;return()=>{isMounted.current=false}},[]);

 const fetchData=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('despesas_previstas').select('*').eq('user_id',user.id).order('data_vencimento',{ascending:false}),
    supabase.from('tipos_despesa').select('nome_despesa,categoria').eq('user_id',user.id).order('nome_despesa',{ascending:true})
   ]);
   if(!isMounted.current)return;
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   setDespesas(a.data||[]);setTiposDespesa(b.data||[]);
  }catch(e){
   if(isMounted.current)toast({title:'Erro ao buscar dados',description:e.message,variant:'destructive'})
  }finally{
   if(isMounted.current)setLoading(false)
  }
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const ch=supabase.channel('despesas_previstas_changes_v1')
   .on('postgres_changes',{event:'*',schema:'public',table:'despesas_previstas'},fetchData)
   .on('postgres_changes',{event:'*',schema:'public',table:'tipos_despesa'},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,fetchData]);

 useEffect(()=>{
  if(formData.descricao&&formData.data_vencimento&&!currentDespesa){
   const n=normalizeString(formData.descricao),d=parseISO(formData.data_vencimento);
   const dup=despesas.find(x=>n===normalizeString(x.descricao)&&isSameMonth(d,parseISO(x.data_vencimento)));
   setDuplicateWarning(dup?`Atenção: Já existe uma despesa "${dup.descricao}" vencendo em ${brDate(dup.data_vencimento)}.`:null);
  }else setDuplicateWarning(null);
 },[formData.descricao,formData.data_vencimento,despesas,currentDespesa]);

 const resetForm=useCallback(()=>{setFormData(initial());setCurrentDespesa(null);setDuplicateWarning(null)},[]);
 const closeModal=useCallback(()=>{setIsDialogOpen(false);resetForm()},[resetForm]);

 const openDialog=despesa=>{
  if(despesa){
   setCurrentDespesa(despesa);
   setFormData({
    data_compra:String(despesa.data_compra||getBRDate()).slice(0,10),
    descricao:despesa.descricao||'',
    data_vencimento:String(despesa.data_vencimento||'').slice(0,10),
    valor:money(Number(despesa.valor||0)*100),
    forma_pagamento:despesa.forma_pagamento||'Boleto',
    parcelas:despesa.parcelas||1,
    categoria:despesa.categoria||'',
    status:despesa.status||'Pendente'
   });
  }else resetForm();
  setIsDialogOpen(true);
 };

 const save=async()=>{
  const valor=moneyNum(formData.valor);
  if(!formData.descricao||!formData.data_vencimento||valor<=0){
   toast({title:'Erro',description:'Descrição, vencimento e valor são obrigatórios.',variant:'destructive'});
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
    const{error}=await supabase.from('despesas_previstas').update(dataToSave).eq('id',currentDespesa.id);
    if(error)throw error;
    toast({title:'Sucesso!',description:'Despesa prevista atualizada.'});
   }else{
    const{error}=await supabase.from('despesas_previstas').insert(dataToSave);
    if(error)throw error;
    toast({title:'Sucesso!',description:'Despesa prevista registrada.'});
   }
   resetForm();
  }catch(e){
   toast({title:'Erro ao salvar',description:e.message,variant:'destructive'})
  }
 };

 const del=async()=>{
  if(!itemToDelete)return;
  try{
   const{error}=await supabase.from('despesas_previstas').delete().eq('id',itemToDelete.id);
   if(error)throw error;
   toast({title:'Removido',description:'Despesa removida com sucesso.'});
   setItemToDelete(null);
  }catch(e){
   toast({title:'Erro ao remover',description:e.message,variant:'destructive'})
  }
 };

 const toggleStatus=async(id,status)=>{
  const novo=status==='Pendente'?'Pago':'Pendente';
  try{
   const{error}=await supabase.from('despesas_previstas').update({status:novo}).eq('id',id);
   if(error)throw error;
  }catch(e){
   toast({title:'Erro',description:'Erro ao atualizar status.',variant:'destructive'})
  }
 };

 return <React.Fragment>
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="dark-pessoal space-y-6">
   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">Finanças Pessoais</p>
     <h2 className="mt-1 text-3xl font-bold text-foreground">Despesas Previstas</h2>
     <p className="text-muted-foreground">Gerencie suas contas a pagar.</p>
    </div>

    <div className="flex gap-2">
     <Button onClick={()=>setIsSearchModalOpen(true)} variant="outline" className="border-[hsl(var(--neon-pessoal)/.45)] text-[hsl(var(--neon-pessoal))] hover:bg-[hsl(var(--neon-pessoal)/.08)]">
      <Search className="mr-2 h-4 w-4"/>Buscar
     </Button>
     <Button onClick={()=>openDialog()} className="bg-[hsl(var(--neon-pessoal))] text-white shadow-[0_0_16px_hsl(var(--neon-pessoal)/.18)] hover:bg-[hsl(var(--neon-pessoal)/.88)]">
      <Plus className="mr-2 h-4 w-4"/>Nova Despesa
     </Button>
    </div>
   </div>

   <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
    <div className="overflow-x-auto">
     <table className="w-full text-sm">
      <thead><tr className="border-b border-border bg-secondary/40">
       <th className="p-4 text-left font-semibold text-muted-foreground">Vencimento</th>
       <th className="p-4 text-left font-semibold text-muted-foreground">Descrição</th>
       <th className="p-4 text-left font-semibold text-muted-foreground">Categoria</th>
       <th className="p-4 text-right font-semibold text-muted-foreground">Valor</th>
       <th className="p-4 text-center font-semibold text-muted-foreground">Status</th>
       <th className="p-4 text-right font-semibold text-muted-foreground">Ações</th>
      </tr></thead>

      <tbody>
       {loading?
        <tr><td colSpan="6" className="p-8 text-center">Carregando...</td></tr>:
       despesas.length===0?
        <tr><td colSpan="6" className="p-8 text-center text-muted-foreground"><CalendarClock className="mx-auto mb-2 h-10 w-10"/>Nenhuma despesa.</td></tr>:
       despesas.map(d=><tr key={d.id} className="border-b border-border transition-colors hover:bg-muted/40">
        <td className="p-4">{brDate(d.data_vencimento)}</td>
        <td className="p-4 font-medium">{d.descricao}</td>
        <td className="p-4"><Badge variant="outline">{d.categoria||'OUTROS'}</Badge></td>
        <td className="p-4 text-right font-bold text-red-400">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d.valor||0))}</td>
        <td className="p-4 text-center"><Badge className="cursor-pointer hover:opacity-80" variant={d.status==='Pago'?'default':'destructive'} onClick={()=>toggleStatus(d.id,d.status)}>{d.status}</Badge></td>
        <td className="p-4 text-right"><div className="flex justify-end gap-2">
         <Button variant="ghost" size="icon" onClick={()=>openDialog(d)}><Edit className="h-4 w-4 text-red-400"/></Button>
         <Button variant="ghost" size="icon" onClick={()=>setItemToDelete(d)}><Trash className="h-4 w-4 text-red-500"/></Button>
        </div></td>
       </tr>)
       }
      </tbody>
     </table>
    </div>
   </div>
  </motion.div>

  <SearchableModal
   isOpen={isSearchModalOpen}
   onClose={()=>setIsSearchModalOpen(false)}
   onSelect={item=>{openDialog(item);setIsSearchModalOpen(false)}}
   tableName="despesas_previstas"
   searchField="descricao"
   displayFields={[
    {key:'descricao',label:'Descrição'},
    {key:'data_vencimento',label:'Vencimento',format:d=>brDate(d)},
    {key:'valor',label:'Valor',format:v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0))}
   ]}
   title="Buscar Despesa Prevista"
  />

  <Dialog open={isDialogOpen} onOpenChange={open=>{if(!open)closeModal();else setIsDialogOpen(true)}}>
   <DialogContent
    onInteractOutside={e=>e.preventDefault()}
    onPointerDownOutside={e=>e.preventDefault()}
    onEscapeKeyDown={e=>e.preventDefault()}
    className="dark-pessoal w-[calc(100%-2rem)] max-w-[680px] overflow-hidden rounded-2xl border p-0 text-foreground shadow-[0_24px_80px_rgba(0,0,0,.58)]"
    style={{borderColor:'hsl(0 84% 60% / .28)',background:'hsl(var(--card-bg))'}}
   >
    <DialogHeader
     className="px-6 py-5 pr-14"
     style={{borderBottom:'1px solid hsl(0 84% 60% / .15)',background:'hsl(0 84% 60% / .045)'}}
    >
     <div className="flex items-center gap-3">
      <div
       className="flex h-11 w-11 items-center justify-center rounded-xl"
       style={{border:'1px solid hsl(0 84% 60% / .24)',background:'hsl(0 84% 60% / .10)'}}
      >
       <WalletCards className="h-5 w-5" style={{color:RED}}/>
      </div>

      <div>
       <DialogTitle className="text-xl font-bold">
        {currentDespesa?'Editar':'Nova'} Despesa Prevista
       </DialogTitle>
       <DialogDescription className="mt-1 text-sm text-muted-foreground">
        Preencha as informações da conta.
       </DialogDescription>
      </div>
     </div>
    </DialogHeader>

    <div className="max-h-[calc(100vh-180px)] overflow-y-auto px-6 py-6">
     <div className="grid gap-5">

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
         setFormData(p=>({...p,descricao:v,categoria:t?.categoria||'OUTROS'}));
        }}
       >
        <SelectTrigger
         className="h-11 rounded-xl bg-input"
         style={{'--tw-ring-color':'hsl(0 84% 60% / .25)'}}
        >
         <SelectValue placeholder="Selecione..."/>
        </SelectTrigger>
        <SelectContent className="dark-pessoal rounded-xl bg-card">
         <ScrollArea className="h-48">
          {tiposDespesa.map((t,i)=><SelectItem key={i} value={t.nome_despesa}>{t.nome_despesa}</SelectItem>)}
         </ScrollArea>
        </SelectContent>
       </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Categoria</Label>
        <Input value={formData.categoria} readOnly disabled className="h-11 rounded-xl bg-muted text-muted-foreground"/>
       </div>

       <div className="space-y-2">
        <Label>Data Compra</Label>
        <Input type="date" value={formData.data_compra} onChange={e=>setFormData({...formData,data_compra:e.target.value})} className="h-11 rounded-xl bg-input"/>
       </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Vencimento</Label>
        <Input type="date" value={formData.data_vencimento} onChange={e=>setFormData({...formData,data_vencimento:e.target.value})} className="h-11 rounded-xl bg-input"/>
       </div>

       <div className="space-y-2">
        <Label>Valor</Label>
        <Input
         type="text"
         inputMode="numeric"
         value={formData.valor}
         onChange={e=>setFormData({...formData,valor:money(e.target.value)})}
         placeholder="R$ 0,00"
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
        />
       </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Pagamento</Label>
        <Select value={formData.forma_pagamento} onValueChange={v=>setFormData({...formData,forma_pagamento:v})}>
         <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue/></SelectTrigger>
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
         value={formData.parcelas}
         onChange={e=>setFormData({...formData,parcelas:parseInt(e.target.value,10)||1})}
         min="1"
         disabled={formData.forma_pagamento!=='Cartão'}
         className="h-11 rounded-xl bg-input"
        />
       </div>
      </div>
     </div>
    </div>

    <DialogFooter className="border-t border-border/70 bg-background/20 px-6 py-4">
     <Button variant="outline" onClick={closeModal} className="h-10 rounded-xl">Cancelar</Button>
     <Button
      onClick={save}
      className="h-10 rounded-xl px-6 font-semibold text-white transition-all hover:opacity-90"
      style={{background:RED,boxShadow:'0 0 18px hsl(0 84% 60% / .22)'}}
     >
      {currentDespesa?'Salvar Alterações':'Salvar Despesa'}
     </Button>
    </DialogFooter>
   </DialogContent>
  </Dialog>

  <AlertDialog open={!!itemToDelete} onOpenChange={()=>setItemToDelete(null)}>
   <AlertDialogContent className="dark-pessoal bg-card">
    <AlertDialogHeader>
     <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
     <AlertDialogDescription>Deseja remover esta despesa?</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
     <AlertDialogCancel>Cancelar</AlertDialogCancel>
     <AlertDialogAction onClick={del} className="bg-red-600">Deletar</AlertDialogAction>
    </AlertDialogFooter>
   </AlertDialogContent>
  </AlertDialog>
 </React.Fragment>;
};

export default DespesaPrevista;
