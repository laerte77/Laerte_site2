import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash2,TrendingDown,RefreshCw,Search,PackagePlus,Receipt}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Badge}from'@/components/ui/badge';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const TIPOS=[{value:'Estoque',label:'Entrada no estoque'},{value:'Despesa operacional',label:'Despesa operacional'}];
const CATEGORIAS=['Impressão','Digital','Infraestrutura','Manutenção','Outros'];
const tipoLabel=v=>TIPOS.find(t=>t.value===v)?.label||'Não configurada';

export default function CadastroDespesas(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState('');
 const[open,setOpen]=useState(false),[editId,setEditId]=useState(null);
 const[nome,setNome]=useState(''),[tipo,setTipo]=useState('Despesa operacional'),[categoria,setCategoria]=useState('');

 const load=useCallback(async()=>{
  if(!user){setData([]);setLoading(false);return}
  setLoading(true);
  try{
   const{data:rows,error}=await supabase.from('lm_despesas').select('*').eq('user_id',user.id).order('despesa');
   if(error)throw error;
   setData(rows||[]);
  }catch(e){
   toast({title:'Erro ao carregar despesas',description:e.message||'Não foi possível carregar os cadastros.',variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);
 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel(`lm_despesas_changes_${user.id}`)
   .on('postgres_changes',{event:'*',schema:'public',table:'lm_despesas',filter:`user_id=eq.${user.id}`},load)
   .subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const reset=()=>{
  setNome('');setTipo('Despesa operacional');setCategoria('');setEditId(null);
 };
 const closeForm=()=>{setOpen(false);reset()};
 const openForm=x=>{
  setEditId(x?.id||null);
  setNome(x?.despesa||'');
  setTipo(x?.tipo_lancamento||'Despesa operacional');
  setCategoria(x?.categoria||'');
  setOpen(true);
 };

 const save=async e=>{
  e.preventDefault();
  if(!user)return;
  if(!nome.trim()){
   toast({title:'Campo obrigatório',description:'Informe o nome da descrição.',variant:'destructive'});return;
  }
  if(!TIPOS.some(t=>t.value===tipo)){
   toast({title:'Classificação obrigatória',description:'Selecione uma classificação válida.',variant:'destructive'});return;
  }
  if(!CATEGORIAS.includes(categoria)){
   toast({title:'Categoria obrigatória',description:'Selecione uma categoria padrão.',variant:'destructive'});return;
  }

  const payload={despesa:nome.trim(),tipo_lancamento:tipo,categoria,user_id:user.id};
  try{
   const q=editId
    ?await supabase.from('lm_despesas').update(payload).eq('id',editId).eq('user_id',user.id)
    :await supabase.from('lm_despesas').insert(payload);
   if(q.error)throw q.error;
   toast({title:'Sucesso',description:editId?'Descrição, classificação e categoria atualizadas.':'Descrição cadastrada.'});
   closeForm();
   await load();
  }catch(e){
   toast({title:'Erro ao salvar',description:e.message||'Não foi possível salvar o cadastro.',variant:'destructive'});
  }
 };

 const remove=async id=>{
  try{
   const{error}=await supabase.from('lm_despesas').delete().eq('id',id).eq('user_id',user.id);
   if(error)throw error;
   toast({title:'Sucesso',description:'Descrição excluída.'});
   await load();
  }catch(e){
   toast({title:'Erro ao excluir',description:e.message||'Verifique se existem lançamentos vinculados.',variant:'destructive'});
  }
 };

 const list=data.filter(x=>`${x.despesa||''} ${tipoLabel(x.tipo_lancamento)} ${x.categoria||''}`.toLowerCase().includes(search.trim().toLowerCase()))
  .sort((a,b)=>String(a.despesa||'').localeCompare(String(b.despesa||''),'pt-BR',{sensitivity:'base',numeric:true}));

 return(
  <div className="dark-lm-impressoes space-y-4">
   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10"><TrendingDown className="h-5 w-5 text-red-400"/></div>
     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-red-400">Cadastros</p>
      <h1 className="text-2xl font-bold tracking-tight">Tipos de Despesa</h1>
      <p className="text-sm text-muted-foreground">Configure a classificação e a categoria padrão de cada descrição.</p>
     </div>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</Button>
     <Button onClick={()=>openForm()} className="bg-red-500 text-white hover:bg-red-600"><Plus className="mr-2 h-4 w-4"/>Nova Descrição</Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
     <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar descrição, classificação ou categoria..." className="h-11 rounded-xl bg-input pl-9"/>
     </div>
     <span className="text-sm text-muted-foreground">{list.length} cadastro(s)</span>
    </CardContent>
   </Card>

   <div className="grid gap-4 sm:grid-cols-3">
    <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Descrições cadastradas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-400">{data.length}</p></CardContent></Card>
    <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Entradas no estoque</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-400">{data.filter(x=>x.tipo_lancamento==='Estoque').length}</p></CardContent></Card>
    <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Despesas operacionais</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{data.filter(x=>x.tipo_lancamento==='Despesa operacional').length}</p></CardContent></Card>
   </div>

   <ModalLancamentoPadrao open={open} onClose={closeForm} title={editId?'Editar Descrição':'Nova Descrição de Despesa'} description="Defina o nome, a classificação e a categoria padrão." icon={TrendingDown} theme="red" footer={<><Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button><Button type="submit" form="f-despesa" className="bg-red-500 text-white hover:bg-red-600">{editId?'Salvar Alterações':'Salvar Cadastro'}</Button></>}>
    <form id="f-despesa" onSubmit={save} className="space-y-5">
     <div className="space-y-2">
      <Label htmlFor="nome-despesa">Descrição *</Label>
      <Input id="nome-despesa" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: Internet, Papel fotográfico..." className="h-11 rounded-xl bg-input" required/>
     </div>
     <div className="space-y-2">
      <Label>Classificação padrão *</Label>
      <Select value={tipo} onValueChange={setTipo}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione a classificação"/></SelectTrigger>
       <SelectContent>
        <SelectItem value="Estoque"><span className="flex items-center gap-2"><PackagePlus className="h-4 w-4"/>Entrada no estoque</span></SelectItem>
        <SelectItem value="Despesa operacional"><span className="flex items-center gap-2"><Receipt className="h-4 w-4"/>Despesa operacional</span></SelectItem>
       </SelectContent>
      </Select>
     </div>
     <div className="space-y-2">
      <Label>Categoria padrão *</Label>
      <Select value={categoria} onValueChange={setCategoria}>
       <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione a categoria"/></SelectTrigger>
       <SelectContent>{CATEGORIAS.map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Essa categoria será aplicada automaticamente nos novos lançamentos desta descrição.</p>
     </div>
     {tipo==='Estoque'&&<div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-muted-foreground">Esta descrição representa uma entrada de material no estoque. Consumo e perdas continuam nos módulos próprios.</div>}
    </form>
   </ModalLancamentoPadrao>

   <Card className="overflow-hidden border-border bg-card">
    <CardHeader className="pb-3"><CardTitle className="text-lg text-red-400">Descrições cadastradas</CardTitle></CardHeader>
    <CardContent className="p-0">
     <div className="overflow-x-auto">
      <table className="w-full min-w-[720px]">
       <thead><tr className="border-b border-border bg-muted/30">
        <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Descrição</th>
        <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Classificação</th>
        <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Categoria</th>
        <th className="w-28 p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th>
       </tr></thead>
       <tbody>
        {loading?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>
        :!list.length?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground"><TrendingDown className="mx-auto mb-2 h-10 w-10 opacity-50"/><p>{data.length?'Nenhum resultado encontrado.':'Nenhuma descrição cadastrada.'}</p></td></tr>
        :list.map(x=><tr key={x.id} className="border-b border-border last:border-0 hover:bg-red-500/5">
         <td className="p-4 font-medium">{x.despesa}</td>
         <td className="p-4"><Badge variant="outline" className={x.tipo_lancamento==='Estoque'?'border-emerald-500/30 bg-emerald-500/10 text-emerald-400':'border-red-500/30 bg-red-500/10 text-red-400'}>{tipoLabel(x.tipo_lancamento)}</Badge></td>
         <td className="p-4">{x.categoria||<span className="text-amber-400">Configurar categoria</span>}</td>
         <td className="p-4 text-right">
          <div className="flex justify-end gap-1">
           <Button type="button" variant="ghost" size="icon" onClick={()=>openForm(x)} className="text-blue-400 hover:bg-blue-500/10" title="Editar" aria-label={`Editar ${x.despesa}`}><Edit className="h-4 w-4"/></Button>
           <AlertDialog>
            <AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10" title="Excluir" aria-label={`Excluir ${x.despesa}`}><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
            <AlertDialogContent className="dark-lm-impressoes border-border bg-card">
             <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Deseja remover a descrição <strong>{x.despesa}</strong>? Se houver lançamentos vinculados, o banco poderá impedir a exclusão.</AlertDialogDescription></AlertDialogHeader>
             <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(x.id)} className="bg-red-600 text-white hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
           </AlertDialog>
          </div>
         </td>
        </tr>)}
       </tbody>
      </table>
     </div>
    </CardContent>
   </Card>
  </div>
 );
}

