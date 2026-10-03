import React,{useState,useEffect,useMemo,useCallback}from'react';
import{BarChart,ArrowDownCircle,DollarSign,Calendar,Filter,FileDown,Printer,Eye,BookOpen,Gift}from'lucide-react';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Button}from'@/components/ui/button';
import{DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger}from'@/components/ui/dropdown-menu';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{ResponsiveContainer,Bar as RechartsBar,XAxis,YAxis,Tooltip,Legend,ComposedChart}from'recharts';
import{useToast}from'@/components/ui/use-toast';

const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const anos=Array.from({length:5},(_,i)=>new Date().getFullYear()-i);
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

const TooltipCustom=({active,payload,label})=>{
 if(!active||!payload?.length)return null;
 const entradas=payload.find(p=>p.dataKey==='entradas')?.value||0;
 const despesas=payload.find(p=>p.dataKey==='despesas')?.value||0;
 return(
  <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
   <p className="mb-2 font-bold text-white">{label}</p>
   <p className="text-green-400">Entradas: {money(entradas)}</p>
   <p className="text-red-400">Despesas: {money(despesas)}</p>
  </div>
 );
};

export default function RelatorioFluxoCaixa(){
 const{user}=useAuth();
 const{toast}=useToast();
 const[entradas,setEntradas]=useState([]);
 const[despesas,setDespesas]=useState([]);
 const[loading,setLoading]=useState(true);
 const[filterType,setFilterType]=useState('anual');
 const[filters,setFilters]=useState({
  year:new Date().getFullYear(),
  month:'all',
  startDate:`${new Date().getFullYear()}-01-01`,
  endDate:new Date().toISOString().split('T')[0]
 });

 const load=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  const[e,x]=await Promise.all([
   supabase.from('igreja_entradas').select('data,valor,tipo_entrada'),
   supabase.from('igreja_despesas').select('data,valor')
  ]);

  if(e.error)toast({title:'Erro ao carregar entradas',description:e.error.message,variant:'destructive'});
  if(x.error)toast({title:'Erro ao carregar despesas',description:x.error.message,variant:'destructive'});

  setEntradas(e.data||[]);
  setDespesas(x.data||[]);
  setLoading(false);
 },[user,toast]);

 useEffect(()=>{load()},[load]);

 const change=(key,value)=>setFilters(p=>({...p,[key]:value}));

 const dados=useMemo(()=>{
  let fe=[],fd=[],titulo='';
  const{year,month,startDate,endDate}=filters;

  if(filterType==='anual'){
   let ini=new Date(Date.UTC(year,0,1));
   let fim=new Date(Date.UTC(year,11,31,23,59,59));

   if(month!=='all'){
    ini=new Date(Date.UTC(year,Number(month),1));
    fim=new Date(Date.UTC(year,Number(month)+1,0,23,59,59));
    titulo=`${meses[Number(month)]}/${year}`;
   }else titulo=`Ano de ${year}`;

   fe=entradas.filter(v=>{
    const d=new Date(v.data);
    return d>=ini&&d<=fim;
   });

   fd=despesas.filter(v=>{
    const d=new Date(v.data);
    return d>=ini&&d<=fim;
   });
  }

  if(filterType==='periodo'){
   const ini=new Date(`${startDate}T00:00:00Z`);
   const fim=new Date(`${endDate}T23:59:59Z`);

   fe=entradas.filter(v=>new Date(v.data)>=ini&&new Date(v.data)<=fim);
   fd=despesas.filter(v=>new Date(v.data)>=ini&&new Date(v.data)<=fim);

   titulo=`${ini.toLocaleDateString('pt-BR',{timeZone:'UTC'})} a ${fim.toLocaleDateString('pt-BR',{timeZone:'UTC'})}`;
  }

  return{fe,fd,titulo};
 },[entradas,despesas,filters,filterType]);

 const grafico=useMemo(()=>{
  if(filterType==='anual'&&filters.month==='all'){
   const data=meses.map(m=>({name:m.substring(0,3),entradas:0,despesas:0}));

   dados.fe.forEach(v=>{
    data[new Date(v.data).getUTCMonth()].entradas+=Number(v.valor)||0;
   });

   dados.fd.forEach(v=>{
    data[new Date(v.data).getUTCMonth()].despesas+=Number(v.valor)||0;
   });

   return data;
  }

  const mapa={};

  [...dados.fe,...dados.fd].forEach(v=>{
   const chave=new Date(v.data).toLocaleDateString('pt-BR',{timeZone:'UTC'});
   if(!mapa[chave])mapa[chave]={name:chave,entradas:0,despesas:0};
  });

  dados.fe.forEach(v=>{
   const chave=new Date(v.data).toLocaleDateString('pt-BR',{timeZone:'UTC'});
   mapa[chave].entradas+=Number(v.valor)||0;
  });

  dados.fd.forEach(v=>{
   const chave=new Date(v.data).toLocaleDateString('pt-BR',{timeZone:'UTC'});
   mapa[chave].despesas+=Number(v.valor)||0;
  });

  return Object.values(mapa).sort((a,b)=>{
   const da=a.name.split('/').reverse().join('-');
   const db=b.name.split('/').reverse().join('-');
   return new Date(da)-new Date(db);
  });
 },[dados,filterType,filters.month]);

 const resumo=useMemo(()=>{
  const tipos=dados.fe.reduce((a,v)=>{
   const tipo=v.tipo_entrada||'Outros';
   a[tipo]=(a[tipo]||0)+(Number(v.valor)||0);
   return a;
  },{});

  const despesasPeriodo=dados.fd.reduce((s,v)=>s+(Number(v.valor)||0),0);
  const geralEntrada=entradas.reduce((s,v)=>s+(Number(v.valor)||0),0);
  const geralDespesa=despesas.reduce((s,v)=>s+(Number(v.valor)||0),0);

  return{
   ...tipos,
   despesasPeriodo,
   saldoGeral:geralEntrada-geralDespesa
  };
 },[dados,entradas,despesas]);

 const url=()=>{
  let q=`?filterType=${filterType}`;

  if(filterType==='anual')
   q+=`&year=${filters.year}&month=${filters.month}`;
  else
   q+=`&startDate=${filters.startDate}&endDate=${filters.endDate}`;

  return`/igreja/relatorios/fluxo-caixa-pdf${q}`;
 };

 const visualizar=()=>{
  window.open(url(),'_blank');
 };

 const imprimir=()=>{
  const w=window.open(`${url()}&print=true`,'_blank');
  if(w)w.focus();
 };

 return(
  <div className="min-h-full space-y-6 bg-slate-950 p-4 text-slate-100">

   <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
    <div className="flex items-center gap-3">
     <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
      <BarChart className="h-6 w-6 text-blue-400"/>
     </div>
     <div>
      <h2 className="text-2xl font-bold text-white">Fluxo de Caixa</h2>
      <p className="text-sm text-slate-400">Comparativo entre entradas e despesas.</p>
     </div>
    </div>

    <DropdownMenu>
     <DropdownMenuTrigger asChild>
      <Button className="border border-blue-500/40 bg-blue-600 hover:bg-blue-700">
       <FileDown className="mr-2 h-4 w-4"/>
       Gerar Relatório
      </Button>
     </DropdownMenuTrigger>

     <DropdownMenuContent>
      <DropdownMenuItem onClick={visualizar}>
       <Eye className="mr-2 h-4 w-4"/>
       Visualizar Relatório
      </DropdownMenuItem>
      <DropdownMenuItem onClick={imprimir}>
       <Printer className="mr-2 h-4 w-4"/>
       Imprimir Relatório
      </DropdownMenuItem>
     </DropdownMenuContent>
    </DropdownMenu>
   </div>

   <Card className="border-slate-800 bg-slate-900/70">
    <CardHeader>
     <CardTitle className="flex items-center text-white">
      <Filter className="mr-2 h-5 w-5 text-blue-400"/>
      Filtros
     </CardTitle>
    </CardHeader>

    <CardContent className="space-y-4">
     <Select value={filterType} onValueChange={setFilterType}>
      <SelectTrigger className="bg-slate-800 border-slate-700 md:w-72">
       <SelectValue/>
      </SelectTrigger>
      <SelectContent>
       <SelectItem value="anual">Por Ano / Mês</SelectItem>
       <SelectItem value="periodo">Por Período</SelectItem>
      </SelectContent>
     </Select>

     {filterType==='anual'&&(
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
       <Select value={String(filters.year)} onValueChange={v=>change('year',Number(v))}>
        <SelectTrigger className="bg-slate-800 border-slate-700">
         <Calendar className="mr-2 h-4 w-4"/>
         <SelectValue/>
        </SelectTrigger>
        <SelectContent>
         {anos.map(a=><SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
        </SelectContent>
       </Select>

       <Select value={String(filters.month)} onValueChange={v=>change('month',v)}>
        <SelectTrigger className="bg-slate-800 border-slate-700">
         <Calendar className="mr-2 h-4 w-4"/>
         <SelectValue/>
        </SelectTrigger>
        <SelectContent>
         <SelectItem value="all">Todos os Meses</SelectItem>
         {meses.map((m,i)=><SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
        </SelectContent>
       </Select>
      </div>
     )}

     {filterType==='periodo'&&(
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
       <div>
        <Label>Data de Início</Label>
        <Input
         type="date"
         value={filters.startDate}
         onChange={e=>change('startDate',e.target.value)}
         className="mt-1 bg-slate-800 border-slate-700"
        />
       </div>

       <div>
        <Label>Data de Fim</Label>
        <Input
         type="date"
         value={filters.endDate}
         onChange={e=>change('endDate',e.target.value)}
         className="mt-1 bg-slate-800 border-slate-700"
        />
       </div>
      </div>
     )}
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

    <Card className="border-l-4 border-l-green-500 border-slate-800 bg-slate-900">
     <CardHeader className="flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm text-slate-400">Total Dízimos</CardTitle>
      <BookOpen className="h-5 w-5 text-green-400"/>
     </CardHeader>
     <CardContent>
      <div className="text-2xl font-bold text-white">{money(resumo['DÍZIMO']||resumo['Dizimo']||0)}</div>
      <p className="text-xs text-slate-500">{dados.titulo}</p>
     </CardContent>
    </Card>

    <Card className="border-l-4 border-l-emerald-500 border-slate-800 bg-slate-900">
     <CardHeader className="flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm text-slate-400">Total Ofertas</CardTitle>
      <Gift className="h-5 w-5 text-emerald-400"/>
     </CardHeader>
     <CardContent>
      <div className="text-2xl font-bold text-white">{money(resumo['OFERTA']||resumo['Oferta']||0)}</div>
      <p className="text-xs text-slate-500">{dados.titulo}</p>
     </CardContent>
    </Card>

    <Card className="border-l-4 border-l-red-500 border-slate-800 bg-slate-900">
     <CardHeader className="flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm text-slate-400">Total Despesas</CardTitle>
      <ArrowDownCircle className="h-5 w-5 text-red-400"/>
     </CardHeader>
     <CardContent>
      <div className="text-2xl font-bold text-white">{money(resumo.despesasPeriodo)}</div>
      <p className="text-xs text-slate-500">{dados.titulo}</p>
     </CardContent>
    </Card>

    <Card className={`border-l-4 border-slate-800 bg-slate-900 ${resumo.saldoGeral<0?'border-l-red-500':'border-l-blue-500'}`}>
     <CardHeader className="flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm text-slate-400">Saldo Geral</CardTitle>
      <DollarSign className={`h-5 w-5 ${resumo.saldoGeral<0?'text-red-400':'text-blue-400'}`}/>
     </CardHeader>
     <CardContent>
      <div className={`text-2xl font-bold ${resumo.saldoGeral<0?'text-red-400':'text-blue-400'}`}>
       {money(resumo.saldoGeral)}
      </div>
      <p className="text-xs text-slate-500">Saldo de todo o período</p>
     </CardContent>
    </Card>

   </div>

   <Card className="border-slate-800 bg-slate-900/70">
    <CardHeader>
     <CardTitle className="flex items-center text-white">
      <BarChart className="mr-2 h-5 w-5 text-blue-400"/>
      Entradas x Despesas
     </CardTitle>
    </CardHeader>

    <CardContent>
     {loading?
      <div className="p-8 text-center text-slate-400">Carregando gráfico...</div>:
      <ResponsiveContainer width="100%" height={400}>
       <ComposedChart data={grafico}>
        <XAxis dataKey="name" stroke="#94a3b8"/>
        <YAxis stroke="#94a3b8" tickFormatter={v=>`R$${(v/1000).toLocaleString('pt-BR')}k`}/>
        <Tooltip content={<TooltipCustom/>}/>
        <Legend/>
        <RechartsBar dataKey="entradas" name="Entradas" fill="#22C55E" radius={[4,4,0,0]}/>
        <RechartsBar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4,4,0,0]}/>
       </ComposedChart>
      </ResponsiveContainer>
     }
    </CardContent>
   </Card>

  </div>
 );
}
