import React,{useCallback,useEffect,useState}from'react';
import{Plus,Edit,Trash2,History,Search,UserPlus,Shield,Droplets,Flame}from'lucide-react';
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

const base={
 nome_completo:'',data_nascimento:'',estado_civil:'',data_entrada:'',
 classe_id:'none',cargo_id:'none',funcao_id:'none',
 participa_conjunto:'nao',conjunto_id:'none',
 is_dirigente:'nao',dirige_mais_de_um:'nao',
 conjuntos_dirigidos:[],quantos_conjuntos_dirige:'',
 funcoes_multiplas:'nao',quantas_funcoes:'',
 funcoes_selecionadas:[],is_batizado_aguas:'nao',
 is_batizado_espirito:'nao',status:'ATIVO'
};

export default function CadastroMembros(){
 const{user}=useAuth(),{toast}=useToast();
 const[membros,setMembros]=useState([]),[busca,setBusca]=useState('');
 const[apoio,setApoio]=useState({classes:[],cargos:[],funcoes:[],conjuntos:[]});
 const[loading,setLoading]=useState(true),[open,setOpen]=useState(false);
 const[current,setCurrent]=useState(null),[form,setForm]=useState(base);
 const[historico,setHistorico]=useState(null);

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);
  try{
   const[r,c,f,k,x]=await Promise.all([
    supabase.from('igreja_membros').select('*,cargo:cargos_igreja(nome_cargo),conjunto:igreja_conjuntos(nome_conjunto)'),
    supabase.from('igreja_classes').select('id,nome_classe').order('nome_classe'),
    supabase.from('cargos_igreja').select('id,nome_cargo').order('nome_cargo'),
    supabase.from('igreja_funcoes').select('id,nome_funcao').order('nome_funcao'),
    supabase.from('igreja_conjuntos').select('id,nome_conjunto').order('nome_conjunto')
   ]);
   const err=[r,c,f,k,x].find(v=>v.error)?.error;
   if(err)throw err;
   setMembros(r.data||[]);
   setApoio({
    classes:c.data||[],cargos:f.data||[],
    funcoes:k.data||[],conjuntos:x.data||[]
   });
  }catch(e){
   toast({title:'Erro ao carregar dados',description:e.message,variant:'destructive'});
  }finally{setLoading(false)}
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 const change=(k,v)=>setForm(p=>({...p,[k]:v}));

 const reset=()=>{setForm(base);setCurrent(null)};

 const edit=m=>{
  const ids=Array.isArray(m.dirige_conjuntos_multiplos?.conjuntos_ids)
   ?m.dirige_conjuntos_multiplos.conjuntos_ids
   :(m.dirige_conjunto_id?[m.dirige_conjunto_id]:[]);

  const multi=Array.isArray(m.funcoes_multiplas?.funcoes_ids)
   ?m.funcoes_multiplas.funcoes_ids:[];

  setCurrent(m);
  setForm({
   ...base,
   nome_completo:m.nome_completo||'',
   data_nascimento:m.data_nascimento||'',
   estado_civil:m.estado_civil||'',
   data_entrada:m.data_entrada||'',
   classe_id:m.classe_id||'none',
   cargo_id:m.cargo_id||'none',
   funcao_id:multi[0]||'none',
   funcoes_multiplas:Number(m.funcoes_multiplas?.quantidade)>1?'sim':'nao',
   quantas_funcoes:String(m.funcoes_multiplas?.quantidade||''),
   funcoes_selecionadas:multi,
   participa_conjunto:m.participa_conjunto?'sim':'nao',
   conjunto_id:m.conjunto_id||'none',
   is_dirigente:m.is_dirigente?'sim':'nao',
   dirige_mais_de_um:ids.length>1?'sim':'nao',
   conjuntos_dirigidos:ids,
   quantos_conjuntos_dirige:ids.length>1?String(ids.length):'',
   is_batizado_aguas:m.is_batizado_aguas?'sim':'nao',
   is_batizado_espirito:m.is_batizado_espirito?'sim':'nao',
   status:m.status||'ATIVO'
  });
  setOpen(true);
 };

 const addFunction=q=>{
  const n=Number(q)||0;
  change('quantas_funcoes',q);
  change('funcoes_selecionadas',Array.from({length:n},(_,i)=>form.funcoes_selecionadas[i]||'none'));
 };

 const addConjunto=q=>{
  const n=Number(q)||0;
  change('quantos_conjuntos_dirige',q);
  change('conjuntos_dirigidos',Array.from({length:n},(_,i)=>form.conjuntos_dirigidos[i]||'none'));
 };

 const payload=()=>{
  const funcoes=form.funcoes_multiplas==='sim'
   ?form.funcoes_selecionadas.filter(v=>v!=='none')
   :(form.funcao_id!=='none'?[form.funcao_id]:[]);

  const dirigidos=form.is_dirigente==='sim'
   ?form.conjuntos_dirigidos.filter(v=>v!=='none'):[];

  return{
   nome_completo:form.nome_completo.trim(),
   data_nascimento:form.data_nascimento,
   estado_civil:form.estado_civil,
   data_entrada:form.data_entrada,
   classe_id:form.classe_id==='none'?null:form.classe_id,
   cargo_id:form.cargo_id==='none'?null:form.cargo_id,
   funcoes_multiplas:funcoes.length?{quantidade:funcoes.length,funcoes_ids:funcoes}:null,
   funcoes_exercidas:funcoes.map(id=>apoio.funcoes.find(x=>x.id===id)?.nome_funcao).filter(Boolean).join(', '),
   participa_conjunto:form.participa_conjunto==='sim',
   conjunto_id:form.participa_conjunto==='sim'&&form.conjunto_id!=='none'?form.conjunto_id:null,
   is_dirigente:form.is_dirigente==='sim',
   dirige_conjunto_id:dirigidos[0]||null,
   dirige_conjuntos_multiplos:dirigidos.length?{quantidade:dirigidos.length,conjuntos_ids:dirigidos}:null,
   is_batizado_aguas:form.is_batizado_aguas==='sim',
   is_batizado_espirito:form.is_batizado_espirito==='sim',
   status:form.status,
   user_id:user.id
  };
 };

 const save=async e=>{
  e?.preventDefault();

  if(!form.nome_completo.trim()||!form.data_nascimento||!form.estado_civil||!form.data_entrada||form.cargo_id==='none'){
   toast({title:'Campos obrigatórios',description:'Preencha nome, nascimento, estado civil, data de entrada e cargo.',variant:'destructive'});
   return;
  }

  if(form.funcoes_multiplas==='nao'&&form.funcao_id==='none'){
   toast({title:'Função obrigatória',description:'Selecione a função do membro.',variant:'destructive'});
   return;
  }

  if(form.funcoes_multiplas==='sim'&&(form.funcoes_selecionadas.length<1||form.funcoes_selecionadas.some(v=>v==='none'))){
   toast({title:'Funções incompletas',description:'Selecione todas as funções.',variant:'destructive'});
   return;
  }

  if(form.participa_conjunto==='sim'&&form.conjunto_id==='none'){
   toast({title:'Conjunto obrigatório',description:'Selecione o conjunto.',variant:'destructive'});
   return;
  }

  const data=payload();

  if(form.is_dirigente==='sim'){
   if(!data.dirige_conjunto_id){
    toast({title:'Conjunto do dirigente',description:'Selecione o conjunto dirigido.',variant:'destructive'});
    return;
   }
   if(new Set(form.conjuntos_dirigidos).size!==form.conjuntos_dirigidos.length){
    toast({title:'Conjuntos duplicados',description:'Não repita o mesmo conjunto.',variant:'destructive'});
    return;
   }
  }

  try{
   const query=supabase.from('igreja_membros');
   const r=current
    ?await query.update(data).eq('id',current.id)
    :await query.insert(data);

   if(r.error)throw r.error;

   toast({
    title:'Sucesso',
    description:current?'Membro atualizado com sucesso.':'Membro cadastrado com sucesso.'
   });

   setOpen(false);
   reset();
   load();
  }catch(e){
   toast({title:'Erro ao salvar',description:e.message,variant:'destructive'});
  }
 };

 const remove=async id=>{
  try{
   const{error}=await supabase.from('igreja_membros').delete().eq('id',id);
   if(error)throw error;
   toast({title:'Membro removido',description:'O cadastro foi excluído.'});
   load();
  }catch(e){
   toast({title:'Erro ao excluir',description:e.message,variant:'destructive'});
  }
 };

 const list=membros.filter(m=>{
  const s=busca.toLowerCase();
  return !s||m.nome_completo?.toLowerCase().includes(s)||m.cargo?.nome_cargo?.toLowerCase().includes(s);
 });

 return(
  <div className="dark-igreja space-y-5">
   <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-igreja))]">Secretaria</p>
     <h1 className="text-2xl font-bold md:text-3xl">Membros</h1>
     <p className="mt-1 text-sm text-muted-foreground">Gerencie os membros e suas informações ministeriais.</p>
    </div>

    <Button
     onClick={()=>{reset();setOpen(true)}}
     className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"
    >
     <UserPlus className="mr-2 h-4 w-4"/>Novo Membro
    </Button>
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
     <CardTitle>Membros cadastrados</CardTitle>
     <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
      <Input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar membro..." className="pl-9"/>
     </div>
    </CardHeader>

    <CardContent className="p-0 overflow-x-auto">
     <Table>
      <TableHeader>
       <TableRow>
        <TableHead>Nome</TableHead>
        <TableHead>Cargo</TableHead>
        <TableHead>Batismos</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="text-right">Ações</TableHead>
       </TableRow>
      </TableHeader>

      <TableBody>
       {loading?
        <TableRow><TableCell colSpan={5} className="p-10 text-center">Carregando...</TableCell></TableRow>:
        list.length?
        list.map(m=>(
         <TableRow key={m.id}>
          <TableCell className="font-medium">
           {m.nome_completo}
           {m.is_dirigente&&<Badge className="ml-2 bg-[hsl(var(--neon-igreja)/.12)] text-[hsl(var(--neon-igreja))]">Dirigente</Badge>}
          </TableCell>

          <TableCell>
           <span className="flex items-center gap-1 text-[hsl(var(--neon-igreja))]">
            <Shield className="h-3.5 w-3.5"/>{m.cargo?.nome_cargo||'Sem cargo'}
           </span>
          </TableCell>

          <TableCell>
           <div className="flex gap-1">
            <Badge variant="outline" className={m.is_batizado_aguas?'text-blue-400':'opacity-40'}>
             <Droplets className="mr-1 h-3 w-3"/>Águas
            </Badge>
            <Badge variant="outline" className={m.is_batizado_espirito?'text-orange-400':'opacity-40'}>
             <Flame className="mr-1 h-3 w-3"/>Espírito
            </Badge>
           </div>
          </TableCell>

          <TableCell>
           <Badge className={m.status==='ATIVO'?'bg-green-500/15 text-green-400':'bg-red-500/15 text-red-400'}>
            {m.status}
           </Badge>
          </TableCell>

          <TableCell>
           <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" onClick={()=>setHistorico(m)}><History className="h-4 w-4 text-blue-400"/></Button>
            <Button variant="ghost" size="icon" onClick={()=>edit(m)}><Edit className="h-4 w-4 text-[hsl(var(--neon-igreja))]"/></Button>

            <AlertDialog>
             <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
             </AlertDialogTrigger>
             <AlertDialogContent className="dark-igreja">
              <AlertDialogHeader>
               <AlertDialogTitle>Excluir membro?</AlertDialogTitle>
               <AlertDialogDescription>Deseja excluir {m.nome_completo}?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
               <AlertDialogCancel>Cancelar</AlertDialogCancel>
               <AlertDialogAction onClick={()=>remove(m.id)} className="bg-destructive">Excluir</AlertDialogAction>
              </AlertDialogFooter>
             </AlertDialogContent>
            </AlertDialog>
           </div>
          </TableCell>
         </TableRow>
        )):
        <TableRow><TableCell colSpan={5} className="p-10 text-center text-muted-foreground">Nenhum membro encontrado.</TableCell></TableRow>
       }
      </TableBody>
     </Table>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={open}
    onClose={()=>{setOpen(false);reset()}}
    title={current?'Editar membro':'Novo membro'}
    description="Preencha os dados cadastrais e ministeriais do membro."
    icon={current?Edit:UserPlus}
    theme="gold"
    footer={
     <>
      <Button variant="outline" onClick={()=>{setOpen(false);reset()}}>Cancelar</Button>
      <Button onClick={save} className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]">Salvar</Button>
     </>
    }
   >
    <div className="grid gap-4 md:grid-cols-2">

     <div className="md:col-span-2">
      <Label>Nome completo *</Label>
      <Input value={form.nome_completo} onChange={e=>change('nome_completo',e.target.value)}/>
     </div>

     <div>
      <Label>Data de nascimento *</Label>
      <Input type="date" value={form.data_nascimento} onChange={e=>change('data_nascimento',e.target.value)}/>
     </div>

     <div>
      <Label>Data de entrada *</Label>
      <Input type="date" value={form.data_entrada} onChange={e=>change('data_entrada',e.target.value)}/>
     </div>

     <div>
      <Label>Estado civil *</Label>
      <Select value={form.estado_civil} onValueChange={v=>change('estado_civil',v)}>
       <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent>
        {['SOLTEIRO','CASADO','DIVORCIADO','VIÚVO'].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}
       </SelectContent>
      </Select>
     </div>

     <div>
      <Label>Cargo *</Label>
      <Select value={form.cargo_id} onValueChange={v=>change('cargo_id',v)}>
       <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent>{apoio.cargos.map(x=><SelectItem key={x.id} value={x.id}>{x.nome_cargo}</SelectItem>)}</SelectContent>
      </Select>
     </div>

     <div>
      <Label>Possui múltiplas funções?</Label>
      <Select value={form.funcoes_multiplas} onValueChange={v=>change('funcoes_multiplas',v)}>
       <SelectTrigger><SelectValue/></SelectTrigger>
       <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
      </Select>
     </div>

     {form.funcoes_multiplas==='nao'?
      <div>
       <Label>Função *</Label>
       <Select value={form.funcao_id} onValueChange={v=>change('funcao_id',v)}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent>{apoio.funcoes.map(x=><SelectItem key={x.id} value={x.id}>{x.nome_funcao}</SelectItem>)}</SelectContent>
       </Select>
      </div>:
      <div>
       <Label>Quantidade de funções</Label>
       <Input type="number" min="1" value={form.quantas_funcoes} onChange={e=>addFunction(e.target.value)}/>
      </div>
     }

     {form.funcoes_multiplas==='sim'&&form.funcoes_selecionadas.map((id,i)=>(
      <div key={i}>
       <Label>Função {i+1}</Label>
       <Select value={id} onValueChange={v=>{
        const a=[...form.funcoes_selecionadas];a[i]=v;change('funcoes_selecionadas',a);
       }}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent>{apoio.funcoes.map(x=><SelectItem key={x.id} value={x.id}>{x.nome_funcao}</SelectItem>)}</SelectContent>
       </Select>
      </div>
     ))}

     <div>
      <Label>Participa de conjunto?</Label>
      <Select value={form.participa_conjunto} onValueChange={v=>change('participa_conjunto',v)}>
       <SelectTrigger><SelectValue/></SelectTrigger>
       <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
      </Select>
     </div>

     {form.participa_conjunto==='sim'&&
      <div>
       <Label>Conjunto</Label>
       <Select value={form.conjunto_id} onValueChange={v=>change('conjunto_id',v)}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent>{apoio.conjuntos.map(x=><SelectItem key={x.id} value={x.id}>{x.nome_conjunto}</SelectItem>)}</SelectContent>
       </Select>
      </div>
     }

     <div>
      <Label>É dirigente?</Label>
      <Select value={form.is_dirigente} onValueChange={v=>change('is_dirigente',v)}>
       <SelectTrigger><SelectValue/></SelectTrigger>
       <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
      </Select>
     </div>

     {form.is_dirigente==='sim'&&
      <div>
       <Label>Dirige mais de um conjunto?</Label>
       <Select value={form.dirige_mais_de_um} onValueChange={v=>change('dirige_mais_de_um',v)}>
        <SelectTrigger><SelectValue/></SelectTrigger>
        <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
       </Select>
      </div>
     }

     {form.is_dirigente==='sim'&&form.dirige_mais_de_um==='nao'&&
      <div>
       <Label>Conjunto dirigido</Label>
       <Select value={form.conjuntos_dirigidos[0]||'none'} onValueChange={v=>change('conjuntos_dirigidos',[v])}>
        <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
        <SelectContent>{apoio.conjuntos.map(x=><SelectItem key={x.id} value={x.id}>{x.nome_conjunto}</SelectItem>)}</SelectContent>
       </Select>
      </div>
     }

     {form.is_dirigente==='sim'&&form.dirige_mais_de_um==='sim'&&
      <>
       <div>
        <Label>Quantidade de conjuntos</Label>
        <Input type="number" min="2" value={form.quantos_conjuntos_dirige} onChange={e=>addConjunto(e.target.value)}/>
       </div>

       {form.conjuntos_dirigidos.map((id,i)=>(
        <div key={i}>
         <Label>Conjunto {i+1}</Label>
         <Select value={id} onValueChange={v=>{
          const a=[...form.conjuntos_dirigidos];a[i]=v;change('conjuntos_dirigidos',a);
         }}>
          <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
          <SelectContent>{apoio.conjuntos.map(x=><SelectItem key={x.id} value={x.id}>{x.nome_conjunto}</SelectItem>)}</SelectContent>
         </Select>
        </div>
       ))}
      </>
     }

     <div>
      <Label>Batizado nas águas?</Label>
      <Select value={form.is_batizado_aguas} onValueChange={v=>change('is_batizado_aguas',v)}>
       <SelectTrigger><SelectValue/></SelectTrigger>
       <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
      </Select>
     </div>

     <div>
      <Label>Batizado no Espírito Santo?</Label>
      <Select value={form.is_batizado_espirito} onValueChange={v=>change('is_batizado_espirito',v)}>
       <SelectTrigger><SelectValue/></SelectTrigger>
       <SelectContent><SelectItem value="nao">Não</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
      </Select>
     </div>

     <div>
      <Label>Classe EBD</Label>
      <Select value={form.classe_id} onValueChange={v=>change('classe_id',v)}>
       <SelectTrigger><SelectValue placeholder="Selecione"/></SelectTrigger>
       <SelectContent>{apoio.classes.map(x=><SelectItem key={x.id} value={x.id}>{x.nome_classe}</SelectItem>)}</SelectContent>
      </Select>
     </div>

     <div>
      <Label>Status</Label>
      <Select value={form.status} onValueChange={v=>change('status',v)}>
       <SelectTrigger><SelectValue/></SelectTrigger>
       <SelectContent><SelectItem value="ATIVO">Ativo</SelectItem><SelectItem value="INATIVO">Inativo</SelectItem></SelectContent>
      </Select>
     </div>
    </div>
   </ModalLancamentoPadrao>

   {historico&&(
    <ConsultaHistoricoMembro
     membro={historico}
     open={!!historico}
     onOpenChange={v=>{if(!v)setHistorico(null)}}
    />
   )}
  </div>
 );
}
