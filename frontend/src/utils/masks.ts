/**
 * Aplica máscara de CPF: 000.000.000-00
 */
export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/**
 * Aplica máscara de CNPJ: 00.000.000/0000-00
 */
export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/**
 * Aplica máscara de documento (CPF ou CNPJ) automaticamente
 */
export function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) return maskCPF(value);
  return maskCNPJ(value);
}

/**
 * Aplica máscara de telefone: (00) 00000-0000 ou (00) 0000-0000
 */
export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/**
 * Aplica máscara de CEP: 00000-000
 */
export function maskZip(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

/**
 * Formata documento para exibição
 */
export function formatDocument(doc: string): string {
  if (!doc) return '';
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) return maskCPF(digits);
  if (digits.length === 14) return maskCNPJ(digits);
  return doc;
}

/**
 * Formata telefone para exibição
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  return maskPhone(phone.replace(/\D/g, ''));
}


/**
 * Formata valor monetário no padrão pt-BR: R$ 1.500,00
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Formata data ISO para dd/mm/aaaa
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}
