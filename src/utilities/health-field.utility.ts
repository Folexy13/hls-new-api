export const normalizeHealthField = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);

    return normalized.length ? normalized : undefined;
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
