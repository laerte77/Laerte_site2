import React,{useState,useEffect,useCallback,useMemo}from'react';
import{BarChart2,Printer,Download,FileText,Filter,ChevronDown,ChevronUp}from'lucide-react';
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
 const{user}=useAuth();
 const{toast}=useToast();

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
  const agora=new Date();
  const y=Number(ano);
  const m=Number(mes)-1;

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
    try{
     return isWithinInterval(parseISO(v.data),range);
    }catch{
     return false;
    }
   });
  }

  if(tipo!=='todos')
   lista=lista.filter(v=>v.despesa===tipo);

  const agrupado=lista.reduce((acc,v)=>{
   const descricao=v.despesa||'Sem Descrição';
   acc[descricao]=(acc[descricao]||0)+(Number(v.valor)||0);
   return acc;
  },{});

  return Object.entries(agrupado)
   .map(([descricao,valor])=>({descricao,valor}))
   .sort((a,b)=>b.valor-a.valor);
 },[despesas,intervalo,tipo]);

 const total=dados.reduce((s,v)=>s+v.valor,0);

 const moeda=v=>Number(v||0).toLocaleString('pt-BR',{
  style:'currency',
  currency:'BRL'
 });

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
   styles:{
    fontSize:9,
    textColor:[23,54,93]
   },
   headStyles:{
    fillColor:[18,59,151],
    textColor:[255,255,255]
   },
   columnStyles:{
    1:{halign:'right'}
   }
  });

  const y=(doc.lastAutoTable?.finalY||40)+10;

  doc.setFontSize(11);
  doc.setTextColor(18,59,151);
  doc.text(`TOTAL GERAL: ${moeda(total)}`,196,y,{align:'right'});

  doc.save('Relatorio_Gastos_Acumulados.pdf');
 };

 const excel=()=>{
  const dadosExcel=dados.map(v=>({
   Descricao:v.descricao,
   Valor_Acumulado:v.valor
  }));

  const ws=XLSX.utils.json_to_sheet(dadosExcel);
  const wb=XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb,ws,'Gastos Acumulados');
  XLSX.writeFile(wb,'Relatorio_Gastos_Acumulados.xlsx');
 };

 const anos=useMemo(()=>{
  const lista=[...new Set(despesas.map(v=>new Date(v.data).getFullYear()))];
  if(!lista.includes(Number(ano)))lista.push(Number(ano));
  return lista.sort((a,b)=>b-a);
 },[despesas,ano]);

 return(
  <div className="min-h-full bg-slate-950 p-4 text-slate-100">

   <style>{`
    @media print{
     @page{margin:12mm}
     .no-print{display:none!important}
     .print-only{display:block!important}
     body{background:#fff!important;color:#000!important}
     .print-table{width:100%;border-collapse:collapse;font-size:10px}
     .print-table th{background:#dbeafe!important;color:#123b97!important;padding:6px;border-bottom:2px solid #123b97}
     .print-table td{padding:6px;border-bottom:1px solid #cbd5e1}
    }
    .print-only{display:none}
   `}</style>

   <div className="no-print space-y-6">

    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

     <div className="flex items-center gap-3">
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
       <BarChart2 className="h-6 w-6 text-blue-400"/>
      </div>

      <div>
       <h2 className="text-2xl font-bold text-white">Gastos por Tipo</h2>
       <p className="text-sm text-slate-400">
        Despesas acumuladas agrupadas por tipo.
       </p>
      </div>
     </div>

     <div className="flex flex-wrap gap-2">
      <Button
       variant="outline"
       onClick={excel}
       className="border-slate-700 text-slate-200"
      >
       <Download className="mr-2 h-4 w-4"/>
       Excel
      </Button>

      <Button
       variant="outline"
       onClick={pdf}
       className="border-slate-700 text-slate-200"
      >
       <FileText className="mr-2 h-4 w-4"/>
       PDF
      </Button>

      <Button
       onClick={imprimir}
       className="bg-blue-600 hover:bg-blue-700"
      >
       <Printer className="mr-2 h-4 w-4"/>
       Imprimir
      </Button>
     </div>
    </div>

    <Card className="border-slate-800 bg-slate-900/70">
     <CardHeader className="border-b border-slate-800 pb-3">
      <CardTitle className="flex items-center justify-between text-base text-white">

       <span className="flex items-center">
        <Filter className="mr-2 h-4 w-4 text-blue-400"/>
        Filtros
       </span>

       <Button
        variant="ghost"
        size="sm"
        onClick={()=>setShowFilters(v=>!v)}
        className="h-8 w-8 p-0"
       >
        {showFilters?<ChevronUp/>:<ChevronDown/>}
       </Button>

      </CardTitle>
     </CardHeader>

     {showFilters&&(
      <CardContent className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-4">

       <div>
        <label className="text-xs text-slate-400">Período</label>
        <Select value={periodo} onValueChange={setPeriodo}>
         <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
          <SelectValue/>
         </SelectTrigger>
         <SelectContent>
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
         <label className="text-xs text-slate-400">Mês</label>
         <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
           <SelectValue/>
          </SelectTrigger>
          <SelectContent>
           {Array.from({length:12},(_,i)=>(
            <SelectItem key={i+1} value={String(i+1)}>
             {format(new Date(2023,i,1),'MMMM',{locale:ptBR})}
            </SelectItem>
           ))}
          </SelectContent>
         </Select>
        </div>
       )}

       {(periodo==='mensal'||periodo==='trimestral'||periodo==='anual')&&(
        <div>
         <label className="text-xs text-slate-400">Ano</label>
         <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
           <SelectValue/>
          </SelectTrigger>
          <SelectContent>
           {anos.map(a=>(
            <SelectItem key={a} value={String(a)}>{a}</SelectItem>
           ))}
          </SelectContent>
         </Select>
        </div>
       )}

       {periodo==='personalizado'&&(
        <>
         <div>
          <label className="text-xs text-slate-400">Início</label>
          <Input
           type="date"
           value={inicio}
           onChange={e=>setInicio(e.target.value)}
           className="mt-1 bg-slate-800 border-slate-700"
          />
         </div>

         <div>
          <label className="text-xs text-slate-400">Fim</label>
          <Input
           type="date"
           value={fim}
           onChange={e=>setFim(e.target.value)}
           className="mt-1 bg-slate-800 border-slate-700"
          />
         </div>
        </>
       )}

       <div>
        <label className="text-xs text-slate-400">Tipo de Despesa</label>
        <Select value={tipo} onValueChange={setTipo}>
         <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
          <SelectValue/>
         </SelectTrigger>
         <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          {tipos.map((v,i)=>(
           <SelectItem key={i} value={v.despesa}>
            {v.despesa}
           </SelectItem>
          ))}
         </SelectContent>
        </Select>
       </div>

      </CardContent>
     )}
    </Card>

    <Card className="border-slate-800 bg-slate-900/70">
     <CardContent className="p-0">

      <div className="flex flex-col justify-between gap-2 border-b border-slate-800 p-4 md:flex-row md:items-center">
       <span className="text-sm text-slate-400">
        Tipos encontrados: <b className="text-white">{dados.length}</b>
       </span>

       <span className="text-lg font-bold text-blue-400">
        Total: {moeda(total)}
       </span>
      </div>

      <ScrollArea className="max-h-[55vh]">
       <Table>
        <TableHeader className="bg-slate-800/70">
         <TableRow>
          <TableHead>Descrição / Tipo</TableHead>
          <TableHead className="text-right">Valor Acumulado</TableHead>
         </TableRow>
        </TableHeader>

        <TableBody>
         {loading?(
          <TableRow>
           <TableCell colSpan={2} className="h-24 text-center text-slate-400">
            Carregando...
           </TableCell>
          </TableRow>
         ):dados.length===0?(
          <TableRow>
           <TableCell colSpan={2} className="h-24 text-center text-slate-500">
            Nenhum registro encontrado.
           </TableCell>
          </TableRow>
         ):(
          dados.map((v,i)=>(
           <TableRow key={i}>
            <TableCell className="font-medium text-slate-200">
             {v.descricao}
            </TableCell>
            <TableCell className="text-right font-bold text-blue-400">
             {moeda(v.valor)}
            </TableCell>
           </TableRow>
          ))
         )}
        </TableBody>
       </Table>
      </ScrollArea>

     </CardContent>
    </Card>

   </div>

   <div className="print-only">
    <div className="mb-6 border-b-2 border-blue-900 pb-4 text-center">
     <img
      src={LOGO}
      alt="Logo"
      className="mx-auto mb-2 h-16 w-16 object-contain"
     />

     <h1 className="text-xl font-extrabold uppercase text-blue-900">
      IGREJA ASSEMBLEIA DE DEUS
     </h1>

     <h2 className="mt-2 text-lg font-bold uppercase text-blue-800">
      RELATÓRIO DE GASTOS POR TIPO DE DESPESA
     </h2>
    </div>

    <table className="print-table">
     <thead>
      <tr>
       <th className="text-left">DESCRIÇÃO / TIPO</th>
       <th className="text-right">VALOR ACUMULADO</th>
      </tr>
     </thead>

     <tbody>
      {dados.map((v,i)=>(
       <tr key={i}>
        <td>{v.descricao}</td>
        <td className="text-right font-bold">{moeda(v.valor)}</td>
       </tr>
      ))}
     </tbody>
    </table>

    <div className="mt-6 border-t-2 border-blue-900 pt-4 text-right">
     <strong className="text-lg">
      TOTAL GERAL: {moeda(total)}
     </strong>
    </div>
   </div>

  </div>
 );
}
