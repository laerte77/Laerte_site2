import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, ShoppingCart, Package } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

const CadastroPedidos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  
  const initialFormData = {
    data_pedido: new Date().toISOString().split('T')[0],
    cliente_id: '',
    data_entrega: '',
    sem_data_prevista: false,
    status: 'Pendente'
  };

  const [formData, setFormData] = useState(initialFormData);
  const [items, setItems] = useState([{ servico_id: '', quantidade: 1 }]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [clientesRes, servicosRes] = await Promise.all([
        supabase.from('lm_clientes').select('id, nome').eq('user_id', user.id).order('nome', { ascending: true }),
        supabase.from('lm_servicos').select('id, servico, valor').eq('user_id', user.id).order('servico', { ascending: true })
      ]);

      if (!isMountedRef.current) return;
      if (clientesRes.error) throw clientesRes.error;
      if (servicosRes.error) throw servicosRes.error;

      setClientes(clientesRes.data || []);
      setServicos(servicosRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddItem = () => {
    setItems([...items, { servico_id: '', quantidade: 1 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      toast({ title: 'Atenção', description: 'É necessário pelo menos um item no pedido.', variant: 'destructive' });
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.cliente_id) {
      toast({ title: 'Campo obrigatório', description: 'Selecione um cliente.', variant: 'destructive' });
      return;
    }

    const validItems = items.filter(item => item.servico_id && item.quantidade > 0);
    if (validItems.length === 0) {
      toast({ title: 'Items obrigatórios', description: 'Adicione pelo menos um item ao pedido.', variant: 'destructive' });
      return;
    }

    try {
      // Insert pedido
      const pedidoPayload = {
        user_id: user.id,
        data_pedido: formData.data_pedido,
        cliente_id: formData.cliente_id,
        data_entrega: formData.sem_data_prevista ? null : (formData.data_entrega || null),
        status: formData.status
      };

      const { data: pedido, error: pedidoError } = await supabase
        .from('lm_pedidos')
        .insert([pedidoPayload])
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Insert items
      const itemsPayload = validItems.map(item => ({
        pedido_id: pedido.id,
        servico_id: item.servico_id,
        quantidade: parseInt(item.quantidade)
      }));

      const { error: itemsError } = await supabase.from('lm_pedido_itens').insert(itemsPayload);
      if (itemsError) throw itemsError;

      toast({ title: 'Sucesso', description: 'Pedido cadastrado com sucesso!' });
      
      // Reset form but keep modal open
      setFormData({ ...initialFormData, data_pedido: formData.data_pedido });
      setItems([{ servico_id: '', quantidade: 1 }]);
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      toast({ title: 'Erro', description: 'Falha ao cadastrar pedido.', variant: 'destructive' });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormData);
    setItems([{ servico_id: '', quantidade: 1 }]);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Cadastro de Pedidos</h1>
          <p className="text-muted-foreground mt-1">Registre novos pedidos de clientes.</p>
        </div>
      </div>

      <Card className="shadow-sm border-border/50 max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Gerenciar Pedidos
          </CardTitle>
          <CardDescription>
            Clique no botão abaixo para iniciar o cadastro contínuo de pedidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Novo Pedido
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Novo Pedido
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_pedido">Data do Pedido <span className="text-red-500">*</span></Label>
                <Input 
                  type="date" 
                  id="data_pedido" 
                  value={formData.data_pedido} 
                  onChange={(e) => setFormData({...formData, data_pedido: e.target.value})}
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cliente_id">Cliente <span className="text-red-500">*</span></Label>
                <Select value={formData.cliente_id} onValueChange={(val) => setFormData({...formData, cliente_id: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-48">
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>{cliente.nome}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-base font-semibold">Itens do Pedido <span className="text-red-500">*</span></Label>
                <Button type="button" size="sm" variant="outline" onClick={handleAddItem}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar Item
                </Button>
              </div>

              <div 
                className="space-y-3 overflow-y-auto overflow-x-hidden pr-2"
                style={{ 
                  maxHeight: '300px',
                  scrollBehavior: 'smooth'
                }}
              >
                <style>{`
                  .items-scrollbar::-webkit-scrollbar {
                    width: 8px;
                  }
                  .items-scrollbar::-webkit-scrollbar-track {
                    background: hsl(var(--muted));
                    border-radius: 4px;
                  }
                  .items-scrollbar::-webkit-scrollbar-thumb {
                    background: hsl(var(--primary) / 0.5);
                    border-radius: 4px;
                    transition: background 0.2s ease;
                  }
                  .items-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--primary) / 0.7);
                  }
                  .items-scrollbar {
                    scrollbar-width: thin;
                    scrollbar-color: hsl(var(--primary) / 0.5) hsl(var(--muted));
                  }
                `}</style>
                <div className="items-scrollbar">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-end mb-3">
                      <div className="flex-1 space-y-2">
                        <Label className="text-xs">Serviço</Label>
                        <Select 
                          value={item.servico_id} 
                          onValueChange={(val) => handleItemChange(index, 'servico_id', val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {servicos.map((servico) => (
                              <SelectItem key={servico.id} value={servico.id}>
                                {servico.servico} - R$ {parseFloat(servico.valor || 0).toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-24 space-y-2">
                        <Label className="text-xs">Quantidade</Label>
                        <Input 
                          type="number" 
                          min="1" 
                          value={item.quantidade}
                          onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                        />
                      </div>
                      
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_entrega">Data da Entrega</Label>
                  <Input 
                    type="date" 
                    id="data_entrega" 
                    value={formData.data_entrega} 
                    onChange={(e) => setFormData({...formData, data_entrega: e.target.value})}
                    disabled={formData.sem_data_prevista}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Status do Pedido <span className="text-red-500">*</span></Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendente">Pendente</SelectItem>
                      <SelectItem value="Entregue">Entregue</SelectItem>
                      <SelectItem value="Atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sem_data" 
                  checked={formData.sem_data_prevista}
                  onCheckedChange={(checked) => setFormData({...formData, sem_data_prevista: checked, data_entrega: ''})}
                />
                <Label htmlFor="sem_data" className="cursor-pointer text-sm">
                  Sem Data Prevista
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-6">
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">Salvar Pedido</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CadastroPedidos;