import React,{useMemo,useState}from'react';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableFooter,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Button}from'@/components/ui/button';
import{Badge}from'@/components/ui/badge';
import{formatCurrency}from'@/lib/utils';
import{AlertCircle,RefreshCw,CheckCircle2,Clock,AlertTriangle,Download,Receipt,DollarSign,TrendingUp,CalendarDays,RotateCcw}from'lucide-react';
import{format,parseISO}from'date-fns';
import{useContasMesData}from'@/hooks/useContasMesData';
import CategoryIcon from'@/components/pessoal/lancamentos/CategoryIcon';
import StatusChangeModal from'@/components/StatusChangeModal';
import LoadingSkeleton from'@/components/ui/LoadingSkeleton';
import{exportToExcel}from'@/lib/ExportUtils';

const BLUE='hsl(var(--neon-pessoal))';

const MONTHS=[
 {value:1,label:'Janeiro'},
 {value:2,label:'Fevereiro'},
 {value:3,label:'Março'},
 {value:4,label:'Abril'},
 {value:5,label:'Maio'},
 {value:6,label:'Junho'},
 {value:7,label:'Julho'},
 {value:8,label:'Agosto'},
 {value:9,label:'Setembro'},
 {value:10,label:'Outubro'},
 {value:11,label:'Novembro'},
 {value:12,label:'Dezembro'}
];

export default function ContasMes(){
 const{user}=useAuth();
 const currentDate=new Date();

 const[selectedMonth,setSelectedMonth]=useState(currentDate.getMonth()+1);
 const[selectedYear,setSelectedYear]=useState(currentDate.getFullYear());
 const[selectedCategory,setSelectedCategory]=useState('Todas');
 const[selectedStatus,setSelectedStatus]=useState('Todos');
 const[selectedExpense,setSelectedExpense]=useState(null);
 const[isModalOpen,setIsModalOpen]=useState(false);

 const{
  contasMes,
  loading,
  error,
  refetch
 }=useContasMesData(
  user?.id,
  selectedMonth,
  selectedYear
 );

 const years=useMemo(()=>{
  const current=new Date().getFullYear();
  return[current-2,current-1,current,current+1,current+2];
 },[]);

 const categories=useMemo(()=>{
  const unique=[
   ...new Set(
    contasMes
     .map(item=>item.categoria)
     .filter(Boolean)
   )
  ];

  return['Todas',...unique];
 },[contasMes]);

 const filteredData=useMemo(()=>{
  return contasMes.filter(item=>{
   const matchCategory=
    selectedCategory==='Todas'||
    item.categoria===selectedCategory;

   const matchStatus=
    selectedStatus==='Todos'||
    item.status===selectedStatus;

   return matchCategory&&matchStatus;
  });
 },[contasMes,selectedCategory,selectedStatus]);

 const subtotals=useMemo(()=>(
  filteredData.reduce(
   (acc,item)=>({
    previsto:acc.previsto+Number(item.valor_previsto||0),
    real:acc.real+Number(item.valor_real||0),
    diferenca:acc.diferenca+Number(item.diferenca||0)
   }),
   {previsto:0,real:0,diferenca:0}
  )
 ),[filteredData]);

 const pendentes=filteredData.filter(
  item=>item.status==='Pendente'||item.status==='Atrasado'
 ).length;

 const getStatusBadge=(status,item)=>{
  let content;

  switch(status){
   case'Pago':
    content=(
     <Badge className="bg-[hsl(var(--status-pago))] text-white">
      <CheckCircle2 className="mr-1 h-3 w-3"/>
      Pago
     </Badge>
    );
    break;

   case'Pago Parcialmente':
    content=(
     <Badge className="bg-[hsl(var(--status-parcial))] text-white">
      <AlertTriangle className="mr-1 h-3 w-3"/>
      Parcial
     </Badge>
    );
    break;

   case'Atrasado':
    content=(
     <Badge className="bg-[hsl(var(--status-atrasado))] text-white">
      <AlertCircle className="mr-1 h-3 w-3"/>
      Atrasado
     </Badge>
    );
    break;

   default:
    content=(
     <Badge className="bg-[hsl(var(--status-pendente))] text-white">
      <Clock className="mr-1 h-3 w-3"/>
      Pendente
     </Badge>
    );
  }

  return(
   <div className="flex flex-col items-center gap-1">
    {content}

    {item.origem!=='cartao'&&(
     <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs"
      onClick={()=>{
       setSelectedExpense(item);
       setIsModalOpen(true);
      }}
     >
      Mudar Status
     </Button>
    )}
   </div>
  );
 };

 const handleExport=()=>{
  if(!filteredData.length)return;

  exportToExcel(
   filteredData.map(item=>({
    'Data Vencimento':format(
     parseISO(item.data_vencimento),
     'dd/MM/yyyy'
    ),
    'Descrição':item.descricao,
    'Categoria':item.categoria||'',
    'Valor Previsto':Number(item.valor_previsto||0),
    'Valor Real':Number(item.valor_real||0),
    'Diferença':Number(item.diferenca||0),
    'Status':item.status
   })),
   `Contas_${selectedMonth}_${selectedYear}`,
   'Contas do Mês'
  );
 };

 const limparFiltros=()=>{
  setSelectedCategory('Todas');
  setSelectedStatus('Todos');
 };

 const stats=[
  {
   label:'Contas',
   value:filteredData.length,
   icon:Receipt
  },
  {
   label:'Total Previsto',
   value:formatCurrency(subtotals.previsto),
   icon:CalendarDays
  },
  {
   label:'Total Real',
   value:formatCurrency(subtotals.real),
   icon:DollarSign
  },
  {
   label:'Pendentes',
   value:pendentes,
   icon:TrendingUp
  }
 ];

 return(
  <div className="dark-pessoal space-y-5">

   <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

    <div>
     <p
      className="text-xs font-semibold uppercase tracking-[.2em]"
      style={{color:BLUE}}
     >
      Consultas
     </p>

     <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
      Contas do Mês
     </h1>

     <p className="text-sm text-muted-foreground">
      Acompanhe as despesas, pagamentos e pendências do período.
     </p>
    </div>

    <div className="flex flex-wrap gap-2">

     <Button
      variant="outline"
      onClick={handleExport}
      disabled={!filteredData.length}
      className="border-border hover:bg-blue-500/10"
      style={{color:BLUE}}
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      variant="outline"
      onClick={refetch}
      disabled={loading}
      className="border-border"
     >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>
      Atualizar
     </Button>

    </div>
   </div>

   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

    {stats.map(({label,value,icon:Icon})=>(
     <Card key={label} className="border-border bg-card">

      <CardContent className="flex items-center justify-between p-4">

       <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
         {label}
        </p>

        <p
         className="mt-1 text-xl font-bold tabular-nums"
         style={{color:BLUE}}
        >
         {value}
        </p>
       </div>

       <div className="rounded-xl bg-blue-500/10 p-2.5" style={{color:BLUE}}>
        <Icon className="h-5 w-5"/>
       </div>

      </CardContent>
     </Card>
    ))}

   </div>

   <Card className="border-border bg-card">
    <CardContent className="p-4">

     <div className="flex flex-col gap-3 xl:flex-row xl:items-end">

      <div className="space-y-1.5">
       <label className="text-xs font-medium text-muted-foreground">
        Mês
       </label>

       <Select
        value={String(selectedMonth)}
        onValueChange={value=>setSelectedMonth(Number(value))}
       >
        <SelectTrigger className="h-10 w-[140px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         {MONTHS.map(month=>(
          <SelectItem
           key={month.value}
           value={String(month.value)}
          >
           {month.label}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-1.5">
       <label className="text-xs font-medium text-muted-foreground">
        Ano
       </label>

       <Select
        value={String(selectedYear)}
        onValueChange={value=>setSelectedYear(Number(value))}
       >
        <SelectTrigger className="h-10 w-[110px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         {years.map(year=>(
          <SelectItem key={year} value={String(year)}>
           {year}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-1.5">
       <label className="text-xs font-medium text-muted-foreground">
        Categoria
       </label>

       <Select
        value={selectedCategory}
        onValueChange={setSelectedCategory}
       >
        <SelectTrigger className="h-10 w-[200px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         {categories.map(category=>(
          <SelectItem
           key={category}
           value={category}
          >
           {category}
          </SelectItem>
         ))}
        </SelectContent>
       </Select>
      </div>

      <div className="space-y-1.5">
       <label className="text-xs font-medium text-muted-foreground">
        Status
       </label>

       <Select
        value={selectedStatus}
        onValueChange={setSelectedStatus}
       >
        <SelectTrigger className="h-10 w-[180px] bg-input">
         <SelectValue/>
        </SelectTrigger>

        <SelectContent>
         <SelectItem value="Todos">Todos os status</SelectItem>
         <SelectItem value="Pago">Pago</SelectItem>
         <SelectItem value="Pago Parcialmente">Pago parcialmente</SelectItem>
         <SelectItem value="Pendente">Pendente</SelectItem>
         <SelectItem value="Atrasado">Atrasado</SelectItem>
        </SelectContent>
       </Select>
      </div>

      <Button
       variant="outline"
       onClick={limparFiltros}
       className="h-10"
      >
       <RotateCcw className="mr-2 h-4 w-4"/>
       Limpar
      </Button>

     </div>

    </CardContent>
   </Card>

   {error?(
    <Card className="border-red-500/20 bg-red-500/5">
     <CardContent className="flex flex-col items-center gap-3 p-8 text-center">

      <AlertCircle className="h-8 w-8 text-red-500"/>

      <div>
       <p className="font-semibold">
        Erro ao carregar as contas
       </p>

       <p className="mt-1 text-sm text-muted-foreground">
        {error}
       </p>
      </div>

      <Button
       variant="outline"
       onClick={refetch}
      >
       Tentar novamente
      </Button>

     </CardContent>
    </Card>
   ):(
    <Card className="border-border bg-card">

     <CardContent className="p-0">

      {loading?(
       <div className="p-6">
        <LoadingSkeleton count={6} height="h-12"/>
       </div>
      ):(
       <div className="overflow-x-auto">

        <Table>

         <TableHeader className="bg-secondary/30">
          <TableRow>

           <TableHead>Vencimento</TableHead>
           <TableHead>Descrição</TableHead>
           <TableHead>Categoria</TableHead>
           <TableHead className="text-right">Previsto</TableHead>
           <TableHead className="text-right">Real</TableHead>
           <TableHead className="text-right">Diferença</TableHead>
           <TableHead className="text-center">Status</TableHead>

          </TableRow>
         </TableHeader>

         <TableBody>

          {!filteredData.length?(
           <TableRow>
            <TableCell
             colSpan={7}
             className="py-14 text-center text-muted-foreground"
            >
             Nenhuma conta encontrada para os filtros selecionados.
            </TableCell>
           </TableRow>
          ):(
           filteredData.map(item=>(
            <TableRow
             key={item.id}
             className="transition-colors hover:bg-muted/40"
            >

             <TableCell className="whitespace-nowrap font-medium">
              {format(
               parseISO(item.data_vencimento),
               'dd/MM/yyyy'
              )}
             </TableCell>

             <TableCell>
              <div className="flex items-center gap-2">
               <CategoryIcon
                category={item.categoria}
                className="h-4 w-4"
                style={{color:BLUE}}
               />
               <span>{item.descricao}</span>
              </div>
             </TableCell>

             <TableCell className="text-muted-foreground">
              {item.categoria||'—'}
             </TableCell>

             <TableCell className="text-right font-medium">
              {formatCurrency(item.valor_previsto)}
             </TableCell>

             <TableCell className="text-right font-semibold text-red-500">
              {item.valor_real>0
               ?formatCurrency(item.valor_real)
               :'-'}
             </TableCell>

             <TableCell
              className={`text-right font-semibold ${
               item.diferenca>0
                ?'text-green-400'
                :item.diferenca<0
                 ?'text-red-500'
                 :'text-muted-foreground'
              }`}
             >
              {formatCurrency(item.diferenca)}
             </TableCell>

             <TableCell className="text-center">
              {getStatusBadge(item.status,item)}
             </TableCell>

            </TableRow>
           ))
          )}

         </TableBody>

         {filteredData.length>0&&(
          <TableFooter>

           <TableRow className="bg-secondary/30 font-bold">

            <TableCell colSpan={3} className="text-right">
             Totais:
            </TableCell>

            <TableCell className="text-right">
             {formatCurrency(subtotals.previsto)}
            </TableCell>

            <TableCell className="text-right text-red-500">
             {formatCurrency(subtotals.real)}
            </TableCell>

            <TableCell
             className={`text-right ${
              subtotals.diferenca>0
               ?'text-green-400'
               :subtotals.diferenca<0
                ?'text-red-500'
                :'text-muted-foreground'
             }`}
            >
             {formatCurrency(subtotals.diferenca)}
            </TableCell>

            <TableCell/>

           </TableRow>

          </TableFooter>
         )}

        </Table>

       </div>
      )}

     </CardContent>
    </Card>
   )}

   <StatusChangeModal
    isOpen={isModalOpen}
    onClose={()=>setIsModalOpen(false)}
    onStatusChange={refetch}
    currentStatus={selectedExpense?.status}
    tableName="despesas_previstas"
    recordId={selectedExpense?.id}
   />

  </div>
 );
}
