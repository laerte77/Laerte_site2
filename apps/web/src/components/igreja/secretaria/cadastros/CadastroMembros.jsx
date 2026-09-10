import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, UserPlus, Droplets, Flame, Search, Shield } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const CadastroMembros = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [membros, setMembros] = useState([]);
    const [filteredMembros, setFilteredMembros] = useState([]);
    const [conjuntos, setConjuntos] = useState([]);
    const [classes, setClasses] = useState([]);
    const [cargos, setCargos] = useState([]);
    const [funcoes, setFuncoes] = useState([]);
    
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMembro, setEditingMembro] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [pendingSubmitData, setPendingSubmitData] = useState(null);

    const [formState, setFormState] = useState({
        nome_completo: '',
        data_nascimento: '',
        estado_civil: '',
        data_entrada: '',
        classe_id: 'none',
        tem_multiplas_funcoes: 'nao',
        quantas_funcoes: '',
        funcoes_selecionadas: [],
        funcao_unica: 'none',
        cargo_id: 'none',
        participa_conjunto: 'nao',
        conjunto_id: 'none',
        is_dirigente: 'nao',
        dirige_conjunto_id: 'none',
        is_batizado_aguas: 'nao',
        is_batizado_espirito: 'nao',
        status: 'ATIVO'
    });

    const fetchInitialData = useCallback(async () => {
        try {
            const { data: conjuntosData } = await supabase.from('igreja_conjuntos').select('id, nome_conjunto').order('nome_conjunto', { ascending: true });
            setConjuntos(conjuntosData || []);
            const { data: classesData } = await supabase.from('igreja_classes').select('id, nome_classe').order('nome_classe', { ascending: true });
            setClasses(classesData || []);
            const { data: cargosData } = await supabase.from('cargos_igreja').select('id, nome_cargo').order('nome_cargo', { ascending: true });
            setCargos(cargosData || []);
            const { data: funcoesData } = await supabase.from('igreja_funcoes').select('id, nome_funcao').order('nome_funcao', { ascending: true });
            setFuncoes(funcoesData || []);
        } catch (error) {
            toast({ title: 'Erro ao buscar dados de apoio', description: error.message, variant: 'destructive' });
        }
    }, [toast]);

    const fetchMembros = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('igreja_membros')
                .select(`
                    *,
                    conjunto:igreja_conjuntos!igreja_membros_conjunto_id_fkey(nome_conjunto),
                    dirige_conjunto:igreja_conjuntos!igreja_membros_dirige_conjunto_id_fkey(nome_conjunto),
                    cargo:cargos_igreja(nome_cargo)
                `)
                .order('nome_completo', { ascending: true });

            if (error) throw error;
            setMembros(data || []);
        } catch (error) {
            toast({ title: 'Erro ao buscar membros', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInitialData();
        fetchMembros();
    }, [fetchInitialData, fetchMembros]);
    
    useEffect(() => {
        if (!user) return;
        const channel = supabase.channel('public:igreja_membros')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'igreja_membros' }, fetchMembros)
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [user, fetchMembros]);

    useEffect(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        let filtered = membros.filter(item =>
            (item.nome_completo && item.nome_completo.toLowerCase().includes(lowercasedFilter)) ||
            (item.cargo && item.cargo.nome_cargo.toLowerCase().includes(lowercasedFilter))
        );
        setFilteredMembros(filtered);
    }, [searchTerm, membros]);

    const resetForm = () => {
        setFormState({
            nome_completo: '', data_nascimento: '', estado_civil: '', data_entrada: '', classe_id: 'none',
            tem_multiplas_funcoes: 'nao', quantas_funcoes: '', funcoes_selecionadas: [], funcao_unica: 'none', cargo_id: 'none',
            participa_conjunto: 'nao', conjunto_id: 'none', is_dirigente: 'nao',
            dirige_conjunto_id: 'none', is_batizado_aguas: 'nao', is_batizado_espirito: 'nao', status: 'ATIVO'
        });
        setEditingMembro(null);
    };

    const handleOpenModal = (membro = null) => {
        if (membro) {
            setEditingMembro(membro);
            setFormState({
                nome_completo: membro.nome_completo || '',
                data_nascimento: membro.data_nascimento || '',
                estado_civil: membro.estado_civil || '',
                data_entrada: membro.data_entrada || '',
                classe_id: membro.classe_id || 'none',
                tem_multiplas_funcoes: membro.funcoes_multiplas?.quantidade && membro.funcoes_multiplas.quantidade > 1 ? 'sim' : 'nao',
                quantas_funcoes: membro.funcoes_multiplas?.quantidade && membro.funcoes_multiplas.quantidade > 1 ? String(membro.funcoes_multiplas.quantidade) : '',
                funcao_unica: (() => {
                    const quantidade = parseInt(membro.funcoes_multiplas?.quantidade, 10);
                    if (quantidade === 1) {
                        if (Array.isArray(membro.funcoes_multiplas?.funcoes_ids) && membro.funcoes_multiplas.funcoes_ids[0]) {
                            return membro.funcoes_multiplas.funcoes_ids[0];
                        } else if (membro.funcoes_exercidas) {
                            const encontrada = funcoes.find(f => f.nome_funcao.toLowerCase() === membro.funcoes_exercidas.trim().toLowerCase());
                            return encontrada ? encontrada.id : 'none';
                        }
                    }
                    return 'none';
                })(),
                funcoes_selecionadas: (() => {
                    const quantidade = parseInt(membro.funcoes_multiplas?.quantidade, 10);
                    if (!quantidade || quantidade === 1) return [];
                    let selecionadas = [];
                    if (Array.isArray(membro.funcoes_multiplas?.funcoes_ids)) {
                        selecionadas = [...membro.funcoes_multiplas.funcoes_ids];
                    } else if (membro.funcoes_exercidas) {
                        selecionadas = membro.funcoes_exercidas.split(',').map(nome => {
                            const encontrada = funcoes.find(f => f.nome_funcao.toLowerCase() === nome.trim().toLowerCase());
                            return encontrada ? encontrada.id : 'none';
                        });
                    }
                    return Array.from({ length: quantidade }, (_, i) => selecionadas[i] || 'none');
                })(),
                cargo_id: membro.cargo_id || 'none', 
                participa_conjunto: membro.participa_conjunto ? 'sim' : 'nao',
                conjunto_id: membro.conjunto_id || 'none',
                is_dirigente: membro.is_dirigente ? 'sim' : 'nao',
                dirige_conjunto_id: membro.dirige_conjunto_id || 'none',
                is_batizado_aguas: membro.is_batizado_aguas ? 'sim' : 'nao',
                is_batizado_espirito: membro.is_batizado_espirito ? 'sim' : 'nao',
                status: membro.status || 'ATIVO'
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        resetForm();
    }

    const handleInputChange = (key, value) => {
        setFormState(prev => ({...prev, [key]: value}));
    }

    const handleQuantidadeChange = (value) => {
        const quantidade = parseInt(value, 10);
        setFormState(prev => {
            const atuais = prev.funcoes_selecionadas || [];
            const novas = Array.from({ length: quantidade }, (_, i) => atuais[i] || 'none');
            return { ...prev, quantas_funcoes: value, funcoes_selecionadas: novas };
        });
    };

    const handleFuncaoChange = (index, value) => {
        setFormState(prev => {
            const novas = [...(prev.funcoes_selecionadas || [])];
            novas[index] = value;
            return { ...prev, funcoes_selecionadas: novas };
        });
    };

    const handleStatusChangeList = async (id, newStatus) => {
        try {
            const { error } = await supabase.from('igreja_membros').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            toast({ title: 'Sucesso', description: `Status atualizado para ${newStatus}` });
            fetchMembros();
        } catch (error) {
            toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        }
    };

    const prepareSubmitData = () => {
        const sanitizeUuid = (value) => (!value || value === 'none' || value === '') ? null : value;
        
        let funcoes_multiplas = null;
        let funcoes_exercidas = null;
        if (formState.tem_multiplas_funcoes === 'sim' && formState.quantas_funcoes) {
            const idsSelecionados = (formState.funcoes_selecionadas || []).filter(id => id && id !== 'none');
            const nomesSelecionados = idsSelecionados
                .map(id => funcoes.find(f => f.id === id)?.nome_funcao)
                .filter(Boolean);
            funcoes_multiplas = { quantidade: parseInt(formState.quantas_funcoes, 10), funcoes_ids: idsSelecionados };
            funcoes_exercidas = nomesSelecionados.join(', ');
        } else if (formState.tem_multiplas_funcoes === 'nao' && formState.funcao_unica && formState.funcao_unica !== 'none') {
            const nomeFuncao = funcoes.find(f => f.id === formState.funcao_unica)?.nome_funcao;
            funcoes_multiplas = { quantidade: 1, funcoes_ids: [formState.funcao_unica] };
            funcoes_exercidas = nomeFuncao || null;
        }

        return {
            nome_completo: formState.nome_completo.trim(),
            data_nascimento: formState.data_nascimento,
            estado_civil: formState.estado_civil,
            data_entrada: formState.data_entrada,
            classe_id: sanitizeUuid(formState.classe_id),
            funcoes_multiplas: funcoes_multiplas,
            funcoes_exercidas: funcoes_exercidas,
            cargo_id: sanitizeUuid(formState.cargo_id), 
            participa_conjunto: formState.participa_conjunto === 'sim',
            conjunto_id: formState.participa_conjunto === 'sim' ? sanitizeUuid(formState.conjunto_id) : null,
            is_dirigente: formState.is_dirigente === 'sim',
            dirige_conjunto_id: formState.is_dirigente === 'sim' ? sanitizeUuid(formState.dirige_conjunto_id) : null,
            is_batizado_aguas: formState.is_batizado_aguas === 'sim',
            is_batizado_espirito: formState.is_batizado_espirito === 'sim',
            status: formState.status || 'ATIVO',
            user_id: user.id
        };
    };

    const executeSubmit = async (upsertData) => {
        setLoading(true);
        try {
            let query = supabase.from('igreja_membros');
            if (editingMembro) {
                const { error } = await query.update(upsertData).eq('id', editingMembro.id);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Membro atualizado com sucesso.' });
                handleCloseModal();
            } else {
                const { error } = await query.insert([upsertData]);
                if (error) throw error;
                toast({ title: 'Sucesso!', description: 'Membro adicionado com sucesso.' });
                resetForm();
                handleCloseModal(); // Keep it close after insert
            }
            fetchMembros();
        } catch (error) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
            setIsConfirmOpen(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Strict Validation Check
        if (!formState.nome_completo.trim() || !formState.data_nascimento || !formState.estado_civil || !formState.data_entrada || formState.cargo_id === 'none') {
            toast({ title: 'Campos obrigatórios', description: 'Preencha todos os campos marcados com *', variant: 'destructive' });
            return;
        }
        if (formState.tem_multiplas_funcoes === 'sim') {
            if (!formState.quantas_funcoes) {
                toast({ title: 'Atenção', description: 'Informe quantas funções o membro possui.', variant: 'destructive' });
                return;
            }
            if ((formState.funcoes_selecionadas || []).some(v => !v || v === 'none')) {
                toast({ title: 'Atenção', description: 'Selecione todas as funções exercidas pelo membro.', variant: 'destructive' });
                return;
            }
        } else if (formState.tem_multiplas_funcoes === 'nao') {
            if (!formState.funcao_unica || formState.funcao_unica === 'none') {
                toast({ title: 'Atenção', description: 'Selecione a função exercida pelo membro.', variant: 'destructive' });
                return;
            }
        }
        if (formState.participa_conjunto === 'sim' && formState.conjunto_id === 'none') {
            toast({ title: 'Atenção', description: 'Selecione o conjunto.', variant: 'destructive' });
            return;
        }
        if (formState.is_dirigente === 'sim' && formState.dirige_conjunto_id === 'none') {
            toast({ title: 'Atenção', description: 'Selecione qual conjunto o membro dirige.', variant: 'destructive' });
            return;
        }

        if (!user) return;
        setLoading(true);
        try {
            // Prevent duplicate checking
            const { data: existingData, error: duplicateError } = await supabase
                .from('igreja_membros')
                .select('id, nome_completo')
                .ilike('nome_completo', formState.nome_completo.trim());
            
            if (duplicateError) throw duplicateError;
            
            const duplicateExists = existingData && existingData.some(m => (!editingMembro || m.id !== editingMembro.id) && m.nome_completo.toLowerCase() === formState.nome_completo.trim().toLowerCase());
            const upsertData = prepareSubmitData();

            if (duplicateExists) {
                setPendingSubmitData(upsertData);
                setIsConfirmOpen(true);
                setLoading(false);
                return;
            }
            await executeSubmit(upsertData);
        } catch (error) {
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            const { error } = await supabase.from('igreja_membros').delete().eq('id', id);
            if (error) throw error;
            toast({ title: 'Membro excluído', description: 'O membro foi removido com sucesso.' });
            fetchMembros();
        } catch (error) {
            toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 bg-background min-h-screen">
            <Helmet>
                <title>Cadastro de Membros | Secretaria Digital</title>
            </Helmet>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Membros</h1>
                    <p className="text-muted-foreground">Gerencie o rol de membros e informações ministeriais</p>
                </div>
                <Button onClick={() => handleOpenModal()} className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90">
                    <UserPlus className="mr-2 h-4 w-4" /> Novo Membro
                </Button>
            </header>

            <Card className="shadow-sm border-muted glass-card">
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg">Listagem Geral</CardTitle>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    {loading && membros.length === 0 ? (
                        <div className="flex items-center justify-center p-12">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">Nome Completo</TableHead>
                                    <TableHead>Cargo Ministerial</TableHead>
                                    <TableHead>Batismos</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <AnimatePresence mode="popLayout">
                                    {filteredMembros.length > 0 ? (
                                        filteredMembros.map((membro) => (
                                            <motion.tr key={membro.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="group hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium">
                                                    <div>
                                                        {membro.nome_completo}
                                                        {membro.is_dirigente && (
                                                            <Badge variant="secondary" className="ml-2 scale-90 bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                                                                Dirigente
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-sm font-semibold text-primary flex items-center">
                                                            <Shield className="h-3 w-3 mr-1" />
                                                            {membro.cargo?.nome_cargo || 'Nenhum Cargo'}
                                                        </span>
                                                        {membro.funcoes_multiplas?.quantidade && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {membro.funcoes_multiplas.quantidade} Função(ões)
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Badge variant="outline" className={membro.is_batizado_aguas ? "text-blue-600 border-blue-200 bg-blue-50" : "text-muted-foreground opacity-40"}>
                                                            <Droplets className="h-3 w-3 mr-1" /> Águas
                                                        </Badge>
                                                        <Badge variant="outline" className={membro.is_batizado_espirito ? "text-orange-600 border-orange-200 bg-orange-50" : "text-muted-foreground opacity-40"}>
                                                            <Flame className="h-3 w-3 mr-1" /> Espírito
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Select value={membro.status || 'ATIVO'} onValueChange={(val) => handleStatusChangeList(membro.id, val)}>
                                                        <SelectTrigger className={`h-8 w-28 text-xs ${membro.status === 'ATIVO' ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-red-500 text-red-500 bg-red-500/10'}`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="ATIVO" className="text-green-500 font-semibold">Ativo</SelectItem>
                                                            <SelectItem value="INATIVO" className="text-red-500 font-semibold">Inativo</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(membro)}>
                                                            <Edit className="h-4 w-4 text-primary" />
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="hover:text-destructive">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                                    <AlertDialogDescription>Deseja realmente remover {membro.nome_completo}?</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(membro.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Nenhum membro encontrado.</TableCell></TableRow>
                                    )}
                                </AnimatePresence>
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
                <DialogContent className="max-w-3xl max-h-[90vh] bg-card border-border text-foreground p-0 flex flex-col gap-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
                        <DialogTitle className="text-xl flex items-center gap-2 text-primary">
                            {editingMembro ? <Edit className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                            {editingMembro ? 'Editar Membro' : 'Cadastrar Novo Membro'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-4 modal-form-scroll">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 pb-2">
                                
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="nome_completo">1. Nome Completo <span className="text-red-500">*</span></Label>
                                    <Input id="nome_completo" value={formState.nome_completo} onChange={(e) => handleInputChange('nome_completo', e.target.value)} placeholder="Digite o nome completo" required className="bg-input" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="data_nascimento">2. Data de Nascimento <span className="text-red-500">*</span></Label>
                                    <Input id="data_nascimento" type="date" value={formState.data_nascimento} onChange={(e) => handleInputChange('data_nascimento', e.target.value)} required className="bg-input [color-scheme:dark]" />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="estado_civil">3. Estado Civil <span className="text-red-500">*</span></Label>
                                    <Select value={formState.estado_civil} onValueChange={(val) => handleInputChange('estado_civil', val)}>
                                        <SelectTrigger id="estado_civil" className="bg-input"><SelectValue placeholder="Selecione" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                                            <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                                            <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                                            <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="data_entrada">4. Data de Entrada no Ministério <span className="text-red-500">*</span></Label>
                                    <Input id="data_entrada" type="date" value={formState.data_entrada} onChange={(e) => handleInputChange('data_entrada', e.target.value)} required className="bg-input [color-scheme:dark]" />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="classe_id">5. Classe da EBD (Opcional)</Label>
                                    <Select value={formState.classe_id || 'none'} onValueChange={(val) => handleInputChange('classe_id', val)}>
                                        <SelectTrigger id="classe_id" className="bg-input"><SelectValue placeholder="Selecione a classe" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Nenhuma</SelectItem>
                                            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_classe}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="md:col-span-2 p-4 bg-muted/30 rounded-lg border border-border mt-2 space-y-4">
                                    <div className="space-y-2">
                                        <Label>6. O Membro Tem Mais de Uma Função? <span className="text-red-500">*</span></Label>
                                        <RadioGroup value={formState.tem_multiplas_funcoes} onValueChange={(val) => handleInputChange('tem_multiplas_funcoes', val)} className="flex gap-6 mt-2">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="mult-sim" /><Label htmlFor="mult-sim" className="cursor-pointer">Sim</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="mult-nao" /><Label htmlFor="mult-nao" className="cursor-pointer">Não</Label></div>
                                        </RadioGroup>
                                    </div>
                                    
                                    {formState.tem_multiplas_funcoes === 'sim' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-border">
                                            <div className="space-y-2">
                                                <Label htmlFor="quantas_funcoes">Quantas Funções? <span className="text-red-500">*</span></Label>
                                                <Select value={formState.quantas_funcoes || ''} onValueChange={handleQuantidadeChange}>
                                                    <SelectTrigger id="quantas_funcoes" className="bg-input md:w-1/2"><SelectValue placeholder="Selecione a quantidade" /></SelectTrigger>
                                                    <SelectContent>
                                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <SelectItem key={n} value={String(n)}>{n} funções</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            {formState.quantas_funcoes && (
                                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {(formState.funcoes_selecionadas || []).map((funcaoId, index) => (
                                                        <div key={index} className="space-y-2">
                                                            <Label htmlFor={`funcao_exercida_${index}`}>Função {index + 1} <span className="text-red-500">*</span></Label>
                                                            <Select value={funcaoId || 'none'} onValueChange={(val) => handleFuncaoChange(index, val)}>
                                                                <SelectTrigger id={`funcao_exercida_${index}`} className="bg-input"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Nenhuma</SelectItem>
                                                                    {funcoes.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_funcao}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    )}
                                    
                                    {formState.tem_multiplas_funcoes === 'nao' && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-4 border-t border-border">
                                            <Label htmlFor="funcao_unica">Qual Função Exercida? <span className="text-red-500">*</span></Label>
                                            <Select value={formState.funcao_unica || 'none'} onValueChange={(val) => handleInputChange('funcao_unica', val)}>
                                                <SelectTrigger id="funcao_unica" className="bg-input md:w-1/2"><SelectValue placeholder="Selecione a função" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none" disabled>Selecione...</SelectItem>
                                                    {funcoes.map(f => <SelectItem key={f.id} value={f.id}>{f.nome_funcao}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </motion.div>
                                    )}
                                </div>

                                <div className="md:col-span-2 space-y-2 mt-2">
                                    <Label htmlFor="cargo_id">7. Cargo Ministerial <span className="text-red-500">*</span></Label>
                                    <Select value={formState.cargo_id || 'none'} onValueChange={(val) => handleInputChange('cargo_id', val)}>
                                        <SelectTrigger id="cargo_id" className="bg-input"><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" disabled>Selecione um cargo...</SelectItem>
                                            {cargos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_cargo}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border border-border mt-2">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>8. Participa de Conjunto? <span className="text-red-500">*</span></Label>
                                            <RadioGroup value={formState.participa_conjunto} onValueChange={(val) => handleInputChange('participa_conjunto', val)} className="flex gap-6 mt-2">
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="part-sim" /><Label htmlFor="part-sim" className="cursor-pointer">Sim</Label></div>
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="part-nao" /><Label htmlFor="part-nao" className="cursor-pointer">Não</Label></div>
                                            </RadioGroup>
                                        </div>
                                        
                                        {formState.participa_conjunto === 'sim' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-2 border-t border-border">
                                                <Label htmlFor="conjunto_id">Qual Conjunto? <span className="text-red-500">*</span></Label>
                                                <Select value={formState.conjunto_id || 'none'} onValueChange={(val) => handleInputChange('conjunto_id', val)}>
                                                    <SelectTrigger id="conjunto_id" className="bg-input"><SelectValue placeholder="Selecione o conjunto" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none" disabled>Selecione...</SelectItem>
                                                        {conjuntos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_conjunto}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </motion.div>
                                        )}
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>9. É Dirigente? <span className="text-red-500">*</span></Label>
                                            <RadioGroup value={formState.is_dirigente} onValueChange={(val) => handleInputChange('is_dirigente', val)} className="flex gap-6 mt-2">
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="dir-sim" /><Label htmlFor="dir-sim" className="cursor-pointer">Sim</Label></div>
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="dir-nao" /><Label htmlFor="dir-nao" className="cursor-pointer">Não</Label></div>
                                            </RadioGroup>
                                        </div>
                                        
                                        {formState.is_dirigente === 'sim' && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-2 border-t border-border">
                                                <Label htmlFor="dirige_conjunto_id">Qual Conjunto que Dirige? <span className="text-red-500">*</span></Label>
                                                <Select value={formState.dirige_conjunto_id || 'none'} onValueChange={(val) => handleInputChange('dirige_conjunto_id', val)}>
                                                    <SelectTrigger id="dirige_conjunto_id" className="bg-input"><SelectValue placeholder="Selecione o conjunto" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none" disabled>Selecione...</SelectItem>
                                                        {conjuntos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_conjunto}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-border rounded-lg mt-2">
                                    <div className="space-y-2">
                                        <Label>10. Batizado nas Águas?</Label>
                                        <RadioGroup value={formState.is_batizado_aguas} onValueChange={(val) => handleInputChange('is_batizado_aguas', val)} className="flex gap-6 mt-2">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="aguas-sim" /><Label htmlFor="aguas-sim" className="cursor-pointer text-blue-500 font-medium">Sim</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="aguas-nao" /><Label htmlFor="aguas-nao" className="cursor-pointer">Não</Label></div>
                                        </RadioGroup>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>11. Batizado no Espírito Santo?</Label>
                                        <RadioGroup value={formState.is_batizado_espirito} onValueChange={(val) => handleInputChange('is_batizado_espirito', val)} className="flex gap-6 mt-2">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="sim" id="espirito-sim" /><Label htmlFor="espirito-sim" className="cursor-pointer text-orange-500 font-medium">Sim</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="nao" id="espirito-nao" /><Label htmlFor="espirito-nao" className="cursor-pointer">Não</Label></div>
                                        </RadioGroup>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0 border-t border-border px-6 py-4 mt-auto shrink-0 bg-card">
                            <Button type="button" variant="outline" onClick={handleCloseModal} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={loading} className="min-w-[120px] bg-primary text-primary-foreground hover:bg-primary/90">
                                {loading ? <div className="mr-2 h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : null}
                                {editingMembro ? 'Salvar Alterações' : 'Salvar Membro'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent className="bg-card text-foreground border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Possível Duplicidade</AlertDialogTitle>
                        <AlertDialogDescription>
                            O nome "{formState.nome_completo}" já está registrado no sistema. Deseja cadastrar mesmo assim?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsConfirmOpen(false)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => executeSubmit(pendingSubmitData)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            Sim, Cadastrar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default CadastroMembros;