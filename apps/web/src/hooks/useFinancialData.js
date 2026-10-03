import{useState,useEffect,useCallback}from'react';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{startOfMonth,endOfMonth,startOfWeek,endOfWeek}from'date-fns';

export function useFinancialData(periodFilter){
 const{user,isAdmin}=useAuth();
 const[data,setData]=useState({
  entradasReais:0,
  entradasPrevistas:0,
  despesasReais:0,
  despesasPrevistas:0,
  aportesReais:0,
  dizimosReais:0,
  distribuicao:{investimento:60,gasto:40}
 });
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState(null);

 const fetchData=useCallback(async()=>{
  if(!user)return;

  setLoading(true);
  setError(null);

  try{
   const{periodType,month,year,quinzena,dateRange}=periodFilter;
   let startDate,endDate;

   if(periodType==='mes'){
    startDate=startOfMonth(new Date(year,month)).toISOString();
    endDate=endOfMonth(new Date(year,month)).toISOString();
   }else if(periodType==='quinzena'){
    if(quinzena===1){
     startDate=startOfMonth(new Date(year,month)).toISOString();
     endDate=new Date(year,month,15,23,59,59).toISOString();
    }else{
     startDate=new Date(year,month,16,0,0,0).toISOString();
     endDate=endOfMonth(new Date(year,month)).toISOString();
    }
   }else if(periodType==='semana'){
    startDate=dateRange?.from
     ?dateRange.from.toISOString()
     :startOfWeek(new Date()).toISOString();
    endDate=dateRange?.to
     ?dateRange.to.toISOString()
     :endOfWeek(new Date()).toISOString();
   }

   const userIdToFetch=isAdmin
    ?(await supabase.rpc('get_admin_id')).data||user.id
    :user.id;

   const[
    receitasRes,
    despesasRes,
    despesasPrevRes,
    entradasPrevRes,
    distribuicaoRes,
    aportesRes,
    dizimosRes
   ]=await Promise.all([
    supabase
     .from('receitas')
     .select('valor')
     .eq('user_id',userIdToFetch)
     .gte('data',startDate)
     .lte('data',endDate),

    supabase
     .from('despesas')
     .select('valor')
     .eq('user_id',userIdToFetch)
     .gte('data',startDate)
     .lte('data',endDate),

    supabase
     .from('despesas_previstas')
     .select('valor')
     .eq('user_id',userIdToFetch)
     .gte('data_vencimento',startDate)
     .lte('data_vencimento',endDate),

    supabase
     .from('pessoal_orcamento_salario_previsto')
     .select('salario_previsto')
     .eq('user_id',userIdToFetch)
     .eq('mes',month)
     .eq('ano',year)
     .maybeSingle(),

    supabase
     .from('pessoal_orcamento_distribuicao')
     .select('percent_investimento,percent_gasto')
     .eq('user_id',userIdToFetch)
     .maybeSingle(),

    supabase
     .from('aportes')
     .select('valor')
     .eq('user_id',userIdToFetch)
     .gte('data',startDate)
     .lte('data',endDate),

    supabase
     .from('pessoal_dizimos_ofertas')
     .select('valor')
     .eq('user_id',userIdToFetch)
     .gte('data',startDate)
     .lte('data',endDate)
   ]);

   const results=[
    receitasRes,despesasRes,despesasPrevRes,
    entradasPrevRes,distribuicaoRes,aportesRes,dizimosRes
   ];

   const firstError=results.find(r=>r.error)?.error;
   if(firstError)throw firstError;

   const sum=items=>
    (items||[]).reduce((total,item)=>total+Number(item.valor||0),0);

   setData({
    entradasReais:sum(receitasRes.data),
    entradasPrevistas:Number(entradasPrevRes.data?.salario_previsto||0),
    despesasReais:sum(despesasRes.data),
    despesasPrevistas:sum(despesasPrevRes.data),
    aportesReais:sum(aportesRes.data),
    dizimosReais:sum(dizimosRes.data),
    distribuicao:distribuicaoRes.data
     ?{
       investimento:Number(distribuicaoRes.data.percent_investimento),
       gasto:Number(distribuicaoRes.data.percent_gasto)
      }
     :{investimento:60,gasto:40}
   });
  }catch(err){
   console.error('Error fetching financial data:',err);
   setError(err.message||'Não foi possível carregar os dados.');
  }finally{
   setLoading(false);
  }
 },[user,isAdmin,periodFilter]);

 useEffect(()=>{fetchData()},[fetchData]);

 return{data,loading,error,refetch:fetchData};
}
