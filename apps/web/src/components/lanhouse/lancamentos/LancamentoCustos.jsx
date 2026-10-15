import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{TrendingDown,Save,Trash2,Search,RotateCcw,Receipt,Loader2,Info,AlertTriangle}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{RadioGroup,RadioGroupItem}from'@/components/ui/radio-group';
import{Card,CardContent}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Badge}from'@/components/ui/badge';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import{resolverCustoUnitarioMaterial}from'@/lib/lmCustosMateriais';

const C='hsl(190 90% 50%)';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:6});
const BRL2=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const hoje=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));return`${p.year}-${p.month}-${p.day}`};
const moeda=v=>BRL2.format(Number(v)||0);
const unitarioBR=v=>BRL.format(Number(v)||0);
const dataBR=v=>v?new Date(`${String(v).slice(0,10)}T12:00:00-03:00`).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'—';
const origemTexto=(origem,estimado,dataCompra)=>{
 if(origem==='compra')return`Compra de ${dataBR(dataCompra)}`;
 if(origem==='cadastro'||estimado)return'Custo estimado pelo cadastro';
 if(origem==='especial')return'Material especial sem custo automático';
 if(origem==='historico')return'Origem histórica não confirmada';
 return'Custo pendente';
};

export default function LancamentoCustos(){
 const{toast}=useToast(),{user}=useAuth();
 const[tiposFolha,setTiposFolha]=useState([]),[entries,setEntries]=useState([]);
 const[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[search,setSearch]=useState(''),[dialogOpen,setDialogOpen]=useState(false);
 const initial={tipo_folha:'',data_lancamento:hoje(),tipo:'Consumo',quantidade:'',custo_unitario:'0',custo_total:'0.00',custo_origem:'pendente',custo_estimado:false,custo_pendente:true,custo_data_compra:'',descricao:''};
 const[form,setForm]=useState(initial);

 const load=useCallback(async()=>{
  if(!user){setTiposFolha([]);setEntries([]);setLoading(false);return}
  setLoading(true);
  try{
   const{data:tipos,error:tipoError}=await supabase.from('lm_tipos_folha').select('*').eq('user_id',user.id).order('tipo_folha');
   if(tipoError)throw tipoError;
   const todos=[],limite=1000;
   for(let inicio=0;;inicio+=limite){
    const{data,error}=await supabase.from('lm_lanc_custos').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(inicio,inicio+limite-1);
    if(error)throw error;
    todos.push(...(data||[]));
    if(!data||data.length<limite)break;
   }
   setTiposFolha(tipos||[]);
   setEntries(todos);
  }catch(e){
   toast({title:'Erro ao carregar',description:e.message||'Não foi possível carregar os lançamentos.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 const available=useMemo(()=>[...tiposFolha].sort((a,b)=>String(a.tipo_folha||'').localeCompare(String(b.tipo_folha||''),'pt-BR',{sensitivity:'base',numeric:true})),[tiposFolha]);
 const selected=useMemo(()=>tiposFolha.find(x=>x.tipo_folha===form.tipo_folha),[tiposFolha,form.tipo_folha]);
 const isSpecial=!!selected?.is_special;

 const loadUnitCost=useCallback(async(tipo,dataReferencia)=>{
  if(!user||!tipo){
   setForm(p=>({...p,custo_unitario:'0',custo_origem:'pendente',custo_estimado:false,custo_pendente:true,custo_data_compra:''}));
   return;
  }
  try{
   const custo=await resolverCustoUnitarioMaterial({supabase,userId:user.id,tipoFolha:tipo,dataReferencia,tipoCadastro:tiposFolha.find(x=>x.tipo_folha===tipo)});
   setForm(p=>({...p,custo_unitario:String(custo.unitario||0),custo_origem:custo.origem,custo_estimado:!!custo.estimado,custo_pendente:!!custo.pendente,custo_data_compra:custo.dataCompra||''}));
   if(custo.pendente)toast({title:'Custo pendente',description:`Não encontrei compra anterior nem custo de referência para "${tipo}". O lançamento ficará marcado para conferência.`});
   else if(custo.estimado)toast({title:'Custo estimado',description:`"${tipo}" usará o custo de referência cadastrado, pois não há compra anterior válida.`});
  }catch(e){
   console.error('Erro ao buscar custo unitário:',e);
   setForm(p=>({...p,custo_unitario:'0',custo_origem:'pendente',custo_estimado:false,custo_pendente:true,custo_data_compra:''}));
   toast({title:'Custo pendente',description:'Não foi possível confirmar o custo. O lançamento poderá ser conferido depois.',variant:'destructive'});
  }
 },[user,tiposFolha,toast]);

 useEffect(()=>{
  if(form.tipo_folha)loadUnitCost(form.tipo_folha,form.data_lancamento);
  else setForm(p=>({...p,custo_unitario:'0',custo_origem:'pendente',custo_estimado:false,custo_pendente:true,custo_data_compra:''}));
 },[form.tipo_folha,form.data_lancamento,loadUnitCost]);

 useEffect(()=>{
  const total=(Number(form.quantidade)||0)*(Number(form.custo_unitario)||0);
  setForm(p=>({...p,custo_total:(Math.round(total*100)/100).toFixed(2)}));
 },[form.quantidade,form.custo_unitario]);

 const filtered=useMemo(()=>{
  const s=search.toLowerCase().trim();
  return s?entries.filter(x=>`${x.tipo_folha||''} ${x.tipo||''} ${x.descricao||''} ${x.custo_origem||''}`.toLowerCase().includes(s)):entries;
 },[entries,search]);
 const total=filtered.reduce((s,x)=>s+Number(x.custo_pendente===true?0:x.custo_total||0),0);
 const consumo=filtered.filter(x=>x.tipo==='Consumo'&&x.custo_pendente!==true).reduce((s,x)=>s+Number(x.custo_total||0),0);
 const perdas=filtered.filter(x=>x.tipo==='Perda'&&x.custo_pendente!==true).reduce((s,x)=>s+Number(x.custo_total||0),0);
 const pendentes=filtered.filter(x=>x.custo_pendente===true).length;
 const estimados=filtered.filter(x=>x.custo_estimado===true||x.custo_origem==='cadastro').length;

 const openDialog=()=>{setForm({...initial,data_lancamento:hoje()});setDialogOpen(true)};
 const closeDialog=()=>{if(!saving){setDialogOpen(false);setForm({...initial,data_lancamento:hoje()})}};

 const save=async e=>{
  e?.preventDefault();
  if(!user||!form.tipo_folha||!form.quantidade||!form.data_lancamento){
   toast({title:'Campos obrigatórios',description:'Informe o tipo de folha, a data e a quantidade.',variant:'destructive'});return;
  }
  const quantidade=Number(form.quantidade),unitario=Number(form.custo_unitario)||0;
  if(!Number.isFinite(quantidade)||quantidade<=0){
   toast({title:'Quantidade inválida',description:'Informe uma quantidade maior que zero.',variant:'destructive'});return;
  }
  const custoTotal=Math.round(quantidade*unitario*100)/100;
  setSaving(true);
  try{
   const{error}=await supabase.from('lm_lanc_custos').insert({
    user_id:user.id,tipo_folha:form.tipo_folha,tipo:form.tipo,quantidade,
    custo_unitario:unitario,custo_total:custoTotal,
    custo_origem:form.custo_origem||'pendente',
    custo_estimado:!!form.custo_estimado,
    custo_pendente:!!form.custo_pendente&&!isSpecial,
    custo_data_compra:form.custo_data_compra||null,
    data_lancamento:form.data_lancamento,descricao:form.descricao.trim()||null
   });
   if(error)throw error;
   toast({title:'Registrado',description:form.custo_pendente?'Lançamento salvo com custo pendente.':form.custo_estimado?'Lançamento salvo com custo estimado.':form.tipo==='Consumo'?'Uso fora de serviço registrado.':'Perda de material registrada.'});
   setDialogOpen(false);
   setForm({...initial,data_lancamento:hoje()});
   await load();
  }catch(e){
   toast({title:'Erro ao salvar',description:e.message||'Não foi possível salvar.',variant:'destructive'});
  }finally{setSaving(false)}
 };

 const remove=async id=>{
  try{
   const{error}=await supabase.from('lm_lanc_custos').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido',description:'Lançamento excluído.'});
   await load();
  }catch(e){toast({title:'Erro',description:e.message,variant:'destructive'})}
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">
   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:C}}>LM Impressões</p>
     <h1 className="mt-1 text-2xl font-bold">Uso de Materiais e Perdas</h1>
     <p className="text-sm text-muted-foreground">Registre materiais usados fora de serviços ou materiais perdidos.</p>
    </div>
    <Button onClick={openDialog} className="text-white" style={{background:C}}><TrendingDown className="mr-2 h-4 w-4"/>Registrar Uso ou Perda</Button>
   </div>

   <Card className="border-cyan-500/30 bg-cyan-500/5"><CardContent className="flex gap-3 p-4">
    <Info className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400"/>
    <div className="space-y-1 text-sm">
     <p className="font-semibold">Quando usar esta tela</p>
     <p className="text-muted-foreground">Registre aqui folhas usadas fora de um serviço cadastrado ou folhas desperdiçadas. Não registre novamente folhas já informadas em um serviço.</p>
     <p className="text-muted-foreground">Este registro calcula o custo financeiro, mas não altera diretamente a quantidade física do estoque. Custos estimados e pendentes são identificados separadamente.</p>
    </div>
   </CardContent></Card>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {[{l:'Lançamentos',v:filtered.length},{l:'Custo registrado',v:moeda(total)},{l:'Uso fora de serviço',v:moeda(consumo)},{l:'Perdas',v:moeda(perdas)},{l:'Custos estimados',v:estimados},{l:'Custos pendentes',v:pendentes}].map(x=><Card key={x.l} className="border-border bg-card"><CardContent className="p-4"><p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p><p className="mt-1 text-xl font-bold" style={{color:x.l.includes('pendentes')?'#f59e0b':C}}>{x.v}</p></CardContent></Card>)}
   </div>

   <Card className="border-border bg-card"><CardContent className="p-4">
    <div className="flex gap-3">
     <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar folha ou observação..." className="h-10 pl-9"/></div>
     <Button variant="outline" onClick={()=>setSearch('')}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button>
    </div>
   </CardContent></Card>

   <ModalLancamentoPadrao open={dialogOpen} onClose={closeDialog} title="Registrar Uso ou Perda" description="Use para consumo fora de serviços cadastrados ou para registrar desperdício." icon={TrendingDown} theme="blue" footer={<><Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button><Button onClick={save} disabled={saving} className="text-white" style={{background:C}}>{saving?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Salvando...</>:<><Save className="mr-2 h-4 w-4"/>Salvar Registro</>}</Button></>}>
    <div className="space-y-5">
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label>Material / Tipo de folha *</Label>
       <Select value={form.tipo_folha} onValueChange={v=>setForm(p=>({...p,tipo_folha:v}))}>
        <SelectTrigger><SelectValue placeholder="Selecione o material"/></SelectTrigger><SelectContent>
         {available.length?available.map(t=><SelectItem key={t.id} value={t.tipo_folha}>{t.tipo_folha}{t.is_special?' — Especial':''}</SelectItem>):<SelectItem value="none" disabled>Nenhum tipo cadastrado</SelectItem>}
        </SelectContent>
       </Select></div>
      <div className="space-y-2"><Label>Data do uso ou perda *</Label><Input type="date" value={form.data_lancamento} onChange={e=>setForm(p=>({...p,data_lancamento:e.target.value}))}/></div>
     </div>
     <div className="space-y-2"><Label>O que aconteceu? *</Label>
      <RadioGroup value={form.tipo} onValueChange={v=>setForm(p=>({...p,tipo:v}))} className="flex flex-wrap gap-5">
       <div className="flex items-center gap-2"><RadioGroupItem value="Consumo" id="custo-consumo"/><Label htmlFor="custo-consumo">Uso fora de serviço</Label></div>
       <div className="flex items-center gap-2"><RadioGroupItem value="Perda" id="custo-perda"/><Label htmlFor="custo-perda">Perda / desperdício</Label></div>
      </RadioGroup>
     </div>
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-2"><Label>Quantidade *</Label><Input type="number" min="1" step="1" value={form.quantidade} onChange={e=>setForm(p=>({...p,quantidade:e.target.value}))} disabled={isSpecial}/></div>
      <div className="space-y-2"><Label>Custo por unidade</Label><Input value={unitarioBR(form.custo_unitario)} readOnly disabled/><p className="text-xs text-muted-foreground">{origemTexto(form.custo_origem,form.custo_estimado,form.custo_data_compra)}</p></div>
      <div className="space-y-2"><Label>Custo total (automático)</Label><Input value={moeda(form.custo_total)} readOnly disabled className="font-bold"/></div>
     </div>
     {form.custo_estimado&&<div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>Este valor é uma estimativa do cadastro, pois não foi encontrada compra válida anterior à data.</div>}
     {form.custo_pendente&&<div className="flex gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-400"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>O registro poderá ser salvo, mas o custo ficará pendente e não será tratado como custo confirmado.</div>}
     <div className="space-y-2"><Label>Observação (opcional)</Label><textarea value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} className="min-h-[90px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-foreground" placeholder="Ex.: folhas usadas em teste de impressão..."/></div>
    </div>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card"><CardContent className="p-0"><ScrollArea className="h-[520px]"><Table>
    <TableHeader className="sticky top-0 z-10 bg-secondary/70"><TableRow>
     <TableHead>Material</TableHead><TableHead>Data</TableHead><TableHead>Registro</TableHead><TableHead className="text-right">Quantidade</TableHead><TableHead className="text-right">Custo unitário</TableHead><TableHead className="text-right">Custo total</TableHead><TableHead>Origem / situação</TableHead><TableHead>Observação</TableHead><TableHead className="text-center">Ações</TableHead>
    </TableRow></TableHeader>
    <TableBody>
     {loading?<TableRow><TableCell colSpan={9} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
     :!filtered.length?<TableRow><TableCell colSpan={9} className="py-12 text-center text-muted-foreground"><Receipt className="mx-auto mb-2 h-8 w-8"/>{search?'Nenhum resultado para a pesquisa.':'Nenhum registro encontrado.'}</TableCell></TableRow>
     :filtered.map(x=><TableRow key={x.id} className="hover:bg-muted/40">
      <TableCell className="font-semibold">{x.tipo_folha||'—'}</TableCell><TableCell>{dataBR(x.data_lancamento)}</TableCell>
      <TableCell><Badge variant="outline" className={x.tipo==='Consumo'?'text-blue-400':'text-red-400'}>{x.tipo==='Consumo'?'Uso fora de serviço':'Perda / desperdício'}</Badge></TableCell>
      <TableCell className="text-right font-mono">{x.quantidade}</TableCell><TableCell className="text-right font-mono">{unitarioBR(x.custo_unitario)}</TableCell><TableCell className="text-right font-bold" style={{color:C}}>{moeda(x.custo_total)}</TableCell>
      <TableCell><Badge variant="outline" className={x.custo_pendente===true?'text-amber-400':x.custo_estimado===true||x.custo_origem==='cadastro'?'text-amber-400':'text-cyan-400'}>{x.custo_pendente===true?'Pendente':x.custo_estimado===true||x.custo_origem==='cadastro'?'Estimado':origemTexto(x.custo_origem,x.custo_estimado,x.custo_data_compra)}</Badge></TableCell>
      <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{x.descricao||'—'}</TableCell>
      <TableCell><div className="flex justify-center"><Button variant="ghost" size="icon" onClick={()=>remove(x.id)} className="text-red-500 hover:bg-red-500/10" title="Excluir registro"><Trash2 className="h-4 w-4"/></Button></div></TableCell>
     </TableRow>)}
    </TableBody>
   </Table></ScrollArea></CardContent></Card>
  </motion.div>
 );
}

