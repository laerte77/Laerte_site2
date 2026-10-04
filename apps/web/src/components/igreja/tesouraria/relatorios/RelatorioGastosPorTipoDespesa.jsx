import React,{useState,useEffect,useCallback,useMemo}from'react';
import{BarChart3,Printer,Download,FileText,Filter,ChevronDown,ChevronUp,RefreshCw}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Input}from'@/components/ui/input';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{useToast}from'@/components/ui/use-toast';
import{format,startOfWeek,endOfWeek,startOfMonth,endOfMonth,startOfQuarter,endOfQuarter,startOfYear,endOfYear,isWithinInterval,parseISO}from'date-fns';
import{ptBR}from'date-fns/locale';
import*as XLSX from'xlsx';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';

const LOGO='https://horizons-cdn.hostinger.com/23ae9372-1ce3-488a-9be5-00d3fa6b6d54/7cf23b48356b9b94cb24959b2cce5390.png';

const base64=url=>new Promise(resolve=>{
 const img=new Image();
 img.crossOrigin='Anonymous';
 img.src=url;
 img.onload=()=>{
  const c=document.createElement('canvas');
  c.width=img.width;
  c.height=img.height;
  c.getContext('2d').drawImage(img,0,0);
  resolve(c.toDataURL('image/png'));
 };
 img.onerror=()=>resolve(null);
});

export default function RelatorioGastosPorTipoDespesa(){
 const{user}=useAuth(),{toast}=useToast();
 const[despesas,setDespesas]=useState([]);
 const[tipos,setTipos]=useState([]);
 const[loading,setLoading]=useState(true);
 const[showFilters,setShowFilters]=useState(true);

 const[periodo,setPeriodo]=useState('mensal');
 const[mes,setMes]=useState(String(new Date().getMonth()+1));
 const[ano,setAno]=useState(String(new Date().getFullYear()));
 const[tipo,setTipo]=useState('todos');
 const[inicio,setInicio]=useState('');
 const[fim,setFim]=useState('');

 const carregar=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const[t,x]=await Promise.all([
    supabase.from('igreja_tipos_despesa').select('despesa').order('despesa'),
    supabase.from('igreja_despesas').select('*').order('data',{ascending:false})
   ]);

   if(t.error)throw t.error;
   if(x.error)throw x.error;

   setTipos(t.data||[]);
   setDespesas(x.data||[]);
  }catch(e){
   toast({
    title:'Erro ao buscar dados',
    description:e.message,
    variant:'destructive'
   });
  }finally{
   setLoading(false);
  }
 },[user,toast]);

 useEffect(()=>{carregar()},[carregar]);

 const intervalo=useCallback(()=>{
  const agora=new Date(),y=Number(ano),m=Number(mes)-1;

  if(periodo==='semanal')
   return{start:startOfWeek(agora),end:endOfWeek(agora)};

  if(periodo==='mensal'){
   const d=new Date(y,m,1);
   return{start:startOfMonth(d),end:endOfMonth(d)};
  }

  if(periodo==='trimestral'){
   const d=new Date(y,m,1);
   return{start:startOfQuarter(d),end:endOfQuarter(d)};
  }

  if(periodo==='anual'){
   const d=new Date(y,0,1);
   return{start:startOfYear(d),end:endOfYear(d)};
  }

  if(periodo==='personalizado'&&inicio&&fim)
   return{
    start:new Date(`${inicio}T00:00:00`),
    end:new Date(`${fim}T23:59:59`)
   };

  return null;
 },[periodo,mes,ano,inicio,fim]);

 const dados=useMemo(()=>{
  const range=intervalo();
  let lista=despesas;

  if(range){
   lista=lista.filter(v=>{
    try{return isWithinInterval(parseISO(v.data),range)}
    catch{return false}
   });
  }

  if(tipo!=='todos')
   lista=lista.filter(v=>v.despesa===tipo);

  const agrupado=lista.reduce((acc,v)=>{
   const d=v.despesa||'Sem Descrição';
   acc[d]=(acc[d]||0)+(Number(v.valor)||0);
   return acc;
  },{});

  return Object.entries(agrupado)
   .map(([descricao,valor])=>({descricao,valor}))
   .sort((a,b)=>b.valor-a.valor);
 },[despesas,intervalo,tipo]);

 const total=dados.reduce((s,v)=>s+v.valor,0);

 const moeda=v=>Number(v||0).toLocaleString(
  'pt-BR',
  {style:'currency',currency:'BRL'}
 );

 const imprimir=()=>window.print();

 const pdf=async()=>{
  const doc=new jsPDF();
  const logo=await base64(LOGO);

  if(logo)doc.addImage(logo,'PNG',15,12,22,22);

  doc.setTextColor(18,59,151);
  doc.setFontSize(14);
  doc.text('IGREJA ASSEMBLEIA DE DEUS',105,20,{align:'center'});

  doc.setFontSize(11);
  doc.text('RELATÓRIO DE GASTOS POR TIPO DE DESPESA',105,28,{align:'center'});

  autoTable(doc,{
   head:[['Descrição / Tipo','Valor Acumulado']],
   body:dados.map(v=>[v.descricao,moeda(v.valor)]),
   startY:40,
   styles:{fontSize:9,textColor:[23,54,93]},
   headStyles:{fillColor:[18,59,151],textColor:[255,255,255]},
   columnStyles:{1:{halign:'right'}}
  });

  const y=(doc.lastAutoTable?.finalY||40)+10;

  doc.setFontSize(11);
  doc.setTextColor(18,59,151);
  doc.text(`TOTAL GERAL: ${moeda(total)}`,196,y,{align:'right'});

  doc.save('Relatorio_Gastos_Acumulados.pdf');
 };

 const excel=()=>{
  const ws=XLSX.utils.json_to_sheet(
   dados.map(v=>({
    Descricao:v.descricao,
    Valor_Acumulado:v.valor
   }))
  );

  const wb=XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
   wb,
   ws,
   'Gastos Acumulados'
  );

  XLSX.writeFile(
   wb,
   'Relatorio_Gastos_Acumulados.xlsx'
  );
 };

 const anos=useMemo(()=>{
  const lista=[
   ...new Set(
    despesas.map(v=>new Date(v.data).getFullYear())
   )
  ];

  if(!lista.includes(Number(ano)))
   lista.push(Number(ano));

  return lista.sort((a,b)=>b-a);
 },[despesas,ano]);

 return(
  <div className="space-y-6 animate-in fade-in duration-500 theme-igreja">

   <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

    <div className="flex items-center gap-3">

     <div className="p-3 rounded-xl bg-[hsl(var(--neon-igreja))]/10 glow-igreja">
      <BarChart3 className="w-6 h-6 text-[hsl(var(--neon-igreja))]"/>
     </div>

     <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
       Relatórios • Tesouraria
      </p>

      <h1 className="text-2xl font-bold">
       Gastos por Tipo
      </h1>

      <p className="text-sm text-muted-foreground">
       Despesas acumuladas agrupadas por tipo.
      </p>
     </div>

    </div>

    <div className="flex flex-wrap gap-2">

     <Button
      variant="outline"
      onClick={carregar}
      disabled={loading}
     >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>
      Atualizar
     </Button>

     <Button
      variant="outline"
      onClick={excel}
      className="border-emerald-500/50 text-emerald-500"
     >
      <Download className="mr-2 h-4 w-4"/>
      Excel
     </Button>

     <Button
      variant="outline"
      onClick={pdf}
      className="border-[hsl(var(--neon-igreja))]/50"
     >
      <FileText className="mr-2 h-4 w-4"/>
      PDF
     </Button>

     <Button
      onClick={imprimir}
      className="bg-[hsl(var(--neon-igreja))] text-[hsl(var(--background))]"
     >
      <Printer className="mr-2 h-4 w-4"/>
      Imprimir
     </Button>

    </div>
   </div>

   <Card className="bg-card border-border/60">

    <CardHeader className="border-b border-border/60">
     <CardTitle className="flex items-center justify-between">

      <span className="flex items-center">
       <Filter className="mr-2 h-5 w-5"/>
       Filtros
      </span>

      <Button
       variant="ghost"
       size="icon"
       onClick={()=>setShowFilters(v=>!v)}
      >
       {showFilters
        ?<ChevronUp className="h-4 w-4"/>
        :<ChevronDown className="h-4 w-4"/>
       }
      </Button>

     </CardTitle>
    </CardHeader>

    {showFilters&&(
     <CardContent className="grid grid-cols-1 gap-4 pt-5 md:grid-cols-4">

      <div>
       <label className="text-sm font-medium">
        Período
       </label>

       <Select
        value={periodo}
        onValueChange={setPeriodo}
       >
        <SelectTrigger className="bg-input mt-2">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-igreja">
         <SelectItem value="semanal">Semanal</SelectItem>
         <SelectItem value="mensal">Mensal</SelectItem>
         <SelectItem value="trimestral">Trimestral</SelectItem>
         <SelectItem value="anual">Anual</SelectItem>
         <SelectItem value="personalizado">Personalizado</SelectItem>
        </SelectContent>
       </Select>
      </div>

      {(periodo==='mensal'||periodo==='trimestral')&&(
       <div>
        <label className="text-sm font-medium">
         Mês
        </label>

        <Select value={mes} onValueChange={setMes}>
         <SelectTrigger className="bg-input mt-2">
          <SelectValue/>
         </SelectTrigger>

         <SelectContent className="dark-igreja">
          {Array.from({length:12},(_,i)=>(
           <SelectItem key={i+1} value={String(i+1)}>
            {format(
             new Date(2023,i,1),
             'MMMM',
             {locale:ptBR}
            )}
           </SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>
      )}

      {(periodo==='mensal'||periodo==='trimestral'||periodo==='anual')&&(
       <div>
        <label className="text-sm font-medium">
         Ano
        </label>

        <Select value={ano} onValueChange={setAno}>
         <SelectTrigger className="bg-input mt-2">
          <SelectValue/>
         </SelectTrigger>

         <SelectContent className="dark-igreja">
          {anos.map(a=>(
           <SelectItem key={a} value={String(a)}>
            {a}
           </SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>
      )}

      {periodo==='personalizado'&&(
       <>
        <div>
         <label className="text-sm font-medium">
          Data de Início
         </label>

         <Input
          type="date"
          value={inicio}
          onChange={e=>setInicio(e.target.value)}
          className="bg-input mt-2"
         />
        </div>

        <div>
         <label className="text-sm font-medium">
          Data de Fim
         </label>

         <Input
          type="date"
          value={fim}
          onChange={e=>setFim(e.target.value)}
          className="bg-input mt-2"
         />
        </div>
       </>
      )}

      <div>
       <label className="text-sm font-medium">
        Tipo de Despesa
       </label>

       <Select value={tipo} onValueChange={setTipo}>
        <SelectTrigger className="bg-input mt-2">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent className="dark-igreja">
         <SelectItem value="todos">
          Todos
         </SelectItem>

         {tipos.map((v,i)=>(
          <SelectItem
           key={i}
           value={v.despesa}
          >
           {v.despesa}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

     </CardContent>
    )}

   </Card>

   <div className="grid gap-4 md:grid-cols-3">

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm text-muted-foreground">
       Tipos encontrados
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p
       className="text-2xl font-bold"
       style={{color:'hsl(var(--neon-igreja))'}}
      >
       {dados.length}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm text-muted-foreground">
       Total de despesas
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p className="text-2xl font-bold text-red-400">
       {moeda(total)}
      </p>
     </CardContent>
    </Card>

    <Card className="border-border bg-card">
     <CardHeader className="pb-2">
      <CardTitle className="text-sm text-muted-foreground">
       Situação
      </CardTitle>
     </CardHeader>

     <CardContent>
      <p className="text-2xl font-bold text-emerald-400">
       Consolidado
      </p>
     </CardContent>
    </Card>

   </div>

   <Card className="bg-card border-border/60 overflow-hidden">

    <CardHeader className="border-b border-border/60">
     <CardTitle className="text-lg">
      Gastos acumulados por tipo
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">

     <div className="responsive-table-wrapper">

      <Table>

       <TableHeader className="bg-muted/50">
        <TableRow>
         <TableHead>
          Descrição / Tipo
         </TableHead>

         <TableHead className="text-right">
          Valor Acumulado
         </TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>

        {loading?(
         <TableRow>
          <TableCell
           colSpan={2}
           className="h-24 text-center text-muted-foreground"
          >
           Carregando...
          </TableCell>
         </TableRow>
        ):dados.length===0?(
         <TableRow>
          <TableCell
           colSpan={2}
           className="h-24 text-center text-muted-foreground"
          >
           Nenhum registro encontrado.
          </TableCell>
         </TableRow>
        ):(
         dados.map((v,i)=>(
          <TableRow
           key={i}
           className="hover:bg-[hsl(var(--neon-igreja)/.04)]"
          >
           <TableCell className="font-medium">
            {v.descricao}
           </TableCell>

           <TableCell className="text-right font-bold text-red-400">
            {moeda(v.valor)}
           </TableCell>
          </TableRow>
         ))
        )}

       </TableBody>

      </Table>

     </div>

    </CardContent>
   </Card>

   <div className="hidden print:block">

    <div className="mb-6 border-b-2 border-yellow-500 pb-4 text-center">
     <img
      src={LOGO}
      alt="Logo"
      className="mx-auto mb-2 h-16 w-16 object-contain"
     />

     <h1 className="text-xl font-extrabold uppercase">
      IGREJA ASSEMBLEIA DE DEUS
     </h1>

     <h2 className="mt-2 text-lg font-bold uppercase">
      RELATÓRIO DE GASTOS POR TIPO DE DESPESA
     </h2>
    </div>

    <table className="w-full border-collapse text-sm">

     <thead>
      <tr className="border-b-2 border-yellow-500">
       <th className="p-2 text-left">
        DESCRIÇÃO / TIPO
       </th>

       <th className="p-2 text-right">
        VALOR ACUMULADO
       </th>
      </tr>
     </thead>

     <tbody>
      {dados.map((v,i)=>(
       <tr
        key={i}
        className="border-b"
       >
        <td className="p-2">
         {v.descricao}
        </td>

        <td className="p-2 text-right font-bold">
         {moeda(v.valor)}
        </td>
       </tr>
      ))}
     </tbody>

    </table>

    <div className="mt-6 border-t-2 border-yellow-500 pt-4 text-right">
     <strong className="text-lg">
      TOTAL GERAL: {moeda(total)}
     </strong>
    </div>

   </div>

  </div>
 );
}
