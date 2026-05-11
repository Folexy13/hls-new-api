export const normalizeEmail = (email?: string | null): string => {
  return String(email || '').trim().toLowerCase();
};

export const normalizePhone = (phone?: string | null): string => {
  const value = String(phone || '').trim();
  if (!value) return '';

  const compact = value.replace(/[^\d+]/g, '');
  if (!compact) return '';

  if (compact.startsWith('+')) {
    return `+${compact.slice(1).replace(/\D/g, '')}`;
  }

  const digits = compact.replace(/\D/g, '');
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('234')) return `+${digits}`;
  if (digits.startsWith('0')) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;

  return digits;
};

export const getPhoneSearchVariants = (phone?: string | null): string[] => {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, '');
  const variants = new Set<string>();

  if (phone) variants.add(String(phone).trim());
  if (normalized) variants.add(normalized);
  if (digits) variants.add(digits);

  if (digits.startsWith('234') && digits.length > 3) {
    variants.add(`0${digits.slice(3)}`);
    variants.add(digits.slice(3));
  }

  return Array.from(variants).filter(Boolean);
};
