export const normalizeHealthField = (value: unknown): string[] | undefined => {
  const normalizeText = (item: unknown) => {
    if (typeof item === 'string') return item.trim();
    if (item && typeof item === 'object') {
      const source = item as Record<string, unknown>;
      return String(source.name || source.label || source.value || source.title || '').trim();
    }
    return '';
  };

  if (Array.isArray(value)) {
    const normalized = value
      .map(normalizeText)
      .filter(Boolean);

    return normalized.length ? normalized : undefined;
  }

  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const values = Object.values(source).flatMap((item) => {
      if (Array.isArray(item)) return item.map(normalizeText);
      return [normalizeText(item)];
    }).filter(Boolean);
    return values.length ? Array.from(new Set(values)) : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
};

export const formatHealthField = (value: unknown): string | undefined => {
  const normalized = normalizeHealthField(value);
  return normalized?.length ? normalized.join(', ') : undefined;
};
