import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Search } from 'lucide-react';

const SearchableModal = ({ isOpen, onClose, onSelect, tableName, searchField, displayFields, title, selectQuery = '*' }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (isOpen && user) {
      const fetchItems = async () => {
        if (!isMounted.current) return;
        setLoading(true);
        try {
          let query = supabase.from(tableName).select(selectQuery).eq('user_id', user.id);
          const { data, error } = await query;

          if (error) throw error;
          
          if (isMounted.current) {
            setItems(data || []);
          }
        } catch (error) {
          if (isMounted.current) {
            toast({ title: 'Erro ao buscar dados', description: error.message, variant: 'destructive' });
          }
        } finally {
          if (isMounted.current) {
            setLoading(false);
          }
        }
      };
      fetchItems();
    }
  }, [isOpen, user, tableName, selectQuery, toast]);

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item => {
      const fieldValue = searchField.split('.').reduce((o, i) => (o ? o[i] : undefined), item);
      return fieldValue?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [items, searchTerm, searchField]);

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      onClose();
    }
  };

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
  };

  // Important: Clean state when modal closes to prevent stale data on reopen
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedItem(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col z-[100]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="p-4 relative">
          <Search className="absolute left-7 top-7 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            className="pl-10"
          />
        </div>
        <ScrollArea className="flex-grow border rounded-md">
          <div className="p-4 space-y-2">
            {loading ? (
              <p className="text-center text-muted-foreground">Carregando...</p>
            ) : filteredItems.length === 0 ? (
               <p className="text-center text-muted-foreground">Nenhum registro encontrado.</p>
            ) : (
              filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-md cursor-pointer border transition-colors duration-200 ${
                    selectedItem?.id === item.id 
                      ? 'bg-primary/20 border-primary' 
                      : 'bg-card hover:bg-muted border-transparent hover:border-border'
                  }`}
                >
                  {displayFields.map((field, idx) => {
                    const value = getNestedValue(item, field.key);
                    return (
                      <p key={field.key} className={`text-sm ${idx === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                         <span className="opacity-70 mr-1">{field.label}:</span>
                        {field.format ? field.format(value) : value}
                      </p>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSelect} disabled={!selectedItem} className="bg-primary text-primary-foreground hover:bg-primary/90">Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SearchableModal;