import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const classesDisponiveis = ["CÍRCULO DE ORAÇÃO", "MOCIDADE", "CAMPANHA EVANGELIZADORA", "SENHORES", "ESCOLA DOMINICAL"];

const CadastroConjuntos = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [conjuntos, setConjuntos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentConjunto, setCurrentConjunto] = useState(null);
    const [formData, setFormData] = useState({ nome_conjunto: '', classe: '' });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('igreja_conjuntos').select('*').order('nome_conjunto', { ascending: true });
            if (error) throw error;
            setConjuntos(data || []);
        } catch (error) {
            toast({ title: "Erro ao buscar conjuntos", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (!user) return;
        const channel = supabase.channel('public:igreja_conjuntos').on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_conjuntos' }, fetchData).subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const resetForm = () => {
        setFormData({ nome_conjunto: '', classe: '' });
        setCurrentConjunto(null);
    };

    const handleSave = async () => {
        if (!formData.nome_conjunto.trim() || !formData.classe) {
            toast({ title: 'Erro de Validação', description: 'Nome do conjunto e classe são obrigatórios.', variant: 'destructive' });
            return;
        }

        const dataToSave = {
            nome_conjunto: formData.nome_conjunto.trim(),
            classe: formData.classe,
            user_id: user.id
        };

        try {
            if (currentConjunto) {
                const { error } = await supabase.from('igreja_conjuntos').update(dataToSave).eq('id', currentConjunto.id);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Conjunto atualizado com sucesso.' });
            } else {
                const { error } = await supabase.from('igreja_conjuntos').insert(dataToSave);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Novo conjunto cadastrado com sucesso.' });
            }
            closeDialog();
        } catch (error) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        }
    };

    const openDialog = (conjunto = null) => {
        if (conjunto) {
            setCurrentConjunto(conjunto);
            setFormData({ nome_conjunto: conjunto.nome_conjunto || '', classe: conjunto.classe || '' });
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
            const { error } = await supabase.from('igreja_conjuntos').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Sucesso', description: 'Conjunto removido.' });
        } catch (error) {
            toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-300">Cadastro de Conjuntos</h2>
                    <p className="text-muted-foreground">Gerencie os conjuntos e departamentos da igreja.</p>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Novo Conjunto</Button>
                    </DialogTrigger>
                    <DialogContent className="dark-igreja sm:max-w-[425px] bg-card border-green-500/20">
                        <DialogHeader>
                            <DialogTitle className="text-primary">{currentConjunto ? 'Editar' : 'Novo'} Conjunto</DialogTitle>
                            <DialogDescription>Preencha os dados do conjunto abaixo.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div>
                                <Label htmlFor="nome_conjunto">Nome do Conjunto</Label>
                                <Input id="nome_conjunto" value={formData.nome_conjunto} onChange={e => setFormData({ ...formData, nome_conjunto: e.target.value })} className="bg-input" />
                            </div>
                            <div>
                                <Label htmlFor="classe">Classe</Label>
                                <Select value={formData.classe || ''} onValueChange={v => setFormData({ ...formData, classe: v })}>
                                    <SelectTrigger id="classe" className="bg-input">
                                        <SelectValue placeholder="Selecione uma classe" />
                                    </SelectTrigger>
                                    <SelectContent className="dark-igreja">
                                        {classesDisponiveis.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
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
                                <th className="p-4 text-left font-semibold text-muted-foreground">Conjunto</th>
                                <th className="p-4 text-left font-semibold text-muted-foreground">Classe</th>
                                <th className="p-4 text-right font-semibold text-muted-foreground">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="3" className="p-8 text-center">Carregando...</td></tr>
                            ) : conjuntos.length === 0 ? (
                                <tr><td colSpan="3" className="p-8 text-center text-muted-foreground"><Music className="mx-auto w-10 h-10 mb-2" />Nenhum conjunto cadastrado.</td></tr>
                            ) : (
                                conjuntos.map((conjunto) => (
                                    <tr key={conjunto.id} className="border-b border-green-500/10 last:border-b-0 hover:bg-accent/50">
                                        <td className="p-4 text-foreground">{conjunto.nome_conjunto}</td>
                                        <td className="p-4 text-foreground">{conjunto.classe}</td>
                                        <td className="p-4 flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openDialog(conjunto)}><Edit className="w-4 h-4 text-primary" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent className="dark-igreja">
                                                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja realmente remover o conjunto "{conjunto.nome_conjunto}"?</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(conjunto.id)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction></AlertDialogFooter>
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

export default CadastroConjuntos;