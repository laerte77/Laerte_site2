import React,{useState,useEffect,useCallback,useMemo}from'react';
import{Users,CreditCard,Receipt,User,Download,RefreshCw}from'lucide-react';
import{format,parse}from'date-fns';
import{ptBR}from'date-fns/locale';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{Select,SelectContent,SelectItem,SelectTrigger,SelectValue}from'@/components/ui/select';
import{Table,TableBody,TableCell,TableHead,TableHeader,TableRow}from'@/components/ui/table';
import{Badge}from'@/components/ui/badge';
import{ScrollArea}from'@/components/ui/scroll-area';
import{Label}from'@/components/ui/label';
import{Button}from'@/components/ui/button';
import{competenciaFatura}from'@/lib/cartaoCompetencia';
import{getInstallmentValue}from'@/lib/cartaoParcelas';
import{exportToExcel}from'@/lib/ExportUtils';

const YEARS=[2024,2025,2026];
const MONTHS=Array.from({length:12},(_,i)=>i);

const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const dateBR=d=>{
 if(!d)return'—';
 try{return format(parse(d,'yyyy-MM-dd',new Date()),'dd/MM/yyyy',{locale:ptBR});}
 catch{return d;}
};

const StatCard=({icon:Icon,label,value,color='blue'})=>(
 <Card className={`border-${color}-500/20 bg-gradient-to-br from-${color}-500/10 to-${color}-700/10`}>
  <CardContent className="p-4">
   <div className="flex items-center gap-3">
    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${color}-500/10`}>
     <Icon className={`h-5 w-5 text-${color}-400`}/>
    </div>
    <div className="min-w-0">
     <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
     <p className={`mt-1 truncate text-xl font-bold text-${color}-400`}>{value}</p>
    </div>
   </div>
  </CardContent>
 </Card>
);

const RelatorioCartaoPessoas=()=>{
 const{user}=useAuth();
 const[usuarios,setUsuarios]=useState([]);
 const[cartoes,setCartoes]=useState([]);
 const[lancCartao,setLancCartao]=useState([]);
 const[despesasCredito,setDespesasCredito]=useState([]);
 const[faturas,setFaturas]=useState([]);
 const[pagamentos,setPagamentos]=useState([]);
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[selectedMonth,setSelectedMonth]=useState('todos');
 const[selectedCartao,setSelectedCartao]=useState('todos');
 const[selectedPessoa,setSelectedPessoa]=useState('todas');
 const[loading,setLoading]=useState(true);

 const fetchAll=useCallback(async()=>{
  if(!user)return;

  setLoading(true);

  const ano=Number(selectedYear);
  const startDate=`${ano-1}-12-01`;
  const endDate=`${ano}-12-31`;

  const[u,c,l,d,f]=await Promise.all([
   supabase.from('pessoal_cartao_usuarios').select('id,nome,parentesco').eq('user_id',user.id).order('nome'),
   supabase.from('pessoal_cartoes').select('id,nome,dia_fechamento').eq('user_id',user.id).order('nome'),
   supabase.from('pessoal_cartao_lancamentos').select('id,cartao_id,responsavel_id,data,descricao,valor,parcelas,parcela_atual,categoria,compra_id').eq('user_id',user.id).gte('data',startDate).lte('data',endDate),
   supabase.from('despesas').select('id,cartao_id,responsavel_id,data,despesa,valor,forma_pagamento,parcelas,categoria').eq('user_id',user.id).eq('forma_pagamento','Crédito').gte('data',startDate).lte('data',endDate),
   supabase.from('pessoal_faturas').select('id,cartao_id,mes,ano,valor_total,status,data_vencimento').eq('user_id',user.id).eq('ano',ano)
  ]);

  setUsuarios(u.data||[]);
  setCartoes(c.data||[]);
  setLancCartao(l.data||[]);
  setDespesasCredito(d.data||[]);
  setFaturas(f.data||[]);

  if(f.data?.length){
   const{data:p}=await supabase
    .from('pessoal_cartao_pagamentos')
    .select('fatura_id,valor')
    .in('fatura_id',f.data.map(x=>x.id));
   setPagamentos(p||[]);
  }else{
   setPagamentos([]);
  }

  setLoading(false);
 },[user,selectedYear]);

 useEffect(()=>{fetchAll();},[fetchAll]);

 const filtrarCompetencia=useCallback((item)=>{
  if(selectedCartao!=='todos'&&item.cartao_id!==selectedCartao)return false;

  const cartao=cartoes.find(c=>c.id===item.cartao_id);
  const comp=competenciaFatura(item.data,cartao?.dia_fechamento||1);

  if(!comp||comp.ano!==Number(selectedYear))return false;
  if(selectedMonth!=='todos'&&String(comp.mes)!==selectedMonth)return false;

  return true;
 },[cartoes,selectedCartao,selectedMonth,selectedYear]);

 const lancFiltrados=useMemo(
  ()=>lancCartao.filter(filtrarCompetencia),
  [lancCartao,filtrarCompetencia]
 );

 const despesasFiltradas=useMemo(
  ()=>despesasCredito.filter(filtrarCompetencia),
  [despesasCredito,filtrarCompetencia]
 );

 const todasCompras=useMemo(()=>{
  const lista=[];

  lancFiltrados.forEach(l=>lista.push({
   id:l.id,
   cartao_id:l.cartao_id,
   responsavel_id:l.responsavel_id,
   data:l.data,
   descricao:l.descricao,
   valor:Number(l.valor)||0,
   parcelas:l.parcelas||1,
   parcela_atual:l.parcela_atual||1,
   categoria:l.categoria,
   compra_id:l.compra_id||l.id
  }));

  despesasFiltradas.forEach(d=>lista.push({
   id:`d-${d.id}`,
   cartao_id:d.cartao_id,
   responsavel_id:d.responsavel_id,
   data:d.data,
   descricao:d.despesa,
   valor:Number(d.valor)||0,
   parcelas:d.parcelas||1,
   parcela_atual:1,
   categoria:d.categoria,
   compra_id:`d-${d.id}`
  }));

  return lista;
 },[lancFiltrados,despesasFiltradas]);

 const resumoPorPessoa=useMemo(()=>{
  const map=new Map();

  usuarios.forEach(u=>{
   map.set(u.id,{...u,compras:0,valorParcelas:0,valorTotal:0});
  });

  map.set('sem',{
   id:'sem',
   nome:'Sem responsável',
   parentesco:'',
   compras:0,
   valorParcelas:0,
   valorTotal:0
  });

  const vistos=new Map();

  todasCompras.forEach(c=>{
   const key=c.responsavel_id||'sem';

   if(!map.has(key)){
    map.set(key,{
     id:key,
     nome:'Pessoa removida',
     parentesco:'',
     compras:0,
     valorParcelas:0,
     valorTotal:0
    });
   }

   const item=map.get(key);
   item.valorParcelas+=getInstallmentValue(c.valor,c.parcelas,c.parcela_atual);

   if(!vistos.has(key))vistos.set(key,new Set());

   const comprasPessoa=vistos.get(key);

   if(!comprasPessoa.has(c.compra_id)){
    comprasPessoa.add(c.compra_id);
    item.compras+=1;
    item.valorTotal+=Number(c.valor)||0;
   }
  });

  return Array.from(map.values())
   .filter(p=>p.id!=='sem'||p.compras>0)
   .sort((a,b)=>a.nome.localeCompare(b.nome));
 },[todasCompras,usuarios]);

 const comprasDetalhe=useMemo(()=>{
  if(selectedPessoa==='todas')return todasCompras;
  if(selectedPessoa==='sem')return todasCompras.filter(c=>!c.responsavel_id);
  return todasCompras.filter(c=>c.responsavel_id===selectedPessoa);
 },[todasCompras,selectedPessoa]);

 const faturasResumo=useMemo(()=>{
  return faturas
   .filter(f=>selectedCartao==='todos'||f.cartao_id===selectedCartao)
   .filter(f=>selectedMonth==='todos'||String(f.mes)===selectedMonth)
   .map(f=>{
    const pago=pagamentos
     .filter(p=>p.fatura_id===f.id)
     .reduce((s,p)=>s+Number(p.valor||0),0);

    return{
     ...f,
     nomeCartao:cartoes.find(c=>c.id===f.cartao_id)?.nome||'—',
     pago,
     saldo:Math.max(0,Number(f.valor_total||0)-pago)
    };
   })
   .sort((a,b)=>(a.ano-b.ano)||(a.mes-b.mes));
 },[faturas,pagamentos,selectedCartao,selectedMonth,cartoes]);

 const totalCompras=resumoPorPessoa.reduce((s,p)=>s+p.compras,0);
 const totalParcelas=resumoPorPessoa.reduce((s,p)=>s+p.valorParcelas,0);
 const totalFaturas=faturasResumo.reduce((s,f)=>s+Number(f.valor_total||0),0);
 const pessoasComCompras=resumoPorPessoa.filter(p=>p.id!=='sem'&&p.compras>0).length;

 const responsavelNome=id=>
  usuarios.find(u=>u.id===id)?.nome||(id?'Pessoa removida':'Sem responsável');

 const cartaoNome=id=>
  cartoes.find(c=>c.id===id)?.nome||'—';

 const handleExport=()=>{
  if(!comprasDetalhe.length){
   return;
  }

  exportToExcel(
   comprasDetalhe
    .slice()
    .sort((a,b)=>a.data<b.data?1:-1)
    .map(c=>({
     Responsável:responsavelNome(c.responsavel_id),
     Cartão:cartaoNome(c.cartao_id),
     Descrição:c.descricao||'-',
     Categoria:c.categoria||'-',
     Data:dateBR(c.data),
     Parcela:`${c.parcela_atual}/${c.parcelas}`,
     'Valor da Compra':c.valor,
     'Valor da Parcela':getInstallmentValue(c.valor,c.parcelas,c.parcela_atual)
    })),
   `Relatorio_Cartao_Pessoas_${selectedYear}`,
   'Cartoes'
  );
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
      <Users className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
     </div>
     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">Relatórios</p>
      <h1 className="text-2xl font-bold tracking-tight">Cartões por Pessoa</h1>
      <p className="text-sm text-muted-foreground">Compras e parcelas organizadas por responsável.</p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button variant="outline" onClick={handleExport} disabled={!comprasDetalhe.length}>
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>
     <Button variant="outline" onClick={fetchAll}>
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="grid gap-4 p-4 md:grid-cols-3">
     <div className="space-y-2">
      <Label className="text-xs">Ano</Label>
      <Select value={selectedYear} onValueChange={setSelectedYear}>
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>
       <SelectContent className="dark-pessoal border-border bg-card">
        {YEARS.map(y=><SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
       </SelectContent>
      </Select>
     </div>

     <div className="space-y-2">
      <Label className="text-xs">Mês</Label>
      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>
       <SelectContent className="dark-pessoal border-border bg-card">
        <SelectItem value="todos">Todos os meses</SelectItem>
        {MONTHS.map(i=>(
         <SelectItem key={i} value={String(i)}>
          {format(new Date(2024,i,1),'MMMM',{locale:ptBR})}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>

     <div className="space-y-2">
      <Label className="text-xs">Cartão</Label>
      <Select value={selectedCartao} onValueChange={setSelectedCartao}>
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>
       <SelectContent className="dark-pessoal border-border bg-card">
        <SelectItem value="todos">Todos os cartões</SelectItem>
        {cartoes.map(c=>(
         <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-4">
    <StatCard label="Pessoas com Compras" value={pessoasComCompras} icon={Users}/>
    <StatCard label="Total de Compras" value={totalCompras} icon={CreditCard}/>
    <StatCard label="Total em Parcelas" value={money(totalParcelas)} icon={Receipt} color="red"/>
    <StatCard label="Total de Faturas" value={money(totalFaturas)} icon={Receipt} color="red"/>
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-pessoal))]">Resumo por Responsável</CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <ScrollArea className="h-[320px]">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Pessoa</TableHead>
         <TableHead>Parentesco</TableHead>
         <TableHead className="text-center">Compras</TableHead>
         <TableHead className="text-right">Total Parcelas</TableHead>
         <TableHead className="text-right">Valor Total</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow>
          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
         </TableRow>
        ):resumoPorPessoa.length===0?(
         <TableRow>
          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhuma pessoa ou compra encontrada.</TableCell>
         </TableRow>
        ):(
         resumoPorPessoa.map(p=>(
          <TableRow
           key={p.id}
           className="cursor-pointer hover:bg-muted/50"
           onClick={()=>setSelectedPessoa(selectedPessoa===p.id?'todas':p.id)}
          >
           <TableCell className="font-medium">
            <div className="flex items-center gap-2">
             <User className="h-4 w-4 text-[hsl(var(--neon-pessoal))]"/>
             {p.nome}
             {selectedPessoa===p.id&&(
              <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-400">Filtrado</Badge>
             )}
            </div>
           </TableCell>

           <TableCell className="text-sm text-muted-foreground">{p.parentesco||'—'}</TableCell>
           <TableCell className="text-center">{p.compras}</TableCell>
           <TableCell className="text-right font-semibold text-red-400">{money(p.valorParcelas)}</TableCell>
           <TableCell className="text-right text-muted-foreground">{money(p.valorTotal)}</TableCell>
          </TableRow>
         ))
        )}
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>

   <Card className="border-border bg-card">
    <CardHeader className="flex flex-col gap-2 pb-3 md:flex-row md:items-center md:justify-between">
     <div>
      <CardTitle className="text-lg text-[hsl(var(--neon-pessoal))]">
       Compras Detalhadas
       {selectedPessoa!=='todas'&&(
        <span className="ml-2 text-sm font-normal text-muted-foreground">
         — {responsavelNome(selectedPessoa==='sem'?null:selectedPessoa)}
        </span>
       )}
      </CardTitle>
     </div>

     {selectedPessoa!=='todas'&&(
      <Button variant="ghost" size="sm" onClick={()=>setSelectedPessoa('todas')}>
       Limpar filtro
      </Button>
     )}
    </CardHeader>

    <CardContent className="p-0">
     <ScrollArea className="h-[420px]">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Responsável</TableHead>
         <TableHead>Cartão</TableHead>
         <TableHead>Descrição</TableHead>
         <TableHead>Data</TableHead>
         <TableHead>Parc.</TableHead>
         <TableHead className="text-right">Valor/Parc.</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {comprasDetalhe.length===0?(
         <TableRow>
          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma compra encontrada.</TableCell>
         </TableRow>
        ):(
         comprasDetalhe
          .slice()
          .sort((a,b)=>a.data<b.data?1:-1)
          .map(c=>(
           <TableRow key={c.id} className="hover:bg-muted/50">
            <TableCell>
             {c.responsavel_id?(
              <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-400">
               {responsavelNome(c.responsavel_id)}
              </Badge>
             ):(
              <span className="text-sm italic text-muted-foreground">Sem responsável</span>
             )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{cartaoNome(c.cartao_id)}</TableCell>
            <TableCell className="font-medium">{c.descricao}</TableCell>
            <TableCell className="text-sm">{dateBR(c.data)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{c.parcela_atual}/{c.parcelas}</TableCell>
            <TableCell className="text-right font-semibold text-red-400">
             {money(getInstallmentValue(c.valor,c.parcelas,c.parcela_atual))}
            </TableCell>
           </TableRow>
          ))
        )}
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="flex items-center gap-2 text-lg text-emerald-500">
      <Receipt className="h-5 w-5"/>
      Faturas do Período
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <ScrollArea className="h-[320px]">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Cartão</TableHead>
         <TableHead>Referência</TableHead>
         <TableHead>Vencimento</TableHead>
         <TableHead className="text-right">Valor</TableHead>
         <TableHead className="text-right">Pago</TableHead>
         <TableHead>Status</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {faturasResumo.length===0?(
         <TableRow>
          <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma fatura no período.</TableCell>
         </TableRow>
        ):(
         faturasResumo.map(f=>(
          <TableRow key={f.id} className="hover:bg-muted/50">
           <TableCell className="font-medium">{f.nomeCartao}</TableCell>
           <TableCell className="text-sm">{String(f.mes+1).padStart(2,'0')}/{f.ano}</TableCell>
           <TableCell className="text-sm">{dateBR(f.data_vencimento)}</TableCell>
           <TableCell className="text-right font-semibold text-red-400">{money(f.valor_total)}</TableCell>
           <TableCell className="text-right text-emerald-400">{money(f.pago)}</TableCell>
           <TableCell>
            <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-400">
             {(f.status||'aberta').toUpperCase()}
            </Badge>
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
 );
};

export default RelatorioCartaoPessoas;
