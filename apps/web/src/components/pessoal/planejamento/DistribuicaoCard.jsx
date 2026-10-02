import React,{useState,useEffect}from'react';
import{Target,WalletCards,Save}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Slider}from'@/components/ui/slider';
import{Button}from'@/components/ui/button';
import{formatCurrency}from'@/lib/utils';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';

const BLUE='hsl(var(--neon-pessoal))';

export default function DistribuicaoCard({
 saldoPrev,
 saldoReal,
 distribuicao,
 onUpdate
}){
 const[investimento,setInvestimento]=useState(60);
 const[gasto,setGasto]=useState(40);
 const{user,isAdmin}=useAuth();
 const{toast}=useToast();

 useEffect(()=>{
  if(distribuicao){
   setInvestimento(Number(distribuicao.investimento)||0);
   setGasto(Number(distribuicao.gasto)||0);
  }
 },[distribuicao]);

 const handleSliderChange=value=>{
  const investimentoValue=Number(value[0])||0;

  setInvestimento(investimentoValue);
  setGasto(100-investimentoValue);
 };

 const handleSave=async()=>{
  if(!user)return;

  try{
   const userIdToMod=isAdmin
    ?(await supabase.rpc('get_admin_id')).data||user.id
    :user.id;

   const{data:existing,error:findError}=await supabase
    .from('pessoal_orcamento_distribuicao')
    .select('id')
    .eq('user_id',userIdToMod)
    .maybeSingle();

   if(findError)throw findError;

   if(existing){
    const{error}=await supabase
     .from('pessoal_orcamento_distribuicao')
     .update({
      percent_investimento:investimento,
      percent_gasto:gasto
     })
     .eq('id',existing.id);

    if(error)throw error;
   }else{
    const{error}=await supabase
     .from('pessoal_orcamento_distribuicao')
     .insert({
      user_id:userIdToMod,
      percent_investimento:investimento,
      percent_gasto:gasto
     });

    if(error)throw error;
   }

   toast({
    title:'Sucesso',
    description:'Distribuição salva.'
   });

   onUpdate();
  }catch(error){
   toast({
    title:'Erro',
    description:error.message||'Não foi possível salvar a distribuição.',
    variant:'destructive'
   });
  }
 };

 const investPrev=Math.max(0,saldoPrev)*investimento/100;
 const investReal=Math.max(0,saldoReal)*investimento/100;
 const gastoPrev=Math.max(0,saldoPrev)*gasto/100;
 const gastoReal=Math.max(0,saldoReal)*gasto/100;

 return(
  <Card className="border-border bg-card lg:col-span-2">

   <CardHeader className="flex flex-col gap-3 border-b border-border/50 pb-3 sm:flex-row sm:items-center sm:justify-between">

    <CardTitle className="flex items-center gap-2 text-lg">

     <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-[hsl(var(--neon-pessoal))]">
      <Target className="h-4 w-4"/>
     </span>

     Distribuição de Saldo

    </CardTitle>

    <Button
     size="sm"
     onClick={handleSave}
     className="text-white hover:opacity-90"
     style={{
      background:BLUE,
      boxShadow:'0 0 16px hsl(var(--neon-pessoal)/.18)'
     }}
    >
     <Save className="mr-2 h-4 w-4"/>
     Salvar Proporção
    </Button>

   </CardHeader>

   <CardContent className="space-y-6 pt-5">

    <div className="space-y-4">

     <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

      <span
       className="font-semibold"
       style={{color:BLUE}}
      >
       Investimento ({investimento}%)
      </span>

      <span className="font-semibold text-red-500">
       Gasto Livre ({gasto}%)
      </span>

     </div>

     <Slider
      value={[investimento]}
      max={100}
      min={0}
      step={1}
      onValueChange={handleSliderChange}
      className="w-full"
     />

     <div className="flex justify-between text-xs text-muted-foreground">
      <span>0%</span>
      <span>100%</span>
     </div>

    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

     <Card className="border-blue-500/20 bg-blue-500/5">

      <CardContent className="space-y-3 p-4">

       <div className="flex items-center justify-between">

        <h4
         className="flex items-center gap-2 font-bold"
         style={{color:BLUE}}
        >
         <Target className="h-4 w-4"/>
         Devo Investir
        </h4>

        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-semibold text-[hsl(var(--neon-pessoal))]">
         {investimento}%
        </span>

       </div>

       <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
         Previsto
        </span>

        <span className="font-bold tabular-nums">
         {formatCurrency(investPrev)}
        </span>
       </div>

       <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
         Real
        </span>

        <span className="font-bold tabular-nums">
         {formatCurrency(investReal)}
        </span>
       </div>

      </CardContent>
     </Card>

     <Card className="border-red-500/20 bg-red-500/5">

      <CardContent className="space-y-3 p-4">

       <div className="flex items-center justify-between">

        <h4 className="flex items-center gap-2 font-bold text-red-500">
         <WalletCards className="h-4 w-4"/>
         Posso Gastar
        </h4>

        <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-400">
         {gasto}%
        </span>

       </div>

       <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
         Previsto
        </span>

        <span className="font-bold tabular-nums">
         {formatCurrency(gastoPrev)}
        </span>
       </div>

       <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">
         Real
        </span>

        <span className="font-bold tabular-nums">
         {formatCurrency(gastoReal)}
        </span>
       </div>

      </CardContent>
     </Card>

    </div>

   </CardContent>
  </Card>
 );
}
