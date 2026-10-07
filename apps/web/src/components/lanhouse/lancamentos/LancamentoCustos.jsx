import React,{useState,useEffect,useCallback,useMemo}from'react';
import{motion}from'framer-motion';
import{TrendingDown,Save,Trash2,Search,RotateCcw,Receipt,Loader2}from'lucide-react';
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

const CYAN='hsl(190 90% 50%)';
const BRL=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const hoje=()=>new Date().toISOString().split('T')[0];
const moeda=v=>BRL.format(Number(v)||0);
const dataBR=v=>v?new Date(`${v}T00:00:00`).toLocaleDateString('pt-BR'):'—';

export default function LancamentoCustos(){
 const{toast}=useToast(),{user}=useAuth();
 const[tiposFolha,setTiposFolha]=useState([]),[estoqueInicial,setEstoqueInicial]=useState({}),[entries,setEntries]=useState([]);
 const[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[search,setSearch]=useState(''),[dialogOpen,setDialogOpen]=useState(false);

 const initial={tipo_folha:'',data_lancamento:hoje(),tipo:'Consumo',quantidade:'',custo_unitario:'',custo_total:'0.00',descricao:''};
 const[form,setForm]=useState(initial);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[a,b,c]=await Promise.all([
    supabase.from('lm_tipos_folha').select('*').eq('user_id',user.id).order('tipo_folha',{ascending:true}),
    supabase.from('lm_estoques_inicial').select('produto,quantidade_inicial').eq('user_id',user.id),
    supabase.from('lm_lanc_custos').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10)
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;if(c.error)throw c.error;
   setTiposFolha(a.data||[]);
   const map={};
   (b.data||[]).forEach(x=>{map[String(x.produto||'').toUpperCase().trim()]=x.quantidade_inicial});
   setEstoqueInicial(map);setEntries(c.data||[]);
  }catch(e){
   toast({title:'Erro',description:e.message||'Não foi possível carregar os custos.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 const available=useMemo(()=>tiposFolha.filter(t=>{
  if(t.is_special)return true;
  return Number(estoqueInicial[String(t.tipo_folha||'').toUpperCase().trim()]||0)>0;
 }),[tiposFolha,estoqueInicial]);

 const selected=useMemo(()=>tiposFolha.find(x=>x.tipo_folha===form.tipo_folha),[tiposFolha,form.tipo_folha]);
 const isSpecial=!!selected?.is_special;

 const loadUnitCost=useCallback(async(tipo)=>{
  if(!user||!tipo){setForm(p=>({...p,custo_unitario:'0.00'}));return}
  const obj=tiposFolha.find(x=>x.tipo_folha===tipo);
  if(obj?.is_special){setForm(p=>({...p,custo_unitario:'0.00'}));return}
  try{
   const a=await supabase.from('lm_tipos_folha').select('preco').eq('user_id',user.id).eq('tipo_folha',tipo).single();
   if(!a.error&&a.data?.preco){
    setForm(p=>({...p,custo_unitario:Number(a.data.preco).toFixed(2)}));return;
   }
   const b=await supabase.from('lm_lanc_despesas').select('valor,quantidade').eq('user_id',user.id).eq('tipo_lancamento','Estoque').eq('tipo_folha',tipo).not('quantidade','is',null).gt('quantidade',0).order('data',{ascending:false}).limit(1);
   if(b.error)throw b.error;
   if(b.data?.length){
    setForm(p=>({...p,custo_unitario:(Number(b.data[0].valor)/Number(b.data[0].quantidade)).toFixed(2)}));
   }else{
    setForm(p=>({...p,custo_unitario:'0.00'}));
    toast({title:'Aviso',description:`Nenhum custo encontrado para "${tipo}".`,variant:'default'});
   }
  }catch(e){
   setForm(p=>({...p,custo_unitario:'0.00'}));
   toast({title:'Erro ao buscar custo',description:e.message,variant:'destructive'});
  }
 },[user,tiposFolha,toast]);

 useEffect(()=>{
  if(form.tipo_folha)loadUnitCost(form.tipo_folha);
  else setForm(p=>({...p,custo_unitario:'0.00'}));
 },[form.tipo_folha,loadUnitCost]);

 useEffect(()=>{
  const total=(Number(form.quantidade)||0)*(Number(form.custo_unitario)||0);
  setForm(p=>({...p,custo_total:total.toFixed(2)}));
 },[form.quantidade,form.custo_unitario]);

 const filtered=useMemo(()=>{
  const s=search.toLowerCase().trim();
  return!s?entries:entries.filter(x=>`${x.tipo_folha||''} ${x.tipo||''} ${x.descricao||''}`.toLowerCase().includes(s));
 },[entries,search]);

 const total=filtered.reduce((s,x)=>s+Number(x.custo_total||0),0);
 const consumo=filtered.filter(x=>x.tipo==='Consumo').reduce((s,x)=>s+Number(x.custo_total||0),0);
 const perdas=filtered.filter(x=>x.tipo==='Perda').reduce((s,x)=>s+Number(x.custo_total||0),0);

 const openDialog=()=>{setForm(initial);setDialogOpen(true)};
 const closeDialog=()=>{if(!saving){setDialogOpen(false);setForm(initial)}};

 const save=async e=>{
  e?.preventDefault();
  if(!form.tipo_folha||!form.quantidade||!form.data_lancamento){
   toast({title:'Campos obrigatórios',description:'Preencha tipo de folha, data e quantidade.',variant:'destructive'});return;
  }
  if(Number(form.quantidade)<=0){
   toast({title:'Quantidade inválida',description:'Informe uma quantidade maior que zero.',variant:'destructive'});return;
  }
  setSaving(true);
  try{
   const{error}=await supabase.from('lm_lanc_custos').insert({
    user_id:user.id,tipo_folha:form.tipo_folha,tipo:form.tipo,
    quantidade:Number(form.quantidade),custo_unitario:Number(form.custo_unitario)||0,
    custo_total:Number(form.custo_total)||0,data_lancamento:form.data_lancamento,
    descricao:form.descricao||null
   });
   if(error)throw error;
   toast({title:'Sucesso',description:`Custo de ${form.tipo.toLowerCase()} registrado.`});
   closeDialog();load();
  }catch(e){
   toast({title:'Erro ao salvar',description:e.message||'Falha ao salvar.',variant:'destructive'});
  }finally{setSaving(false)}
 };

 const remove=async id=>{
  try{
   const{error}=await supabase.from('lm_lanc_custos').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Removido',description:'Lançamento de custo excluído.'});load();
  }catch(e){toast({title:'Erro',description:e.message,variant:'destructive'})}
 };

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="space-y-5">

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em]" style={{color:CYAN}}>LM Impressões</p>
     <h1 className="mt-1 text-2xl font-bold">Lançamento de Custos</h1>
     <p className="text-sm text-muted-foreground">Registre consumo e perdas de folhas.</p>
    </div>
    <Button onClick={openDialog} className="text-white" style={{background:CYAN}}>
     <TrendingDown className="mr-2 h-4 w-4"/>Novo Lançamento
    </Button>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {[
     {l:'Registros',v:filtered.length},
     {l:'Total',v:moeda(total)},
     {l:'Consumo',v:moeda(consumo)},
     {l:'Perdas',v:moeda(perdas)}
    ].map(x=>
     <Card key={x.l} className="border-border bg-card">
      <CardContent className="p-4">
       <p className="text-xs uppercase tracking-wider text-muted-foreground">{x.l}</p>
       <p className="mt-1 text-xl font-bold" style={{color:CYAN}}>{x.v}</p>
      </CardContent>
     </Card>
    )}
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">
     <div className="flex gap-3">
      <div className="relative flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
       <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar folha, tipo ou descrição..." className="h-10 pl-9"/>
      </div>
      <Button variant="outline" onClick={()=>setSearch('')}><RotateCcw className="mr-2 h-4 w-4"/>Limpar</Button>
     </div>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={dialogOpen}
    onClose={closeDialog}
    title="Novo Lançamento de Custo"
    description="Preencha os dados do consumo ou perda."
    icon={TrendingDown}
    theme="blue"
    footer={
     <>
      <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
      <Button onClick={save} disabled={saving} className="text-white" style={{background:CYAN}}>
       {saving?<><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Salvando...</>:<><Save className="mr-2 h-4 w-4"/>Salvar Lançamento</>}
      </Button>
     </>
    }
   >
    <div className="space-y-5">
     <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
       <Label>Tipo de Folha *</Label>
       <Select value={form.tipo_folha} onValueChange={v=>setForm(p=>({...p,tipo_folha:v}))}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent>
         {available.length?
          available.map(t=><SelectItem key={t.id} value={t.tipo_folha}>{t.tipo_folha}{t.is_special?' — Especial':''}</SelectItem>):
          <SelectItem value="none" disabled>Nenhum tipo disponível</SelectItem>}
        </SelectContent>
       </Select>
       {isSpecial&&<p className="text-xs text-yellow-500">⚠️ {selected.description}</p>}
      </div>

      <div className="space-y-2">
       <Label>Data *</Label>
       <Input type="date" value={form.data_lancamento} onChange={e=>setForm(p=>({...p,data_lancamento:e.target.value}))}/>
      </div>
     </div>

     <div className="space-y-2">
      <Label>Tipo de Lançamento *</Label>
      <RadioGroup value={form.tipo} onValueChange={v=>setForm(p=>({...p,tipo:v}))} className="flex gap-6">
       <div className="flex items-center gap-2"><RadioGroupItem value="Consumo" id="custo-consumo"/><Label htmlFor="custo-consumo">Consumo</Label></div>
       <div className="flex items-center gap-2"><RadioGroupItem value="Perda" id="custo-perda"/><Label htmlFor="custo-perda">Perda</Label></div>
      </RadioGroup>
     </div>

     <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="space-y-2">
       <Label>Quantidade *</Label>
       <Input type="number" min="1" step="1" value={form.quantidade} onChange={e=>setForm(p=>({...p,quantidade:e.target.value}))} disabled={isSpecial}/>
      </div>

      <div className="space-y-2">
       <Label>Custo Unitário</Label>
       <Input value={`R$ ${form.custo_unitario}`} readOnly disabled/>
      </div>

      <div className="space-y-2">
       <Label>Custo Total</Label>
       <Input value={`R$ ${form.custo_total}`} readOnly disabled className="font-bold"/>
      </div>
     </div>

     <div className="space-y-2">
      <Label>Descrição</Label>
      <textarea value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} className="min-h-[90px] w-full rounded-md border border-border bg-background px-3 py-2 text-foreground resize-y" placeholder="Descrição opcional..."/>
     </div>
    </div>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <ScrollArea className="h-[520px]">
      <Table>
       <TableHeader className="sticky top-0 z-10 bg-secondary/70">
        <TableRow>
         <TableHead>Folha</TableHead>
         <TableHead>Data</TableHead>
         <TableHead>Tipo</TableHead>
         <TableHead className="text-right">Qtd.</TableHead>
         <TableHead className="text-right">Custo Unit.</TableHead>
         <TableHead className="text-right">Total</TableHead>
         <TableHead>Descrição</TableHead>
         <TableHead className="text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
        ):!filtered.length?(
         <TableRow><TableCell colSpan={8} className="py-12 text-center text-muted-foreground"><Receipt className="mx-auto mb-2 h-8 w-8"/>Nenhum lançamento encontrado.</TableCell></TableRow>
        ):filtered.map(x=>(
         <TableRow key={x.id} className="hover:bg-muted/40">
          <TableCell className="font-semibold">{x.tipo_folha||'N/A'}</TableCell>
          <TableCell>{dataBR(x.data_lancamento)}</TableCell>
          <TableCell><Badge variant="outline" className={x.tipo==='Consumo'?'text-blue-400':'text-red-400'}>{x.tipo}</Badge></TableCell>
          <TableCell className="text-right font-mono">{x.quantidade}</TableCell>
          <TableCell className="text-right font-mono">{moeda(x.custo_unitario)}</TableCell>
          <TableCell className="text-right font-bold" style={{color:CYAN}}>{moeda(x.custo_total)}</TableCell>
          <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{x.descricao||'—'}</TableCell>
          <TableCell>
           <div className="flex justify-center">
            <Button variant="ghost" size="icon" onClick={()=>remove(x.id)} className="text-red-500 hover:bg-red-500/10">
             <Trash2 className="h-4 w-4"/>
            </Button>
           </div>
          </TableCell>
         </TableRow>
        ))}
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>
  </motion.div>
 )
}
