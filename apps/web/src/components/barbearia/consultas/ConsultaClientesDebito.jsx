import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { parseISO, format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

const ConsultaClientesDebito = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [debitos, setDebitos] = useState([]);
    
    const [clientesList, setClientesList] = useState([]);
    const [filterCliente, setFilterCliente] = useState('');
    const [filterStatus, setFilterStatus] = useState('devendo');

    const fetchDados = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('barbearia_lancamentos_debitos')
                .select(`
                    id, data, valor, status, tem_servico,
                    barbearia_clientes(id, nome),
                    barbearia_tipos_corte(nome),
                    barbearia_servicos(nome)
                `)
                .eq('user_id', user.id)
                .order('data', { ascending: false });
            
            if (error) throw error;
            
            setDebitos(data || []);
            
            const cList = [];
            (data||[]).forEach(p => {
                if (p.barbearia_clientes && !cList.find(x => x.id === p.barbearia_clientes.id)) {
                    cList.push(p.barbearia_clientes);
                }
            });
            setClientesList(cList.sort((a,b) => a.nome.localeCompare(b.nome)));

        } catch (error) { 
            console.error(error);
            toast({ title: 'Erro', description: 'Não foi possível carregar os dados.', variant: 'destructive' }); 
        } finally { 
            setLoading(false); 
        }
    };

    useEffect(() => { fetchDados(); }, [user]);

    const handleMarcarPago = async (id) => {
        try {
            const { error } = await supabase.from('barbearia_lancamentos_debitos').update({ status: 'paga' }).eq('id', id);
            if (error) throw error;
            toast({ title: 'Sucesso', description: 'Débito marcado como pago!' });
            fetchDados();
        } catch (error) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    };

    const filteredData = debitos.filter(d => {
        if (filterCliente && d.barbearia_clientes?.id !== filterCliente) return false;
        if (filterStatus !== 'all' && d.status !== filterStatus) return false;
        return true;
    });

    const formatDescricao = (item) => {
        let desc = item.barbearia_tipos_corte?.nome || 'Corte';
        if (item.tem_servico && item.barbearia_servicos) {
            desc += ` + ${item.barbearia_servicos.nome}`;
        }
        return desc;
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-3xl font-bold text-red-400 uppercase mb-6">Clientes em Débito (Fiado)</h2>
            
            <div className="flex flex-wrap gap-4 bg-gray-900/80 p-4 rounded-xl border border-red-500/20 shadow-lg">
                <div className="flex-1 min-w-[200px]">
                    <select value={filterCliente} onChange={e=>setFilterCliente(e.target.value)} className="w-full bg-black border border-red-500/30 text-white p-2.5 rounded-md focus:ring-2 focus:ring-red-500/50">
                        <option value="">Todos os Clientes</option>
                        {clientesList.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                </div>
                <div className="w-48">
                    <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="w-full bg-black border border-red-500/30 text-white p-2.5 rounded-md focus:ring-2 focus:ring-red-500/50">
                        <option value="all">Todos os Status</option>
                        <option value="devendo">Devendo</option>
                        <option value="paga">Pago</option>
                    </select>
                </div>
            </div>

            <div className="bg-gray-900/80 border border-red-500/30 rounded-xl overflow-hidden shadow-lg">
                <ScrollArea className="w-full">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                        <thead>
                            <tr className="border-b border-red-500/20 bg-black/50">
                                <th className="p-4 text-red-400 font-semibold">Nome do Cliente</th>
                                <th className="p-4 text-red-400 font-semibold">Corte e Serviço Realizado</th>
                                <th className="p-4 text-red-400 font-semibold">Valor</th>
                                <th className="p-4 text-red-400 font-semibold">Data da Dívida</th>
                                <th className="p-4 text-red-400 font-semibold text-center">Status</th>
                                <th className="p-4 text-right text-red-400 font-semibold">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="6" className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-red-400" /></td></tr> : 
                            filteredData.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-[#A9A9A9]">Nenhum registro encontrado.</td></tr> : 
                            filteredData.map(item => (
                                <tr key={item.id} className="border-b border-red-500/10 hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-white font-medium">{item.barbearia_clientes?.nome || 'N/A'}</td>
                                    <td className="p-4 text-[#A9A9A9]">{formatDescricao(item)}</td>
                                    <td className="p-4 font-bold text-red-400">R$ {Number(item.valor).toFixed(2)}</td>
                                    <td className="p-4 text-[#A9A9A9]">{item.data ? format(parseISO(item.data), 'dd/MM/yyyy') : '-'}</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${item.status === 'paga' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {item.status === 'devendo' && (
                                            <Button size="sm" onClick={() => handleMarcarPago(item.id)} className="bg-green-600 hover:bg-green-700 text-white font-bold h-8 text-xs transition-colors">
                                                <CheckCircle className="w-4 h-4 mr-2" /> Marcar como Pago
                                            </Button>
                                        )}
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
export default ConsultaClientesDebito;