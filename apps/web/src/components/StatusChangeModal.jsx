import React,{useState,useEffect}from'react';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
import{Button}from'@/components/ui/button';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent}from'@/components/ui/card';
import{supabase}from'@/lib/customSupabaseClient';
import{useToast}from'@/components/ui/use-toast';
import{Loader2,CheckCircle2,Clock,AlertCircle,AlertTriangle,RefreshCw}from'lucide-react';

export default function StatusChangeModal({
 isOpen,
 onClose,
 onStatusChange,
 currentStatus,
 tableName,
 recordId
}){
 const[status,setStatus]=useState(currentStatus||'Pendente');
 const[loading,setLoading]=useState(false);
 const{toast}=useToast();

 useEffect(()=>{
  if(isOpen)setStatus(currentStatus||'Pendente');
 },[isOpen,currentStatus]);

 const handleSave=async()=>{
  if(!recordId||!tableName)return;

  setLoading(true);

  try{
   const{error}=await supabase
    .from(tableName)
    .update({status})
    .eq('id',recordId);

   if(error)throw error;

   toast({
    title:'Status atualizado',
    description:'O status foi atualizado com sucesso.'
   });

   if(onStatusChange)await onStatusChange();

   onClose();
  }catch(e){
   toast({
    title:'Erro',
    description:e.message||'Não foi possível atualizar o status.',
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 };

 const statusInfo={
  Pago:{
   icon:CheckCircle2,
   label:'Pago',
   color:'text-emerald-400',
   bg:'bg-emerald-500/10',
   border:'border-emerald-500/30'
  },
  'Pago Parcialmente':{
   icon:AlertTriangle,
   label:'Pago Parcialmente',
   color:'text-orange-400',
   bg:'bg-orange-500/10',
   border:'border-orange-500/30'
  },
  Pendente:{
   icon:Clock,
   label:'Pendente',
   color:'text-yellow-400',
   bg:'bg-yellow-500/10',
   border:'border-yellow-500/30'
  },
  Atrasado:{
   icon:AlertCircle,
   label:'Atrasado',
   color:'text-red-400',
   bg:'bg-red-500/10',
   border:'border-red-500/30'
  }
 };

 const info=statusInfo[status]||statusInfo.Pendente;
 const Icon=info.icon;

 return(
  <Dialog open={isOpen} onOpenChange={open=>!open&&onClose()}>
   <DialogContent className="sm:max-w-[460px] border-border bg-card p-0 overflow-hidden">

    <DialogHeader className="border-b border-border bg-muted/20 px-6 py-5">
     <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
       <RefreshCw className="h-5 w-5 text-cyan-400"/>
      </div>

      <div>
       <DialogTitle className="text-lg font-bold">
        Alterar Status
       </DialogTitle>

       <DialogDescription className="mt-1 text-sm">
        Atualize o status deste lançamento.
       </DialogDescription>
      </div>
     </div>
    </DialogHeader>

    <div className="space-y-4 px-6 py-5">

     <Card className={`${info.bg} ${info.border}`}>
      <CardContent className="flex items-center gap-3 p-3">
       <Icon className={`h-5 w-5 ${info.color}`}/>

       <div>
        <p className="text-xs text-muted-foreground">
         Status selecionado
        </p>
        <p className={`font-semibold ${info.color}`}>
         {info.label}
        </p>
       </div>
      </CardContent>
     </Card>

     <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">
       Novo status
      </label>

      <Select value={status} onValueChange={setStatus}>
       <SelectTrigger className="h-11 bg-input">
        <SelectValue placeholder="Selecione o status"/>
       </SelectTrigger>

       <SelectContent className="z-[210] bg-card">
        <SelectItem value="Pago">Pago</SelectItem>
        <SelectItem value="Pago Parcialmente">
         Pago Parcialmente
        </SelectItem>
        <SelectItem value="Pendente">
         Pendente
        </SelectItem>
        <SelectItem value="Atrasado">
         Atrasado
        </SelectItem>
       </SelectContent>
      </Select>
     </div>

    </div>

    <DialogFooter className="border-t border-border bg-muted/10 px-6 py-4">

     <Button
      variant="outline"
      onClick={onClose}
      disabled={loading}
     >
      Cancelar
     </Button>

     <Button
      onClick={handleSave}
      disabled={loading}
      className="bg-cyan-600 hover:bg-cyan-500 text-white"
     >
      {loading&&(
       <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
      )}
      Salvar Status
     </Button>

    </DialogFooter>

   </DialogContent>
  </Dialog>
 );
}
