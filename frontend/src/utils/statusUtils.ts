export const STATUS_OPTIONS = [
  { value: 'vigente', label: 'Vigente', color: 'green' },
  { value: 'revogada', label: 'Revogada', color: 'red' },
  { value: 'suspensa', label: 'Suspensa', color: 'yellow' },
  { value: 'em_tramitacao', label: 'Em Tramitação', color: 'blue' },
  { value: 'vencida', label: 'Vencida', color: 'gray' },
  { value: 'alterada', label: 'Alterada', color: 'purple' },
] as const;

export type StatusValue = typeof STATUS_OPTIONS[number]['value'];

export const getStatusLabel = (status: string | null | undefined): string => {
  if (!status) return 'Não Informado';
  
  const normalizedStatus = status.toLowerCase().trim();
  const statusOption = STATUS_OPTIONS.find(opt => opt.value === normalizedStatus);
  
  return statusOption?.label || status;
};

export const getStatusColor = (status: string | null | undefined): string => {
  if (!status) return 'gray';
  
  const normalizedStatus = status.toLowerCase().trim();
  const statusOption = STATUS_OPTIONS.find(opt => opt.value === normalizedStatus);
  
  return statusOption?.color || 'gray';
};

export const getStatusBadgeClasses = (status: string | null | undefined): string => {
  const color = getStatusColor(status);
  
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
    purple: 'bg-purple-100 text-purple-800',
  };
  
  return colorClasses[color] || colorClasses.gray;
};
