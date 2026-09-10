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

const CadastroCargos = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [cargos, setCargos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentCargo, setCurrentCargo] = useState(null);
    const [formData, setFormData] = useState({ nome_cargo: '' });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('cargos_igreja').select('*').order('nome_cargo', { ascending: true });
            if (error) throw error;
            setCargos(data || []);
        } catch (error) {
            toast({ title: "Erro ao buscar cargos", description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        if (!user) return;
        const channel = supabase.channel('public:cargos_igreja').on('postgres_changes', { event: '*', schema: 'public', table: 'cargos_igreja' }, fetchData).subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchData]);

    const resetForm = () => {
        setFormData({ nome_cargo: '' });
        setCurrentCargo(null);
    };

    const handleSave = async () => {
        if (!formData.nome_cargo.trim()) {
            toast({ title: 'Erro de Validação', description: 'O nome do cargo é obrigatório.', variant: 'destructive' });
            return;
        }

        const dataToSave = {
            nome_cargo: formData.nome_cargo.trim(),
            user_id: user.id
        };

        try {
            if (currentCargo) {
                const { error } = await supabase.from('cargos_igreja').update(dataToSave).eq('id', currentCargo.id);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Cargo atualizado com sucesso.' });
                resetForm();
            } else {
                const { error } = await supabase.from('cargos_igreja').insert(dataToSave);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Novo cargo cadastrado com sucesso.' });
                resetForm();
            }
        } catch (error) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        }
    };
    
    const openDialog = (cargo = null) => {
        if (cargo) {
            setCurrentCargo(cargo);
            setFormData({ nome_cargo: cargo.nome_cargo || '' });
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
            const { error } = await supabase.from('cargos_igreja').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Sucesso', description: 'Cargo removido.' });
        } catch (error) {
            toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-green-300">Cadastro de Cargos</h2>
                    <p className="text-muted-foreground">Gerencie os cargos ministeriais e administrativos.</p>
                </div>
                 <Dialog open={isDialogOpen} onOpenChange={(open) => {
                     if (!open) closeDialog();
                     else setIsDialogOpen(true);
                 }}>
                    <DialogTrigger asChild>
                        <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary/90 text-primary-foreground"><Plus className="w-4 h-4 mr-2" /> Novo Cargo</Button>
                    </DialogTrigger>
                    <DialogContent className="dark-igreja sm:max-w-[425px] bg-card border-green-500/20">
                        <DialogHeader>
                            <DialogTitle className="text-primary">{currentCargo ? 'Editar' : 'Novo'} Cargo</DialogTitle>
                            <DialogDescription>Preencha o nome do cargo abaixo.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div>
                                <Label htmlFor="nome_cargo">Nome do Cargo</Label>
                                <Input 
                                    id="nome_cargo" 
                                    value={formData.nome_cargo} 
                                    onChange={e => setFormData({ ...formData, nome_cargo: e.target.value })} 
                                    className="bg-input" 
                                    placeholder="Ex: Diácono, Presbítero, Tesoureiro"
                                />
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
                                <th className="p-4 text-left font-semibold text-muted-foreground">Cargo</th>
                                <th className="p-4 text-right font-semibold text-muted-foreground">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="2" className="p-8 text-center">Carregando...</td></tr>
                            ) : cargos.length === 0 ? (
                                <tr><td colSpan="2" className="p-8 text-center text-muted-foreground"><Briefcase className="mx-auto w-10 h-10 mb-2" />Nenhum cargo cadastrado.</td></tr>
                            ) : (
                                cargos.map((cargo) => (
                                    <tr key={cargo.id} className="border-b border-green-500/10 last:border-b-0 hover:bg-accent/50">
                                        <td className="p-4 text-foreground">{cargo.nome_cargo}</td>
                                        <td className="p-4 flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openDialog(cargo)}><Edit className="w-4 h-4 text-primary" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash className="w-4 h-4 text-red-500" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent className="dark-igreja">
                                                    <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja realmente remover o cargo "{cargo.nome_cargo}"? Esta ação é irreversível.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(cargo.id)} className="bg-red-600 hover:bg-red-700">Deletar</AlertDialogAction></AlertDialogFooter>
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

export default CadastroCargos;