import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{PackageOpen,Search,Save,Edit,X,AlertCircle,RefreshCw}from'lucide-react';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Input}from'@/components/ui/input';
import{Card,CardContent,CardHeader,CardTitle,CardDescription}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{useToast}from'@/components/ui/use-toast';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{Switch}from'@/components/ui/switch';
import{Label}from'@/components/ui/label';
import{Button}from'@/components/ui/button';
import{Alert,AlertDescription}from'@/components/ui/alert';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';

const TZ='America/Sao_Paulo';
const todaySP=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`};
const dateBR=v=>{if(!v)return'—';const p=String(v).slice(0,10).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:'—'};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();

export default function EstoqueInicial(){
 const{user}=useAuth();
 const{toast}=useToast();
 const mounted=useRef(true);
 const[loading,setLoading]=useState(true);
 const[saving,setSaving]=useState(false);
 const[estoqueData,setEstoqueData]=useState([]);
 const[insumos,setInsumos]=useState([]);
 const[searchTerm,setSearchTerm]=useState('');
 const[showZeroStock,setShowZeroStock]=useState(false);
 const[editingId,setEditingId]=useState(null);
 const[editValue,setEditValue]=useState('');
 const[baselineDate,setBaselineDate]=useState(null);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const fetchData=useCallback(async()=>{
  if(!user){setLoading(false);return}
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('lm_estoques_inicial').select('*').eq('user_id',user.id).order('produto',{ascending:true}),
    supabase.from('lm_insumos').select('id,nome,unidade,ativo').eq('user_id',user.id).order('nome',{ascending:true})
   ]);
   if(a.error)throw a.error;
   if(b.error)throw b.error;
   if(!mounted.current)return;
   const rows=a.data||[];
   const dates=rows.map(x=>x.data_inventario).filter(Boolean).sort();
   setBaselineDate(dates[0]||null);
   setEstoqueData(rows);
   setInsumos(b.data||[]);
  }catch(e){
   if(mounted.current)toast({title:'Erro ao carregar estoque inicial',description:e.message||'Não foi possível carregar os dados.',variant:'destructive'});
  }finally{if(mounted.current)setLoading(false)}
 },[user,toast]);

 useEffect(()=>{fetchData()},[fetchData]);

 const linkedIds=useMemo(()=>new Set(estoqueData.map(x=>String(x.insumo_id||'')).filter(Boolean)),[estoqueData]);
 const insumoMap=useMemo(()=>new Map(insumos.map(i=>[String(i.id),i])),[insumos]);
 const getName=item=>insumoMap.get(String(item.insumo_id||''))?.nome||item.produto||'Insumo sem nome';
 const getUnit=item=>insumoMap.get(String(item.insumo_id||''))?.unidade||'unidade';

 const filtered=useMemo(()=>estoqueData.filter(item=>{
  const nome=getName(item);
  const matchesSearch=norm(nome).includes(norm(searchTerm))||norm(item.produto).includes(norm(searchTerm));
  return matchesSearch&&(showZeroStock||Number(item.quantidade_inicial)>0);
 }),[estoqueData,searchTerm,showZeroStock,insumoMap]);

 const totalProducts=filtered.length;
 const totalQuantity=filtered.reduce((s,x)=>s+Number(x.quantidade_inicial||0),0);

 const handleEdit=item=>{setEditingId(item.id);setEditValue(String(item.quantidade_inicial??0))};
 const handleCancelEdit=()=>{setEditingId(null);setEditValue('')};

 const handleSaveEdit=async item=>{
  const q=Number(editValue);
  if(editValue.trim()===''||!Number.isFinite(q)||q<0){
   toast({title:'Quantidade inválida',description:'Informe uma quantidade válida, igual ou maior que zero.',variant:'destructive'});return;
  }
  setSaving(true);
  try{
   const{error}=await supabase.from('lm_estoques_inicial').update({quantidade_inicial:q,updated_at:new Date().toISOString()}).eq('id',item.id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Quantidade atualizada',description:`${getName(item)}: ${q} ${getUnit(item)}.`});
   handleCancelEdit();
   await fetchData();
  }catch(e){
   toast({title:'Erro ao atualizar',description:e.message||'Não foi possível atualizar a quantidade.',variant:'destructive'});
  }finally{setSaving(false)}
 };

 const handleLinkInsumo=async(item,insumoId)=>{
  if(!insumoId)return;
  const target=insumoMap.get(String(insumoId));
  if(!target)return;
  const duplicate=estoqueData.some(x=>x.id!==item.id&&String(x.insumo_id||'')===String(insumoId));
  if(duplicate){
   toast({title:'Insumo já vinculado',description:'Esse insumo já possui um registro de estoque inicial. Edite o registro existente para evitar duplicidade.',variant:'destructive'});return;
  }
  setSaving(true);
  try{
   const{error}=await supabase.from('lm_estoques_inicial').update({insumo_id:target.id,produto:target.nome,updated_at:new Date().toISOString()}).eq('id',item.id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Insumo vinculado',description:`O registro agora está associado a ${target.nome}.`});
   await fetchData();
  }catch(e){
   toast({title:'Erro ao vincular',description:e.message||'Não foi possível vincular o insumo.',variant:'destructive'});
  }finally{setSaving(false)}
 };

 const handleSetBaseline=async()=>{
  if(!estoqueData.length){
   toast({title:'Inventário vazio',description:'Não há registros para definir como baseline.',variant:'destructive'});return;
  }
  const confirmed=window.confirm('Definir hoje como baseline altera a data de referência de todos os registros. Confirme apenas se as quantidades atuais representam o inventário físico de hoje.');
  if(!confirmed)return;
  setSaving(true);
  try{
   const today=todaySP();
   for(const item of estoqueData){
    const{error}=await supabase.from('lm_estoques_inicial').update({data_inventario:today,updated_at:new Date().toISOString()}).eq('id',item.id).eq('user_id',user.id);
    if(error)throw error;
   }
   toast({title:'Baseline atualizada',description:`Data de referência: ${dateBR(today)}.`});
   await fetchData();
  }catch(e){
   toast({title:'Erro ao definir baseline',description:e.message||'Não foi possível atualizar a referência.',variant:'destructive'});
  }finally{setSaving(false)}
 };

 return <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-6 py-6">
  <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
   <div>
    <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-primary"><PackageOpen className="h-8 w-8"/>Estoque Inicial (Baseline)</h1>
    <p className="mt-1 text-sm text-muted-foreground">Inventário de referência: {baselineDate?dateBR(baselineDate):'não definido'}</p>
   </div>
   <div className="flex flex-wrap gap-2">
    <Button variant="outline" onClick={fetchData} disabled={loading||saving}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button>
    <Button onClick={handleSetBaseline} disabled={saving||loading} className="bg-blue-500 text-white hover:bg-blue-600">{saving?'Salvando...':'Definir Hoje como Baseline'}</Button>
   </div>
  </div>

  <Alert className="border-blue-500/20 bg-blue-500/10">
   <AlertCircle className="h-4 w-4 text-blue-500"/>
   <AlertDescription className="text-sm text-muted-foreground">As quantidades registradas formam a base do cálculo do estoque. Vincule os registros antigos aos insumos correspondentes. Não altere a baseline, a menos que as quantidades informadas representem o inventário físico atual.</AlertDescription>
  </Alert>

  <div className="grid gap-4 md:grid-cols-3">
   <Card className="border-blue-200/20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-600">Data Baseline</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-blue-600">{baselineDate?dateBR(baselineDate):'Não definida'}</div></CardContent></Card>
   <Card className="border-purple-200/20 bg-gradient-to-br from-purple-500/10 to-pink-500/10 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-600">Total de Produtos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-purple-600">{totalProducts}</div></CardContent></Card>
   <Card className="border-green-200/20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">Quantidade Total</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{totalQuantity.toLocaleString('pt-BR')}</div></CardContent></Card>
  </div>

  <Card className="border-border/50 shadow-sm"><CardContent className="p-4">
   <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
    <div className="relative flex w-full max-w-md items-center gap-2 md:w-auto"><Search className="absolute left-3 h-4 w-4 text-muted-foreground"/><Input placeholder="Buscar insumo..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="flex-1 pl-9"/></div>
    <div className="flex items-center space-x-2"><Switch id="show-zero" checked={showZeroStock} onCheckedChange={setShowZeroStock}/><Label htmlFor="show-zero" className="cursor-pointer text-sm">Mostrar itens com estoque zero</Label></div>
   </div>
  </CardContent></Card>

  <Card className="overflow-hidden border-border/50 shadow-sm">
   <CardHeader><CardTitle className="text-primary">Inventário Baseline</CardTitle><CardDescription>Vincule cada registro antigo a um insumo cadastrado e ajuste a quantidade inicial.</CardDescription></CardHeader>
   <CardContent className="p-0"><ScrollArea className="h-[600px]"><div className="overflow-x-auto"><Table>
    <TableHeader className="bg-muted/50"><TableRow><TableHead className="min-w-[240px]">Insumo / Produto</TableHead><TableHead className="min-w-[220px]">Vincular ao cadastro</TableHead><TableHead className="min-w-[160px] text-center">Quantidade inicial</TableHead><TableHead className="min-w-[120px] text-center">Ações</TableHead></TableRow></TableHeader>
    <TableBody>
     {loading?<TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Carregando estoque inicial...</TableCell></TableRow>:!filtered.length?<TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Nenhum produto encontrado.</TableCell></TableRow>:filtered.map(item=>{
      const linked=insumoMap.get(String(item.insumo_id||''));
      const options=insumos.filter(i=>i.ativo!==false&&(!linkedIds.has(String(i.id))||String(i.id)===String(item.insumo_id)));
      return <TableRow key={item.id} className="transition-colors hover:bg-accent/30">
       <TableCell className="font-semibold">{getName(item)}<p className="text-xs font-normal text-muted-foreground">{getUnit(item)}</p>{!linked&&<Badge variant="outline" className="mt-1">Registro antigo sem vínculo</Badge>}</TableCell>
       <TableCell><Select value={String(item.insumo_id||'')} onValueChange={v=>handleLinkInsumo(item,v)} disabled={saving}><SelectTrigger className="min-w-[200px]"><SelectValue placeholder="Selecionar insumo"/></SelectTrigger><SelectContent className="max-h-60 overflow-y-auto">{options.map(i=><SelectItem key={i.id} value={String(i.id)}>{i.nome} — {i.unidade}</SelectItem>)}</SelectContent></Select></TableCell>
       <TableCell className="text-center">{editingId===item.id?<Input type="number" min="0" step="0.001" value={editValue} onChange={e=>setEditValue(e.target.value)} className="mx-auto w-28 text-center" autoFocus/>:<Badge variant={Number(item.quantidade_inicial)===0?'destructive':'default'} className="px-3 text-sm font-semibold">{Number(item.quantidade_inicial||0).toLocaleString('pt-BR')}</Badge>}</TableCell>
       <TableCell className="text-center">{editingId===item.id?<div className="flex items-center justify-center gap-1"><Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={()=>handleSaveEdit(item)} disabled={saving}><Save className="h-4 w-4"/></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={handleCancelEdit} disabled={saving}><X className="h-4 w-4"/></Button></div>:<Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={()=>handleEdit(item)}><Edit className="h-4 w-4"/></Button>}</TableCell>
      </TableRow>
     })}
    </TableBody>
   </Table></div></ScrollArea></CardContent>
  </Card>
 </motion.div>;
}
