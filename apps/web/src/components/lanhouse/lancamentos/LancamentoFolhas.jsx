import React,{useState,useEffect,useCallback,useMemo,useRef}from'react';
import{motion}from'framer-motion';
import{Plus,Edit,Trash2,FileText,Search,RotateCcw,Boxes,ArrowDownToLine,ArrowUpFromLine,AlertTriangle,Package}from'lucide-react';
import{parseISO,getMonth,getYear}from'date-fns';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{Alert,AlertDescription}from'@/components/ui/alert';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CYAN='hsl(190 90% 50%)';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const brDate=d=>d?new Date(`${d}T12:00:00-03:00`).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const movementLabel=v=>norm(v)==='SAIDA'?'SAÍDA':norm(v);

export default function LancamentoFolhas(){
 const{toast}=useToast(),{user}=useAuth(),mounted=useRef(true);
 const[folhas,setFolhas]=useState([]),[insumos,setInsumos]=useState([]),[loading,setLoading]=useState(true);
 const[searchTerm,setSearchTerm]=useState(''),[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear())),[currentPage,setCurrentPage]=useState(1);
 const[dialogOpen,setDialogOpen]=useState(false),[currentItem,setCurrentItem]=useState(null);
 const pageSize=10,initialForm=()=>({data:today(),insumo_id:'',tipo_movimento:'ENTRADA',quantidade:'',valor:''});
 const[formData,setFormData]=useState(initialForm);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);

 const fetchData=useCallback(async()=>{
  if(!user){setFolhas([]);setInsumos([]);setLoading(false);return}
  setLoading(true);
  try{
   const[a,b]=await Promise.all([
    supabase.from('lm_folhas').select('*').eq('user_id',user.id).order('data',{ascending:false}),
    supabase.from('lm_insumos').select('id,nome,unidade,ativo').eq('user_id',user.id).order('nome')
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   if(mounted.current){setFolhas(a.data||[]);setInsumos(b.data||[])}
  }catch(e){
   if(mounted.current)toast({title:'Erro ao carregar',description:e.message||'Não foi possível carregar os lançamentos.',variant:'destructive'});
  }finally{if(mounted.current)setLoading(false)}
 },[user,toast]);

 useEffect(()=>{
  fetchData();
  if(!user)return;
  const channel=supabase.channel(`lm_folhas_insumos_${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_folhas',filter:`user_id=eq.${user.id}`},fetchData)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_insumos',filter:`user_id=eq.${user.id}`},fetchData)
   .subscribe();
  return()=>supabase.removeChannel(channel);
 },[user,fetchData]);

 const nomeInsumo=item=>insumos.find(i=>String(i.id)===String(item.insumo_id))?.nome||item.tipo_folha||'Insumo não identificado';
 const insumoSelecionado=insumos.find(i=>String(i.id)===String(formData.insumo_id));
 const anos=useMemo(()=>{
  const ys=folhas.map(x=>getYear(parseISO(x.data))).filter(Number.isFinite);
  ys.push(new Date().getFullYear());
  return[...new Set(ys)].sort((a,b)=>b-a);
 },[folhas]);

 const filtered=useMemo(()=>{
  let rows=folhas;
  if(selectedYear!=='all')rows=rows.filter(x=>String(getYear(parseISO(x.data)))===selectedYear);
  if(selectedMonth!=='all')rows=rows.filter(x=>String(getMonth(parseISO(x.data)))===selectedMonth);
  if(searchTerm.trim()){
   const q=norm(searchTerm);
   rows=rows.filter(x=>norm(nomeInsumo(x)).includes(q)||norm(x.tipo_movimento).includes(q));
  }
  return rows;
 },[folhas,selectedYear,selectedMonth,searchTerm,insumos]);

 useEffect(()=>setCurrentPage(1),[selectedYear,selectedMonth,searchTerm]);
 const totalEntradas=filtered.filter(x=>norm(x.tipo_movimento)==='ENTRADA').reduce((s,x)=>s+Number(x.quantidade||0),0);
 const totalSaidas=filtered.filter(x=>norm(x.tipo_movimento)==='SAIDA').reduce((s,x)=>s+Number(x.quantidade||0),0);
 const totalPerdas=filtered.filter(x=>norm(x.tipo_movimento)==='PERDA').reduce((s,x)=>s+Number(x.quantidade||0),0);
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const paginated=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize);

 const openDialog=item=>{
  setCurrentItem(item||null);
  const linked=item?.insumo_id||insumos.find(i=>norm(i.nome)===norm(item?.tipo_folha))?.id||'';
  setFormData(item?{data:item.data||today(),insumo_id:String(linked),tipo_movimento:movementLabel(item.tipo_movimento||'ENTRADA'),quantidade:String(item.quantidade??''),valor:item.valor==null?'':String(item.valor)}:initialForm());
  setDialogOpen(true);
 };
 const closeDialog=()=>{setDialogOpen(false);setCurrentItem(null);setFormData(initialForm())};

 const handleSave=async()=>{
  const quantity=Number(formData.quantidade);
  if(!user||!formData.data||!Number.isFinite(quantity)||quantity<=0){
   toast({title:'Dados obrigatórios',description:'Informe a data e uma quantidade maior que zero.',variant:'destructive'});return;
  }
  const insumo=insumos.find(i=>String(i.id)===String(formData.insumo_id));
  if(!insumo&&!currentItem){
   toast({title:'Insumo obrigatório',description:'Selecione um material cadastrado em Insumos.',variant:'destructive'});return;
  }
  if(!insumo&&currentItem?.insumo_id){
   toast({title:'Insumo não encontrado',description:'O insumo associado não está mais disponível. Selecione outro material.',variant:'destructive'});return;
  }
  const type=movementLabel(formData.tipo_movimento);
  if(!['ENTRADA','SAÍDA','PERDA'].includes(type)){
   toast({title:'Movimento inválido',description:'Selecione Entrada, Saída ou Perda.',variant:'destructive'});return;
  }
  const payload={
   user_id:user.id,data:formData.data,
   insumo_id:insumo?.id||currentItem?.insumo_id||null,
   tipo_folha:insumo?.nome||currentItem?.tipo_folha||null,
   tipo_movimento:type,quantidade:quantity,
   valor:type==='ENTRADA'&&formData.valor!==''?Number(formData.valor):null
  };
  try{
   const result=currentItem
    ?await supabase.from('lm_folhas').update(payload).eq('id',currentItem.id).eq('user_id',user.id)
    :await supabase.from('lm_folhas').insert(payload);
   if(result.error)throw result.error;
   toast({title:'Sucesso',description:currentItem?'Movimentação atualizada.':'Movimentação registrada.'});
   closeDialog();await fetchData();
  }catch(e){
   toast({title:'Erro ao salvar',description:e.message||'Não foi possível salvar a movimentação.',variant:'destructive'});
  }
 };

 const handleDelete=async id=>{
  try{
   const{error}=await supabase.from('lm_folhas').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Movimentação excluída',description:'O estoque será recalculado.'});
   await fetchData();
  }catch(e){toast({title:'Erro ao excluir',description:e.message||'Não foi possível excluir.',variant:'destructive')}
 };

 const clearFilters=()=>{setSearchTerm('');setSelectedMonth(String(new Date().getMonth()));setSelectedYear(String(new Date().getFullYear()))};

 return <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="dark-lm-impressoes space-y-5">
  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
   <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-400">LM Impressões</p><h1 className="mt-1 text-2xl font-bold">Movimentação de Insumos</h1><p className="text-sm text-muted-foreground">Registre entradas manuais, saídas e perdas dos materiais cadastrados.</p></div>
   <Button onClick={()=>openDialog()} className="text-white" style={{background:CYAN}}><Plus className="mr-2 h-4 w-4"/>Nova Movimentação</Button>
  </div>

  <Alert className="border-amber-500/30 bg-amber-500/5"><AlertTriangle className="h-4 w-4 text-amber-400"/><AlertDescription>Compras e reposições devem ser lançadas em <strong>Despesas → Estoque</strong>. Use Entrada aqui apenas para ajustes ou entradas que não tenham sido contabilizados em uma despesa, para evitar duplicação.</AlertDescription></Alert>

  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   {[{label:'Registros',value:filtered.length,Icon:FileText},{label:'Entradas',value:totalEntradas,Icon:ArrowDownToLine},{label:'Saídas',value:totalSaidas,Icon:ArrowUpFromLine},{label:'Perdas',value:totalPerdas,Icon:AlertTriangle}].map(({label,value,Icon})=><Card key={label} className="border-border bg-card"><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold tabular-nums text-cyan-400">{value}</p></div><div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-400"><Icon className="h-5 w-5"/></div></CardContent></Card>)}
  </div>

  <Card className="border-border bg-card"><CardContent className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Buscar por insumo ou movimento..." className="h-10 pl-9"/></div><div className="flex flex-wrap gap-2"><Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[140px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem>{meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent></Select><Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[110px]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">Todos os anos</SelectItem>{anos.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select><Button variant="outline" onClick={clearFilters}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button></div></CardContent></Card>

  <ModalLancamentoPadrao open={dialogOpen} onClose={closeDialog} title={currentItem?'Editar Movimentação':'Nova Movimentação'} description="Selecione o material, a data e a quantidade." icon={Boxes} theme="cyan" footer={<><Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button><Button type="button" onClick={handleSave} style={{background:CYAN}} className="text-white">{currentItem?'Salvar Alterações':'Salvar Movimentação'}</Button></>}>
   <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Data *</Label><Input type="date" value={formData.data} onChange={e=>setFormData(p=>({...p,data:e.target.value}))} className="h-11 rounded-xl" required/></div><div className="space-y-2"><Label>Quantidade *</Label><Input type="number" min="0.001" step="0.001" value={formData.quantidade} onChange={e=>setFormData(p=>({...p,quantidade:e.target.value}))} className="h-11 rounded-xl" required/></div></div>
    <div className="space-y-2"><Label>Insumo *</Label><Select value={formData.insumo_id} onValueChange={v=>setFormData(p=>({...p,insumo_id:v}))}><SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Selecione o material"/></SelectTrigger><SelectContent className="max-h-60">{insumos.filter(i=>i.ativo!==false||String(i.id)===formData.insumo_id).map(i=><SelectItem key={i.id} value={String(i.id)}>{i.nome} — {i.unidade||'unidade'}</SelectItem>)}</SelectContent></Select>{insumoSelecionado&&<p className="text-xs text-muted-foreground">Unidade: {insumoSelecionado.unidade||'unidade'}</p>}{!insumos.length&&<p className="text-sm text-red-400">Cadastre primeiro um material em Cadastros → Insumos.</p>}</div>
    <div className="space-y-2"><Label>Tipo de Movimento *</Label><Select value={formData.tipo_movimento} onValueChange={v=>setFormData(p=>({...p,tipo_movimento:v,valor:v==='ENTRADA'?p.valor:''}))}><SelectTrigger className="h-11 rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ENTRADA">Entrada manual</SelectItem><SelectItem value="SAÍDA">Saída</SelectItem><SelectItem value="PERDA">Perda</SelectItem></SelectContent></Select></div>
    {formData.tipo_movimento==='ENTRADA'&&<div className="space-y-2"><Label>Valor da entrada (opcional)</Label><Input type="number" min="0" step="0.01" value={formData.valor} onChange={e=>setFormData(p=>({...p,valor:e.target.value}))} placeholder="0,00" className="h-11 rounded-xl"/>{formData.valor!==''&&<p className="text-xs text-muted-foreground">{BRL.format(Number(formData.valor)||0)}</p>}</div>}
   </div>
  </ModalLancamentoPadrao>

  <Card className="overflow-hidden border-border bg-card"><CardContent className="p-0"><ScrollArea className="h-[500px]"><Table><TableHeader className="sticky top-0 z-10 bg-secondary/70"><TableRow><TableHead>Data</TableHead><TableHead>Insumo</TableHead><TableHead>Movimento</TableHead><TableHead className="text-right">Quantidade</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader><TableBody>
   {loading?<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground">Carregando movimentações...</TableCell></TableRow>:!paginated.length?<TableRow><TableCell colSpan={6} className="py-12 text-center text-muted-foreground"><Package className="mx-auto mb-2 h-8 w-8 opacity-40"/>Nenhuma movimentação encontrada.</TableCell></TableRow>:paginated.map(item=><TableRow key={item.id} className="hover:bg-cyan-500/5"><TableCell>{brDate(item.data)}</TableCell><TableCell className="font-medium">{nomeInsumo(item)}<div className="text-xs text-muted-foreground">{insumos.find(i=>String(i.id)===String(item.insumo_id))?.unidade||'—'}</div></TableCell><TableCell><Badge variant="outline" className={norm(item.tipo_movimento)==='PERDA'?'border-red-500/30 bg-red-500/10 text-red-400':norm(item.tipo_movimento)==='SAIDA'?'border-blue-500/30 bg-blue-500/10 text-blue-400':'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'}>{movementLabel(item.tipo_movimento)}</Badge></TableCell><TableCell className="text-right tabular-nums">{Number(item.quantidade||0).toLocaleString('pt-BR',{maximumFractionDigits:3})}</TableCell><TableCell className="text-right tabular-nums">{item.valor==null?'—':BRL.format(Number(item.valor)||0)}</TableCell><TableCell><div className="flex justify-center gap-1"><Button variant="ghost" size="icon" onClick={()=>openDialog(item)} className="text-cyan-400"><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir movimentação?</AlertDialogTitle><AlertDialogDescription>O efeito desta movimentação será removido do cálculo do estoque.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>handleDelete(item.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell></TableRow>)}
  </TableBody></Table></ScrollArea>{!loading&&filtered.length>0&&<div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground"><span>{(currentPage-1)*pageSize+1}–{Math.min(currentPage*pageSize,filtered.length)} de {filtered.length}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={currentPage===1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}>Anterior</Button><span>{currentPage}/{totalPages}</span><Button variant="outline" size="sm" disabled={currentPage===totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}>Próxima</Button></div></div>}</CardContent></Card>
 </motion.div>;
}
