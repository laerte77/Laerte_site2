import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{FileText,Download,Calendar,TrendingUp,TrendingDown,AlertTriangle,Loader2,RotateCcw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardDescription,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';

const CYAN='#06b6d4';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const dateKey=v=>String(v||'').slice(0,10);
const isReposicaoFolha=v=>/reposi.{0,8}de folha/i.test(String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,''));
const hojeSP=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`};
const emptyData={insumos:[],tipos:[],despesas:[],servicos:[],movimentos:[]};

export default function ControleFolhas(){
 const{toast}=useToast(),{user}=useAuth();
 const[loading,setLoading]=useState(true);
 const[dateRange,setDateRange]=useState({start_date:'',end_date:''});
 const[selectedTipoFolha,setSelectedTipoFolha]=useState('Todos');
 const[raw,setRaw]=useState(emptyData);

 const fetchData=useCallback(async()=>{
  if(!user){setRaw(emptyData);setLoading(false);return}
  setLoading(true);
  try{
   const[a,b,c,d,e]=await Promise.all([
    supabase.from('lm_insumos').select('id,nome,unidade,ativo').eq('user_id',user.id),
    supabase.from('lm_tipos_folha').select('tipo_folha,insumo_id,preco').eq('user_id',user.id),
    supabase.from('lm_lanc_despesas').select('data,valor,tipo_lancamento,tipo_folha,quantidade,insumo_id,created_at,lm_despesas(despesa)').eq('user_id',user.id).eq('tipo_lancamento','Estoque').not('quantidade','is',null).gt('quantidade',0),
    supabase.from('lm_lanc_servicos').select('data,folhas_gastas').eq('user_id',user.id).not('folhas_gastas','is',null),
    supabase.from('lm_folhas').select('data,tipo_folha,tipo_movimento,quantidade,insumo_id').eq('user_id',user.id)
   ]);
   for(const r of[a,b,c,d,e])if(r.error)throw r.error;
   setRaw({insumos:a.data||[],tipos:b.data||[],despesas:c.data||[],servicos:d.data||[],movimentos:e.data||[]});
  }catch(e){
   console.error('Erro ao carregar controle de folhas:',e);
   toast({title:'Erro ao carregar',description:e.message||'Não foi possível consultar o estoque.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const{controlData,tiposFolha}=useMemo(()=>{
  const insumoById=new Map(raw.insumos.map(i=>[String(i.id),i]));
  const insumoIdByName=new Map(raw.insumos.map(i=>[norm(i.nome),String(i.id)]));
  const typeIdByName=new Map(),labelById=new Map();

  raw.tipos.forEach(t=>{
   if(!t.tipo_folha||!t.insumo_id)return;
   const id=String(t.insumo_id);
   typeIdByName.set(norm(t.tipo_folha),id);
   if(!labelById.has(id))labelById.set(id,t.tipo_folha);
  });

  const resolveId=(id,name)=>{
   if(id&&insumoById.has(String(id)))return String(id);
   return typeIdByName.get(norm(name))||insumoIdByName.get(norm(name))||null;
  };
  const keyFor=(id,name)=>{
   const iid=resolveId(id,name);
   return iid?`I:${iid}`:`N:${norm(name)}`;
  };
  const displayName=(id,name)=>{
   const iid=resolveId(id,name);
   return(iid&&(labelById.get(iid)||insumoById.get(iid)?.nome))||name||'Não especificado';
  };
  const expenseName=x=>{
   const desc=x.lm_despesas?.despesa;
   if(x.insumo_id)return insumoById.get(String(x.insumo_id))?.nome||x.tipo_folha||desc;
   return isReposicaoFolha(desc)?x.tipo_folha:(x.tipo_folha||desc);
  };
  const inRange=date=>{
   const d=dateKey(date);
   if(dateRange.start_date&&(!d||d<dateRange.start_date))return false;
   if(dateRange.end_date&&(!d||d>dateRange.end_date))return false;
   return true;
  };

  // O custo estimado respeita a data final do relatório.
  // Compras posteriores ao período não são utilizadas.
  const cutoff=dateRange.end_date||hojeSP();
  const costs={};
  const sortedExpenses=[...raw.despesas]
   .filter(x=>dateKey(x.data)&&dateKey(x.data)<=cutoff)
   .sort((a,b)=>dateKey(a.data).localeCompare(dateKey(b.data))||String(a.created_at||'').localeCompare(String(b.created_at||'')));

  sortedExpenses.forEach(x=>{
   const q=Number(x.quantidade),value=Number(x.valor),name=expenseName(x);
   if(q<=0||!Number.isFinite(value)||value<=0||!name)return;
   costs[keyFor(x.insumo_id,name)]=value/q;
  });

  // O preço cadastrado serve de estimativa quando não há compra anterior disponível.
  raw.tipos.forEach(t=>{
   const key=keyFor(t.insumo_id,t.tipo_folha);
   if(costs[key]==null&&Number(t.preco)>0)costs[key]=Number(t.preco);
  });

  const grouped={};
  const ensure=(id,name)=>{
   const key=keyFor(id,name);
   if(!grouped[key]){
    grouped[key]={
     key,tipo_folha:displayName(id,name),
     entradas:0,saidas:0,perdas:0,variacao:0,
     custo_unitario:costs[key]||0,valor_variacao:0
    };
   }else if(!grouped[key].custo_unitario){
    grouped[key].custo_unitario=costs[key]||0;
   }
   return grouped[key];
  };

  // Entradas de estoque.
  raw.despesas.forEach(x=>{
   if(!inRange(x.data)||norm(x.tipo_lancamento)!=='ESTOQUE')return;
   const q=Number(x.quantidade)||0,name=expenseName(x);
   if(q<=0||!name)return;
   ensure(x.insumo_id,name).entradas+=q;
  });

  // Movimentações manuais de insumos.
  raw.movimentos.forEach(x=>{
   if(!inRange(x.data))return;
   const q=Number(x.quantidade)||0,type=norm(x.tipo_movimento);
   if(q<=0||!['ENTRADA','SAIDA','PERDA'].includes(type))return;
   const row=ensure(x.insumo_id,x.tipo_folha);
   if(type==='ENTRADA')row.entradas+=q;
   else if(type==='SAIDA')row.saidas+=q;
   else row.perdas+=q;
  });

  // Folhas consumidas em serviços. Rascunhos são ignorados.
  raw.servicos.forEach(x=>{
   if(!inRange(x.data)||!Array.isArray(x.folhas_gastas))return;
   x.folhas_gastas.forEach(f=>{
    if(f.e_rascunho||!f.tipo_folha||Number(f.quantidade)<=0)return;
    ensure(null,f.tipo_folha).saidas+=Number(f.quantidade)||0;
   });
  });

  const all=Object.values(grouped).map(x=>{
   x.variacao=x.entradas-x.saidas-x.perdas;
   x.valor_variacao=x.variacao*x.custo_unitario;
   return x;
  }).sort((a,b)=>a.tipo_folha.localeCompare(b.tipo_folha,'pt-BR'));

  const options=new Set();
  raw.tipos.forEach(t=>{if(t.tipo_folha)options.add(displayName(t.insumo_id,t.tipo_folha))});
  raw.insumos.forEach(i=>options.add(displayName(i.id,i.nome)));
  all.forEach(x=>options.add(x.tipo_folha));

  const filtered=selectedTipoFolha==='Todos'?all:all.filter(x=>norm(x.tipo_folha)===norm(selectedTipoFolha));

  return{
   controlData:filtered,
   tiposFolha:[...options].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'))
  };
 },[raw,dateRange,selectedTipoFolha]);

 const totals=useMemo(()=>controlData.reduce((a,x)=>({
  entradas:a.entradas+x.entradas,
  saidas:a.saidas+x.saidas,
  perdas:a.perdas+x.perdas,
  variacao:a.variacao+x.variacao,
  valor:a.valor+x.valor_variacao
 }),{entradas:0,saidas:0,perdas:0,variacao:0,valor:0}),[controlData]);

 const formatCurrency=v=>BRL.format(Number(v)||0);

 const handleRefresh=()=>{
  if(dateRange.start_date&&dateRange.end_date&&dateRange.start_date>dateRange.end_date){
   toast({title:'Período inválido',description:'A data inicial precisa ser anterior ou igual à data final.',variant:'destructive'});
   return;
  }
  fetchData();
 };

 const handleExport=()=>{
  if(!controlData.length){
   toast({title:'Sem dados',description:'Não há movimentações para exportar neste filtro.',variant:'destructive'});
   return;
  }
  const rows=[
   ['Tipo de folha','Entradas','Saídas/consumo','Perdas','Variação líquida do período','Custo unitário estimado','Valor estimado da variação'],
   ...controlData.map(x=>[x.tipo_folha,x.entradas,x.saidas,x.perdas,x.variacao,x.custo_unitario,x.valor_variacao])
  ];
  const csv=rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(';')).join('\r\n');
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;
  link.download=`Controle_Folhas_${dateRange.start_date||'inicio'}_${dateRange.end_date||'fim'}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast({title:'Exportação concluída',description:'CSV gerado com os dados exibidos.'});
 };

 const clearFilters=()=>{
  setDateRange({start_date:'',end_date:''});
  setSelectedTipoFolha('Todos');
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p>
     <div className="mt-1 flex items-center gap-2">
      <FileText className="h-6 w-6" style={{color:CYAN}}/>
      <h1 className="text-2xl font-bold">Controle de Folhas</h1>
     </div>
     <p className="mt-1 text-sm text-muted-foreground">Movimentações e variação líquida de materiais no período.</p>
    </div>
    <Button variant="outline" onClick={handleExport} disabled={loading||!controlData.length}>
     <Download className="mr-2 h-4 w-4"/>Exportar CSV
    </Button>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <Card><CardContent className="flex items-center justify-between p-4"><div>
     <p className="text-xs uppercase tracking-wider text-muted-foreground">Entradas e reposições</p>
     <p className="mt-1 text-xl font-bold text-green-400">{totals.entradas.toLocaleString('pt-BR')}</p>
    </div><TrendingUp className="h-5 w-5 text-green-400"/></CardContent></Card>
    <Card><CardContent className="flex items-center justify-between p-4"><div>
     <p className="text-xs uppercase tracking-wider text-muted-foreground">Saídas e consumo</p>
     <p className="mt-1 text-xl font-bold text-blue-400">{totals.saidas.toLocaleString('pt-BR')}</p>
    </div><TrendingDown className="h-5 w-5 text-blue-400"/></CardContent></Card>
    <Card><CardContent className="flex items-center justify-between p-4"><div>
     <p className="text-xs uppercase tracking-wider text-muted-foreground">Perdas</p>
     <p className="mt-1 text-xl font-bold text-red-400">{totals.perdas.toLocaleString('pt-BR')}</p>
    </div><AlertTriangle className="h-5 w-5 text-red-400"/></CardContent></Card>
    <Card><CardContent className="flex items-center justify-between p-4"><div>
     <p className="text-xs uppercase tracking-wider text-muted-foreground">Valor estimado da variação</p>
     <p className="mt-1 text-xl font-bold" style={{color:CYAN}}>{formatCurrency(totals.valor)}</p>
    </div><FileText className="h-5 w-5" style={{color:CYAN}}/></CardContent></Card>
   </div>

   <Card>
    <CardHeader>
     <CardTitle className="flex items-center gap-2 text-base"><Calendar className="h-5 w-5" style={{color:CYAN}}/>Filtros</CardTitle>
     <CardDescription>{!dateRange.start_date&&!dateRange.end_date?'Exibindo todas as movimentações.':'Filtrando pelo período selecionado.'}</CardDescription>
    </CardHeader>
    <CardContent>
     <div className="grid gap-3 md:grid-cols-5">
      <div><Label>Tipo de folha</Label>
       <Select value={selectedTipoFolha} onValueChange={setSelectedTipoFolha}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent>
         <SelectItem value="Todos">Todos</SelectItem>
         {tiposFolha.map(tipo=><SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
        </SelectContent>
       </Select>
      </div>
      <div><Label>Data inicial</Label><Input type="date" value={dateRange.start_date} onChange={e=>setDateRange(p=>({...p,start_date:e.target.value}))}/></div>
      <div><Label>Data final</Label><Input type="date" value={dateRange.end_date} onChange={e=>setDateRange(p=>({...p,end_date:e.target.value}))}/></div>
      <div className="flex items-end"><Button onClick={handleRefresh} className="w-full text-white" style={{background:CYAN}} disabled={loading}>
       {loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:null}Atualizar
      </Button></div>
      <div className="flex items-end"><Button variant="outline" className="w-full" onClick={clearFilters} disabled={loading}>
       <RotateCcw className="mr-2 h-4 w-4"/>Limpar
      </Button></div>
     </div>
    </CardContent>
   </Card>

   <Card className="border-cyan-500/20 bg-cyan-500/5">
    <CardContent className="p-4 text-sm text-muted-foreground space-y-1">
     <p className="font-semibold text-foreground">Como interpretar este relatório</p>
     <p>A variação líquida do período é calculada como entradas menos saídas e perdas. Ela não representa, sozinha, a quantidade física total disponível em estoque.</p>
     <p>O valor é uma estimativa: utiliza a compra mais recente até a data final selecionada ou, se não houver compra anterior, o preço unitário cadastrado. O sistema não mantém histórico completo de alteração desses preços.</p>
    </CardContent>
   </Card>

   <Card>
    <CardHeader>
     <CardTitle className="text-base">Variação por tipo de folha</CardTitle>
     <CardDescription>Valores negativos indicam que saídas e perdas superaram as entradas no período selecionado.</CardDescription>
    </CardHeader>
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <Table>
       <TableHeader className="bg-secondary/70"><TableRow>
        <TableHead>Tipo de folha</TableHead>
        <TableHead className="text-right">Entradas</TableHead>
        <TableHead className="text-right">Saídas/consumo</TableHead>
        <TableHead className="text-right">Perdas</TableHead>
        <TableHead className="text-right">Variação líquida</TableHead>
        <TableHead className="text-right">Valor estimado da variação</TableHead>
       </TableRow></TableHeader>
       <TableBody>
        {loading?<TableRow><TableCell colSpan={6} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6" style={{color:CYAN}}/></TableCell></TableRow>
        :!controlData.length?<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Nenhuma movimentação no período.</TableCell></TableRow>
        :controlData.map(item=><TableRow key={item.key} className="hover:bg-muted/40">
         <TableCell className="font-semibold">{item.tipo_folha}</TableCell>
         <TableCell className="text-right font-mono text-green-400">{item.entradas.toLocaleString('pt-BR')}</TableCell>
         <TableCell className="text-right font-mono text-blue-400">{item.saidas.toLocaleString('pt-BR')}</TableCell>
         <TableCell className="text-right font-mono text-red-400">{item.perdas.toLocaleString('pt-BR')}</TableCell>
         <TableCell className={`text-right font-mono font-bold ${item.variacao<0?'text-red-400':''}`}>{item.variacao.toLocaleString('pt-BR')}</TableCell>
         <TableCell className={`text-right font-mono font-bold ${item.valor_variacao<0?'text-red-400':''}`} style={{color:item.valor_variacao<0?undefined:CYAN}}>{formatCurrency(item.valor_variacao)}</TableCell>
        </TableRow>)}
       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>
  </motion.div>
 );
}

