import React,{useState,useEffect,useCallback,useMemo}from'react';
import{CreditCard,TrendingUp,AlertCircle,Download,RefreshCw}from'lucide-react';
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
const toCents=v=>Math.round((Number(v)||0)*100);
const fromCents=v=>(Number(v)||0)/100;
const money=v=>new Intl.NumberFormat('pt-BR',{
 style:'currency',
 currency:'BRL',
 minimumFractionDigits:2,
 maximumFractionDigits:2
}).format(fromCents(toCents(v)));
const installmentCents=l=>toCents(
 getInstallmentValue(l.valor,l.parcelas,l.parcela_atual)
);

const STATUS_STYLE={
 aberta:'bg-amber-500/20 text-amber-400 border-amber-500/40',
 fechada:'bg-blue-500/20 text-blue-400 border-blue-500/40',
 paga:'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
};

const StatCard=({label,value,icon:Icon,type='blue',note})=>{
 const styles={
  blue:{
   border:'border-blue-500/20',
   bg:'from-blue-500/10 to-blue-700/10',
   icon:'bg-blue-500/10',
   text:'text-blue-400'
  },
  red:{
   border:'border-red-500/20',
   bg:'from-red-500/10 to-red-700/10',
   icon:'bg-red-500/10',
   text:'text-red-400'
  },
  green:{
   border:'border-emerald-500/20',
   bg:'from-emerald-500/10 to-emerald-700/10',
   icon:'bg-emerald-500/10',
   text:'text-emerald-400'
  },
  amber:{
   border:'border-amber-500/20',
   bg:'from-amber-500/10 to-amber-700/10',
   icon:'bg-amber-500/10',
   text:'text-amber-400'
  }
 };
 const s=styles[type];

 return(
  <Card className={`${s.border} bg-gradient-to-br ${s.bg}`}>
   <CardContent className="p-4">
    <div className="flex items-center gap-3">
     <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.icon}`}>
      <Icon className={`h-5 w-5 ${s.text}`}/>
     </div>
     <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-xl font-bold ${s.text}`}>{value}</p>
      {note&&<p className="mt-1 text-xs text-muted-foreground">{note}</p>}
     </div>
    </div>
   </CardContent>
  </Card>
 );
};

const RelatorioCartoes=()=>{
 const{user}=useAuth();
 const[cartoes,setCartoes]=useState([]);
 const[lancamentos,setLancamentos]=useState([]);
 const[faturas,setFaturas]=useState([]);
 const[pagamentos,setPagamentos]=useState([]);
 const[selectedYear,setSelectedYear]=useState(String(new Date().getFullYear()));
 const[loading,setLoading]=useState(true);

 const fetchAll=useCallback(async()=>{
  if(!user)return;
  setLoading(true);

  try{
   const ano=Number(selectedYear);
   const startDate=`${ano-1}-12-01`;
   const endDate=`${ano}-12-31`;

   const[cRes,lRes,fRes]=await Promise.all([
    supabase
     .from('pessoal_cartoes')
     .select('*')
     .eq('user_id',user.id)
     .order('nome',{ascending:true}),

    supabase
     .from('pessoal_cartao_lancamentos')
     .select('cartao_id,valor,parcelas,parcela_atual,data')
     .eq('user_id',user.id)
     .gte('data',startDate)
     .lte('data',endDate),

    supabase
     .from('pessoal_faturas')
     .select('*')
     .eq('user_id',user.id)
     .eq('ano',ano)
   ]);

   if(cRes.error)throw cRes.error;
   if(lRes.error)throw lRes.error;
   if(fRes.error)throw fRes.error;

   const ids=(fRes.data||[]).map(f=>f.id);
   let pagamentosData=[];

   if(ids.length){
    const{data,error}=await supabase
     .from('pessoal_cartao_pagamentos')
     .select('fatura_id,valor')
     .in('fatura_id',ids);

    if(error)throw error;
    pagamentosData=data||[];
   }

   setCartoes(cRes.data||[]);
   setLancamentos(lRes.data||[]);
   setFaturas(fRes.data||[]);
   setPagamentos(pagamentosData);
  }catch(error){
   console.error(error);
   setCartoes([]);
   setLancamentos([]);
   setFaturas([]);
   setPagamentos([]);
  }finally{
   setLoading(false);
  }
 },[user,selectedYear]);

 useEffect(()=>{
  fetchAll();
 },[fetchAll]);

 const pagamentosPorFatura=useMemo(()=>{
  const map={};

  pagamentos.forEach(p=>{
   map[p.fatura_id]=(map[p.fatura_id]||0)+toCents(p.valor);
  });

  return map;
 },[pagamentos]);

 const pagamentosPorCartao=useMemo(()=>{
  const map={};

  faturas.forEach(f=>{
   map[f.cartao_id]=(map[f.cartao_id]||0)+(pagamentosPorFatura[f.id]||0);
  });

  return map;
 },[faturas,pagamentosPorFatura]);

 const comprasPorCartao=useCallback(cartaoId=>{
  const cartao=cartoes.find(c=>c.id===cartaoId);

  return lancamentos
   .filter(l=>l.cartao_id===cartaoId)
   .filter(l=>{
    const comp=competenciaFatura(
     l.data,
     cartao?.dia_fechamento||1
    );

    return comp&&comp.ano===Number(selectedYear);
   })
   .reduce(
    (sum,l)=>sum+installmentCents(l),
    0
   );
 },[cartoes,lancamentos,selectedYear]);

 const resumoCartoes=useMemo(()=>{
  return cartoes.map(c=>{
   const limiteCents=toCents(c.limite);
   const comprasCents=comprasPorCartao(c.id);
   const pagoCents=pagamentosPorCartao[c.id]||0;
   const utilizadoCents=Math.max(0,comprasCents-pagoCents);
   const percentual=limiteCents>0
    ?(utilizadoCents/limiteCents)*100
    :0;

   return{
    ...c,
    limite:fromCents(limiteCents),
    utilizado:fromCents(utilizadoCents),
    disponivel:fromCents(Math.max(0,limiteCents-utilizadoCents)),
    percentual
   };
  });
 },[cartoes,comprasPorCartao,pagamentosPorCartao]);

 const totalLimiteCents=useMemo(
  ()=>resumoCartoes.reduce((sum,c)=>sum+toCents(c.limite),0),
  [resumoCartoes]
 );

 const totalUtilizadoCents=useMemo(
  ()=>resumoCartoes.reduce((sum,c)=>sum+toCents(c.utilizado),0),
  [resumoCartoes]
 );

 const totalGastoAnoCents=useMemo(
  ()=>cartoes.reduce((sum,c)=>sum+comprasPorCartao(c.id),0),
  [cartoes,comprasPorCartao]
 );

 const totalPagoAnoCents=useMemo(
  ()=>cartoes.reduce(
   (sum,c)=>sum+(pagamentosPorCartao[c.id]||0),
   0
  ),
  [cartoes,pagamentosPorCartao]
 );

 const totalFaturasEmAbertoCents=useMemo(
  ()=>faturas
   .filter(f=>f.status==='aberta'||f.status==='fechada')
   .reduce(
    (sum,f)=>sum+Math.max(
     0,
     toCents(f.valor_total)-(pagamentosPorFatura[f.id]||0)
    ),
    0
   ),
  [faturas,pagamentosPorFatura]
 );

 const handleExport=()=>{
  if(!resumoCartoes.length)return;

  exportToExcel(
   resumoCartoes.map(c=>({
    Cartão:c.nome,
    Bandeira:c.bandeira||'-',
    Limite:fromCents(toCents(c.limite)),
    Utilizado:fromCents(toCents(c.utilizado)),
    Disponível:fromCents(toCents(c.disponivel)),
    'Uso (%)':Number(c.percentual.toFixed(2))
   })),
   `Relatorio_Cartoes_${selectedYear}`,
   'Cartoes'
  );
 };

 return(
  <div className="dark-pessoal space-y-4">

   <div className="flex flex-col gap-4 rounded-xl border border-border bg-card/70 p-5 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex items-center gap-3">
     <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(var(--neon-pessoal)/.20)] bg-[hsl(var(--neon-pessoal)/.08)]">
      <CreditCard className="h-5 w-5 text-[hsl(var(--neon-pessoal))]"/>
     </div>

     <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-[hsl(var(--neon-pessoal))]">
       Relatórios
      </p>
      <h1 className="text-2xl font-bold tracking-tight">
       Relatório de Cartões
      </h1>
      <p className="text-sm text-muted-foreground">
       Visão geral de limites, utilização, faturas e pagamentos.
      </p>
     </div>
    </div>

    <div className="flex flex-wrap gap-2">
     <Button
      variant="outline"
      onClick={handleExport}
      disabled={!resumoCartoes.length}
     >
      <Download className="mr-2 h-4 w-4"/>
      Exportar
     </Button>

     <Button
      variant="outline"
      onClick={fetchAll}
      disabled={loading}
     >
      <RefreshCw className="mr-2 h-4 w-4"/>
      Atualizar
     </Button>
    </div>
   </div>

   <Card className="border-border bg-card/80">
    <CardContent className="p-4">
     <div className="max-w-[160px] space-y-2">
      <Label className="text-xs">Ano</Label>

      <Select
       value={selectedYear}
       onValueChange={setSelectedYear}
      >
       <SelectTrigger className="bg-input">
        <SelectValue/>
       </SelectTrigger>

       <SelectContent className="dark-pessoal border-border bg-card">
        {YEARS.map(year=>(
         <SelectItem
          key={year}
          value={String(year)}
         >
          {year}
         </SelectItem>
        ))}
       </SelectContent>
      </Select>
     </div>
    </CardContent>
   </Card>

   <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
    <StatCard
     label="Limite Total"
     value={money(fromCents(totalLimiteCents))}
     icon={CreditCard}
    />

    <StatCard
     label="Limite Utilizado"
     value={money(fromCents(totalUtilizadoCents))}
     icon={TrendingUp}
     type="red"
     note="Compras - pagamentos"
    />

    <StatCard
     label="Pago no Ano"
     value={money(fromCents(totalPagoAnoCents))}
     icon={CreditCard}
     type="green"
     note="Valor já pago"
    />

    <StatCard
     label="Gasto no Ano"
     value={money(fromCents(totalGastoAnoCents))}
     icon={CreditCard}
     type="red"
    />

    <StatCard
     label="Faturas em Aberto"
     value={money(fromCents(totalFaturasEmAbertoCents))}
     icon={AlertCircle}
     type="amber"
    />
   </div>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-pessoal))]">
      Limite por Cartão
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <ScrollArea className="h-[400px]">
      <Table>
       <TableHeader>
        <TableRow>
         <TableHead>Cartão</TableHead>
         <TableHead>Bandeira</TableHead>
         <TableHead className="text-right">Limite</TableHead>
         <TableHead className="text-right">Utilizado</TableHead>
         <TableHead className="text-right">Disponível</TableHead>
         <TableHead>Uso</TableHead>
        </TableRow>
       </TableHeader>

       <TableBody>
        {loading?(
         <TableRow>
          <TableCell
           colSpan={6}
           className="py-8 text-center text-muted-foreground"
          >
           Carregando...
          </TableCell>
         </TableRow>
        ):resumoCartoes.length===0?(
         <TableRow>
          <TableCell
           colSpan={6}
           className="py-8 text-center text-muted-foreground"
          >
           Nenhum cartão cadastrado.
          </TableCell>
         </TableRow>
        ):(
         resumoCartoes.map(c=>{
          const barra=c.percentual>80
           ?'bg-red-500'
           :c.percentual>50
            ?'bg-amber-500'
            :'bg-emerald-500';

          return(
           <TableRow
            key={c.id}
            className="hover:bg-muted/50"
           >
            <TableCell className="font-medium">
             {c.nome}
            </TableCell>

            <TableCell className="text-sm text-muted-foreground">
             {c.bandeira||'—'}
            </TableCell>

            <TableCell className="text-right">
             {money(c.limite)}
            </TableCell>

            <TableCell className="text-right font-semibold text-red-400">
             {money(c.utilizado)}
            </TableCell>

            <TableCell className="text-right font-semibold text-emerald-400">
             {money(c.disponivel)}
            </TableCell>

            <TableCell>
             <div className="flex items-center gap-2">
              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
               <div
                className={`h-full rounded-full ${barra}`}
                style={{width:`${Math.min(100,c.percentual)}%`}}
               />
              </div>

              <span className="text-xs text-muted-foreground">
               {c.percentual.toFixed(0)}%
              </span>
             </div>
            </TableCell>
           </TableRow>
          );
         })
        )}
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>

   <Card className="border-border bg-card">
    <CardHeader className="pb-3">
     <CardTitle className="text-lg text-[hsl(var(--neon-pessoal))]">
      Faturas do Ano
     </CardTitle>
    </CardHeader>

    <CardContent className="p-0">
     <ScrollArea className="h-[400px]">
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
        {loading?(
         <TableRow>
          <TableCell
           colSpan={6}
           className="py-8 text-center text-muted-foreground"
          >
           Carregando...
          </TableCell>
         </TableRow>
        ):faturas.length===0?(
         <TableRow>
          <TableCell
           colSpan={6}
           className="py-8 text-center text-muted-foreground"
          >
           Nenhuma fatura encontrada neste ano.
          </TableCell>
         </TableRow>
        ):(
         faturas
          .slice()
          .sort((a,b)=>(a.ano-b.ano)||(a.mes-b.mes))
          .map(f=>{
           const cartao=cartoes.find(c=>c.id===f.cartao_id);
           const pagoCents=pagamentosPorFatura[f.id]||0;

           return(
            <TableRow
             key={f.id}
             className="hover:bg-muted/50"
            >
             <TableCell className="font-medium">
              {cartao?.nome||'—'}
             </TableCell>

             <TableCell className="text-sm">
              {String(f.mes+1).padStart(2,'0')}/{f.ano}
             </TableCell>

             <TableCell className="text-sm">
              {f.data_vencimento
               ?new Date(`${f.data_vencimento}T00:00:00`).toLocaleDateString('pt-BR')
               :'—'}
             </TableCell>

             <TableCell className="text-right font-semibold text-red-400">
              {money(f.valor_total)}
             </TableCell>

             <TableCell className="text-right font-semibold text-emerald-400">
              {money(fromCents(pagoCents))}
             </TableCell>

             <TableCell>
              <Badge
               className={STATUS_STYLE[f.status]||STATUS_STYLE.aberta}
               variant="outline"
              >
               {(f.status||'aberta').toUpperCase()}
              </Badge>
             </TableCell>
            </TableRow>
           );
          })
        )}
       </TableBody>
      </Table>
     </ScrollArea>
    </CardContent>
   </Card>

  </div>
 );
};

export default RelatorioCartoes;
