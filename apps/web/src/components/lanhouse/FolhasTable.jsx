import React from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FolhasTable = ({ folhas, setFolhas, tiposFolha, estoqueAtual }) => {
  const addRow = () => {
    setFolhas([...folhas, { tipo_folha: '', quantidade: '', e_rascunho: false }]);
  };

  const removeRow = (index) => {
    setFolhas(folhas.filter((_, i) => i !== index));
  };

  const updateRow = (index, field, value) => {
    const updated = [...folhas];
    updated[index] = { ...updated[index], [field]: value };
    setFolhas(updated);
  };

  const getEstoqueDisponivel = (tipoFolha) => {
    if (!tipoFolha || !estoqueAtual) return null;
    const estoque = estoqueAtual[tipoFolha.toUpperCase().trim()];
    return estoque !== undefined ? estoque : null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold text-foreground">Consumo de Folhas</Label>
        <Button 
          type="button"
          onClick={addRow} 
          size="sm" 
          className="bg-cyan-500 hover:bg-cyan-600 text-white"
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar Folha
        </Button>
      </div>

      {folhas.length === 0 ? (
        <Alert className="bg-muted/50 border-border">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-muted-foreground">
            Nenhuma folha adicionada ainda. Clique em "Adicionar Folha" para registrar o consumo.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="folhas-table-container border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="folhas-table w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="p-3 text-left font-semibold text-muted-foreground min-w-[250px]">Tipo de Folha</th>
                  <th className="p-3 text-center font-semibold text-muted-foreground min-w-[120px]">Estoque</th>
                  <th className="p-3 text-center font-semibold text-muted-foreground min-w-[150px]">Quantidade Gasta</th>
                  <th className="p-3 text-center font-semibold text-muted-foreground min-w-[140px]">É Rascunho?</th>
                  <th className="p-3 text-center font-semibold text-muted-foreground min-w-[80px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {folhas.map((folha, index) => {
                  const estoqueDisponivel = getEstoqueDisponivel(folha.tipo_folha);
                  const quantidadeGasta = parseInt(folha.quantidade) || 0;
                  const insuficiente = estoqueDisponivel !== null && quantidadeGasta > estoqueDisponivel && !folha.e_rascunho;

                  return (
                    <tr 
                      key={index} 
                      className={`border-b border-border last:border-b-0 folhas-table-row ${
                        insuficiente ? 'bg-red-500/5' : 'hover:bg-accent/5'
                      }`}
                    >
                      <td className="p-3">
                        <Select 
                          value={folha.tipo_folha} 
                          onValueChange={(val) => updateRow(index, 'tipo_folha', val)}
                        >
                          <SelectTrigger className="bg-background text-foreground border-border">
                            <SelectValue placeholder="Selecione o tipo de folha" />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposFolha.map((tipo) => (
                              <SelectItem key={tipo.id} value={tipo.tipo_folha}>
                                {tipo.tipo_folha}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3 text-center">
                        {folha.tipo_folha ? (
                          estoqueDisponivel !== null ? (
                            <Badge 
                              variant={estoqueDisponivel > 10 ? "default" : estoqueDisponivel > 0 ? "secondary" : "destructive"}
                              className="font-semibold"
                            >
                              {estoqueDisponivel}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">N/A</span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={folha.quantidade}
                          onChange={(e) => updateRow(index, 'quantidade', e.target.value)}
                          className={`bg-background text-foreground text-center font-semibold ${
                            insuficiente ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-border'
                          }`}
                        />
                        {insuficiente && (
                          <p className="text-xs text-red-500 mt-1 text-center">Estoque insuficiente!</p>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={folha.e_rascunho}
                            onCheckedChange={(checked) => updateRow(index, 'e_rascunho', checked)}
                            id={`rascunho-${index}`}
                          />
                          <Label 
                            htmlFor={`rascunho-${index}`} 
                            className="ml-2 text-sm cursor-pointer text-muted-foreground"
                          >
                            {folha.e_rascunho ? 'Sim' : 'Não'}
                          </Label>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(index)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {folhas.length > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border">
          <p className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <strong>Nota:</strong> Folhas marcadas como "Rascunho" não serão deduzidas do estoque.
          </p>
        </div>
      )}
    </div>
  );
};

export default FolhasTable;