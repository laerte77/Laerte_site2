import React from 'react';
import { Plus, Trash2, AlertCircle, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const normalizar = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();

const FolhasTable = ({ folhas = [], setFolhas, tiposFolha = [], estoqueAtual = {}, disabled = false }) => {
  const addRow = () => setFolhas(prev => [...prev, { tipo_folha: '', quantidade: '1', e_rascunho: false }]);

  const removeRow = index => setFolhas(prev => prev.filter((_, i) => i !== index));

  const updateRow = (index, field, value) => {
    setFolhas(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  const getEstoque = nome => {
    if (!nome) return null;
    const chave = normalizar(nome);
    const item = Object.entries(estoqueAtual || {}).find(([k]) => normalizar(k) === chave);
    return item ? Number(item[1]) : null;
  };

  return (
    <div className="w-full min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label className="text-base font-semibold">Consumo de Folhas</Label>
          <p className="text-xs text-muted-foreground mt-1">Informe os materiais utilizados no serviço.</p>
        </div>
        <Button type="button" size="sm" onClick={addRow} disabled={disabled} className="bg-cyan-500 hover:bg-cyan-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Adicionar Folha
        </Button>
      </div>

      {!folhas.length ? (
        <Alert className="bg-muted/50 border-border">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Nenhuma folha adicionada. Clique em "Adicionar Folha" para registrar o consumo.</AlertDescription>
        </Alert>
      ) : (
        <div className="w-full min-w-0 space-y-3">
          {folhas.map((folha, index) => {
            const estoque = getEstoque(folha.tipo_folha);
            const quantidade = Number(folha.quantidade) || 0;
            const insuficiente = estoque !== null && quantidade > estoque && !folha.e_rascunho;

            return (
              <div key={index} className={`w-full min-w-0 rounded-xl border p-3 sm:p-4 space-y-3 ${insuficiente ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-card'}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <FileText className="h-4 w-4 text-cyan-500" />
                    Folha {index + 1}
                  </div>
                  <Button type="button" variant="ghost" size="icon" disabled={disabled} onClick={() => removeRow(index)} className="h-8 w-8 text-red-500 hover:bg-red-500/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 min-w-0">
                  <Label>Tipo de Folha</Label>
                  <Select value={folha.tipo_folha || ''} onValueChange={v => updateRow(index, 'tipo_folha', v)} disabled={disabled}>
                    <SelectTrigger className="w-full min-w-0 bg-background">
                      <SelectValue placeholder="Selecione o tipo de folha" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposFolha.map(tipo => (
                        <SelectItem key={tipo.id} value={tipo.tipo_folha}>{tipo.tipo_folha}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 min-w-0">
                    <Label className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Estoque</Label>
                    <div className="h-10 flex items-center">
                      {folha.tipo_folha ? (
                        estoque !== null ? (
                          <Badge variant={estoque > 10 ? 'default' : estoque > 0 ? 'secondary' : 'destructive'}>{estoque} folha(s)</Badge>
                        ) : <span className="text-xs text-muted-foreground">N/A</span>
                      ) : <span className="text-xs text-muted-foreground">Selecione a folha</span>}
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label>Quantidade gasta</Label>
                    <Input type="number" min="1" step="1" placeholder="0" value={folha.quantidade ?? ''} disabled={disabled} onChange={e => updateRow(index, 'quantidade', e.target.value)} className={`h-10 text-center font-semibold ${insuficiente ? 'border-red-500' : ''}`} />
                  </div>
                </div>

                {insuficiente && (
                  <p className="text-xs text-red-500">Estoque insuficiente! Disponível: {estoque} folha(s).</p>
                )}

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id={`rascunho-${index}`} checked={!!folha.e_rascunho} disabled={disabled} onCheckedChange={v => updateRow(index, 'e_rascunho', v === true)} />
                    <Label htmlFor={`rascunho-${index}`} className="text-sm cursor-pointer">É rascunho?</Label>
                  </div>
                  <Badge variant={folha.e_rascunho ? 'secondary' : 'outline'}>{folha.e_rascunho ? 'Sim' : 'Não'}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {folhas.length > 0 && (
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            Folhas marcadas como "Rascunho" não serão deduzidas do estoque.
          </p>
        </div>
      )}
    </div>
  );
};

export default FolhasTable;

