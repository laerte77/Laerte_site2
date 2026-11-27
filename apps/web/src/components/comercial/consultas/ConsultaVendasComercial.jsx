
import React,{useState,useEffect,useCallback,useMemo}from'react';
import{ShoppingCart,Search,RefreshCw,FileSpreadsheet,FileText,Printer,Loader2,Wallet,TrendingUp,Clock}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import supabase from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';
import * as XLSX from'xlsx';

const GREEN='hsl(var(--neon-comercial))';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const brDate=v=>v?new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR'):'—';

const STATUS={
 recebido:{nome:'Pago',cor:'text-emerald-400'},
 pendente:{nome:'Devendo',cor:'text-amber-400'},
 parcial:{nome:'Pago parcialmente',cor:'text-blue-400'},
 cancelado:{nome:'Cancelado',cor:'text-red-400'}
};

const MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function ConsultaVendasComercial(){
 const{user}=useAuth();
 const{toast}=useToast();
 const[rows,setRows]=useState([]);
 const[clientes,setClientes]=useState([]);
 const[loading,setLoading]=useState(true);
 const[filters,setFilters]=useState({inicio:'',fim:'',cliente:'',status:'',busca:''});

 const set=(key,value)=>setFilters(old=>({...old,[key]:value}));

 const consultar=useCallback(async()=>{
  if(!user){setLoading(false);return}
  if(filters.inicio&&filters.fim&&filters.inicio>filters.fim){
   toast({title:'Período inválido',description:'A data inicial não pode ser posterior à data final.',variant:'destructive'});
   return;
  }

  setLoading(true);

  const[c,v]=await Promise.all([
   supabase.from('comercial_clientes').select('id,nome').eq('user_id',user.id).order('nome'),
   (()=>{
    let q=supabase.from('comercial_vendas').select('id,data_venda,status,forma_pagamento,observacoes,valor_total,valor_recebido,data_recebimento,data_vencimento,cliente_id,comercial_venda_itens(id,descricao,quantidade,valor_unitario,subtotal,produto_id)').eq('user_id',user.id).order('data_venda',{ascending:false}).limit(5000);
    if(filters.inicio)q=q.gte('data_venda',filters.inicio);
    if(filters.fim)q=q.lte('data_venda',filters.fim);
    if(filters.cliente)q=q.eq('cliente_id',filters.cliente);
    if(filters.status)q=q.eq('status',filters.status);
    return q;
   })()
  ]);

  const error=c.error||v.error;
  if(error){
   toast({title:'Erro na consulta',description:error.message,variant:'destructive'});
   setLoading(false);
   return;
  }

  setClientes(c.data||[]);
  const termo=filters.busca.trim().toLowerCase();
  const filtradas=(v.data||[]).filter(r=>{
   if(!termo)return true;
   const cliente=(c.data||[]).find(x=>x.id===r.cliente_id)?.nome||'Consumidor não identificado';
   const itens=(r.comercial_venda_itens||[]).map(i=>i.descricao||'').join(' ');
   return cliente.toLowerCase().includes(termo)||itens.toLowerCase().includes(termo)||String(r.id).toLowerCase().includes(termo);
  });
  setRows(filtradas);
  setLoading(false);
 },[user,filters,toast]);

 useEffect(()=>{
  consultar();
 },[consultar]);

 const clienteNome=id=>clientes.find(c=>c.id===id)?.nome||'Consumidor não identificado';
 const statusNome=status=>STATUS[status]?.nome||status||'—';

 const totalVendido=useMemo(()=>rows.filter(r=>r.status!=='cancelado').reduce((s,r)=>s+Number(r.valor_total||0),0),[rows]);
 const totalRecebido=useMemo(()=>rows.filter(r=>r.status!=='cancelado').reduce((s,r)=>s+Number(r.valor_recebido||0),0),[rows]);
 const totalRestante=Math.max(0,Number((totalVendido-totalRecebido).toFixed(2)));
 const quantidadePaga=rows.filter(r=>r.status==='recebido').length;
 const quantidadePendente=rows.filter(r=>r.status==='pendente').length;
 const quantidadeParcial=rows.filter(r=>r.status==='parcial').length;

 const exportData=rows.map(r=>({
  Data:brDate(r.data_venda),
  Cliente:clienteNome(r.cliente_id),
  Produtos:(r.comercial_venda_itens||[]).map(i=>`${i.descricao||'Produto'} (${i.quantidade})`).join(', '),
  'Forma de pagamento':r.forma_pagamento||'',
  'Valor total':Number(r.valor_total||0),
  'Valor recebido':Number(r.valor_recebido||0),
  'Valor restante':Math.max(0,Number((Number(r.valor_total||0)-Number(r.valor_recebido||0)).toFixed(2))),
  Status:statusNome(r.status),
  Observações:r.observacoes||''
 }));

 const exportExcel=()=>{
  if(!rows.length)return toast({title:'Sem dados para exportar',variant:'destructive'});
  const ws=XLSX.utils.json_to_sheet(exportData);
  ws['!cols']=[{wch:14},{wch:28},{wch:45},{wch:22},{wch:17},{wch:17},{wch:17},{wch:22},{wch:40}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Vendas');
  XLSX.writeFile(wb,'consulta_de_vendas.xlsx');
 };

 const exportPDF=()=>{
  if(!rows.length)return toast({title:'Sem dados para exportar',variant:'destructive'});
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  doc.setFontSize(17);
  doc.text('CONSULTA DE VENDAS',14,17);
  doc.setFontSize(9);
  doc.text(`Registros: ${rows.length} | Total vendido: ${money(totalVendido)} | Recebido: ${money(totalRecebido)} | A receber: ${money(totalRestante)}`,14,24);
  autoTable(doc,{
   startY:30,
   head:[['Data','Cliente','Produtos','Pagamento','Total','Recebido','Restante','Status']],
   body:exportData.map(r=>[r.Data,r.Cliente,r.Produtos,r['Forma de pagamento'],money(r['Valor total']),money(r['Valor recebido']),money(r['Valor restante']),r.Status]),
   styles:{fontSize:7,cellPadding:2,overflow:'linebreak'},
   headStyles:{fillColor:[30,45,32],textColor:[255,255,255]}
  });
  doc.save('consulta_de_vendas.pdf');
 };

 const imprimir=()=>{
  if(!rows.length)return toast({title:'Sem dados para imprimir',variant:'destructive'});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const htmlRows=exportData.map(r=>`<tr><td>${esc(r.Data)}</td><td>${esc(r.Cliente)}</td><td>${esc(r.Produtos)}</td><td>${esc(r['Forma de pagamento'])}</td><td>${esc(money(r['Valor total']))}</td><td>${esc(money(r['Valor recebido']))}</td><td>${esc(money(r['Valor restante']))}</td><td>${esc(r.Status)}</td></tr>`).join('');
  const win=window.open('','_blank');
  if(!win)return toast({title:'Impressão bloqueada',description:'Permita a abertura de janelas para imprimir.',variant:'destructive'});
  win.document.write(`<html><head><title>Consulta de Vendas</title><style>body{font-family:Arial;padding:20px;color:#222}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ccc;padding:7px;text-align:left}th{background:#eee}h1{font-size:20px}</style></head><body><h1>Consulta de Vendas</h1><p>Registros: ${rows.length} | Total vendido: ${esc(money(totalVendido))} | Recebido: ${esc(money(totalRecebido))} | A receber: ${esc(money(totalRestante))}</p><table><thead><tr><th>Data</th><th>Cliente</th><th>Produtos</th><th>Pagamento</th><th>Total</th><th>Recebido</th><th>Restante</th><th>Status</th></tr></thead><tbody>${htmlRows}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`);
  win.document.close();
 };

 const limpar=()=>{
  setFilters({inicio:'',fim:'',cliente:'',status:'',busca:''});
 };

 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5">
   <div className="flex items-center gap-3">
    <div className="rounded-xl border p-3" style={{borderColor:'hsl(var(--neon-comercial)/.3)',color:GREEN}}><ShoppingCart/></div>
    <div>
     <p className="text-xs font-semibold uppercase tracking-widest" style={{color:GREEN}}>Consultas</p>
     <h1 className="text-2xl font-bold text-white">Vendas</h1>
     <p className="text-sm text-muted-foreground">Consulte vendas, recebimentos e valores a receber.</p>
    </div>
   </div>
   <div className="flex flex-wrap gap-2">
    <Button variant="outline" onClick={consultar} disabled={loading}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button>
    <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4"/>Excel</Button>
    <Button variant="outline" onClick={exportPDF}><FileText className="mr-2 h-4 w-4"/>PDF</Button>
    <Button variant="outline" onClick={imprimir}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
   </div>
  </div>

  <Card className="border-border bg-card/80">
   <CardHeader><CardTitle style={{color:GREEN}}>Filtros da consulta</CardTitle></CardHeader>
   <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <div className="space-y-2"><Label>Data inicial</Label><Input type="date" value={filters.inicio} onChange={e=>set('inicio',e.target.value)}/></div>
    <div className="space-y-2"><Label>Data final</Label><Input type="date" value={filters.fim} onChange={e=>set('fim',e.target.value)}/></div>
    <div className="space-y-2"><Label>Cliente</Label><select value={filters.cliente} onChange={e=>set('cliente',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todos os clientes</option>{clientes.map(c=><option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
    <div className="space-y-2"><Label>Situação do pagamento</Label><select value={filters.status} onChange={e=>set('status',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todas</option><option value="recebido">Pago</option><option value="pendente">Devendo</option><option value="parcial">Pago parcialmente</option><option value="cancelado">Cancelado</option></select></div>
    <div className="space-y-2 sm:col-span-2"><Label>Pesquisar cliente, produto ou código da venda</Label><Input value={filters.busca} onChange={e=>set('busca',e.target.value)} placeholder="Digite para pesquisar..."/></div>
    <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
     <Button onClick={consultar} disabled={loading} className="font-bold text-black" style={{background:GREEN}}><Search className="mr-2 h-4 w-4"/>Consultar</Button>
     <Button variant="outline" onClick={limpar}>Limpar filtros</Button>
    </div>
    <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">O período considera a data da venda. O saldo a receber é calculado pelo valor total menos o valor recebido. Vendas canceladas não entram nos indicadores financeiros.</p>
   </CardContent>
  </Card>

  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
   <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-4 w-4"/>Total vendido</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={{color:GREEN}}>{money(totalVendido)}</p></CardContent></Card>
   <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4"/>Total recebido</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-emerald-400">{money(totalRecebido)}</p></CardContent></Card>
   <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4"/>Saldo a receber</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-amber-400">{money(totalRestante)}</p></CardContent></Card>
  </div>

  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
   <Card className="border-border bg-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vendas encontradas</p><p className="mt-1 text-xl font-bold">{rows.length}</p></CardContent></Card>
   <Card className="border-border bg-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pagas</p><p className="mt-1 text-xl font-bold text-emerald-400">{quantidadePaga}</p></CardContent></Card>
   <Card className="border-border bg-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Devendo</p><p className="mt-1 text-xl font-bold text-amber-400">{quantidadePendente}</p></CardContent></Card>
   <Card className="border-border bg-card"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pagas parcialmente</p><p className="mt-1 text-xl font-bold text-blue-400">{quantidadeParcial}</p></CardContent></Card>
  </div>

  <Card className="border-border bg-card">
   <CardHeader><CardTitle style={{color:GREEN}}>Resultado da consulta</CardTitle></CardHeader>
   <CardContent className="overflow-x-auto p-0">
    <table className="w-full min-w-[1150px] text-sm">
     <thead><tr className="border-y border-border bg-muted/30 text-left text-muted-foreground">
      <th className="p-3">Data</th><th className="p-3">Cliente</th><th className="p-3">Produtos</th><th className="p-3">Pagamento</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Recebido</th><th className="p-3 text-right">Restante</th><th className="p-3">Situação</th>
     </tr></thead>
     <tbody>
      {loading?<tr><td colSpan={8} className="p-8 text-center"><Loader2 className="mx-auto animate-spin"/></td></tr>
      :rows.length?rows.map(r=>{
       const restante=Math.max(0,Number((Number(r.valor_total||0)-Number(r.valor_recebido||0)).toFixed(2)));
       const status=STATUS[r.status]||{nome:r.status,cor:'text-gray-400'};
       return <tr key={r.id} className={`border-b border-border ${r.status==='cancelado'?'opacity-60':''}`}>
        <td className="p-3">{brDate(r.data_venda)}</td>
        <td className="p-3">{clienteNome(r.cliente_id)}</td>
        <td className="max-w-[260px] p-3">{(r.comercial_venda_itens||[]).map(i=>`${i.descricao||'Produto'} (${i.quantidade})`).join(', ')||'—'}</td>
        <td className="p-3">{r.forma_pagamento||'—'}</td>
        <td className="p-3 text-right font-semibold">{money(r.valor_total)}</td>
        <td className="p-3 text-right text-emerald-400">{money(r.valor_recebido)}</td>
        <td className="p-3 text-right text-amber-400">{money(restante)}</td>
        <td className={`p-3 font-semibold ${status.cor}`}>{status.nome}</td>
       </tr>;
      }):<tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhuma venda encontrada.</td></tr>}
     </tbody>
    </table>
   </CardContent>
  </Card>
 </div>;
}
