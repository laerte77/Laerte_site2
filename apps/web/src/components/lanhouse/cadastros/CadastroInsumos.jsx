import React,{useState,useEffect,useCallback}from'react';
import{Plus,Edit,Trash2,Package,RefreshCw,Search}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const C='hsl(var(--neon-lanhouse))';

export default function CadastroInsumos(){
 const{user}=useAuth(),{toast}=useToast();
 const[data,setData]=useState([]),[loading,setLoading]=useState(true),[search,setSearch]=useState('');
 const[open,setOpen]=useState(false),[editId,setEditId]=useState(null);
 const[nome,setNome]=useState(''),[unidade,setUnidade]=useState('unidade'),[minimo,setMinimo]=useState('');

 const load=useCallback(async()=>{
  if(!user){setData([]);setLoading(false);return}
  setLoading(true);
  const{data:rows,error}=await supabase.from('lm_insumos').select('*').eq('user_id',user.id).order('nome');
  if(error)toast({title:'Erro ao carregar insumos',description:error.message,variant:'destructive'});
  else setData(rows||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 useEffect(()=>{
  if(!user)return;
  const ch=supabase.channel(`lm_insumos_changes_${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'lm_insumos',filter:`user_id=eq.${user.id}`},load).subscribe();
  return()=>supabase.removeChannel(ch);
 },[user,load]);

 const reset=()=>{setNome('');setUnidade('unidade');setMinimo('');setEditId(null)};
 const closeForm=()=>{setOpen(false);reset()};
 const openForm=x=>{
  setEditId(x?.id||null);
  setNome(x?.nome||'');
  setUnidade(x?.unidade||'unidade');
  setMinimo(x?.estoque_minimo==null?'':String(x.estoque_minimo));
  setOpen(true);
 };

 const save=async e=>{
  e.preventDefault();
  if(!user)return;
  const n=nome.trim(),u=unidade.trim();
  if(!n||!u)return toast({title:'Campos obrigatórios',description:'Informe o nome e a unidade de medida.',variant:'destructive'});
  if(minimo.trim()&&(!Number.isFinite(Number(minimo))||Number(minimo)<0))return toast({title:'Estoque mínimo inválido',description:'Informe uma quantidade igual ou maior que zero.',variant:'destructive'});
  if(data.some(x=>x.id!==editId&&String(x.nome||'').trim().toLocaleLowerCase('pt-BR')===n.toLocaleLowerCase('pt-BR')))return toast({title:'Insumo já cadastrado',description:'Já existe um insumo com esse nome.',variant:'destructive'});
  const payload={nome:n,unidade:u,estoque_minimo:minimo.trim()?Number(minimo):null,user_id:user.id};
  const q=editId
   ?await supabase.from('lm_insumos').update(payload).eq('id',editId).eq('user_id',user.id)
   :await supabase.from('lm_insumos').insert(payload);
  if(q.error)return toast({title:'Erro ao salvar insumo',description:q.error.message,variant:'destructive'});
  toast({title:'Sucesso',description:editId?'Insumo atualizado.':'Insumo cadastrado.'});
  closeForm();
  await load();
 };

 const remove=async id=>{
  const{error}=await supabase.from('lm_insumos').delete().eq('id',id).eq('user_id',user.id);
  if(error)toast({title:'Erro ao excluir',description:error.message,variant:'destructive'});
  else{toast({title:'Sucesso',description:'Insumo excluído.'});await load()}
 };

 const list=data.filter(x=>`${x.nome||''} ${x.unidade||''}`.toLowerCase().includes(search.trim().toLowerCase()));
 const fmt=v=>v==null||v===''?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:3});

 return <div className="dark-lm-impressoes space-y-4">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-3">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-lanhouse)/.2)] bg-[hsl(var(--neon-lanhouse)/.08)]">
     <Package className="h-5 w-5" style={{color:C}}/>
    </div>
    <div>
     <p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:C}}>Cadastros</p>
     <h1 className="text-2xl font-bold tracking-tight">Insumos</h1>
     <p className="text-sm text-muted-foreground">Cadastre materiais e defina seus níveis mínimos de estoque.</p>
    </div>
   </div>
   <div className="flex flex-wrap gap-2">
    <Button variant="outline" onClick={load}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button>
    <Button onClick={()=>openForm()} className="text-slate-950 hover:opacity-90" style={{background:C}}><Plus className="mr-2 h-4 w-4"/>Novo Insumo</Button>
   </div>
  </div>

  <Card className="border-border bg-card/80">
   <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="relative w-full max-w-md">
     <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
     <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar insumo ou unidade..." className="h-11 rounded-xl bg-input pl-9"/>
    </div>
    <span className="text-sm text-muted-foreground">{list.length} insumo(s)</span>
   </CardContent>
  </Card>

  <div className="grid gap-4 sm:grid-cols-2">
   <Card className="border-border bg-card">
    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Insumos cadastrados</CardTitle></CardHeader>
    <CardContent><p className="text-2xl font-bold" style={{color:C}}>{data.length}</p></CardContent>
   </Card>
   <Card className="border-border bg-card">
    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Com estoque mínimo</CardTitle></CardHeader>
    <CardContent><p className="text-2xl font-bold">{data.filter(x=>x.estoque_minimo!=null).length}</p></CardContent>
   </Card>
  </div>

  <ModalLancamentoPadrao open={open} onClose={closeForm} title={editId?'Editar Insumo':'Novo Insumo'} description="Informe os dados do material." icon={Package} theme="cyan" footer={<><Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button><Button type="submit" form="f-insumo" className="text-slate-950 hover:opacity-90" style={{background:C}}>{editId?'Salvar Alterações':'Salvar Insumo'}</Button></>}>
   <form id="f-insumo" onSubmit={save} className="space-y-4">
    <div className="space-y-2">
     <Label htmlFor="insumo-nome">Nome do insumo</Label>
     <Input id="insumo-nome" value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex.: Palito de topo de bolo" className="h-11 rounded-xl bg-input" required/>
    </div>
    <div className="space-y-2">
     <Label htmlFor="insumo-unidade">Unidade de medida</Label>
     <Input id="insumo-unidade" value={unidade} onChange={e=>setUnidade(e.target.value)} placeholder="Ex.: unidade, folha, pacote" className="h-11 rounded-xl bg-input" required/>
    </div>
    <div className="space-y-2">
     <Label htmlFor="insumo-minimo">Estoque mínimo (opcional)</Label>
     <Input id="insumo-minimo" type="number" min="0" step="0.001" value={minimo} onChange={e=>setMinimo(e.target.value)} placeholder="Ex.: 10" className="h-11 rounded-xl bg-input"/>
    </div>
   </form>
  </ModalLancamentoPadrao>

  <Card className="overflow-hidden border-border bg-card">
   <CardHeader className="pb-3"><CardTitle className="text-lg" style={{color:C}}>Insumos cadastrados</CardTitle></CardHeader>
   <CardContent className="p-0">
    <div className="overflow-x-auto">
     <table className="w-full min-w-[600px]">
      <thead><tr className="border-b border-border bg-muted/30">
       <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Nome</th>
       <th className="p-4 text-left text-sm font-semibold text-muted-foreground">Unidade</th>
       <th className="p-4 text-right text-sm font-semibold text-muted-foreground">Estoque mínimo</th>
       <th className="w-28 p-4 text-right text-sm font-semibold text-muted-foreground">Ações</th>
      </tr></thead>
      <tbody>
       {loading?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Carregando...</td></tr>
       :!list.length?<tr><td colSpan={4} className="p-10 text-center text-muted-foreground"><Package className="mx-auto mb-2 h-10 w-10 opacity-40"/><p>{data.length?'Nenhum resultado encontrado.':'Nenhum insumo cadastrado.'}</p></td></tr>
       :list.map(x=><tr key={x.id} className="border-b border-border last:border-0 hover:bg-[hsl(var(--neon-lanhouse)/.04)]">
        <td className="p-4 font-medium">{x.nome}</td>
        <td className="p-4 text-muted-foreground">{x.unidade}</td>
        <td className="p-4 text-right tabular-nums">{fmt(x.estoque_minimo)}</td>
        <td className="p-4 text-right">
         <div className="flex justify-end gap-1">
          <Button type="button" variant="ghost" size="icon" onClick={()=>openForm(x)} className="text-blue-400 hover:bg-blue-500/10" title="Editar" aria-label={`Editar ${x.nome}`}><Edit className="h-4 w-4"/></Button>
          <AlertDialog>
           <AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10" title="Excluir" aria-label={`Excluir ${x.nome}`}><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger>
           <AlertDialogContent className="dark-lm-impressoes border-border bg-card">
            <AlertDialogHeader><AlertDialogTitle>Excluir insumo?</AlertDialogTitle><AlertDialogDescription>Deseja excluir <strong>{x.nome}</strong>? Os registros de estoque associados perderão o vínculo com este insumo.</AlertDialogDescription></AlertDialogHeader>
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
 </div>;
}
