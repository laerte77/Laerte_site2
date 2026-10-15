import React,{useState,useEffect,useCallback,useMemo}from'react';
import{Download,Loader2,RotateCcw,AlertTriangle}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='#06b6d4',RED='#ef4444',GREEN='#10b981',AMBER='#f59e0b';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const money=v=>BRL.format(Number(v)||0);
const empty=()=>({tipo_folha:'Não especificado',total_consumo:0,total_servicos:0,total_perda:0,itens_pendentes:0,itens_estimados:0,itens_sem_origem:0});

const origemNaoIdentificada=x=>!x.custo_origem&&x.custo_estimado==null;

export default function RelatorioCustosPorTipo(){
 const{toast}=useToast(),{user}=useAuth();
 const[loading,setLoading]=useState(true),[start,setStart]=useState(''),[end,setEnd]=useState(''),[rows,setRows]=useState([]);

 const load=useCallback(async()=>{
  if(!user){setRows([]);setLoading(false);return}
  if(start&&end&&start>end){
   setRows([]);setLoading(false);
   toast({title:'Período inválido',description:'A data inicial deve ser anterior ou igual à data final.',variant:'destructive'});
   return;
  }
  setLoading(true);
  try{
   let manualQ=supabase.from('lm_lanc_custos')
    .select('tipo_folha,tipo,custo_total,data_lancamento,custo_origem,custo_estimado,custo_pendente')
    .eq('user_id',user.id);
   let servicesQ=supabase.from('lm_lanc_servicos')
    .select('data,folhas_gastas').eq('user_id',user.id).not('folhas_gastas','is',null);

   if(start){manualQ=manualQ.gte('data_lancamento',start);servicesQ=servicesQ.gte('data',start)}
   if(end){manualQ=manualQ.lte('data_lancamento',end);servicesQ=servicesQ.lte('data',end)}

   const[manualRes,servicesRes]=await Promise.all([manualQ,servicesQ]);
   if(manualRes.error)throw manualRes.error;
   if(servicesRes.error)throw servicesRes.error;

   const grouped=new Map();
   const ensure=name=>{
    const label=String(name||'Não especificado').trim()||'Não especificado';
    const key=norm(label);
    if(!grouped.has(key))grouped.set(key,{...empty(),tipo_folha:label});
    return grouped.get(key);
   };

   (manualRes.data||[]).forEach(x=>{
    const row=ensure(x.tipo_folha);
    if(x.custo_pendente===true){row.itens_pendentes++;return}
    if(origemNaoIdentificada(x))row.itens_sem_origem++;
    if(norm(x.tipo)==='consumo')row.total_consumo+=Number(x.custo_total)||0;
    if(norm(x.tipo)==='perda')row.total_perda+=Number(x.custo_total)||0;
    if(x.custo_estimado===true||x.custo_origem==='cadastro')row.itens_estimados++;
   });

   (servicesRes.data||[]).forEach(s=>{
    if(!Array.isArray(s.folhas_gastas))return;
    s.folhas_gastas.forEach(f=>{
     if(f.e_rascunho||!f.tipo_folha||Number(f.quantidade)<=0)return;
     const row=ensure(f.tipo_folha);
     const confirmado=f.custo_automatico===true&&!f.custo_pendente&&
      f.custo_total!==undefined&&f.custo_total!==null&&
      Number.isFinite(Number(f.custo_total))&&Number(f.custo_total)>=0;

     if(!confirmado){row.itens_pendentes++;return}
     row.total_servicos+=Number(f.custo_total);

     if(!f.custo_origem||f.custo_origem==='historico')row.itens_sem_origem++;
     else if(f.custo_estimado===true||f.custo_origem==='cadastro')row.itens_estimados++;
    });
   });

   const resultado=[...grouped.values()].map(x=>{
    x.total_consumo=Math.round(x.total_consumo*100)/100;
    x.total_servicos=Math.round(x.total_servicos*100)/100;
    x.total_perda=Math.round(x.total_perda*100)/100;
    x.total_custos=x.total_consumo+x.total_servicos+x.total_perda;
    x.margem_perda=x.total_custos?x.total_perda/x.total_custos*100:0;
    return x;
   }).sort((a,b)=>b.total_custos-a.total_custos||a.tipo_folha.localeCompare(b.tipo_folha,'pt-BR'));

   setRows(resultado);
  }catch(e){
   console.error('Erro no relatório de custos por tipo:',e);
   toast({title:'Erro ao carregar relatório',description:e.message||'Não foi possível carregar os custos.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,start,end,toast]);

 useEffect(()=>{load()},[load]);

 const totals=useMemo(()=>rows.reduce((a,x)=>({
  consumo:a.consumo+x.total_consumo,
  servicos:a.servicos+x.total_servicos,
  perda:a.perda+x.total_perda,
  total:a.total+x.total_custos,
  pendentes:a.pendentes+x.itens_pendentes,
  estimados:a.estimados+x.itens_estimados,
  semOrigem:a.semOrigem+x.itens_sem_origem
 }),{consumo:0,servicos:0,perda:0,total:0,pendentes:0,estimados:0,semOrigem:0}),[rows]);

 const exportar=()=>{
  if(!rows.length){toast({title:'Nada para exportar',description:'Não há dados no período selecionado.'});return}
  const lines=[
   ['Tipo de Folha','Uso fora de serviço','Folhas em serviços','Perdas','Total de custos','Itens estimados','Itens sem origem identificada','Itens pendentes','Margem de perda'],
   ...rows.map(x=>[x.tipo_folha,x.total_consumo.toFixed(2),x.total_servicos.toFixed(2),x.total_perda.toFixed(2),x.total_custos.toFixed(2),x.itens_estimados,x.itens_sem_origem,x.itens_pendentes,x.margem_perda.toFixed(2)+'%'])
  ];
  const csv=lines.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`Relatorio_Custos_Por_Tipo_${start||'inicio'}_${end||'fim'}.csv`;
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };

 const clearFilters=()=>{setStart('');setEnd('')};
 const maxTotal=Math.max(...rows.map(x=>x.total_custos),1);

 return(
  <div className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div><p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p><h1 className="mt-1 text-2xl font-bold">Relatório de Custos por Tipo</h1><p className="text-sm text-muted-foreground">Uso fora de serviços, folhas em serviços, perdas e situação da origem dos custos.</p></div>
    <Button variant="outline" onClick={exportar} disabled={loading||!rows.length}><Download className="mr-2 h-4 w-4"/>Exportar CSV</Button>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[['Uso fora de serviço',totals.consumo,CYAN],['Folhas em serviços',totals.servicos,GREEN],['Perdas',totals.perda,RED],['Total de custos',totals.total,CYAN],['Custos estimados',totals.estimados,AMBER],['Origem não identificada',totals.semOrigem,AMBER],['Custos pendentes',totals.pendentes,AMBER]].map(([label,value,color])=><Card key={label}><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold" style={{color}}>{['Custos pendentes','Custos estimados','Origem não identificada'].includes(label)?value:money(value)}</p></CardContent></Card>)}
   </div>

   {totals.pendentes>0&&<Card className="border-amber-500/30 bg-amber-500/5"><CardContent className="flex gap-3 p-4"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"/><div className="space-y-1 text-sm"><p className="font-semibold text-amber-400">Existem custos pendentes</p><p className="text-muted-foreground">{totals.pendentes} item(ns) sem custo confirmado. Esses valores não entram nos custos calculados até serem verificados.</p></div></CardContent></Card>}

   <Card><CardContent className="p-4"><div className="grid gap-3 md:grid-cols-4">
    <div><Label>Data inicial</Label><Input type="date" value={start} onChange={e=>setStart(e.target.value)}/></div>
    <div><Label>Data final</Label><Input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></div>
    <div className="flex items-end"><Button onClick={load} className="w-full text-white" style={{background:CYAN}} disabled={loading}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Atualizar</Button></div>
    <div className="flex items-end"><Button variant="outline" className="w-full" onClick={clearFilters} disabled={loading}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button></div>
   </div></CardContent></Card>

   <Card><CardHeader><CardTitle className="text-base">Distribuição dos custos</CardTitle></CardHeader><CardContent>
    {!rows.length?<div className="py-12 text-center text-muted-foreground">{loading?'Carregando...':'Nenhum dado disponível no período.'}</div>:
     <div className="space-y-4">{rows.map(x=>{
      const total=x.total_custos||0,pct=v=>total?v/total*100:0;
      return <div key={norm(x.tipo_folha)} className="space-y-1.5">
       <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium truncate">{x.tipo_folha}</span><span className="font-bold">{money(total)}</span></div>
       <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="flex h-full rounded-full" style={{width:`${total/maxTotal*100}%`}}><div style={{width:`${pct(x.total_consumo)}%`,background:CYAN}}/><div style={{width:`${pct(x.total_servicos)}%`,background:GREEN}}/><div style={{width:`${pct(x.total_perda)}%`,background:RED}}/></div></div>
      </div>;
     })}<div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-muted-foreground"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{background:CYAN}}/>Uso fora de serviço</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{background:GREEN}}/>Uso em serviços</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm" style={{background:RED}}/>Perdas</span></div></div>
    }
   </CardContent></Card>

   <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table>
    <TableHeader className="bg-secondary/70"><TableRow><TableHead>Tipo de folha</TableHead><TableHead className="text-right">Uso fora de serviço</TableHead><TableHead className="text-right">Folhas em serviços</TableHead><TableHead className="text-right">Perdas</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Estimados</TableHead><TableHead className="text-right">Sem origem</TableHead><TableHead className="text-right">Pendências</TableHead><TableHead className="text-right">Margem de perda</TableHead></TableRow></TableHeader>
    <TableBody>
     {loading?<TableRow><TableCell colSpan={9} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6"/></TableCell></TableRow>
     :!rows.length?<TableRow><TableCell colSpan={9} className="py-12 text-center text-muted-foreground">Nenhum custo encontrado.</TableCell></TableRow>
     :rows.map(x=><TableRow key={norm(x.tipo_folha)}><TableCell className="font-semibold">{x.tipo_folha}</TableCell><TableCell className="text-right" style={{color:CYAN}}>{money(x.total_consumo)}</TableCell><TableCell className="text-right" style={{color:GREEN}}>{money(x.total_servicos)}</TableCell><TableCell className="text-right text-red-400">{money(x.total_perda)}</TableCell><TableCell className="text-right font-bold">{money(x.total_custos)}</TableCell><TableCell className="text-right text-amber-400">{x.itens_estimados}</TableCell><TableCell className="text-right text-amber-400">{x.itens_sem_origem}</TableCell><TableCell className="text-right text-amber-400">{x.itens_pendentes}</TableCell><TableCell className={`text-right font-bold ${x.margem_perda>10?'text-red-400':'text-muted-foreground'}`}>{x.margem_perda.toFixed(2)}%</TableCell></TableRow>)}
    </TableBody>
   </Table></div></CardContent></Card>
  </div>
 );
}
