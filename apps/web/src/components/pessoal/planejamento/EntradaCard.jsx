import React,{useEffect,useState}from'react';
import{Check,Edit2,ArrowUpRight}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Input}from'@/components/ui/input';
import{Button}from'@/components/ui/button';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{formatCurrency}from'@/lib/utils';

const BLUE='hsl(var(--neon-pessoal))';

export default function EntradaCard({
 realValue,
 prevValue,
 periodFilter,
 onUpdate
}){
 const[isEditing,setIsEditing]=useState(false);
 const[editValue,setEditValue]=useState(prevValue);
 const{user,isAdmin}=useAuth();
 const{toast}=useToast();

 const diff=realValue-prevValue;

 useEffect(()=>{
  setEditValue(prevValue);
 },[prevValue]);

 const handleSave=async()=>{
  if(!user)return;

  const val=Number(editValue)||0;

  if(val<0){
   toast({
    title:'Valor inválido',
    description:'Informe um valor igual ou maior que zero.',
    variant:'destructive'
   });
   return;
  }

  try{
   const userIdToMod=isAdmin
    ?(await supabase.rpc('get_admin_id')).data||user.id
    :user.id;

   const{data:existing}=await supabase
    .from('pessoal_orcamento_salario_previsto')
    .select('id')
    .eq('user_id',userIdToMod)
    .eq('mes',periodFilter.month)
    .eq('ano',periodFilter.year)
    .maybeSingle();

   if(existing){
    const{error}=await supabase
     .from('pessoal_orcamento_salario_previsto')
     .update({salario_previsto:val})
     .eq('id',existing.id);

    if(error)throw error;
   }else{
    const{error}=await supabase
     .from('pessoal_orcamento_salario_previsto')
     .insert({
      user_id:userIdToMod,
      mes:periodFilter.month,
      ano:periodFilter.year,
      salario_previsto:val
     });

    if(error)throw error;
   }

   setIsEditing(false);
   onUpdate();

   toast({
    title:'Sucesso',
    description:'Entrada prevista atualizada.'
   });
  }catch(error){
   toast({
    title:'Erro',
    description:error.message||'Não foi possível atualizar a entrada.',
    variant:'destructive'
   });
  }
 };

 return(
  <Card className="border-border bg-card">

   <CardHeader className="border-b border-border/50 pb-3">
    <div className="flex items-center justify-between">

     <CardTitle
      className="flex items-center gap-2 text-lg"
      style={{color:BLUE}}
     >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
       <ArrowUpRight className="h-4 w-4"/>
      </span>
      Entradas
     </CardTitle>

     <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-[hsl(var(--neon-pessoal))]">
      Entrada
     </span>

    </div>
   </CardHeader>

   <CardContent className="space-y-4 pt-4">

    <div className="flex items-center justify-between gap-4">

     <div>
      <p className="text-sm font-medium text-muted-foreground">
       Previsto
      </p>
     </div>

     {isEditing?(
      <div className="flex items-center gap-2">

       <Input
        type="number"
        min="0"
        step="0.01"
        value={editValue}
        onChange={e=>setEditValue(e.target.value)}
        className="h-9 w-28 bg-input text-right"
       />

       <Button
        size="icon"
        variant="ghost"
        onClick={handleSave}
        className="h-8 w-8 hover:bg-blue-500/10"
        style={{color:BLUE}}
       >
        <Check className="h-4 w-4"/>
       </Button>

      </div>
     ):(
      <div className="flex items-center gap-2">

       <span
        className="text-xl font-bold tabular-nums"
        style={{color:BLUE}}
       >
        {formatCurrency(prevValue)}
       </span>

       <Button
        size="icon"
        variant="ghost"
        onClick={()=>setIsEditing(true)}
        className="h-7 w-7 text-muted-foreground hover:bg-blue-500/10"
       >
        <Edit2 className="h-3.5 w-3.5"/>
       </Button>

      </div>
     )}

    </div>

    <div className="flex items-center justify-between">

     <span className="text-sm font-medium text-muted-foreground">
      Realizado
     </span>

     <span
      className="text-xl font-bold tabular-nums"
      style={{color:BLUE}}
     >
      {formatCurrency(realValue)}
     </span>

    </div>

    <div className="flex items-center justify-between border-t border-border/50 pt-3">

     <span className="text-sm font-semibold">
      Diferença
     </span>

     <span
      className={`text-lg font-bold tabular-nums ${
       diff>0
        ?'text-green-400'
        :diff<0
        ?'text-red-400'
        :'text-muted-foreground'
      }`}
     >
      {diff>0?'+':''}{formatCurrency(diff)}
     </span>

    </div>

   </CardContent>
  </Card>
 );
}
