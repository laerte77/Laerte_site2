import React,{useState,useEffect}from'react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Slider}from'@/components/ui/slider';
import{Button}from'@/components/ui/button';
import{formatCurrency}from'@/lib/utils';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';

export default function DistribuicaoCard({saldoPrev,saldoReal,distribuicao,onUpdate}){
 const[investimento,setInvestimento]=useState(60);
 const[gasto,setGasto]=useState(40);
 const{user,isAdmin}=useAuth();
 const{toast}=useToast();

 useEffect(()=>{
  if(distribuicao){
   setInvestimento(distribuicao.investimento);
   setGasto(distribuicao.gasto);
  }
 },[distribuicao]);

 const handleSliderChange=val=>{
  setInvestimento(val[0]);
  setGasto(100-val[0]);
 };

 const handleSave=async()=>{
  if(!user)return;

  try{
   const userIdToMod=isAdmin?(await supabase.rpc('get_admin_id')).data||user.id:user.id;
   const{data:existing}=await supabase
    .from('pessoal_orcamento_distribuicao')
    .select('id')
    .eq('user_id',userIdToMod)
    .maybeSingle();

   if(existing){
    await supabase
     .from('pessoal_orcamento_distribuicao')
     .update({
      percent_investimento:investimento,
      percent_gasto:gasto
     })
     .eq('id',existing.id);
   }else{
    await supabase
     .from('pessoal_orcamento_distribuicao')
     .insert({
      user_id:userIdToMod,
      percent_investimento:investimento,
      percent_gasto:gasto
     });
   }

   toast({title:'Sucesso',description:'Distribuição salva.'});
   onUpdate();
  }catch(e){
   toast({variant:'destructive',title:'Erro',description:e.message});
  }
 };

 const investPrev=Math.max(0,saldoPrev)*investimento/100;
 const investReal=Math.max(0,saldoReal)*investimento/100;
 const gastoPrev=Math.max(0,saldoPrev)*gasto/100;
 const gastoReal=Math.max(0,saldoReal)*gasto/100;

 return(
  <Card className="border-border bg-card lg:col-span-2">
   <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-2">
    <CardTitle className="text-lg">Distribuição de Saldo</CardTitle>
    <Button
     size="sm"
     onClick={handleSave}
     className="bg-[hsl(var(--neon-pessoal))] text-black hover:bg-[hsl(var(--neon-pessoal))]/80"
    >
     Salvar Proporção
    </Button>
   </CardHeader>

   <CardContent className="space-y-6 pt-6">
    <div className="space-y-4">
     <div className="flex justify-between text-sm font-semibold">
      <span className="text-investment">Investimento ({investimento}%)</span>
      <span className="text-spending">Gasto Livre ({gasto}%)</span>
     </div>

     <Slider
      defaultValue={[60]}
      value={[investimento]}
      max={100}
      step={1}
      onValueChange={handleSliderChange}
      className="w-full"
     />
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
     <Card className="border-investment/30 bg-investment/10">
      <CardContent className="space-y-2 p-4 text-center">
       <h4 className="font-bold text-investment">Devo Investir</h4>
       <div className="flex justify-between text-sm">
        <span>Previsto:</span>
        <span className="font-bold">{formatCurrency(investPrev)}</span>
       </div>
       <div className="flex justify-between text-sm">
        <span>Real:</span>
        <span className="font-bold">{formatCurrency(investReal)}</span>
       </div>
      </CardContent>
     </Card>

     <Card className="border-spending/30 bg-spending/10">
      <CardContent className="space-y-2 p-4 text-center">
       <h4 className="font-bold text-spending">Posso Gastar</h4>
       <div className="flex justify-between text-sm">
        <span>Previsto:</span>
        <span className="font-bold">{formatCurrency(gastoPrev)}</span>
       </div>
       <div className="flex justify-between text-sm">
        <span>Real:</span>
        <span className="font-bold">{formatCurrency(gastoReal)}</span>
       </div>
      </CardContent>
     </Card>
    </div>
   </CardContent>
  </Card>
 );
}
