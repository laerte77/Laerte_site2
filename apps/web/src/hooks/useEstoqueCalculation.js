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
   const[a,b,c,d,e]=await Promise.all([
    supabase.from('lm_estoques_inicial').select('produto,quantidade_inicial,insumo_id').eq('user_id',user.id),
    supabase.from('lm_lanc_despesas').select('tipo_lancamento,tipo_folha,quantidade,insumo_id,lm_despesas(despesa)').eq('user_id',user.id).eq('tipo_lancamento','Estoque').not('quantidade','is',null),
    supabase.from('lm_lanc_servicos').select('folhas_gastas').eq('user_id',user.id).not('folhas_gastas','is',null),
    supabase.from('lm_insumos').select('id,nome,unidade,estoque_minimo').eq('user_id',user.id),
    supabase.from('lm_tipos_folha').select('tipo_folha,insumo_id').eq('user_id',user.id)
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   if(c.error)throw c.error;
   if(d.error)throw d.error;
   if(e.error)throw e.error;

   const insumoPorId=new Map((d.data||[]).map(i=>[String(i.id),i]));
   const folhaPorInsumo=new Map();
   const insumoPorFolha=new Map();

   (e.data||[]).forEach(f=>{
    if(!f.insumo_id||!f.tipo_folha)return;
    const id=String(f.insumo_id);
    if(!folhaPorInsumo.has(id))folhaPorInsumo.set(id,f.tipo_folha);
    insumoPorFolha.set(normalizeKey(f.tipo_folha),id);
   });

   const nomePorInsumo=id=>{
    if(!id)return null;
    return folhaPorInsumo.get(String(id))||insumoPorId.get(String(id))?.nome||null;
   };

   const map={};
   const ensure=name=>{
    const key=normalizeKey(name);
    if(!map[key])map[key]={
     tipo_folha:String(name||key),
     baseline:0,
     reposicoes:0,
     folhasGastas:0,
     estoqueAtual:0
    };
    return map[key];
   };

   (a.data||[]).forEach(x=>{
    const nome=nomePorInsumo(x.insumo_id)||x.produto;
    if(nome)ensure(nome).baseline+=Number(x.quantidade_inicial)||0;
   });

   (b.data||[]).forEach(x=>{
    const descricao=x.lm_despesas?.despesa;
    const nome=isReposicaoFolha(descricao)
     ?(nomePorInsumo(x.insumo_id)||x.tipo_folha)
     :(nomePorInsumo(x.insumo_id)||descricao);
    if(nome)ensure(nome).reposicoes+=Number(x.quantidade)||0;
   });

   (c.data||[]).forEach(x=>{
    if(!Array.isArray(x.folhas_gastas))return;
    x.folhas_gastas.forEach(f=>{
     if(f.e_rascunho||!f.tipo_folha||Number(f.quantidade)<=0)return;
     const id=insumoPorFolha.get(normalizeKey(f.tipo_folha));
     const nome=nomePorInsumo(id)||f.tipo_folha;
     ensure(nome).folhasGastas+=Number(f.quantidade);
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
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_tipos_folha',filter:`user_id=eq.${user.id}`},fetchAllData)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_insumos',filter:`user_id=eq.${user.id}`},fetchAllData)
   .subscribe();

  return()=>{
   isMounted.current=false;
   supabase.removeChannel(channel);
  };
 },[user,fetchAllData]);

 return{stockData,loading,isLoading:loading,error,refresh:fetchAllData,lastUpdate};
}
