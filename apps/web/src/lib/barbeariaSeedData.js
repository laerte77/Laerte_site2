import { supabase } from './customSupabaseClient';

const demoData = {
  barbearia_clientes: [
    { nome: 'João Silva', telefone: '(11) 99999-1111', email: 'joao@email.com', endereco: 'Rua A, 123' },
    { nome: 'Pedro Henrique', telefone: '(11) 98888-2222', email: 'pedro@email.com', endereco: 'Rua B, 456' },
    { nome: 'Lucas Oliveira', telefone: '(11) 97777-3333', email: 'lucas@email.com', endereco: 'Rua C, 789' }
  ],
  barbearia_produtos: [
    { nome: 'Pomada Modeladora Efeito Matte', descricao: 'Fixação forte', preco: 45.00, estoque: 20 },
    { nome: 'Óleo para Barba', descricao: 'Hidratação profunda', preco: 35.00, estoque: 15 },
    { nome: 'Shampoo Refrescante', descricao: 'Limpeza e frescor', preco: 25.00, estoque: 30 } 
  ],
  barbearia_servicos: [
    { nome: 'Corte Social', descricao: 'Corte tradicional com tesoura e máquina', preco: 40.00, duracao: 30 },
    { nome: 'Barba Terapia', descricao: 'Toalha quente e relaxamento', preco: 35.00, duracao: 25 },
    { nome: 'Sobrancelha na Navalha', descricao: 'Alinhamento perfeito', preco: 15.00, duracao: 15 }
  ],
  barbearia_tipos_corte: [
    { nome: 'Degradê (Fade)', descricao: 'Disfarçado navalhado' },
    { nome: 'Militar', descricao: 'Corte baixo padrão' },
    { nome: 'Pompadour', descricao: 'Topete clássico' }
  ],
  barbearia_tipos_despesa: [
    { nome: 'Luz', descricao: 'Conta de energia' },
    { nome: 'Água', descricao: 'Conta de água' },
    { nome: 'Produtos de Limpeza', descricao: 'Material higiene' },
    { nome: 'Materiais de Barbearia', descricao: 'Lâminas, golas, etc' }
  ],
  barbearia_barbeiros: [
    { nome: 'Carlos "Cabelo" Santos', telefone: '(11) 91111-1111', email: 'carlos@barbearia.com', data_admissao: '2023-01-15' },
    { nome: 'Marcos Navalha', telefone: '(11) 92222-2222', email: 'marcos@barbearia.com', data_admissao: '2023-05-20' }
  ],
  barbearia_tipos_planos: [
    { nome: 'Plano Básico (2 Cortes/mês)', descricao: 'Ideal para manutenção quinzenal', valor: 70.00, sessoes: 2 },
    { nome: 'Plano VIP (Cortes Ilimitados)', descricao: 'Sempre alinhado', valor: 150.00, sessoes: 99 }
  ]
};

export const seedBarbeariaDemoData = async () => {
  const results = [];
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado para semear dados.");

    for (const [table, records] of Object.entries(demoData)) {
      const recordsWithUser = records.map(r => ({ ...r, user_id: user.id }));

      const { data, error } = await supabase.from(table).insert(recordsWithUser).select();
      
      if (error) {
        console.error(`Erro ao popular ${table}:`, error);
        results.push({ table, success: false, error: error.message });
      } else {
        results.push({ table, success: true, count: recordsWithUser.length, data });
      }
    }
    
    return { success: true, results };
  } catch (error) {
    console.error("Erro inesperado durante o seeding:", error);
    return { success: false, error: error.message, results };
  }
};