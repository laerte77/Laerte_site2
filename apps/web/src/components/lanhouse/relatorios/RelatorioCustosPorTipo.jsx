import React,{useState,useEffect,useCallback,useMemo}from'react';
import{Download,Loader2,RotateCcw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='#06b6d4',RED='#ef4444',BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});

export default function RelatorioCustosPorTipo(){
 const{toast}=useToast(),{user}=useAuth();
 const[loading,setLoading]=useState(true),[start,setStart]=useState(''),[end,setEnd]=useState(''),[rows,setRows]=useState([]);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   let q=supabase.from('lm_lanc_custos').select('tipo_folha,tipo,custo_total,data_lancamento').eq('user_id',user.id);
   if(start)q=q.gte('data_lancamento',start);
   if(end)q=q.lte('data_lancamento',end);
   const{data,error}=await q;
   if(error)throw error;
   const g={};
   (data||[]).forEach(x=>{
    const k=x.tipo_folha||'Não especificado';
    if(!g[k])g[k]={tipo_folha:k,total_consumo:0,total_perda:0};
    if(String(x.tipo||'').toLowerCase()==='consumo')g[k].total_consumo+=Number(x.custo_total||0);
    if(String(x.tipo||'').toLowerCase()==='perda')g[k].total_perda+=Number(x.custo_total||0);
   });
   setRows(Object.values(g).map(x=>{
    const total=x.total_consumo+x.total_perda;
    return{...x,total_custos:total,margem_perda:total?(x.total_perda/total)*100:0};
   }).sort((a,b)=>b.total_custos-a.total_custos));
  }catch(e){
   toast({title:'Erro ao carregar relatório',description:e.message||'Não foi possível carregar os custos.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,start,end,toast]);

 useEffect(()=>{load()},[load]);

 const totals=useMemo(()=>rows.reduce((a,x)=>({consumo:a.consumo+x.total_consumo,perda:a.perda+x.total_perda,total:a.total+x.total_custos}),{consumo:0,perda:0,total:0}),[rows]);

 const exportar=()=>{
  if(!rows.length){
   toast({title:'Nada para exportar',description:'Não há dados no período selecionado.'});
   return;
  }
  const lines=[
   ['Tipo de Folha','Consumo','Perda','Total','Margem de Perda'],
   ...rows.map(x=>[x.tipo_folha,x.total_consumo.toFixed(2),x.total_perda.toFixed(2),x.total_custos.toFixed(2),x.margem_perda.toFixed(2)+'%'])
  ];
  const csv=lines.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob=new Blob([`\\ufeff${csv}`],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='relatorio-custos-por-tipo.csv';a.click();URL.revokeObjectURL(url);
 };

 return(
  <div className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p>
     <h1 className="mt-1 text-2xl font-bold">Relatório de Custos por Tipo</h1>
     <p className="text-sm text-muted-foreground">Análise de consumo e perdas por tipo de folha.</p>
    </div>
    <Button variant="outline" onClick={exportar} disabled={!rows.length}><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {[['Consumo',totals.consumo,CYAN],['Perdas',totals.perda,RED],['Total de Custos',totals.total,CYAN]].map(([l,v,c])=>
     <Card key={l}><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{l}</p><p className="mt-1 text-xl font-bold" style={{color:c}}>{BRL.format(v)}</p></CardContent></Card>
    )}
   </div>

   <Card>
    <CardContent className="p-4">
     <div className="grid gap-3 md:grid-cols-4">
      <div><Label>Data Inicial</Label><Input type="date" value={start} onChange={e=>setStart(e.target.value)}/></div>
      <div><Label>Data Final</Label><Input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div>
      <div className="flex items-end"><Button onClick={load} className="w-full text-white" style={{background:CYAN}} disabled={loading}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Atualizar</Button></div>
      <div className="flex items-end"><Button variant="outline" className="w-full" onClick={()=>{setStart('');setEnd('')}}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button></div>
     </div>
    </CardContent>
   </Card>

   <Card>
    <CardContent className="p-4">
     <div className="mb-4"><h2 className="font-semibold">Distribuição dos Custos</h2><p className="text-sm text-muted-foreground">Comparação entre consumo e perdas.</p></div>
     {!rows.length?<div className="py-12 text-center text-muted-foreground">{loading?'Carregando...':'Nenhum dado disponível.'}</div>:
      <div className="space-y-4">
       {rows.map(x=>{
        const max=Math.max(...rows.map(r=>r.total_custos),1),cons=x.total_custos?x.total_consumo/x.total_custos*100:0,perda=x.total_custos?x.total_perda/x.total_custos*100:0;
        return(
         <div key={x.tipo_folha} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium truncate">{x.tipo_folha}</span><span className="font-bold">{BRL.format(x.total_custos)}</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="flex h-full rounded-full" style={{width:`${(x.total_custos/max)*100}%`}}><div style={{width:`${cons}%`,background:CYAN}}/><div style={{width:`${perda}%`,background:RED}}/></div></div>
         </div>
        );
       })}
       <div className="flex justify-center gap-6 pt-2 text-xs text-muted-foreground"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{background:CYAN}}/>Consumo</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{background:RED}}/>Perda</span></div>
      </div>
     }
    </CardContent>
   </Card>

   <Card>
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader className="bg-secondary/70">
        <TableRow><TableHead>Tipo de Folha</TableHead><TableHead className="text-right">Consumo</TableHead><TableHead className="text-right">Perda</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Margem de Perda</TableHead></TableRow>
       </TableHeader>
       <TableBody>
        {loading?<TableRow><TableCell colSpan={5} className="py-12 text-center">Carregando...</TableCell></TableRow>:
         !rows.length?<TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Nenhum custo encontrado.</TableCell></TableRow>:
         rows.map(x=>
          <TableRow key={x.tipo_folha}>
           <TableCell className="font-semibold">{x.tipo_folha}</TableCell>
           <TableCell className="text-right" style={{color:CYAN}}>{BRL.format(x.total_consumo)}</TableCell>
           <TableCell className="text-right text-red-400">{BRL.format(x.total_perda)}</TableCell>
           <TableCell className="text-right font-bold">{BRL.format(x.total_custos)}</TableCell>
           <TableCell className={`text-right font-bold ${x.margem_perda>10?'text-red-400':'text-muted-foreground'}`}>{x.margem_perda.toFixed(2)}%</TableCell>
          </TableRow>
         )
        }
       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>
  </div>
 );
}
