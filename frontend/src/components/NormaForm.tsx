import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { Norma, NormaFormData } from '../types/norma';
import { normasService } from '../services/normas.service';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Textarea } from './ui/Textarea';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { STATUS_OPTIONS } from '../utils/statusUtils';

interface NormaFormProps {
  norma: Norma | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const NormaForm = ({ norma, onClose, onSuccess }: NormaFormProps) => {
  const [formData, setFormData] = useState<NormaFormData>({
    divisao_politica: norma?.divisao_politica || '',
    numero_norma: norma?.numero_norma || '',
    tipo_norma: norma?.tipo_norma || '',
    orgao_emissor: norma?.orgao_emissor || '',
    data_publicacao: norma?.data_publicacao || '',
    data_inicio_vigencia: norma?.data_inicio_vigencia || '',
    status_vigencia: norma?.status_vigencia || '',
    ementa: norma?.ementa || '',
    titulo_da_norma: norma?.titulo_da_norma || '',
    texto_integral: norma?.texto_integral || '',
    artigos_no_texto: norma?.artigos_no_texto || '',
    idioma_original: norma?.idioma_original || '',
    link_documento: norma?.link_documento || '',
    origem_publicacao: norma?.origem_publicacao || '',
    origem_dado: norma?.origem_dado || 'SITE',
    referencia_norma_anterior: norma?.referencia_norma_anterior || '',
    normas_citadas: norma?.normas_citadas || '',
    temas: norma?.temas || '',
    sistema_de_gestao: norma?.sistema_de_gestao || '',
    ramo_de_atividade: norma?.ramo_de_atividade || '',
    documento_referencia: norma?.documento_referencia || '',
  });

  const mutation = useMutation({
    mutationFn: (data: NormaFormData) =>
      norma ? normasService.update(norma.id, data) : normasService.create(data),
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={norma ? 'Editar Norma' : 'Nova Norma'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Número da Norma *"
            name="numero_norma"
            value={formData.numero_norma}
            onChange={handleChange}
            required
          />
          <Select
            label="Tipo de Norma *"
            name="tipo_norma"
            value={formData.tipo_norma}
            onChange={handleChange}
            options={[
              { value: '', label: 'Selecione' },
              { value: 'Lei', label: 'Lei' },
              { value: 'Decreto', label: 'Decreto' },
              { value: 'Portaria', label: 'Portaria' },
              { value: 'Resolução', label: 'Resolução' },
              { value: 'Instrução Normativa', label: 'Instrução Normativa' },
              { value: 'Medida Provisória', label: 'Medida Provisória' },
            ]}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Divisão Política *"
            name="divisao_politica"
            value={formData.divisao_politica}
            onChange={handleChange}
            options={[
              { value: '', label: 'Selecione' },
              { value: 'Federal', label: 'Federal' },
              { value: 'Estadual', label: 'Estadual' },
              { value: 'Municipal', label: 'Municipal' },
            ]}
            required
          />
          <Input
            label="Órgão Emissor *"
            name="orgao_emissor"
            value={formData.orgao_emissor}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          label="Título da Norma *"
          name="titulo_da_norma"
          value={formData.titulo_da_norma}
          onChange={handleChange}
          required
        />

        <Textarea
          label="Ementa"
          name="ementa"
          value={formData.ementa}
          onChange={handleChange}
          rows={3}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Data de Publicação"
            name="data_publicacao"
            type="date"
            value={formData.data_publicacao}
            onChange={handleChange}
          />
          <Input
            label="Data de Início de Vigência"
            name="data_inicio_vigencia"
            type="date"
            value={formData.data_inicio_vigencia}
            onChange={handleChange}
          />
          <Select
            label="Status de Vigência"
            name="status_vigencia"
            value={formData.status_vigencia}
            onChange={handleChange}
            options={[
              { value: '', label: 'Selecione' },
              ...STATUS_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
            ]}
          />
        </div>

        <Textarea
          label="Texto Integral"
          name="texto_integral"
          value={formData.texto_integral}
          onChange={handleChange}
          rows={6}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Idioma Original"
            name="idioma_original"
            value={formData.idioma_original}
            onChange={handleChange}
          />
          <Input
            label="Link do Documento"
            name="link_documento"
            type="url"
            value={formData.link_documento}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Origem da Publicação"
            name="origem_publicacao"
            value={formData.origem_publicacao}
            onChange={handleChange}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Origem do Dado
            </label>
            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600 text-sm">
              {formData.origem_dado || 'SITE'} (padrão)
            </div>
          </div>
          <Input
            label="Referência Norma Anterior"
            name="referencia_norma_anterior"
            value={formData.referencia_norma_anterior}
            onChange={handleChange}
          />
        </div>

        <Textarea
          label="Normas Citadas"
          name="normas_citadas"
          value={formData.normas_citadas}
          onChange={handleChange}
          rows={2}
        />

        <Textarea
          label="Artigos no Texto"
          name="artigos_no_texto"
          value={formData.artigos_no_texto}
          onChange={handleChange}
          rows={3}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Temas"
            name="temas"
            value={formData.temas}
            onChange={handleChange}
          />
          <Input
            label="Sistema de Gestão"
            name="sistema_de_gestao"
            value={formData.sistema_de_gestao}
            onChange={handleChange}
          />
          <Input
            label="Ramo de Atividade"
            name="ramo_de_atividade"
            value={formData.ramo_de_atividade}
            onChange={handleChange}
          />
        </div>

        <Input
          label="Documento de Referência"
          name="documento_referencia"
          value={formData.documento_referencia}
          onChange={handleChange}
        />

        {mutation.isError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            Erro ao salvar norma. Tente novamente.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={mutation.isPending}>
            {norma ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
