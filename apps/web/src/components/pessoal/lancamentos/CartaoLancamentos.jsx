import React,{useState,useEffect,useCallback,useRef,useMemo}from'react';
import{motion}from'framer-motion';
import{Plus,Trash2,Edit,CreditCard,Search,WalletCards,Download,CalendarDays,DollarSign,Receipt,TrendingUp,RotateCcw}from'lucide-react';
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
import{pertenceCompetencia}from'@/lib/cartaoCompetencia';
import{getInstallmentValue}from'@/lib/cartaoParcelas';
import{exportToExcel}from'@/lib/ExportUtils';
import ModalLancamentoPadrao from'@/components/ModalLancamentoPadrao';

const TZ='America/Sao_Paulo';
const RED='hsl(0 84% 60%)';

const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const roundMoney=v=>fromCents(toCents(v));

const moeda=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL'
}).format(roundMoney(v));

const getBRDate=()=>{
 const p=new Intl.DateTimeFormat('en-CA',{
  timeZone:TZ,
  year:'numeric',
  month:'2-digit',
  day:'2-digit'
 }).formatToParts(new Date()),v={};

 p.forEach(x=>{
  if(x.type!=='literal')v[x.type]=x.value;
 });

 return`${v.year}-${v.month}-${v.day}`;
};

const money=v=>{
 const d=String(v??'').replace(/\D/g,'');

 return d
  ?new Intl.NumberFormat('pt-BR',{
    style:'currency',
    currency:'BRL'
   }).format(fromCents(Number(d)))
  :'';
};

const moneyNum=v=>{
 const d=String(v??'').replace(/\D/g,'');
 return d?fromCents(Number(d)):0;
};

const CartaoLancamentos=()=>{
 const{user}=useAuth();
 const{toast}=useToast();
 const mounted=useRef(true);
 const cartoesRef=useRef([]);
 const toastRef=useRef(toast);

 const anoAtual=new Date().getFullYear();

 const[loading,setLoading]=useState(true);
 const[metaReady,setMetaReady]=useState(false);
 const[cartoes,setCartoes]=useState([]);
 const[usuarios,setUsuarios]=useState([]);
 const[tiposDespesa,setTiposDespesa]=useState([]);
 const[lancamentos,setLancamentos]=useState([]);
 const[searchTerm,setSearchTerm]=useState('');
 const[selectedCartao,setSelectedCartao]=useState('todos');
 const[selectedResponsavel,setSelectedResponsavel]=useState('todos');
 const[selectedMonth,setSelectedMonth]=useState(String(new Date().getMonth()));
 const[selectedYear,setSelectedYear]=useState(String(anoAtual));
 const[currentPage,setCurrentPage]=useState(1);

 const[isModalOpen,setIsModalOpen]=useState(false);
 const[editingId,setEditingId]=useState(null);
 const[editingCompraId,setEditingCompraId]=useState(null);

 const[formData,setFormData]=useState(()=>({
  cartao_id:'',
  data:getBRDate(),
  descricao:'',
  valor:'',
  parcelas:1,
  categoria:'',
  responsavel_id:''
 }));

 const pageSize=10;

 useEffect(()=>{
  mounted.current=true;
  return()=>{mounted.current=false};
 },[]);

 useEffect(()=>{
  toastRef.current=toast;
 },[toast]);

 useEffect(()=>{
  cartoesRef.current=cartoes;
 },[cartoes]);

 useEffect(()=>{
  if(!user)return;

  let cancelled=false;

  setMetaReady(false);

  (async()=>{
   const[a,b,c]=await Promise.all([
    supabase
     .from('pessoal_cartoes')
     .select('id,nome,bandeira,dia_fechamento')
     .eq('user_id',user.id)
     .order('nome'),

    supabase
     .from('pessoal_cartao_usuarios')
     .select('id,nome,parentesco')
     .eq('user_id',user.id)
     .order('nome'),

    supabase
     .from('tipos_despesa')
     .select('nome_despesa,categoria')
     .eq('user_id',user.id)
     .order('nome_despesa')
   ]);

   if(cancelled||!mounted.current)return;

   const cards=a.data||[];

   cartoesRef.current=cards;

   setCartoes(cards);
   setUsuarios(b.data||[]);
   setTiposDespesa(c.data||[]);
   setMetaReady(true);
  })();

  return()=>{
   cancelled=true;
  };
 },[user]);

 const fetchLancamentos=useCallback(async()=>{
  if(!user||!metaReady)return;

  setLoading(true);

  const mes=parseInt(selectedMonth,10);
  const ano=parseInt(selectedYear,10);

  const startDate=format(
   new Date(ano,mes,1),
   'yyyy-MM-dd'
  );

  const endDate=format(
   new Date(ano,mes+1,0),
   'yyyy-MM-dd'
  );

  let q=supabase
   .from('pessoal_cartao_lancamentos')
   .select('*')
   .eq('user_id',user.id)
   .gte('data',startDate)
   .lte('data',endDate);

  if(selectedCartao!=='todos'){
   q=q.eq('cartao_id',selectedCartao);
  }

  if(selectedResponsavel!=='todos'){
   q=selectedResponsavel==='sem'
    ?q.is('responsavel_id',null)
    :q.eq('responsavel_id',selectedResponsavel);
  }

  const{data,error}=await q.order('data',{ascending:false});

  if(!mounted.current)return;

  if(error){
   toastRef.current?.({
    title:'Erro',
    description:'Não foi possível carregar os lançamentos.',
    variant:'destructive'
   });

   setLancamentos([]);
  }else{
   const cards=cartoesRef.current;

   setLancamentos((data||[]).filter(l=>{
    const card=cards.find(c=>c.id===l.cartao_id);

    return pertenceCompetencia(
     l.data,
     card?.dia_fechamento||1,
     mes,
     ano
    );
   }));
  }

  setCurrentPage(1);
  setLoading(false);
 },[
  user,
  metaReady,
  selectedMonth,
  selectedYear,
  selectedCartao,
  selectedResponsavel
 ]);

 useEffect(()=>{
  fetchLancamentos();
 },[fetchLancamentos]);

 const filtered=useMemo(()=>{
  const term=searchTerm.trim().toLowerCase();

  if(!term)return lancamentos;

  return lancamentos.filter(x=>
   (x.descricao||'').toLowerCase().includes(term)||
   (x.categoria||'').toLowerCase().includes(term)
  );
 },[searchTerm,lancamentos]);

 useEffect(()=>{
  setCurrentPage(1);
 },[searchTerm]);

 const totalCentavos=useMemo(
  ()=>filtered.reduce(
   (acc,item)=>
    acc+
    toCents(
     getInstallmentValue(
      item.valor,
      item.parcelas,
      item.parcela_atual
     )
    ),
   0
  ),
  [filtered]
 );

 const total=fromCents(totalCentavos);

 const average=filtered.length
  ?fromCents(
    Math.round(totalCentavos/filtered.length)
   )
  :0;

 const biggestCentavos=filtered.length
  ?Math.max(
    ...filtered.map(item=>
     toCents(
      getInstallmentValue(
       item.valor,
       item.parcelas,
       item.parcela_atual
      )
     )
    )
   )
  :0;

 const biggest=fromCents(biggestCentavos);

 const totalPages=Math.max(
  1,
  Math.ceil(filtered.length/pageSize)
 );

 const paginated=filtered.slice(
  (currentPage-1)*pageSize,
  currentPage*pageSize
 );

 const cartaoNome=id=>
  cartoes.find(c=>c.id===id)?.nome||'—';

 const responsavelNome=id=>
  usuarios.find(u=>u.id===id)?.nome||'—';

 const resetForm=useCallback(()=>{
  setFormData({
   cartao_id:cartoesRef.current[0]?.id||'',
   data:getBRDate(),
   descricao:'',
   valor:'',
   parcelas:1,
   categoria:'',
   responsavel_id:''
  });

  setEditingId(null);
  setEditingCompraId(null);
 },[]);

 const closeModal=useCallback(()=>{
  setIsModalOpen(false);
  resetForm();
 },[resetForm]);

 const openDialog=lanc=>{
  if(lanc){
   const pa=lanc.parcela_atual||1;

   let baseDate=parse(
    lanc.data,
    'yyyy-MM-dd',
    new Date()
   );

   if(pa>1){
    baseDate=subMonths(
     baseDate,
     pa-1
    );
   }

   setEditingId(lanc.id);
   setEditingCompraId(lanc.compra_id||null);

   setFormData({
    cartao_id:lanc.cartao_id||'',
    data:format(baseDate,'yyyy-MM-dd'),
    descricao:lanc.descricao||'',
    valor:money(toCents(lanc.valor)),
    parcelas:lanc.parcelas||1,
    categoria:lanc.categoria||'',
    responsavel_id:lanc.responsavel_id||''
   });
  }else{
   setEditingId(null);
   setEditingCompraId(null);

   setFormData({
    cartao_id:cartoesRef.current[0]?.id||'',
    data:getBRDate(),
    descricao:'',
    valor:'',
    parcelas:1,
    categoria:'',
    responsavel_id:''
   });
  }

  setIsModalOpen(true);
 };

 const handleSubmit=async e=>{
  e.preventDefault();

  const valorTotal=roundMoney(
   moneyNum(formData.valor)
  );

  if(
   !formData.cartao_id||
   !formData.descricao||
   valorTotal<=0||
   !formData.data
  ){
   toast({
    title:'Campos obrigatórios',
    description:'Preencha cartão, descrição, valor e data.',
    variant:'destructive'
   });

   return;
  }

  const parcelas=Math.max(
   1,
   parseInt(formData.parcelas,10)||1
  );

  let baseDate;

  try{
   baseDate=parse(
    formData.data,
    'yyyy-MM-dd',
    new Date()
   );
  }catch{
   toast({
    title:'Erro',
    description:'Data inválida.',
    variant:'destructive'
   });

   return;
  }

  const compraId=editingId
   ?(editingCompraId||null)
   :(typeof crypto!=='undefined'&&crypto.randomUUID
     ?crypto.randomUUID()
     :null);

  const rows=Array.from(
   {length:parcelas},
   (_,i)=>({
    user_id:user.id,
    cartao_id:formData.cartao_id,
    data:format(
     addMonths(baseDate,i),
     'yyyy-MM-dd'
    ),
    descricao:formData.descricao,
    valor:valorTotal,
    parcelas,
    parcela_atual:i+1,
    categoria:formData.categoria,
    responsavel_id:formData.responsavel_id||null,
    compra_id:compraId
   })
  );

  try{
   if(editingId){
    let delQ=supabase
     .from('pessoal_cartao_lancamentos')
     .delete()
     .eq('user_id',user.id);

    if(editingCompraId){
     delQ=delQ.eq(
      'compra_id',
      editingCompraId
     );
    }else{
     delQ=delQ.eq(
      'id',
      editingId
     );
    }

    const{error:delErr}=await delQ;

    if(delErr)throw delErr;

    const{error}=await supabase
     .from('pessoal_cartao_lancamentos')
     .insert(rows);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:'Compra atualizada.'
    });
   }else{
    const{error}=await supabase
     .from('pessoal_cartao_lancamentos')
     .insert(rows);

    if(error)throw error;

    toast({
     title:'Sucesso',
     description:
      parcelas>1
       ?`Compra parcelada em ${parcelas}x adicionada.`
       :'Lançamento adicionado.'
    });
   }

   closeModal();
   fetchLancamentos();
  }catch{
   toast({
    title:'Erro',
    description:'Falha ao salvar lançamento.',
    variant:'destructive'
   });
  }
 };

 const handleDelete=async item=>{
  let q=supabase
   .from('pessoal_cartao_lancamentos')
   .delete()
   .eq('user_id',user.id);

  if(item.compra_id){
   q=q.eq(
    'compra_id',
    item.compra_id
   );
  }else{
   q=q.eq(
    'id',
    item.id
   );
  }

  const{error}=await q;

  if(error){
   toast({
    title:'Erro',
    description:'Falha ao remover lançamento.',
    variant:'destructive'
   });
  }else{
   toast({
    title:'Sucesso',
    description:
     item.parcelas>1
      ?'Compra removida (todas as parcelas).'
      :'Lançamento removido.'
   });

   fetchLancamentos();
  }
 };

 const handleExport=()=>{
  if(!filtered.length){
   toast({
    title:'Sem dados',
    description:'Não há lançamentos para exportar.',
    variant:'destructive'
   });

   return;
  }

  exportToExcel(
   filtered.map(item=>({
    Cartão:cartaoNome(item.cartao_id),
    Descrição:item.descricao,
    Responsável:responsavelNome(item.responsavel_id),
    Categoria:item.categoria||'',
    Data:format(
     parse(
      item.data,
      'yyyy-MM-dd',
      new Date()
     ),
     'dd/MM/yyyy',
     {locale:ptBR}
    ),
    Parcela:`${item.parcela_atual}/${item.parcelas}`,
    Valor:roundMoney(
     getInstallmentValue(
      item.valor,
      item.parcelas,
      item.parcela_atual
     )
    )
   })),
   'Lancamentos_Cartao',
   'Cartão'
  );
 };

 const limparFiltros=()=>{
  setSearchTerm('');
  setSelectedCartao('todos');
  setSelectedResponsavel('todos');
  setSelectedMonth(String(new Date().getMonth()));
  setSelectedYear(String(new Date().getFullYear()));
 };

 const statCards=[
  {
   label:'Lançamentos',
   value:filtered.length,
   icon:Receipt
  },
  {
   label:'Total no Período',
   value:moeda(total),
   icon:DollarSign
  },
  {
   label:'Média por Parcela',
   value:moeda(average),
   icon:TrendingUp
  },
  {
   label:'Maior Parcela',
   value:moeda(biggest),
   icon:CalendarDays
  }
 ];

 return(
  <motion.div
   initial={{opacity:0,y:20}}
   animate={{opacity:1,y:0}}
   className="dark-pessoal space-y-5"
  >

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    <div>
     <p className="text-xs font-semibold uppercase tracking-[.2em] text-red-500">
      Finanças Pessoais
     </p>

     <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
      Lançamentos do Cartão
     </h1>

     <p className="text-sm text-muted-foreground">
      Controle das compras e despesas realizadas no cartão.
     </p>
    </div>

    <div className="flex flex-wrap gap-2">

     <Button
      variant="outline"
      onClick={handleExport}
      className="border-border bg-card hover:border-red-500/40 hover:text-red-400"
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      onClick={()=>openDialog()}
      disabled={!cartoes.length}
      className="bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600"
     >
      <Plus className="mr-2 h-4 w-4"/>
      Novo Lançamento
     </Button>

    </div>

   </div>

   {!cartoes.length&&(
    <Card className="border-amber-500/30 bg-amber-500/5">
     <CardContent className="flex items-center gap-2 p-4 text-sm text-amber-400">
      <CreditCard className="h-4 w-4"/>
      Cadastre um cartão antes de lançar despesas.
     </CardContent>
    </Card>
   )}

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {statCards.map(({label,value,icon:Icon})=>(
     <Card key={label} className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-4">
       <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
         {label}
        </p>

        <p className="mt-1 text-xl font-bold text-red-500 tabular-nums">
         {value}
        </p>
       </div>

       <div className="rounded-xl bg-red-500/10 p-2.5 text-red-500">
        <Icon className="h-5 w-5"/>
       </div>
      </CardContent>
     </Card>
    ))}
   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">
     <div className="flex flex-col gap-3 xl:flex-row xl:items-center">

      <div className="relative min-w-0 flex-1">
       <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>

       <Input
        placeholder="Buscar por descrição ou categoria..."
        value={searchTerm}
        onChange={e=>setSearchTerm(e.target.value)}
        className="h-10 bg-input pl-9"
       />
      </div>

      <div className="flex flex-wrap gap-2">
       <Select
        value={selectedCartao}
        onValueChange={setSelectedCartao}
       >
        <SelectTrigger className="h-10 w-[160px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal bg-card">
         <SelectItem value="todos">
          Todos os cartões
         </SelectItem>

         {cartoes.map(c=>(
          <SelectItem key={c.id} value={c.id}>
           {c.nome}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>

       <Select
        value={selectedResponsavel}
        onValueChange={setSelectedResponsavel}
       >
        <SelectTrigger className="h-10 w-[160px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal bg-card">
         <SelectItem value="todos">
          Todas as pessoas
         </SelectItem>

         <SelectItem value="sem">
          Sem responsável
         </SelectItem>

         {usuarios.map(u=>(
          <SelectItem key={u.id} value={u.id}>
           {u.nome}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>

       <Select
        value={selectedMonth}
        onValueChange={setSelectedMonth}
       >
        <SelectTrigger className="h-10 w-[125px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal bg-card">
         {Array.from(
          {length:12},
          (_,i)=>(
           <SelectItem key={i} value={String(i)}>
            {format(
             new Date(2024,i,1),
             'MMMM',
             {locale:ptBR}
            )}
           </SelectItem>
          )
         )}
        </SelectContent>
       </Select>

       <Select
        value={selectedYear}
        onValueChange={setSelectedYear}
       >
        <SelectTrigger className="h-10 w-[95px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal bg-card">
         {Array.from(
          {length:4},
          (_,i)=>{
           const y=anoAtual-2+i;

           return(
            <SelectItem key={y} value={String(y)}>
             {y}
            </SelectItem>
           );
          }
         )}
        </SelectContent>
       </Select>

       <Button
        variant="outline"
        onClick={limparFiltros}
        className="h-10 border-border"
       >
        <RotateCcw className="mr-2 h-4 w-4"/>
        Limpar
       </Button>
      </div>
     </div>
    </CardContent>
   </Card>

   <ModalLancamentoPadrao
    open={isModalOpen}
    onClose={closeModal}
    title={editingId?'Editar Lançamento':'Novo Lançamento'}
    description={
     editingId
      ?'Atualize os dados da compra.'
      :'Preencha os dados da compra no cartão.'
    }
    icon={WalletCards}
    theme="red"
    footer={
     <>
      <Button
       type="button"
       variant="outline"
       onClick={closeModal}
       className="h-11 rounded-xl border-border px-5"
      >
       Cancelar
      </Button>

      <Button
       type="submit"
       form="form-lancamento-cartao"
       className="h-11 rounded-xl px-6 font-semibold text-white hover:opacity-90"
       style={{
        background:RED,
        boxShadow:'0 0 18px hsl(0 84% 60% / .22)'
       }}
      >
       {editingId?'Salvar Alterações':'Salvar Lançamento'}
      </Button>
     </>
    }
   >
    <form
     id="form-lancamento-cartao"
     onSubmit={handleSubmit}
     className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1"
    >
     <div className="space-y-5">

      <div className="space-y-2">
       <Label>Cartão</Label>

       <Select
        value={formData.cartao_id}
        onValueChange={v=>setFormData(p=>({
         ...p,
         cartao_id:v
        }))}
       >
        <SelectTrigger className="h-11 rounded-xl bg-input">
         <SelectValue placeholder="Selecione o cartão"/>
        </SelectTrigger>

        <SelectContent className="dark-pessoal rounded-xl bg-card">
         {cartoes.map(c=>(
          <SelectItem key={c.id} value={c.id}>
           {c.nome}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
       <div className="space-y-2">
        <Label>Data</Label>

        <Input
         type="date"
         value={formData.data}
         onChange={e=>setFormData(p=>({
          ...p,
          data:e.target.value
         }))}
         required
         className="h-11 rounded-xl bg-input"
        />
       </div>

       <div className="space-y-2">
        <Label>Valor</Label>

        <Input
         type="text"
         inputMode="numeric"
         value={formData.valor}
         onChange={e=>setFormData(p=>({
          ...p,
          valor:money(e.target.value)
         }))}
         placeholder="R$ 0,00"
         required
         className="h-11 rounded-xl bg-input font-semibold tabular-nums"
        />
       </div>
      </div>

      <div className="space-y-2">
       <Label>Descrição (Tipo de Despesa)</Label>

       {tiposDespesa.length===0?(
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">
         Nenhum tipo de despesa cadastrado. Cadastre em Cadastros → Tipos de Despesa.
        </p>
       ):(
        <Select
         value={formData.descricao}
         onValueChange={v=>{
          const sel=tiposDespesa.find(
           t=>t.nome_despesa===v
          );

          setFormData(p=>({
           ...p,
           descricao:v,
           categoria:sel?.categoria||''
          }));
         }}
        >
         <SelectTrigger className="h-11 rounded-xl bg-input">
          <SelectValue placeholder="Selecione"/>
         </SelectTrigger>

         <SelectContent className="dark-pessoal rounded-xl bg-card">
          <ScrollArea className="h-48">
           {tiposDespesa.map(t=>(
            <SelectItem
             key={t.nome_despesa}
             value={t.nome_despesa}
            >
             {t.nome_despesa}
            </SelectItem>
           ))}
          </ScrollArea>
         </SelectContent>
        </Select>
       )}
      </div>

      <div className="space-y-2">
       <Label>Responsável pela Compra</Label>

       {usuarios.length===0?(
        <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm italic text-amber-400">
         Nenhuma pessoa cadastrada. Cadastre em Cadastros → Pessoas do Cartão.
        </p>
       ):(
        <Select
         value={formData.responsavel_id||'nenhum'}
         onValueChange={v=>setFormData(p=>({
          ...p,
          responsavel_id:v==='nenhum'?'':v
         }))}
        >
         <SelectTrigger className="h-11 rounded-xl bg-input">
          <SelectValue placeholder="Selecione o responsável"/>
         </SelectTrigger>

         <SelectContent className="dark-pessoal bg-card">
          <SelectItem value="nenhum">
           — Sem responsável —
          </SelectItem>

          {usuarios.map(u=>(
           <SelectItem key={u.id} value={u.id}>
            {u.nome}
           </SelectItem>
          ))}
         </SelectContent>
        </Select>
       )}
      </div>

      <div className="space-y-2">
       <Label>Categoria</Label>

       <Input
        value={formData.categoria}
        onChange={e=>setFormData(p=>({
         ...p,
         categoria:e.target.value
        }))}
        placeholder="Ex: Alimentação"
        className="h-11 rounded-xl bg-input"
       />
      </div>

      <div className="space-y-2">
       <Label>Parcelas</Label>

       <Input
        type="number"
        min="1"
        value={formData.parcelas}
        onChange={e=>setFormData(p=>({
         ...p,
         parcelas:e.target.value
        }))}
        className="h-11 rounded-xl bg-input"
       />

       <p className="text-xs text-muted-foreground">
        A compra será dividida em parcelas mensais e cada parcela cairá na fatura correspondente.
       </p>
      </div>

     </div>
    </form>
   </ModalLancamentoPadrao>

   <Card className="border-border bg-card">
    <CardContent className="p-0">
     <ScrollArea className="h-[500px]">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Cartão</TableHead>
         <TableHead>Descrição</TableHead>
         <TableHead>Responsável</TableHead>
         <TableHead>Categoria</TableHead>
         <TableHead>Data</TableHead>
         <TableHead>Parcelas</TableHead>
         <TableHead className="text-right">Valor</TableHead>
         <TableHead className="text-center">Ações</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow>
          <TableCell
           colSpan={8}
           className="py-12 text-center text-muted-foreground"
          >
           Carregando lançamentos...
          </TableCell>
         </TableRow>
        ):paginated.length===0?(
         <TableRow>
          <TableCell colSpan={8} className="py-12 text-center">
           <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <CreditCard className="h-8 w-8 opacity-40"/>
            <span>Nenhum lançamento encontrado.</span>
           </div>
          </TableCell>
         </TableRow>
        ):(
         paginated.map(item=>(
          <TableRow
           key={item.id}
           className="transition-colors hover:bg-muted/40"
          >
           <TableCell className="p-4 text-sm font-medium">
            {cartaoNome(item.cartao_id)}
           </TableCell>

           <TableCell className="p-4">
            <span className="font-medium">
             {item.descricao}
            </span>
           </TableCell>

           <TableCell className="p-4">
            {item.responsavel_id?(
             <Badge
              variant="outline"
              className="border-border bg-muted/30"
             >
              {responsavelNome(item.responsavel_id)}
             </Badge>
            ):(
             <span className="italic text-muted-foreground">
              —
             </span>
            )}
           </TableCell>

           <TableCell className="p-4">
            {item.categoria?(
             <Badge
              variant="outline"
              className="border-border bg-muted/30"
             >
              {item.categoria}
             </Badge>
            ):(
             <span className="italic text-muted-foreground">
              —
             </span>
            )}
           </TableCell>

           <TableCell className="p-4 text-sm text-muted-foreground">
            {format(
             parse(
              item.data,
              'yyyy-MM-dd',
              new Date()
             ),
             'dd/MM/yyyy',
             {locale:ptBR}
            )}
           </TableCell>

           <TableCell className="p-4 text-sm text-muted-foreground">
            {item.parcela_atual}/{item.parcelas}
           </TableCell>

           <TableCell className="p-4 text-right font-bold text-red-500 tabular-nums">
            {moeda(
             getInstallmentValue(
              item.valor,
              item.parcelas,
              item.parcela_atual
             )
            )}
           </TableCell>

           <TableCell className="p-4">
            <div className="flex justify-center gap-1">
             <Button
              variant="ghost"
              size="icon"
              onClick={()=>openDialog(item)}
              className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
             >
              <Edit className="h-4 w-4"/>
             </Button>

             <Button
              variant="ghost"
              size="icon"
              onClick={()=>handleDelete(item)}
              className="text-red-500 hover:bg-red-500/10"
             >
              <Trash2 className="h-4 w-4"/>
             </Button>
            </div>
           </TableCell>
          </TableRow>
         ))
        )}
       </TableBody>
      </Table>
     </ScrollArea>

     {!loading&&filtered.length>0&&(
      <div className="flex flex-col gap-2 border-t border-border px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
       <span>
        Mostrando {((currentPage-1)*pageSize)+1}–
        {Math.min(currentPage*pageSize,filtered.length)}
        {' '}de {filtered.length}
       </span>

       <div className="flex items-center gap-1">
        <Button
         variant="outline"
         size="sm"
         disabled={currentPage===1}
         onClick={()=>setCurrentPage(p=>Math.max(1,p-1))}
         className="h-8"
        >
         Anterior
        </Button>

        <span className="px-2 text-xs">
         {currentPage} / {totalPages}
        </span>

        <Button
         variant="outline"
         size="sm"
         disabled={currentPage===totalPages}
         onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))}
         className="h-8"
        >
         Próxima
        </Button>
       </div>
      </div>
     )}
    </CardContent>
   </Card>

  </motion.div>
 );
};

export default CartaoLancamentos;
