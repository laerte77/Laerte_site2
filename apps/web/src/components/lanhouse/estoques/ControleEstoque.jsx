import React,{useState,useMemo}from'react';
import{motion}from'framer-motion';
import{Download,Search,RefreshCw,Loader2,PackageSearch}from'lucide-react';
import{useEstoqueCalculation}from'@/hooks/useEstoqueCalculation';
import{Input}from'@/components/ui/input';
import{Button}from'@/components/ui/button';
import{Card,CardContent,CardHeader,CardTitle,CardDescription}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{format}from'date-fns';
import*as XLSX from'xlsx';
import EstoqueAtualCard from'./EstoqueAtualCard';
import{cn}from'@/lib/utils';

const qty=v=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:3});

export default function ControleEstoque(){
 const{stockData,loading,refresh,lastUpdate,error}=useEstoqueCalculation();
 const[searchTerm,setSearchTerm]=useState('');
 const items=useMemo(()=>Object.values(stockData).sort((a,b)=>(a.nomeInsumo||a.tipo_folha).localeCompare(b.nomeInsumo||b.tipo_folha,'pt-BR')),[stockData]);
 const filtered=useMemo(()=>items.filter(x=>`${x.nomeInsumo||''} ${x.tipo_folha||''} ${x.unidade||''}`.toLowerCase().includes(searchTerm.trim().toLowerCase())),[items,searchTerm]);

 const exportData=()=>{
  if(!filtered.length)return;
  const rows=filtered.map(x=>({
   'INSUMO':x.nomeInsumo||x.tipo_folha,
   'UNIDADE':x.unidade||'unidade',
   'ESTOQUE INICIAL':x.baseline,
   'REPOSIÇÕES':x.reposicoes,
   'ENTRADAS MANUAIS':x.entradas,
   'CONSUMO EM SERVIÇOS':x.folhasGastas,
   'SAÍDAS MANUAIS':x.saidas,
   'PERDAS':x.perdas,
   'ESTOQUE ATUAL':x.estoqueAtual
  }));
  const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Controle de Estoque');
  XLSX.writeFile(wb,`Controle_Estoque_LM_${format(new Date(),'dd_MM_yyyy')}.xlsx`);
 };

 return <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="dark-lm-impressoes space-y-5 py-5">
  <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card/70 p-5 md:flex-row md:items-center">
   <div><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-cyan-400">Estoque</p><h1 className="mt-1 flex items-center gap-3 text-2xl font-bold sm:text-3xl"><PackageSearch className="h-7 w-7 text-cyan-400"/>Controle de Estoque</h1><p className="mt-1 text-sm text-muted-foreground">Acompanhe entradas, consumo, saídas, perdas e saldo atual.</p><p className="mt-1 text-xs text-muted-foreground">{lastUpdate?`Atualizado às ${format(lastUpdate,'HH:mm:ss')}`:'Aguardando atualização'}</p></div>
   <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={refresh} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4',loading&&'animate-spin')}/>Atualizar</Button><Button onClick={exportData} disabled={!filtered.length}><Download className="mr-2 h-4 w-4"/>Exportar Excel</Button></div>
  </div>

  {error&&<Card className="border-red-500/30 bg-red-500/5"><CardContent className="p-4 text-sm text-red-400">{error}</CardContent></Card>}

  <Card className="border-border bg-card/80"><CardContent className="p-4"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar por insumo ou unidade..." className="h-11 bg-input pl-9"/></div><p className="mt-2 text-xs text-muted-foreground">{filtered.length} material(is)</p></CardContent></Card>

  {loading&&!items.length?<div className="flex flex-col items-center justify-center py-16 text-muted-foreground"><Loader2 className="mb-3 h-8 w-8 animate-spin text-cyan-400"/>Calculando estoque...</div>:<>
   <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(item=><EstoqueAtualCard key={item.insumo_id||item.tipo_folha} item={item}/>)}{!filtered.length&&<div className="col-span-full py-10 text-center text-muted-foreground">Nenhum insumo encontrado.</div>}</div>
   <Card className="overflow-hidden border-border bg-card"><CardHeader className="border-b border-border bg-muted/20"><CardTitle className="text-lg text-cyan-400">Resumo do estoque</CardTitle><CardDescription>Entradas e saídas detalhadas por material.</CardDescription></CardHeader><CardContent className="p-0"><ScrollArea className="h-[480px]"><div className="overflow-x-auto"><Table><TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur"><TableRow><TableHead className="min-w-[200px]">Insumo</TableHead><TableHead className="text-center">Base</TableHead><TableHead className="text-center">Reposições</TableHead><TableHead className="text-center">Entradas</TableHead><TableHead className="text-center">Consumo</TableHead><TableHead className="text-center">Saídas</TableHead><TableHead className="text-center">Perdas</TableHead><TableHead className="text-right">Atual</TableHead></TableRow></TableHeader><TableBody>{filtered.length?filtered.map(x=><TableRow key={x.insumo_id||x.tipo_folha} className="hover:bg-cyan-500/5"><TableCell><span className="font-medium">{x.nomeInsumo||x.tipo_folha}</span><div className="text-xs text-muted-foreground">{x.unidade||'unidade'}</div></TableCell><TableCell className="text-center">{qty(x.baseline)}</TableCell><TableCell className="text-center text-emerald-400">+{qty(x.reposicoes)}</TableCell><TableCell className="text-center text-emerald-400">+{qty(x.entradas)}</TableCell><TableCell className="text-center text-red-400">-{qty(x.folhasGastas)}</TableCell><TableCell className="text-center text-red-400">-{qty(x.saidas)}</TableCell><TableCell className="text-center text-red-400">-{qty(x.perdas)}</TableCell><TableCell className={cn('text-right font-bold',x.estoqueAtual<0?'text-red-400':x.estoqueAtual===0?'text-amber-400':'text-cyan-300')}>{qty(x.estoqueAtual)}</TableCell></TableRow>):<TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhum material encontrado.</TableCell></TableRow>}</TableBody></Table></div></ScrollArea></CardContent></Card>
  </>}
 </motion.div>;
}
