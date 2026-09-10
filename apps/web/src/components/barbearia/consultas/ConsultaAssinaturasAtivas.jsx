import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const ConsultaAssinaturasAtivas = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [assinaturas, setAssinaturas] = useState([]);
    
    // Filters
    const [clientesList, setClientesList] = useState([]);
    const [filterCliente, setFilterCliente] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        const fetchDados = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const { data } = await supabase
                    .from('barbearia_lancamentos_assinaturas')
                    .select(`
                        id, data_assinatura, valor, status,
                        barbearia_clientes(id, nome),
                        barbearia_tipos_planos(nome)
                    `)
                    .eq('user_id', user.id)
                    .order('data_assinatura', { ascending: false });
                
                const processadas = (data || []).map(item => {
                    if (!item.data_assinatura) return item;
                    const diff = differenceInDays(new Date(), parseISO(item.data_assinatura));
                    const diasRestantes = 30 - diff;
                    const calculatedStatus = diasRestantes <= 0 ? 'vencida' : 'ativa';
                    return { ...item, diasRestantes, calculatedStatus };
                });

                setAssinaturas(processadas);
                
                // Extract unique clients for filter
                const cList = [];
                processadas.forEach(p => {
                    if (p.barbearia_clientes && !cList.find(x => x.id === p.barbearia_clientes.id)) {
                        cList.push(p.barbearia_clientes);
                    }
                });
                setClientesList(cList.sort((a,b) => a.nome.localeCompare(b.nome)));

            } catch (error) { 
                console.error(error); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchDados();
    }, [user]);

    const filteredData = assinaturas.filter(a => {
        if (filterCliente && a.barbearia_clientes?.id !== filterCliente) return false;
        if (filterStatus !== 'all' && a.calculatedStatus !== filterStatus) return false;
        return true;
    });

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-3xl font-bold text-[#D4AF37] uppercase mb-6">Assinaturas Ativas</h2>
            
            <div className="flex flex-wrap gap-4 bg-gray-900/80 p-4 rounded-xl border border-[#D4AF37]/20 shadow-lg">
                <div className="flex-1 min-w-[200px]">
                    <select value={filterCliente} onChange={e=>setFilterCliente(e.target.value)} className="w-full bg-black border border-[#D4AF37]/30 text-white p-2.5 rounded-md focus:ring-2 focus:ring-[#D4AF37]/50">
                        <option value="">Todos os Clientes</option>
                        {clientesList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                </div>
                <div className="w-48">
                    <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="w-full bg-black border border-[#D4AF37]/30 text-white p-2.5 rounded-md focus:ring-2 focus:ring-[#D4AF37]/50">
                        <option value="all">Todos os Status</option>
                        <option value="ativa">Ativas</option>
                        <option value="vencida">Vencidas</option>
                    </select>
                </div>
            </div>

            <div className="bg-gray-900/80 border border-[#D4AF37]/30 rounded-xl overflow-hidden shadow-lg">
                <ScrollArea className="w-full">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                        <thead>
                            <tr className="border-b border-[#D4AF37]/20 bg-black/50">
                                <th className="p-4 text-[#D4AF37] font-semibold">Nome do Cliente</th>
                                <th className="p-4 text-[#D4AF37] font-semibold">Plano Assinado</th>
                                <th className="p-4 text-[#D4AF37] font-semibold">Valor do Plano</th>
                                <th className="p-4 text-[#D4AF37] font-semibold">Data da Assinatura</th>
                                <th className="p-4 text-[#D4AF37] font-semibold text-center">Dias Restantes</th>
                                <th className="p-4 text-[#D4AF37] font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="6" className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#D4AF37]" /></td></tr> : 
                            filteredData.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-[#A9A9A9]">Nenhuma assinatura encontrada.</td></tr> : 
                            filteredData.map(item => (
                                <tr key={item.id} className="border-b border-[#D4AF37]/10 hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-white font-medium">{item.barbearia_clientes?.nome || 'Cliente não encontrado'}</td>
                                    <td className="p-4 text-[#A9A9A9]">{item.barbearia_tipos_planos?.nome || 'Plano não encontrado'}</td>
                                    <td className="p-4 text-[#D4AF37] font-bold">R$ {Number(item.valor).toFixed(2)}</td>
                                    <td className="p-4 text-[#A9A9A9]">{item.data_assinatura ? format(parseISO(item.data_assinatura), 'dd/MM/yyyy') : '-'}</td>
                                    <td className="p-4 text-white font-bold text-center">{item.diasRestantes !== undefined ? Math.max(0, item.diasRestantes) : '-'}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${item.calculatedStatus === 'ativa' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                            {item.calculatedStatus || 'desconhecido'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </ScrollArea>
            </div>
        </motion.div>
    );
};
export default ConsultaAssinaturasAtivas;