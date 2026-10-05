import React,{useCallback,useEffect,useState}from'react';
import{Plus,Edit,Trash2,History,Search,UserPlus,Shield,Droplets,Flame,RefreshCw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Badge}from'@/components/ui/badge';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle,AlertDialogTrigger}from'@/components/ui/alert-dialog';
import{useToast}from'@/components/ui/use-toast';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{supabase}from'@/lib/customSupabaseClient';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';
import ConsultaHistoricoMembro from'@/components/igreja/secretaria/consultas/ConsultaHistoricoMembro';

const GOLD='hsl(var(--neon-igreja))';
const base={nome_completo:'',data_nascimento:'',estado_civil:'',data_entrada:'',tipo_vinculo:'MEMBRO',classe_id:'none',cargo_id:'none',funcao_id:'none',participa_conjunto:'nao',conjunto_id:'none',is_dirigente:'nao',dirige_mais_de_um:'nao',conjuntos_dirigidos:[],quantos_conjuntos_dirige:'',funcoes_multiplas:'nao',quantas_funcoes:'',funcoes_selecionadas:[],is_batizado_aguas:'nao',is_batizado_espirito:'nao',status:'ATIVO'};

const Sel=({label,value,onChange,options,placeholder='Selecione'})=><div><Label>{label}</Label><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder}/></SelectTrigger><SelectContent className="dark-igreja">{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select></div>;
const simNao=[{value:'nao',label:'Não'},{value:'sim',label:'Sim'}];
const estado=['SOLTEIRO','CASADO','DIVORCIADO','VIÚVO'].map(x=>({value:x,label:x}));
const vinculos=[{value:'MEMBRO',label:'Membro'},{value:'CONGREGADO',label:'Congregado'}];

export default function CadastroMembros(){
 const{user}=useAuth(),{toast}=useToast();
 const[membros,setMembros]=useState([]),[busca,setBusca]=useState('');
 const[apoio,setApoio]=useState({classes:[],cargos:[],funcoes:[],conjuntos:[]});
 const[loading,setLoading]=useState(true),[open,setOpen]=useState(false),[current,setCurrent]=useState(null),[form,setForm]=useState(base),[historico,setHistorico]=useState(null);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[r,c,f,k,x]=await Promise.all([
    supabase.from('igreja_membros').select('*,cargo:cargos_igreja(nome_cargo),conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto)').order('nome_completo'),
    supabase.from('igreja_classes').select('id,nome_classe').order('nome_classe'),
    supabase.from('cargos_igreja').select('id,nome_cargo').order('nome_cargo'),
    supabase.from('igreja_funcoes').select('id,nome_funcao').order('nome_funcao'),
    supabase.from('igreja_conjuntos').select('id,nome_conjunto').order('nome_conjunto')
   ]);
   const e=[r,c,f,k,x].find(v=>v.error)?.error;
   if(e)throw e;
   setMembros(r.data||[]);
   setApoio({classes:c.data||[],cargos:f.data||[],funcoes:k.data||[],conjuntos:x.data||[]});
  }catch(e){toast({title:'Erro ao carregar dados',description:e.message,variant:'destructive'})}
  finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 const change=(k,v)=>setForm(p=>({...p,[k]:v}));
 const reset=()=>{setForm({...base});setCurrent(null)};

 const edit=m=>{
  const ids=Array.isArray(m.dirige_conjuntos_multiplos?.conjuntos_ids)?m.dirige_conjuntos_multiplos.conjuntos_ids:(m.dirige_conjunto_id?[m.dirige_conjunto_id]:[]);
  const multi=Array.isArray(m.funcoes_multiplas?.funcoes_ids)?m.funcoes_multiplas.funcoes_ids:[];
  setCurrent(m);
  setForm({...base,
   nome_completo:m.nome_completo||'',data_nascimento:m.data_nascimento||'',estado_civil:m.estado_civil||'',data_entrada:m.data_entrada||'',tipo_vinculo:m.tipo_vinculo||'MEMBRO',
   classe_id:m.classe_id||'none',cargo_id:m.cargo_id||'none',funcao_id:multi[0]||'none',
   funcoes_multiplas:Number(m.funcoes_multiplas?.quantidade)>1?'sim':'nao',quantas_funcoes:String(m.funcoes_multiplas?.quantidade||''),funcoes_selecionadas:multi,
   participa_conjunto:m.participa_conjunto?'sim':'nao',conjunto_id:m.conjunto_id||'none',
   is_dirigente:m.is_dirigente?'sim':'nao',dirige_mais_de_um:ids.length>1?'sim':'nao',conjuntos_dirigidos:ids,quantos_conjuntos_dirige:ids.length>1?String(ids.length):'',
   is_batizado_aguas:m.is_batizado_aguas?'sim':'nao',is_batizado_espirito:m.is_batizado_espirito?'sim':'nao',status:m.status||'ATIVO'
  });
  setOpen(true);
 };

 const setQtd=(k,q,key)=>{
  const n=Number(q)||0;
  change(k,q);
  change(key,Array.from({length:n},(_,i)=>form[key][i]||'none'));
 };

 const payload=()=>{
  const f=form.funcoes_multiplas==='sim'?form.funcoes_selecionadas.filter(v=>v!=='none'):(form.funcao_id!=='none'?[form.funcao_id]:[]);
  const d=form.is_dirigente==='sim'?form.conjuntos_dirigidos.filter(v=>v!=='none'):[];
  return{
   nome_completo:form.nome_completo.trim(),data_nascimento:form.data_nascimento,estado_civil:form.estado_civil,data_entrada:form.data_entrada,
   tipo_vinculo:form.tipo_vinculo,
   classe_id:form.classe_id==='none'?null:form.classe_id,cargo_id:form.cargo_id==='none'?null:form.cargo_id,
   funcoes_multiplas:f.length?{quantidade:f.length,funcoes_ids:f}:null,
   funcoes_exercidas:f.map(id=>apoio.funcoes.find(x=>x.id===id)?.nome_funcao).filter(Boolean).join(', '),
   participa_conjunto:form.participa_conjunto==='sim',conjunto_id:form.participa_conjunto==='sim'&&form.conjunto_id!=='none'?form.conjunto_id:null,
   is_dirigente:form.is_dirigente==='sim',dirige_conjunto_id:d[0]||null,
   dirige_conjuntos_multiplos:d.length?{quantidade:d.length,conjuntos_ids:d}:null,
   is_batizado_aguas:form.is_batizado_aguas==='sim',is_batizado_espirito:form.is_batizado_espirito==='sim',status:form.status,user_id:user.id
  };
 };

 const save=async e=>{
  e?.preventDefault();
  if(!form.nome_completo.trim()||!form.data_nascimento||!form.estado_civil||!form.data_entrada||form.cargo_id==='none')return toast({title:'Campos obrigatórios',description:'Preencha nome, nascimento, estado civil, data de entrada e cargo.',variant:'destructive'});
  if(form.funcoes_multiplas==='nao'&&form.funcao_id==='none')return toast({title:'Função obrigatória',description:'Selecione a função do membro.',variant:'destructive'});
  if(form.funcoes_multiplas==='sim'&&(!form.funcoes_selecionadas.length||form.funcoes_selecionadas.some(v=>v==='none')))return toast({title:'Funções incompletas',description:'Selecione todas as funções.',variant:'destructive'});
  if(form.participa_conjunto==='sim'&&form.conjunto_id==='none')return toast({title:'Conjunto obrigatório',description:'Selecione o conjunto.',variant:'destructive'});
  const data=payload();
  if(form.is_dirigente==='sim'){
   if(!data.dirige_conjunto_id)return toast({title:'Conjunto do dirigente',description:'Selecione o conjunto dirigido.',variant:'destructive'});
   if(new Set(form.conjuntos_dirigidos).size!==form.conjuntos_dirigidos.length)return toast({title:'Conjuntos duplicados',description:'Não repita o mesmo conjunto.',variant:'destructive'});
  }
  try{
   const q=current?await supabase.from('igreja_membros').update(data).eq('id',current.id):await supabase.from('igreja_membros').insert(data);
   if(q.error)throw q.error;
   toast({title:'Sucesso',description:current?'Membro atualizado com sucesso.':'Membro cadastrado com sucesso.'});
   setOpen(false);reset();load();
  }catch(e){toast({title:'Erro ao salvar',description:e.message,variant:'destructive'})}
 };

 const remove=async id=>{
  try{const{error}=await supabase.from('igreja_membros').delete().eq('id',id);if(error)throw error;toast({title:'Membro removido',description:'O cadastro foi excluído.'});load()}
  catch(e){toast({title:'Erro ao excluir',description:e.message,variant:'destructive'})}
 };

 const list=membros.filter(m=>{const s=busca.trim().toLowerCase();return!s||m.nome_completo?.toLowerCase().includes(s)||m.cargo?.nome_cargo?.toLowerCase().includes(s)});
 const ativos=membros.filter(m=>m.status==='ATIVO').length;
 const dirigentes=membros.filter(m=>m.is_dirigente).length;
 const selCargo=apoio.cargos.map(x=>({value:x.id,label:x.nome_cargo}));
 const selFunc=apoio.funcoes.map(x=>({value:x.id,label:x.nome_funcao}));
 const selConj=apoio.conjuntos.map(x=>({value:x.id,label:x.nome_conjunto}));
 const selClasse=[{value:'none',label:'Nenhuma'},...apoio.classes.map(x=>({value:x.id,label:x.nome_classe}))];

 return <div className="dark-igreja space-y-4">
  <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
   <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{borderColor:'hsl(var(--neon-igreja)/.20)',background:'hsl(var(--neon-igreja)/.08)'}}><UserPlus className="h-5 w-5" style={{color:GOLD}}/></div><div><p className="text-[11px] font-semibold uppercase tracking-[.2em]" style={{color:GOLD}}>Cadastros</p><h1 className="text-2xl font-bold">Membros</h1><p className="text-sm text-muted-foreground">Gerencie os membros e suas informações ministeriais.</p></div></div>
   <div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</Button><Button onClick={()=>{reset();setOpen(true)}} style={{background:GOLD,color:'#111827'}}><Plus className="mr-2 h-4 w-4"/>Novo Membro</Button></div>
  </div>

  <Card><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar membro ou cargo..." className="pl-9"/></div><span className="text-sm text-muted-foreground">{list.length} membro(s)</span></CardContent></Card>

  <div className="grid gap-4 md:grid-cols-4">{[['Total de membros',membros.length,GOLD],['Membros ativos',ativos,'#34d399'],['Membros inativos',membros.length-ativos,'#f87171'],['Dirigentes',dirigentes,GOLD]].map(([t,v,c])=><Card key={t}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{t}</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={{color:c}}>{v}</p></CardContent></Card>)}</div>

  <Card><CardHeader><CardTitle style={{color:GOLD}}>Membros cadastrados</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Vínculo</TableHead><TableHead>Cargo</TableHead><TableHead>Batismos</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader><TableBody>
   {loading?<TableRow><TableCell colSpan={6} className="p-10 text-center">Carregando...</TableCell></TableRow>:list.length?list.map(m=><TableRow key={m.id} className="hover:bg-[hsl(var(--neon-igreja)/.04)]">
    <TableCell className="font-medium">{m.nome_completo}{m.is_dirigente&&<Badge className="ml-2 bg-[hsl(var(--neon-igreja)/.12)] text-[hsl(var(--neon-igreja))]">Dirigente</Badge>}</TableCell>
    <TableCell><Badge variant="outline" style={{color:m.tipo_vinculo==='CONGREGADO'?'#60a5fa':GOLD,borderColor:m.tipo_vinculo==='CONGREGADO'?'#3b82f6':'hsl(var(--neon-igreja)/.30)'}}>{m.tipo_vinculo||'MEMBRO'}</Badge></TableCell>
    <TableCell><span className="flex items-center gap-1" style={{color:GOLD}}><Shield className="h-3.5 w-3.5"/>{m.cargo?.nome_cargo||'Sem cargo'}</span></TableCell>
    <TableCell><div className="flex gap-1"><Badge variant="outline" className={m.is_batizado_aguas?'text-blue-400':'opacity-40'}><Droplets className="mr-1 h-3 w-3"/>Águas</Badge><Badge variant="outline" className={m.is_batizado_espirito?'text-orange-400':'opacity-40'}><Flame className="mr-1 h-3 w-3"/>Espírito</Badge></div></TableCell>
    <TableCell><Badge className={m.status==='ATIVO'?'bg-green-500/15 text-green-400':'bg-red-500/15 text-red-400'}>{m.status}</Badge></TableCell>
    <TableCell><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={()=>setHistorico(m)} className="text-blue-400"><History className="h-4 w-4"/></Button><Button variant="ghost" size="icon" onClick={()=>edit(m)} style={{color:GOLD}}><Edit className="h-4 w-4"/></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-red-400"><Trash2 className="h-4 w-4"/></Button></AlertDialogTrigger><AlertDialogContent className="dark-igreja"><AlertDialogHeader><AlertDialogTitle>Excluir membro?</AlertDialogTitle><AlertDialogDescription>Deseja excluir <strong>{m.nome_completo}</strong>?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={()=>remove(m.id)} className="bg-red-600">Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div></TableCell>
   </TableRow>):<TableRow><TableCell colSpan={6} className="p-12 text-center text-muted-foreground">Nenhum membro cadastrado.</TableCell></TableRow>}
  </TableBody></Table></div></CardContent></Card>

  <ModalLancamentoPadrao open={open} onClose={()=>{setOpen(false);reset()}} title={current?'Editar membro':'Novo membro'} description="Preencha os dados cadastrais e ministeriais do membro." icon={current?Edit:UserPlus} theme="gold" footer={<><Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button><Button onClick={save} style={{background:GOLD,color:'#111827'}}>Salvar</Button></>}>
   <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
    <div className="md:col-span-2"><Label>Nome completo *</Label><Input value={form.nome_completo} onChange={e=>change('nome_completo',e.target.value)}/></div>
    <div><Label>Data de nascimento *</Label><Input type="date" value={form.data_nascimento} onChange={e=>change('data_nascimento',e.target.value)}/></div>
    <div><Label>Data de entrada *</Label><Input type="date" value={form.data_entrada} onChange={e=>change('data_entrada',e.target.value)}/></div>
    <Sel label="Tipo de vínculo *" value={form.tipo_vinculo} onChange={v=>change('tipo_vinculo',v)} options={vinculos}/>
    <Sel label="Estado civil *" value={form.estado_civil} onChange={v=>change('estado_civil',v)} options={estado}/>
    <Sel label="Cargo *" value={form.cargo_id} onChange={v=>change('cargo_id',v)} options={selCargo}/>
    <Sel label="Possui múltiplas funções?" value={form.funcoes_multiplas} onChange={v=>change('funcoes_multiplas',v)} options={simNao}/>
    {form.funcoes_multiplas==='nao'?<Sel label="Função *" value={form.funcao_id} onChange={v=>change('funcao_id',v)} options={selFunc}/>:<div><Label>Quantidade de funções</Label><Input type="number" min="1" value={form.quantas_funcoes} onChange={e=>setQtd('quantas_funcoes',e.target.value,'funcoes_selecionadas')}/></div>}
    {form.funcoes_multiplas==='sim'&&form.funcoes_selecionadas.map((id,i)=><Sel key={i} label={`Função ${i+1}`} value={id} onChange={v=>{const a=[...form.funcoes_selecionadas];a[i]=v;change('funcoes_selecionadas',a)}} options={selFunc}/>)}
    <Sel label="Participa de conjunto?" value={form.participa_conjunto} onChange={v=>change('participa_conjunto',v)} options={simNao}/>
    {form.participa_conjunto==='sim'&&<Sel label="Conjunto" value={form.conjunto_id} onChange={v=>change('conjunto_id',v)} options={selConj}/>}
    <Sel label="É dirigente?" value={form.is_dirigente} onChange={v=>change('is_dirigente',v)} options={simNao}/>
    {form.is_dirigente==='sim'&&<Sel label="Dirige mais de um conjunto?" value={form.dirige_mais_de_um} onChange={v=>change('dirige_mais_de_um',v)} options={simNao}/>}
    {form.is_dirigente==='sim'&&form.dirige_mais_de_um==='nao'&&<Sel label="Conjunto dirigido" value={form.conjuntos_dirigidos[0]||'none'} onChange={v=>change('conjuntos_dirigidos',[v])} options={[{value:'none',label:'Selecione'},...selConj]}/>}
    {form.is_dirigente==='sim'&&form.dirige_mais_de_um==='sim'&&<><div><Label>Quantidade de conjuntos</Label><Input type="number" min="2" value={form.quantos_conjuntos_dirige} onChange={e=>setQtd('quantos_conjuntos_dirige',e.target.value,'conjuntos_dirigidos')}/></div>{form.conjuntos_dirigidos.map((id,i)=><Sel key={i} label={`Conjunto ${i+1}`} value={id} onChange={v=>{const a=[...form.conjuntos_dirigidos];a[i]=v;change('conjuntos_dirigidos',a)}} options={selConj}/>)}</>}
    <Sel label="Batizado nas águas?" value={form.is_batizado_aguas} onChange={v=>change('is_batizado_aguas',v)} options={simNao}/>
    <Sel label="Batizado no Espírito Santo?" value={form.is_batizado_espirito} onChange={v=>change('is_batizado_espirito',v)} options={simNao}/>
    <Sel label="Classe EBD" value={form.classe_id} onChange={v=>change('classe_id',v)} options={selClasse}/>
    <Sel label="Status" value={form.status} onChange={v=>change('status',v)} options={[{value:'ATIVO',label:'Ativo'},{value:'INATIVO',label:'Inativo'}]}/>
   </form>
  </ModalLancamentoPadrao>

  {historico&&<ConsultaHistoricoMembro membro={historico} open={!!historico} onOpenChange={v=>!v&&setHistorico(null)}/>}
 </div>
}
