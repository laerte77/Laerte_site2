import React,{useState,useEffect,useCallback}from'react';
import{motion}from'framer-motion';
import{TrendingDown,Save,Trash2,Loader2}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardDescription,CardHeader,CardTitle}from'@/components/ui/card';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{RadioGroup,RadioGroupItem}from'@/components/ui/radio-group';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Badge}from'@/components/ui/badge';

const C='hsl(var(--neon-lanhouse))';

export default function LancamentoCustos(){
 const{toast}=useToast(),{user}=useAuth();
 const[loading,setLoading]=useState(false),[tiposFolha,setTiposFolha]=useState([]),[estoqueInicial,setEstoqueInicial]=useState({}),[recentEntries,setRecentEntries]=useState([]);
 const[formData,setFormData]=useState({
  tipo_folha:'',
  data_lancamento:new Date().toISOString().split('T')[0],
  tipo:'Consumo',
  quantidade:'',
  custo_unitario:'',
  custo_total:'0.00',
  descricao:''
 });

 const fetchEstoqueInicial=useCallback(async()=>{
  if(!user)return;
  try{
   const{data,error}=await supabase.from('lm_estoques_inicial').select('produto,quantidade_inicial').eq('user_id',user.id);
   if(error)throw error;
   const map={};
   (data||[]).forEach(item=>{
    map[String(item.produto||'').toUpperCase().trim()]=item.quantidade_inicial;
   });
   setEstoqueInicial(map);
  }catch(error){
   console.error('Error fetching estoque inicial:',error);
  }
 },[user]);

 const fetchTiposFolha=useCallback(async()=>{
  if(!user)return;
  try{
   const{data,error}=await supabase.from('lm_tipos_folha').select('*').eq('user_id',user.id).order('tipo_folha',{ascending:true});
   if(error)throw error;
   setTiposFolha(data||[]);
  }catch(error){
   console.error('Error fetching tipos de folha:',error);
  }
 },[user]);

 const fetchCustoUnitario=useCallback(async tipoFolha=>{
  if(!user||!tipoFolha){
   setFormData(prev=>({...prev,custo_unitario:'0.00'}));
   return;
  }

  const tipoObj=tiposFolha.find(t=>t.tipo_folha===tipoFolha);

  if(tipoObj?.is_special){
   setFormData(prev=>({...prev,custo_unitario:'0.00'}));
   return;
  }

  try{
   const{data:tipoData,error:tipoError}=await supabase.from('lm_tipos_folha').select('preco').eq('user_id',user.id).eq('tipo_folha',tipoFolha).single();

   if(!tipoError&&tipoData&&tipoData.preco!==null){
    setFormData(prev=>({...prev,custo_unitario:Number(tipoData.preco).toFixed(2)}));
    return;
   }

   const{data:lancData,error:lancError}=await supabase
    .from('lm_lanc_despesas')
    .select('valor,quantidade')
    .eq('user_id',user.id)
    .eq('tipo_lancamento','Estoque')
    .eq('tipo_folha',tipoFolha)
    .not('quantidade','is',null)
    .gt('quantidade',0)
    .order('data',{ascending:false})
    .limit(1);

   if(lancError)throw lancError;

   if(lancData?.length){
    const unitCost=Number(lancData[0].valor||0)/Number(lancData[0].quantidade||1);
    setFormData(prev=>({...prev,custo_unitario:unitCost.toFixed(2)}));
   }else{
    toast({
     title:'Aviso',
     description:`Nenhum lançamento de estoque encontrado para "${tipoFolha}". Usando preço zero.`
    });
    setFormData(prev=>({...prev,custo_unitario:'0.00'}));
   }
  }catch(error){
   console.error('Error fetching custo unitario:',error);
   toast({
    title:'Erro ao buscar preço',
    description:`Erro: ${error.message}. Usando preço zero.`,
    variant:'destructive'
   });
   setFormData(prev=>({...prev,custo_unitario:'0.00'}));
  }
 },[user,toast,tiposFolha]);

 const fetchRecentEntries=useCallback(async()=>{
  if(!user)return;
  try{
   const{data,error}=await supabase.from('lm_lanc_custos').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10);
   if(error)throw error;
   setRecentEntries(data||[]);
  }catch(error){
   console.error('Error fetching recent entries:',error);
  }
 },[user]);

 useEffect(()=>{
  fetchTiposFolha();
  fetchEstoqueInicial();
  fetchRecentEntries();
 },[fetchTiposFolha,fetchEstoqueInicial,fetchRecentEntries]);

 useEffect(()=>{
  if(formData.tipo_folha)fetchCustoUnitario(formData.tipo_folha);
  else setFormData(prev=>({...prev,custo_unitario:'0.00'}));
 },[formData.tipo_folha,fetchCustoUnitario]);

 useEffect(()=>{
  const quantidade=Number(formData.quantidade)||0;
  const custoUnitario=Number(formData.custo_unitario)||0;
  setFormData(prev=>({...prev,custo_total:(quantidade*custoUnitario).toFixed(2)}));
 },[formData.quantidade,formData.custo_unitario]);

 const handleSubmit=async e=>{
  e.preventDefault();

  if(!formData.tipo_folha||!formData.quantidade||!formData.data_lancamento){
   toast({
    title:'Erro',
    description:'Preencha todos os campos obrigatórios.',
    variant:'destructive'
   });
   return;
  }

  setLoading(true);

  try{
   const{error}=await supabase.from('lm_lanc_custos').insert({
    user_id:user.id,
    tipo_folha:formData.tipo_folha,
    tipo:formData.tipo,
    quantidade:parseInt(formData.quantidade),
    custo_unitario:parseFloat(formData.custo_unitario),
    custo_total:parseFloat(formData.custo_total),
    data_lancamento:formData.data_lancamento,
    descricao:formData.descricao||null
   });

   if(error)throw error;

   toast({
    title:'Sucesso',
    description:`Custo de ${formData.tipo.toLowerCase()} registrado com sucesso!`,
    className:'bg-green-500 text-white'
   });

   setFormData({
    tipo_folha:'',
    data_lancamento:new Date().toISOString().split('T')[0],
    tipo:'Consumo',
    quantidade:'',
    custo_unitario:'',
    custo_total:'0.00',
    descricao:''
   });

   fetchRecentEntries();
  }catch(error){
   console.error('Error saving cost:',error);
   toast({
    title:'Erro',
    description:error.message||'Falha ao salvar lançamento de custo.',
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 };

 const handleDelete=async id=>{
  try{
   const{error}=await supabase.from('lm_lanc_custos').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;

   toast({
    title:'Sucesso',
    description:'Lançamento excluído com sucesso!',
    className:'bg-green-500 text-white'
   });

   fetchRecentEntries();
  }catch(error){
   console.error('Error deleting entry:',error);
   toast({
    title:'Erro',
    description:'Falha ao excluir lançamento.',
    variant:'destructive'
   });
  }
 };

 const formatCurrency=value=>new Intl.NumberFormat('pt-BR',{
  style:'currency',
  currency:'BRL'
 }).format(value||0);

 const formatDate=dateString=>new Date(`${dateString}T00:00:00`).toLocaleDateString('pt-BR');

 const availableTiposFolha=tiposFolha.filter(tipo=>{
  if(tipo.is_special)return true;
  const estoque=estoqueInicial[String(tipo.tipo_folha||'').toUpperCase().trim()]||0;
  return estoque>0;
 });

 const selectedTipoObj=tiposFolha.find(t=>t.tipo_folha===formData.tipo_folha);
 const isRascunho=!!selectedTipoObj?.is_special;

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-lm-impressoes space-y-4"
  >

   <div className="rounded-xl border border-border bg-card/70">
    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
     <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.20)] bg-[hsl(var(--neon-lanhouse)/.08)]">
       <TrendingDown className="h-5 w-5" style={{color:C}}/>
      </div>

      <div>
       <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Custos & Lucros</p>
       <h1 className="text-2xl font-bold">Lançamento de Custos</h1>
       <p className="text-sm text-muted-foreground">Registre consumo e perdas de folhas por tipo.</p>
      </div>
     </div>
    </div>
   </div>

   <Card>
    <CardHeader>
     <CardTitle style={{color:C}}>Novo Lançamento de Custo</CardTitle>
     <CardDescription>Preencha os dados do consumo ou perda de folhas.</CardDescription>
    </CardHeader>

    <CardContent>
     <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

       <div className="space-y-2">
        <Label>Tipo de Folha <span className="text-red-500">*</span></Label>
        <Select
         value={formData.tipo_folha}
         onValueChange={value=>setFormData({...formData,tipo_folha:value})}
        >
         <SelectTrigger>
          <SelectValue placeholder="Selecione o tipo de folha"/>
         </SelectTrigger>

         <SelectContent>
          {!availableTiposFolha.length?
           <SelectItem value="none" disabled>Nenhum tipo de folha disponível</SelectItem>:
           availableTiposFolha.map(tipo=>
            <SelectItem key={tipo.id} value={tipo.tipo_folha}>
             {tipo.tipo_folha}
             {tipo.is_special&&<Badge variant="outline" className="ml-2 text-xs">Especial</Badge>}
            </SelectItem>
           )
          }
         </SelectContent>
        </Select>

        {isRascunho&&
         <p className="mt-1 text-xs text-yellow-500">⚠️ {selectedTipoObj.description}</p>
        }
       </div>

       <div className="space-y-2">
        <Label>Data do Consumo/Perda <span className="text-red-500">*</span></Label>
        <Input
         type="date"
         value={formData.data_lancamento}
         onChange={e=>setFormData({...formData,data_lancamento:e.target.value})}
         required
        />
       </div>

       <div className="space-y-2 md:col-span-2">
        <Label>Tipo <span className="text-red-500">*</span></Label>

        <RadioGroup
         value={formData.tipo}
         onValueChange={value=>setFormData({...formData,tipo:value})}
         className="flex flex-wrap gap-6"
        >
         <div className="flex items-center space-x-2">
          <RadioGroupItem value="Consumo" id="consumo"/>
          <Label htmlFor="consumo" className="cursor-pointer">Consumo (Uso Normal)</Label>
         </div>

         <div className="flex items-center space-x-2">
          <RadioGroupItem value="Perda" id="perda"/>
          <Label htmlFor="perda" className="cursor-pointer">Perda (Dano/Desperdício)</Label>
         </div>
        </RadioGroup>
       </div>

       <div className="space-y-2">
        <Label>Quantidade (Folhas) <span className="text-red-500">*</span></Label>
        <Input
         type="number"
         min="1"
         step="1"
         value={formData.quantidade}
         onChange={e=>setFormData({...formData,quantidade:e.target.value})}
         placeholder="Ex: 100"
         required
         disabled={isRascunho}
         readOnly={isRascunho}
        />
       </div>

       <div className="space-y-2">
        <Label>Custo Unitário (R$)</Label>
        <Input
         value={`R$ ${formData.custo_unitario||'0.00'}`}
         className="bg-muted/50 font-mono"
         readOnly
         disabled
        />
       </div>

       <div className="space-y-2 md:col-span-2">
        <Label>Custo Total (R$)</Label>
        <Input
         value={`R$ ${formData.custo_total}`}
         className="bg-muted/50 text-lg font-bold font-mono"
         readOnly
         disabled
        />
       </div>

       <div className="space-y-2 md:col-span-2">
        <Label>Descrição (Opcional)</Label>
        <textarea
         value={formData.descricao}
         onChange={e=>setFormData({...formData,descricao:e.target.value})}
         className="min-h-[100px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-foreground"
         placeholder="Ex: Consumo de folhas A4 para impressão de documentos..."
        />
       </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-border pt-4">
       <Button
        type="button"
        variant="outline"
        onClick={()=>{
         setFormData({
          tipo_folha:'',
          data_lancamento:new Date().toISOString().split('T')[0],
          tipo:'Consumo',
          quantidade:'',
          custo_unitario:'',
          custo_total:'0.00',
          descricao:''
         });
        }}
        disabled={loading}
       >
        Limpar
       </Button>

       <Button
        type="submit"
        className="text-slate-950"
        style={{background:C}}
        disabled={loading}
       >
        {loading?
         <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
          Salvando...
         </>:
         <>
          <Save className="mr-2 h-4 w-4"/>
          Salvar Lançamento
         </>
        }
       </Button>
      </div>
     </form>
    </CardContent>
   </Card>

   <Card>
    <CardHeader>
     <CardTitle style={{color:C}}>Lançamentos Recentes</CardTitle>
     <CardDescription>Últimos 10 registros de custos.</CardDescription>
    </CardHeader>

    <CardContent>
     <div className="overflow-x-auto">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Tipo de Folha</TableHead>
         <TableHead>Data</TableHead>
         <TableHead>Tipo</TableHead>
         <TableHead className="text-right">Quantidade</TableHead>
         <TableHead className="text-right">Custo Unitário</TableHead>
         <TableHead className="text-right">Custo Total</TableHead>
         <TableHead>Descrição</TableHead>
         <TableHead className="text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {!recentEntries.length?
         <TableRow>
          <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
           Nenhum lançamento registrado
          </TableCell>
         </TableRow>:
         recentEntries.map(entry=>
          <TableRow key={entry.id} className="hover:bg-[hsl(var(--neon-lanhouse)/.04)]">
           <TableCell className="font-medium">{entry.tipo_folha||'N/A'}</TableCell>
           <TableCell className="font-mono text-sm">{formatDate(entry.data_lancamento)}</TableCell>

           <TableCell>
            <Badge
             variant="outline"
             className={entry.tipo==='Consumo'
              ?'border-blue-500/30 bg-blue-500/20 text-blue-400'
              :'border-red-500/30 bg-red-500/20 text-red-400'}
            >
             {entry.tipo}
            </Badge>
           </TableCell>

           <TableCell className="text-right font-mono">{entry.quantidade}</TableCell>
           <TableCell className="text-right font-mono">{formatCurrency(entry.custo_unitario)}</TableCell>
           <TableCell className="text-right font-mono font-bold">{formatCurrency(entry.custo_total)}</TableCell>
           <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{entry.descricao||'-'}</TableCell>

           <TableCell className="text-center">
            <Button
             variant="ghost"
             size="icon"
             onClick={()=>handleDelete(entry.id)}
             className="text-red-400 hover:bg-red-500/10 hover:text-red-500"
            >
             <Trash2 className="h-4 w-4"/>
            </Button>
           </TableCell>
          </TableRow>
         )
        }
       </TableBody>
      </Table>
     </div>
    </CardContent>
   </Card>

  </motion.div>
 );
}
