import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const CadastroFuncoes = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [funcoes, setFuncoes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentFuncao, setCurrentFuncao] = useState(null);
    const [formData, setFormData] = useState({ nome_funcao: '' });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('igreja_funcoes').select('*').order('nome_funcao', { ascending: true });
            if (error) throw error;
            setFuncoes(data || []);
        } catch (error) {
            toast({ title: "Erro ao buscar funções", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        if (!user) return;
        const channel = supabase.channel('public:igreja_funcoes').on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_funcoes' }, fetchData).subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const resetForm = () => {
        setFormData({ nome_funcao: '' });
        setCurrentFuncao(null);
    };

    const handleSave = async () => {
        if (!formData.nome_funcao.trim()) {
            toast({ title: 'Erro de Validação', description: 'O nome da função é obrigatório.', variant: 'destructive' });
            return;
        }

        const dataToSave = {
            nome_funcao: formData.nome_funcao.trim(),
            user_id: user.id
        };

        try {
            if (currentFuncao) {
                const { error } = await supabase.from('igreja_funcoes').update(dataToSave).eq('id', currentFuncao.id);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Função atualizada com sucesso.' });
            } else {
                const { error } = await supabase.from('igreja_funcoes').insert(dataToSave);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Nova função cadastrada com sucesso.' });
            }
            closeDialog();
        } catch (error) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        }
    };
    
    const openDialog = (funcao = null) => {
        if (funcao) {
            setCurrentFuncao(funcao);
            setFormData({ nome_funcao: funcao.nome_funcao || '' });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };
    
    const closeDialog = () => {
        setIsDialogOpen(false);
        resetForm();
    };

    const handleDelete = async (id) => {
        try {
            const { count, error: checkError } = await supabase
                .from('igreja_membros')
                .select('*', { count: 'exact', head: true })
                .eq('funcao_id', id);

            if (checkError) {
                console.error("Erro ao verificar vínculos:", checkError);
                throw new Error("Não foi possível verificar os vínculos desta função.");
            }

            if (count > 0) {
                toast({
                    title: 'Operação Bloqueada',
                    description: `Esta função está vinculada a ${count} membro(s). Remova o vínculo antes de excluir.`,
                    variant: 'destructive'
                });
                return;
            }

            const { error } = await supabase.from('igreja_funcoes').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Sucesso', description: 'Função removida.' });
        } catch (error) {
            toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-300">Cadastro de Funções</h2>
                    <p className="text-muted-foreground">Gerencie as funções e cargos da igreja.</p>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Nova Função</Button>
                    </DialogTrigger>
                    <DialogContent className="dark-igreja sm:max-w-[425px] bg-card border-green-500/20">
                        <DialogHeader>
                            <DialogTitle className="text-primary">{currentFuncao ? 'Editar' : 'Nova'} Função</DialogTitle>
                            <DialogDescription>Preencha o nome da função abaixo.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div>
                                <Label htmlFor="nome_funcao">Nome da Função</Label>
                                <Input id="nome_funcao" value={formData.nome_funcao} onChange={e => setFormData({ ...formData, nome_funcao: e.target.value })} className="bg-input" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Salvar</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-card/80 backdrop-blur-sm border border-green-500/10 rounded-xl shadow-lg shadow-green-500/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-green-500/10">
                                <th className="p-4 text-left font-semibold text-muted-foreground">Função</th>
                                <th className="p-4 text-right font-semibold text-muted-foreground">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="2" className="p-8 text-center">Carregando...</td></tr>
                            ) : funcoes.length === 0 ? (
                                <tr><td colSpan="2" className="p-8 text-center text-muted-foreground"><Briefcase className="mx-auto w-10 h-10 mb-2" />Nenhuma função cadastrada.</td></tr>
                            ) : (
                                funcoes.map((funcao) => (
                                    <tr key={funcao.id} className="border-b border-green-500/10 last:border-b-0 hover:bg-accent/50">
                                        <td className="p-4 text-foreground">{funcao.nome_funcao}</td>
                                        <td className="p-4 flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openDialog(funcao)}><Edit className="w-4 h-4 text-primary" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent className="dark-igreja">
                                                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja realmente remover a função "{funcao.nome_funcao}"? Esta ação é irreversível.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(funcao.id)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </motion.div>
    );
};

export default CadastroFuncoes;