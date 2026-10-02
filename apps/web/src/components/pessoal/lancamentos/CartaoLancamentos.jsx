import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Trash2,Edit,CreditCard,Search,WalletCards}from'lucide-react';
import{format,parse,addMonths,subMonths}from'date-fns';
import{ptBR}from'date-fns/locale';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{ScrollArea}from'@/components/ui/scroll-area';
import{useToast}from'@/components/ui/use-toast';
import{Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter}from'@/components/ui/dialog';
import{pertenceCompetencia}from'@/lib/cartaoCompetencia';
import{getInstallmentValue}from'@/lib/cartaoParcelas';

const TZ='America/Sao_Paulo',RED='hsl(0 84% 60%)';
const moeda=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),v={};
 p.forEach(x=>{if(x.type!=='literal')v[x.type]=x.value});
 return`${v.year}-${v.month}-${v.day}`;
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d)/100):'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?Number(d)/100:0;
};

const CartaoLancamentos=()=>{
 const{user}=useAuth(),{toast}=useToast(),mounted=useRef(true),cartoesRef=useRef([]),toastRef=useRef(toast);
 const[loading,setLoading]=useState(true),[metaReady,setMetaReady]=useState(false),[cartoes,setCartoes]=useState([]),[usuarios,setUsuarios]=useState([]),[tiposDespesa,setTiposDespesa]=useState([]),[lancamentos,setLancamentos]=useState([]);
 const[searchTerm,setSearchTerm]=useState(''),[selectedCartao,setSelectedCartao]=useState('todos'),[selectedResponsavel,setSelectedResponsavel]=useState('todos'),[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth())),[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[isModalOpen,setIsModalOpen]=useState(false),[editingId,setEditingId]=useState(null),[editingCompraId,setEditingCompraId]=useState(null);
 const initialForm=()=>({cartao_id:cartoesRef.current[0]?.id||'',data:getBRDate(),descricao:'',valor:'',parcelas:1,categoria:'',responsavel_id:''});
 const[formData,setFormData]=useState(initialForm);

 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[]);
 useEffect(()=>{toastRef.current=toast},[toast]);
 useEffect(()=>{cartoesRef.current=cartoes},[cartoes]);

 useEffect(()=>{
  if(!user)return;
  let cancelled=false;
  setMetaReady(false);
  (async()=>{
   const[a,b,c]=await Promise.all([
    supabase.from('pessoal_cartoes').select('id,nome,bandeira,dia_fechamento').eq('user_id',user.id).order('nome'),
    supabase.from('pessoal_cartao_usuarios').select('id,nome,parentesco').eq('user_id',user.id).order('nome'),
    supabase.from('tipos_despesa').select('nome_despesa,categoria').eq('user_id',user.id).order('nome_despesa')
   ]);
   if(cancelled||!mounted.current)return;
   const cards=a.data||[];
   cartoesRef.current=cards;
   setCartoes(cards);
   setUsuarios(b.data||[]);
   setTiposDespesa(c.data||[]);
   setMetaReady(true);
  })();
  return()=>{cancelled=true};
 },[user]);

 const fetchLancamentos=useCallback(async()=>{
  if(!user||!metaReady)return;
  setLoading(true);
  const mes=parseInt(selectedMonth,10),ano=parseInt(selectedYear,10);
  const startDate=format(new Date(ano,mes-1,1),'yyyy-MM-dd');
  const endDate=format(new Date(ano,mes+1,0),'yyyy-MM-dd');
  let q=supabase.from('pessoal_cartao_lancamentos').select('*').eq('user_id',user.id).gte('data',startDate).lte('data',endDate);
  if(selectedCartao!=='todos')q=q.eq('cartao_id',selectedCartao);
  if(selectedResponsavel!=='todos')q=selectedResponsavel==='sem'?q.is('responsavel_id',null):q.eq('responsavel_id',selectedResponsavel);
  const{data,error}=await q.order('data',{ascending:false});
  if(!mounted.current)return;
  if(error){
   toastRef.current?.({title:'Erro',description:'Não foi possível carregar os lançamentos.',variant:'destructive'});
   setLancamentos([]);
  }else{
   const cards=cartoesRef.current;
   setLancamentos((data||[]).filter(l=>{
    const card=cards.find(c=>c.id===l.cartao_id);
    return pertenceCompetencia(l.data,card?.dia_fechamento||1,mes,ano);
   }));
  }
  setLoading(false);
 },[user,metaReady,selectedMonth,selectedYear,selectedCartao,selectedResponsavel]);

 useEffect(()=>{fetchLancamentos()},[fetchLancamentos]);

 const filtered=useMemo(()=>{
  const term=searchTerm.toLowerCase();
  return term?lancamentos.filter(x=>(x.descricao||'').toLowerCase().includes(term)||(x.categoria||'').toLowerCase().includes(term)):lancamentos;
 },[searchTerm,lancamentos]);

 const cartaoNome=id=>cartoes.find(c=>c.id===id)?.nome||'—';
 const responsavelNome=id=>usuarios.find(u=>u.id===id)?.nome||'—';

 const resetForm=useCallback(()=>{setFormData({cartao_id:'',data:getBRDate(),descricao:'',valor:'',parcelas:1,categoria:'',responsavel_id:''});setEditingId(null);setEditingCompraId(null)},[]);
 const closeModal=useCallback(()=>{setIsModalOpen(false);resetForm()},[resetForm]);

 const openDialog=lanc=>{
  if(lanc){
   const pa=lanc.parcela_atual||1;
   let baseDate=parse(lanc.data,'yyyy-MM-dd',new Date());
   if(pa>1)baseDate=subMonths(baseDate,pa-1);
   setEditingId(lanc.id);
   setEditingCompraId(lanc.compra_id||null);
   setFormData({
    cartao_id:lanc.cartao_id||'',
    data:format(baseDate,'yyyy-MM-dd'),
    descricao:lanc.descricao||'',
    valor:money(Number(lanc.valor||0)*100),
    parcelas:lanc.parcelas||1,
    categoria:lanc.categoria||'',
    responsavel_id:lanc.responsavel_id||''
   });
  }else{
   setEditingId(null);
   setEditingCompraId(null);
   setFormData(initialForm());
  }
  setIsModalOpen(true);
 };

 const handleSubmit=async e=>{
  e.preventDefault();
  const valorTotal=moneyNum(formData.valor);

  if(!formData.cartao_id||!formData.descricao||valorTotal<=0||!formData.data){
   toast({title:'Campos obrigatórios',description:'Preencha cartão, descrição, valor e data.',variant:'destructive'});
   return;
  }

  const parcelas=Math.max(1,parseInt(formData.parcelas,10)||1);
  let baseDate;

  try{baseDate=parse(formData.data,'yyyy-MM-dd',new Date())}
  catch{
   toast({title:'Erro',description:'Data inválida.',variant:'destructive'});
   return;
  }

  const compraId=editingId?(editingCompraId||null):(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():null);

  const rows=Array.from({length:parcelas},(_,i)=>({
   user_id:user.id,
   cartao_id:formData.cartao_id,
   data:format(addMonths(baseDate,i),'yyyy-MM-dd'),
   descricao:formData.descricao,
   valor:valorTotal,
   parcelas,
   parcela_atual:i+1,
   categoria:formData.categoria,
   responsavel_id:formData.responsavel_id||null,
   compra_id:compraId
  }));

  try{
   if(editingId){
    let delQ=supabase.from('pessoal_cartao_lancamentos').delete().eq('user_id',user.id);
    if(editingCompraId)delQ=delQ.eq('compra_id',editingCompraId);
    else delQ=delQ.eq('id',editingId);
    const{error:delErr}=await delQ;
    if(delErr)throw delErr;

    const{error}=await supabase.from('pessoal_cartao_lancamentos').insert(rows);
    if(error)throw error;

    toast({title:'Sucesso',description:'Compra atualizada.'});
   }else{
    const{error}=await supabase.from('pessoal_cartao_lancamentos').insert(rows);
    if(error)throw error;

    toast({title:'Sucesso',description:parcelas>1?`Compra parcelada em ${parcelas}x adicionada.`:'Lançamento adicionado.'});
   }

   resetForm();
   fetchLancamentos();
  }catch(err){
   toast({title:'Erro',description:'Falha ao salvar lançamento.',variant:'destructive'});
  }
 };

 const handleDelete=async item=>{
  let q=supabase.from('pessoal_cartao_lancamentos').delete().eq('user_id',user.id);
  if(item.compra_id)q=q.eq('compra_id',item.compra_id);
  else q=q.eq('id',item.id);
  const{error}=await q;
  if(error)toast({title:'Erro',description:'Falha ao remover lançamento.',variant:'destructive'});
  else{
   toast({title:'Sucesso',description:item.parcelas>1?'Compra removida (todas as parcelas).':'Lançamento removido.'});
   fetchLancamentos();
  }
 };

 const total=filtered.reduce((acc,c)=>acc+getInstallmentValue(c.valor,c.parcelas,c.parcela_atual),0);
 const formatDate=d=>{if(!d)return'-';try{return format(parse(d,'yyyy-MM-dd',new Date()),'dd/MM/yyyy',{locale:ptBR})}catch{return d}};

 return(
  <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="dark-pessoal space-y-6">
   <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">Finanças Pessoais</p>
     <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">Lançamentos do Cartão</h1>
     <p className="text-muted-foreground">Compras e despesas no cartão de crédito.</p>
    </div>
    <Button className="bg-[hsl(var(--neon-pessoal))] text-white hover:bg-[hsl(var(--neon-pessoal)/.88)]" onClick={()=>openDialog()} disabled={cartoes.length===0}>
     <Plus className="mr-2 h-4 w-4"/>Novo Lançamento
    </Button>
   </div>

   {cartoes.length===0&&(
    <Card className="border-amber-500/30 bg-amber-500/5">
     <CardContent className="flex items-center gap-2 p-4 text-sm text-amber-400"><CreditCard className="h-4 w-4"/>Cadastre um cartão antes de lançar despesas.</CardContent>
    </Card>
   )}

   <Dialog open={isModalOpen} onOpenChange={v=>v?setIsModalOpen(true):closeModal()}>
    <DialogContent
     onInteractOutside={e=>e.preventDefault()}
     onPointerDownOutside={e=>e.preventDefault()}
     onEscapeKeyDown={e=>e.preventDefault()}
     className="dark-pessoal w-[calc(100%-2rem)] max-w-[680px] overflow-hidden rounded-2xl border-0 bg-[hsl(var(--card-bg))] p-0 text-foreground shadow-[0_24px_80px_rgba(0,0,0,.58)]"
     style={{border:'1px solid hsl(0 84% 60% / .28)'}}
    >
     <DialogHeader className="px-6 py-5 pr-14" style={{borderBottom:'1px solid hsl(0 84% 60% / .15)',background:'hsl(0 84% 60% / .045)'}}>
      <div className="flex items-center gap-3">
       <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{border:'1px solid hsl(0 84% 60% / .24)',background:'hsl(0 84% 60% / .10)'}}>
        <WalletCards className="h-5 w-5" style={{color:RED}}/>
       </div>
       <div>
        <DialogTitle className="text-xl font-bold">{editingId?'Editar Lançamento':'Novo Lançamento'}</DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted-foreground">{editingId?'Atualize os dados da compra.':'Preencha os dados da compra no cartão.'}</DialogDescription>
       </div>
      </div>
     </DialogHeader>

     <form onSubmit={handleSubmit} className="max-h-[calc(100vh-180px)] overflow-y-auto">
      <div className="space-y-5 px-6 py-6">
       <div className="space-y-2">
        <Label>Cartão</Label>
        <Select value={formData.cartao_id} onValueChange={v=>setFormData(p=>({...p,cartao_id:v}))}>
         <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione o cartão"/></SelectTrigger>
         <SelectContent className="dark-pessoal rounded-xl bg-card">{cartoes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
        </Select>
       </div>

       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
         <Label>Data</Label>
         <Input type="date" name="data" value={formData.data} onChange={e=>setFormData(p=>({...p,data:e.target.value}))} required className="h-11 rounded-xl bg-input"/>
        </div>

        <div className="space-y-2">
         <Label>Valor</Label>
         <Input type="text" inputMode="numeric" value={formData.valor} onChange={e=>setFormData(p=>({...p,valor:money(e.target.value)}))} placeholder="R$ 0,00" required className="h-11 rounded-xl bg-input font-semibold tabular-nums"/>
        </div>
       </div>

       <div className="space-y-2">
        <Label>Descrição (Tipo de Despesa)</Label>
        {tiposDespesa.length===0?
         <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">Nenhum tipo de despesa cadastrado. Cadastre em Cadastros → Tipos de Despesa.</p>:
         <Select value={formData.descricao} onValueChange={v=>{const sel=tiposDespesa.find(t=>t.nome_despesa===v);setFormData(p=>({...p,descricao:v,categoria:sel?.categoria||''}))}}>
          <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione"/></SelectTrigger>
          <SelectContent className="dark-pessoal rounded-xl bg-card"><ScrollArea className="h-48">{tiposDespesa.map(t=><SelectItem key={t.nome_despesa} value={t.nome_despesa}>{t.nome_despesa}</SelectItem>)}</ScrollArea></SelectContent>
         </Select>
        }
       </div>

       <div className="space-y-2">
        <Label>Responsável pela Compra</Label>
        {usuarios.length===0?
         <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">Nenhuma pessoa cadastrada. Cadastre em Cadastros → Pessoas do Cartão.</p>:
         <Select value={formData.responsavel_id||'nenhum'} onValueChange={v=>setFormData(p=>({...p,responsavel_id:v==='nenhum'?'':v}))}>
          <SelectTrigger className="h-11 rounded-xl bg-input"><SelectValue placeholder="Selecione o responsável"/></SelectTrigger>
          <SelectContent className="dark-pessoal rounded-xl bg-card">
           <SelectItem value="nenhum">— Sem responsável —</SelectItem>
           {usuarios.map(u=><SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
          </SelectContent>
         </Select>
        }
       </div>

       <div className="space-y-2">
        <Label>Categoria</Label>
        <Input value={formData.categoria} onChange={e=>setFormData(p=>({...p,categoria:e.target.value}))} placeholder="Ex: Alimentação" className="h-11 rounded-xl bg-input"/>
       </div>

       <div className="space-y-2">
        <Label>Parcelas</Label>
        <Input type="number" min="1" value={formData.parcelas} onChange={e=>setFormData(p=>({...p,parcelas:e.target.value}))} className="h-11 rounded-xl bg-input"/>
        <p className="text-xs text-muted-foreground">A compra será dividida em parcelas mensais e cada parcela cairá na fatura do mês correspondente.</p>
       </div>
      </div>

      <DialogFooter className="border-t border-border/70 bg-background/20 px-6 py-4">
       <Button type="button" variant="outline" onClick={closeModal} className="h-10 rounded-xl border-border px-5">Cancelar</Button>
       <Button type="submit" className="h-10 rounded-xl px-6 font-semibold text-white hover:opacity-90" style={{background:RED,boxShadow:'0 0 18px hsl(0 84% 60% / .22)'}}>{editingId?'Salvar Alterações':'Salvar Lançamento'}</Button>
      </DialogFooter>
     </form>
    </DialogContent>
   </Dialog>

   <div className="grid gap-4 md:grid-cols-4">
    <Card className="col-span-1 border-border md:col-span-3">
     <CardContent className="flex flex-col items-center gap-4 p-4 md:flex-row">
      <div className="flex w-full flex-1 items-center gap-2"><Search className="h-4 w-4 text-muted-foreground"/><Input placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="flex-1 bg-input"/></div>
      <div className="flex w-full flex-wrap gap-2 md:w-auto">
       <Select value={selectedCartao} onValueChange={setSelectedCartao}><SelectTrigger className="w-[160px] bg-input"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal bg-card"><SelectItem value="todos">Todos os cartões</SelectItem>{cartoes.map(c=><SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select>
       <Select value={selectedResponsavel} onValueChange={setSelectedResponsavel}><SelectTrigger className="w-[160px] bg-input"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal bg-card"><SelectItem value="todos">Todas as pessoas</SelectItem><SelectItem value="sem">Sem responsável</SelectItem>{usuarios.map(u=><SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent></Select>
       <Select value={selectedMonth} onValueChange={setSelectedMonth}><SelectTrigger className="w-[130px] bg-input"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal bg-card">{Array.from({length:12},(_,i)=><SelectItem key={i} value={String(i)}>{format(new Date(2024,i,1),'MMMM',{locale:ptBR})}</SelectItem>)}</SelectContent></Select>
       <Select value={selectedYear} onValueChange={setSelectedYear}><SelectTrigger className="w-[100px] bg-input"><SelectValue/></SelectTrigger><SelectContent className="dark-pessoal bg-card">{[2024,2025,2026].map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select>
      </div>
     </CardContent>
    </Card>

    <Card className="border-red-200/20 bg-gradient-to-br from-red-500/10 to-red-400/10">
     <CardContent className="p-4">
      <p className="text-sm font-medium text-red-500">Total no Período</p>
      <p className="text-2xl font-bold text-red-500">{moeda(total)}</p>
     </CardContent>
    </Card>
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader><TableRow><TableHead>Cartão</TableHead><TableHead>Descrição</TableHead><TableHead>Responsável</TableHead><TableHead>Categoria</TableHead><TableHead>Data</TableHead><TableHead>Parcelas</TableHead><TableHead className="text-right">Valor/Parcela</TableHead><TableHead className="text-center">Ações</TableHead></TableRow></TableHeader>
       <TableBody>
        {loading?
         <TableRow><TableCell colSpan={8} className="py-8 text-center">Carregando...</TableCell></TableRow>:
        filtered.length===0?
         <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhum lançamento encontrado.</TableCell></TableRow>:
        filtered.map(item=><TableRow key={item.id} className="transition-colors hover:bg-muted/50">
         <TableCell className="p-4 text-sm text-muted-foreground">{cartaoNome(item.cartao_id)}</TableCell>
         <TableCell className="p-4 font-medium">{item.descricao}</TableCell>
         <TableCell className="p-4 text-sm">{item.responsavel_id?<Badge variant="outline" className="border-indigo-500/20 bg-indigo-500/10 text-indigo-400">{responsavelNome(item.responsavel_id)}</Badge>:<span className="italic text-muted-foreground">—</span>}</TableCell>
         <TableCell className="p-4">{item.categoria?<Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-400">{item.categoria}</Badge>:<span className="italic text-muted-foreground">—</span>}</TableCell>
         <TableCell className="p-4 text-sm">{formatDate(item.data)}</TableCell>
         <TableCell className="p-4 text-sm text-muted-foreground">{item.parcela_atual}/{item.parcelas}</TableCell>
         <TableCell className="p-4 text-right font-bold text-red-500">{moeda(getInstallmentValue(item.valor,item.parcelas,item.parcela_atual))}</TableCell>
         <TableCell className="p-4 text-center">
          <div className="flex items-center justify-center gap-2">
           <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-500/10" onClick={()=>openDialog(item)}><Edit className="h-4 w-4"/></Button>
           <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={()=>handleDelete(item)}><Trash2 className="h-4 w-4"/></Button>
          </div>
         </TableCell>
        </TableRow>)
        }
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>
  </motion.div>
 );
};

export default CartaoLancamentos;
