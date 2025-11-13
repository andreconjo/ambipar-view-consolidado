import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';
import toast from 'react-hot-toast';

interface Usuario {
  id: number;
  username: string;
  nome_completo: string;
  tipo_usuario: 'admin' | 'user';
  ativo: boolean;
  data_criacao: string;
}

interface UsuarioFormData {
  username: string;
  password: string;
  nome_completo: string;
  tipo_usuario: 'admin' | 'user';
}

export default function UsuariosPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState<UsuarioFormData>({
    username: '',
    password: '',
    nome_completo: '',
    tipo_usuario: 'user',
  });
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Query para listar usuários
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const response = await api.get<{ usuarios: Usuario[] }>('/usuarios');
      return response.data.usuarios;
    },
  });

  // Query para aprovações de um usuário
  const { data: aprovacoes } = useQuery({
    queryKey: ['usuario-aprovacoes', selectedUserId],
    queryFn: async () => {
      const response = await api.get(`/usuarios/${selectedUserId}/aprovacoes`);
      return response.data.aprovacoes;
    },
    enabled: !!selectedUserId,
  });

  // Mutation para criar usuário
  const createMutation = useMutation({
    mutationFn: async (data: UsuarioFormData) => {
      return api.post('/usuarios', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário criado com sucesso!');
      handleCloseModal();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao criar usuário';
      toast.error(message);
    },
  });

  // Mutation para atualizar usuário
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Usuario> }) => {
      return api.put(`/usuarios/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário atualizado com sucesso!');
      handleCloseModal();
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao atualizar usuário';
      toast.error(message);
    },
  });

  // Mutation para deletar usuário
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/usuarios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário deletado com sucesso!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Erro ao deletar usuário';
      toast.error(message);
    },
  });

  const handleOpenModal = (user?: Usuario) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        nome_completo: user.nome_completo,
        tipo_usuario: user.tipo_usuario,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        nome_completo: '',
        tipo_usuario: 'user',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      nome_completo: '',
      tipo_usuario: 'user',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome_completo.trim()) {
      toast.error('Nome completo é obrigatório');
      return;
    }

    if (editingUser) {
      // Atualizar
      const updateData: any = {
        nome_completo: formData.nome_completo,
        tipo_usuario: formData.tipo_usuario,
      };

      if (formData.password) {
        updateData.password = formData.password;
      }

      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      // Criar
      if (!formData.username.trim() || !formData.password) {
        toast.error('Username e senha são obrigatórios');
        return;
      }

      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, username: string) => {
    if (window.confirm(`Tem certeza que deseja deletar o usuário "${username}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleAtivo = (user: Usuario) => {
    updateMutation.mutate({
      id: user.id,
      data: { ativo: !user.ativo },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gerenciamento de Usuários
            </h1>
            <p className="text-gray-600 mt-1">
              Cadastre e gerencie os usuários do sistema
            </p>
          </div>
          <Button onClick={() => handleOpenModal()}>
            + Novo Usuário
          </Button>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Nome Completo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Criado em
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {usuarios?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{user.nome_completo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {user.tipo_usuario === 'admin' ? 'Administrador' : 'Usuário'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleAtivo(user)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        user.ativo
                          ? 'bg-green-600 focus:ring-green-500'
                          : 'bg-gray-300 focus:ring-gray-400'
                      }`}
                      title={user.ativo ? 'Clique para desativar' : 'Clique para ativar'}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          user.ativo ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="ml-2 text-xs text-gray-600">
                      {user.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.data_criacao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenModal(user)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      Ver Aprovações
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(user.id, user.username)}
                    >
                      Deletar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de Cadastro/Edição */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingUser && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Username *
                    </label>
                    <Input
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="Digite o username"
                      autoFocus
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
                  </label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={editingUser ? 'Nova senha' : 'Digite a senha'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <Input
                    value={formData.nome_completo}
                    onChange={(e) =>
                      setFormData({ ...formData, nome_completo: e.target.value })
                    }
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de Usuário *
                  </label>
                  <Select
                    value={formData.tipo_usuario}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tipo_usuario: e.target.value as 'admin' | 'user',
                      })
                    }
                  >
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </Select>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="ghost" type="button" onClick={handleCloseModal}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de Aprovações do Usuário */}
      {selectedUserId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Histórico de Aprovações
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Usuário: <strong>{usuarios?.find((u: Usuario) => u.id === selectedUserId)?.nome_completo}</strong>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUserId(null)}
                >
                  ✕
                </Button>
              </div>

              {aprovacoes && aprovacoes.length > 0 ? (
                <>
                  {/* Estatísticas */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-gray-900">
                        {aprovacoes.length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Total de Ações</p>
                    </div>
                    <div className="bg-white border-l-4 border-l-green-600 border-t border-r border-b border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-gray-900">
                        {aprovacoes.filter((a: any) => a.status === 'aprovado').length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Aprovadas</p>
                    </div>
                    <div className="bg-white border-l-4 border-l-red-600 border-t border-r border-b border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-gray-900">
                        {aprovacoes.filter((a: any) => a.status === 'recusado').length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Recusadas</p>
                    </div>
                  </div>

                  {/* Timeline de Aprovações */}
                  <div className="relative">
                    {/* Linha vertical da timeline */}
                    <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    <div className="space-y-6">
                      {aprovacoes.map((aprov: any) => (
                        <div key={aprov.id} className="relative pl-12">
                          {/* Ponto na timeline */}
                          <div
                            className={`absolute left-0 top-2 w-9 h-9 rounded-full border-2 bg-white shadow-sm flex items-center justify-center ${
                              aprov.status === 'aprovado'
                                ? 'border-green-600'
                                : 'border-red-600'
                            }`}
                          >
                            <span className={`font-semibold text-sm ${
                              aprov.status === 'aprovado' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {aprov.status === 'aprovado' ? '✓' : '✗'}
                            </span>
                          </div>

                          {/* Card de conteúdo */}
                          <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="p-4">
                              {/* Header do card */}
                              <div className="flex items-center justify-between mb-3">
                                <span
                                  className={`px-2.5 py-1 text-xs font-medium rounded-md border ${
                                    aprov.status === 'aprovado'
                                      ? 'text-green-700 border-green-600'
                                      : 'text-red-700 border-red-600'
                                  }`}
                                >
                                  {aprov.status === 'aprovado' ? 'Aprovado' : 'Recusado'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(aprov.data_registro).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })} às {new Date(aprov.data_registro).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>

                              {/* Informações da norma */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-[#005bb3] bg-blue-50 px-2 py-1 rounded border border-blue-100">
                                    {aprov.numero_norma || 'S/N'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-900 leading-relaxed">
                                  {aprov.titulo_da_norma || 'Título não disponível'}
                                </p>
                                {aprov.observacao && (
                                  <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium text-gray-700">Observação:</span> {aprov.observacao}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma aprovação registrada ainda
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
