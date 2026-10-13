import{useState,useEffect,useCallback,useRef}from'react';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const normalizeKey=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase()||'DESCONHECIDO';
const isReposicaoFolha=v=>/reposi.{0,8}de folha/i.test(String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''));

export function useEstoqueCalculation(){
 const{user}=useAuth();
 const[stockData,setStockData]=useState({});
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState(null);
 const[lastUpdate,setLastUpdate]=useState(new Date());
 const isMounted=useRef(true);

 const fetchAllData=useCallback(async()=>{
  if(!user){setStockData({});setLoading(false);return}
  try{
   setLoading(true);setError(null);
   const[a,b,c]=await Promise.all([
    supabase.from('lm_estoques_inicial').select('produto,quantidade_inicial').eq('user_id',user.id),
    supabase.from('lm_lanc_despesas').select('tipo_lancamento,tipo_folha,quantidade,lm_despesas(despesa)').eq('user_id',user.id).eq('tipo_lancamento','Estoque').not('quantidade','is',null),
    supabase.from('lm_lanc_servicos').select('folhas_gastas').eq('user_id',user.id).not('folhas_gastas','is',null)
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   if(c.error)throw c.error;

   const map={};
   const ensure=(name)=>{
    const key=normalizeKey(name);
    if(!map[key])map[key]={tipo_folha:key,baseline:0,reposicoes:0,folhasGastas:0,estoqueAtual:0};
    return map[key];
   };

   (a.data||[]).forEach(x=>{
    if(x.produto)ensure(x.produto).baseline+=Number(x.quantidade_inicial)||0;
   });

   (b.data||[]).forEach(x=>{
    const descricao=x.lm_despesas?.despesa;
    const nome=isReposicaoFolha(descricao)?x.tipo_folha:descricao;
    if(nome)ensure(nome).reposicoes+=Number(x.quantidade)||0;
   });

   (c.data||[]).forEach(x=>{
    if(!Array.isArray(x.folhas_gastas))return;
    x.folhas_gastas.forEach(f=>{
     if(!f.e_rascunho&&f.tipo_folha&&Number(f.quantidade)>0){
      ensure(f.tipo_folha).folhasGastas+=Number(f.quantidade);
     }
    });
   });

   Object.values(map).forEach(x=>{
    x.estoqueAtual=x.baseline+x.reposicoes-x.folhasGastas;
   });

   if(isMounted.current){setStockData(map);setLastUpdate(new Date())}
  }catch(e){
   console.error('Erro ao calcular estoque:',e);
   if(isMounted.current)setError(e.message||'Não foi possível calcular o estoque.');
  }finally{
   if(isMounted.current)setLoading(false);
  }
 },[user]);

 useEffect(()=>{
  isMounted.current=true;
  fetchAllData();
  if(!user)return()=>{isMounted.current=false};

  const channel=supabase.channel(`stock-updates-${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_estoques_inicial',filter:`user_id=eq.${user.id}`},fetchAllData)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_lanc_despesas',filter:`user_id=eq.${user.id}`},fetchAllData)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_lanc_servicos',filter:`user_id=eq.${user.id}`},fetchAllData)
   .subscribe();

  return()=>{
   isMounted.current=false;
   supabase.removeChannel(channel);
  };
 },[user,fetchAllData]);

 return{stockData,loading,error,refresh:fetchAllData,lastUpdate};
}
