import React,{useState,useEffect,useCallback}from'react';
import{Receipt,Search,RefreshCw,FileSpreadsheet,FileText,Printer,Loader2}from'lucide-react';
import{Button}from'@/components/ui/button';
import{Input}from'@/components/ui/input';
import{Label}from'@/components/ui/label';
import{Card,CardContent,CardHeader,CardTitle}from'@/components/ui/card';
import{useToast}from'@/components/ui/use-toast';
import{supabase}from'@/lib/customSupabaseClient';
import{useAuth}from'@/contexts/SupabaseAuthContext';
import jsPDF from'jspdf';
import autoTable from'jspdf-autotable';
import * as XLSX from'xlsx';

const GREEN='hsl(var(--neon-comercial))';
const CATEGORIAS=['Fixa','Variável','Operacional','Custo','Investimento','Administrativa','Manutenção','Outras'];
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const brDate=v=>v?new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR'):'—';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function ConsultaDespesasComercial(){
 const{user}=useAuth();
 const{toast}=useToast();
 const[rows,setRows]=useState([]);
 const[tipos,setTipos]=useState([]);
 const[fornecedores,setFornecedores]=useState([]);
 const[loading,setLoading]=useState(true);
 const[filters,setFilters]=useState({mes:'',ano:'',inicio:'',fim:'',fornecedor:'',tipo:'',categoria:''});
 const set=(key,value)=>setFilters(old=>({...old,[key]:value}));

 const consultar=useCallback(async()=>{
  if(!user){setLoading(false);return}
  setLoading(true);
  const[t,f]=await Promise.all([
   supabase.from('comercial_tipos_despesas').select('id,nome,categoria').eq('user_id',user.id).order('nome'),
   supabase.from('comercial_fornecedores').select('id,nome').eq('user_id',user.id).order('nome')
  ]);
  let query=supabase.from('comercial_despesas').select('*').eq('user_id',user.id).order('data_despesa',{ascending:false}).limit(2000);
  if(filters.fornecedor)query=query.eq('fornecedor_id',filters.fornecedor);
  if(filters.tipo)query=query.eq('tipo_despesa_id',filters.tipo);
  if(filters.inicio)query=query.gte('data_despesa',filters.inicio);
  if(filters.fim)query=query.lte('data_despesa',filters.fim);
  if(!filters.inicio&&!filters.fim&&filters.mes&&filters.ano){
   const last=new Date(Number(filters.ano),Number(filters.mes),0).getDate();
   query=query.gte('data_despesa',`${filters.ano}-${filters.mes}-01`).lte('data_despesa',`${filters.ano}-${filters.mes}-${String(last).padStart(2,'0')}`);
  }else if(!filters.inicio&&!filters.fim&&filters.ano){
   query=query.gte('data_despesa',`${filters.ano}-01-01`).lte('data_despesa',`${filters.ano}-12-31`);
  }else if(!filters.inicio&&!filters.fim&&filters.mes){
   toast({title:'Selecione o ano',description:'O filtro por mês precisa de um ano.',variant:'destructive'});
  }
  const{data,error}=await query;
  if(error||t.error||f.error)toast({title:'Erro na consulta',description:(error||t.error||f.error).message,variant:'destructive'});
  const tiposCarregados=t.data||[];
  const dados=data||[];
  const filtrados=filters.categoria?dados.filter(r=>tiposCarregados.find(tipo=>tipo.id===r.tipo_despesa_id)?.categoria===filters.categoria):dados;
  setRows(filtrados);
  setTipos(tiposCarregados);
  setFornecedores(f.data||[]);
  setLoading(false);
 },[user,filters,toast]);

 useEffect(()=>{consultar()},[consultar]);

 const tipoPorId=id=>tipos.find(t=>t.id===id);
 const tipoNome=id=>tipoPorId(id)?.nome||'Não informado';
 const categoriaNome=id=>tipoPorId(id)?.categoria||'—';
 const fornecedorNome=id=>fornecedores.find(f=>f.id===id)?.nome||'—';
 const exportData=rows.map(r=>({
  Data:brDate(r.data_despesa),
  Valor:Number(r.valor||0),
  Tipo:tipoNome(r.tipo_despesa_id),
  Categoria:categoriaNome(r.tipo_despesa_id),
  Fornecedor:fornecedorNome(r.fornecedor_id),
  'Forma de pagamento':r.forma_pagamento||'',
  Status:r.status||'',
  Observações:r.observacoes||''
 }));
 const total=rows.reduce((sum,r)=>sum+Number(r.valor||0),0);

 const exportExcel=()=>{
  if(!rows.length)return toast({title:'Sem dados para exportar',variant:'destructive'});
  const ws=XLSX.utils.json_to_sheet(exportData);
  ws['!cols']=[{wch:14},{wch:16},{wch:24},{wch:20},{wch:26},{wch:22},{wch:16},{wch:40}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Despesas');
  XLSX.writeFile(wb,'consulta_de_despesas.xlsx');
 };

 const exportPDF=()=>{
  if(!rows.length)return toast({title:'Sem dados para exportar',variant:'destructive'});
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
  doc.setFontSize(17);
  doc.text('CONSULTA DE DESPESAS',14,17);
  doc.setFontSize(9);
  doc.text(`Registros: ${rows.length} | Total: ${money(total)}`,14,24);
  autoTable(doc,{
   startY:30,
   head:[['Data','Valor','Tipo','Categoria','Fornecedor','Pagamento','Status','Observações']],
   body:exportData.map(r=>[r.Data,money(r.Valor),r.Tipo,r.Categoria,r.Fornecedor,r['Forma de pagamento'],r.Status,r.Observações]),
   styles:{fontSize:7,cellPadding:2,overflow:'linebreak'},
   headStyles:{fillColor:[30,45,32],textColor:[255,255,255]}
  });
  doc.save('consulta_de_despesas.pdf');
 };

 const imprimir=()=>{
  if(!rows.length)return toast({title:'Sem dados para imprimir',variant:'destructive'});
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const htmlRows=exportData.map(r=>`<tr><td>${esc(r.Data)}</td><td>${esc(money(r.Valor))}</td><td>${esc(r.Tipo)}</td><td>${esc(r.Categoria)}</td><td>${esc(r.Fornecedor)}</td><td>${esc(r['Forma de pagamento'])}</td><td>${esc(r.Status)}</td><td>${esc(r.Observações)}</td></tr>`).join('');
  const win=window.open('','_blank');
  if(!win)return toast({title:'Impressão bloqueada',description:'Permita a abertura de janelas para imprimir.',variant:'destructive'});
  win.document.write(`<html><head><title>Consulta de Despesas</title><style>body{font-family:Arial;padding:20px;color:#222}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #ccc;padding:7px;text-align:left}th{background:#eee}h1{font-size:20px}</style></head><body><h1>Consulta de Despesas</h1><p>Registros: ${rows.length} | Total: ${esc(money(total))}</p><table><thead><tr><th>Data</th><th>Valor</th><th>Tipo</th><th>Categoria</th><th>Fornecedor</th><th>Pagamento</th><th>Status</th><th>Observações</th></tr></thead><tbody>${htmlRows}</tbody></table><script>window.onload=function(){window.print()}</script></body></html>`);
  win.document.close();
 };

 const limpar=()=>setFilters({mes:'',ano:'',inicio:'',fim:'',fornecedor:'',tipo:'',categoria:''});
 const anos=Array.from({length:8},(_,i)=>String(new Date().getFullYear()-5+i));

 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/70 p-5">
   <div className="flex items-center gap-3">
    <div className="rounded-xl border p-3" style={{borderColor:'hsl(var(--neon-comercial)/.3)',color:GREEN}}><Receipt/></div>
    <div><p className="text-xs font-semibold uppercase tracking-widest" style={{color:GREEN}}>Consultas</p><h1 className="text-2xl font-bold text-white">Despesas</h1><p className="text-sm text-muted-foreground">Consulte, filtre e exporte seus lançamentos.</p></div>
   </div>
   <div className="flex flex-wrap gap-2">
    <Button variant="outline" onClick={consultar}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button>
    <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="mr-2 h-4 w-4"/>Excel</Button>
    <Button variant="outline" onClick={exportPDF}><FileText className="mr-2 h-4 w-4"/>PDF</Button>
    <Button variant="outline" onClick={imprimir}><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>
   </div>
  </div>

  <Card className="border-border bg-card/80">
   <CardHeader><CardTitle style={{color:GREEN}}>Filtros da consulta</CardTitle></CardHeader>
   <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <div className="space-y-2"><Label>Mês</Label><select value={filters.mes} onChange={e=>set('mes',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todos</option>{meses.map((m,i)=><option key={i} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select></div>
    <div className="space-y-2"><Label>Ano</Label><select value={filters.ano} onChange={e=>set('ano',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todos</option>{anos.map(a=><option key={a}>{a}</option>)}</select></div>
    <div className="space-y-2"><Label>Categoria</Label><select value={filters.categoria} onChange={e=>set('categoria',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todas</option>{CATEGORIAS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
    <div className="space-y-2"><Label>Fornecedor</Label><select value={filters.fornecedor} onChange={e=>set('fornecedor',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todos</option>{fornecedores.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></div>
    <div className="space-y-2"><Label>Tipo de despesa</Label><select value={filters.tipo} onChange={e=>set('tipo',e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Todos</option>{tipos.map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
    <div className="space-y-2"><Label>Período inicial</Label><Input type="date" value={filters.inicio} onChange={e=>set('inicio',e.target.value)}/></div>
    <div className="space-y-2"><Label>Período final</Label><Input type="date" value={filters.fim} onChange={e=>set('fim',e.target.value)}/></div>
    <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
     <Button onClick={consultar} className="font-bold text-black" style={{background:GREEN}}><Search className="mr-2 h-4 w-4"/>Consultar</Button>
     <Button variant="outline" onClick={limpar}>Limpar filtros</Button>
    </div>
    <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-3">O período informado tem prioridade sobre mês e ano. Para filtrar por mês, selecione também o ano.</p>
   </CardContent>
  </Card>

  <div className="grid gap-4 sm:grid-cols-2">
   <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Despesas encontradas</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold" style={{color:GREEN}}>{rows.length}</p></CardContent></Card>
   <Card className="border-border bg-card"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Valor total</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{money(total)}</p></CardContent></Card>
  </div>

  <Card className="border-border bg-card">
   <CardHeader><CardTitle style={{color:GREEN}}>Resultado da consulta</CardTitle></CardHeader>
   <CardContent className="overflow-x-auto p-0">
    <table className="w-full min-w-[1050px] text-sm">
     <thead><tr className="border-y border-border bg-muted/30 text-left text-muted-foreground">
      <th className="p-3">Data</th><th className="p-3">Tipo</th><th className="p-3">Categoria</th><th className="p-3">Fornecedor</th><th className="p-3">Pagamento</th><th className="p-3">Status</th><th className="p-3 text-right">Valor</th>
     </tr></thead>
     <tbody>
      {loading?<tr><td colSpan={7} className="p-8 text-center"><Loader2 className="mx-auto animate-spin"/></td></tr>
      :rows.length?rows.map(r=><tr key={r.id} className="border-b border-border">
       <td className="p-3">{brDate(r.data_despesa)}</td>
       <td className="p-3">{tipoNome(r.tipo_despesa_id)==='Não informado'?r.descricao:tipoNome(r.tipo_despesa_id)}</td>
       <td className="p-3">{categoriaNome(r.tipo_despesa_id)}</td>
       <td className="p-3">{fornecedorNome(r.fornecedor_id)}</td>
       <td className="p-3">{r.forma_pagamento||'—'}</td>
       <td className="p-3 capitalize">{r.status}</td>
       <td className="p-3 text-right font-semibold">{money(r.valor)}</td>
      </tr>)
      :<tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma despesa encontrada.</td></tr>}
     </tbody>
    </table>
   </CardContent>
  </Card>
 </div>;
}
