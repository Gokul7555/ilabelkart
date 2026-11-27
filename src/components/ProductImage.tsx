/**
 * Product photo placeholder (placehold.co, light-grey background, brand-green text).
 * Swap for real photography by passing `src`.
 */
export function ProductImage({ size = 40, radius = 6, label, index = 0, alt, src }: {
  hue?: number; size?: number | string; radius?: number; label?: string; index?: number; alt?: string; src?: string;
}) {
  const px = typeof size === 'number' ? Math.max(48, Math.round(size * 2)) : 600;
  const h = typeof size === 'number' ? px : Math.round(px * 0.75);
  const text = (label ?? 'Product').split(/[ ,]/).filter(Boolean).slice(0, 3).join(' ') + (index ? `\\nView ${index + 1}` : '');
  const url = src ?? `https://placehold.co/${px}x${h}/F1F5F9/1D682E/png?font=inter&text=${encodeURIComponent(text)}`;
  return (
    <img src={url} alt={alt ?? label ?? 'Product photo'} loading="lazy" width={typeof size === 'number' ? size : undefined} height={typeof size === 'number' ? size : undefined}
      style={{ width: size, height: typeof size === 'number' ? size : '100%', objectFit: 'cover', borderRadius: radius ? 'var(--radius)' : 0, flexShrink: 0, background: 'var(--slate-100)', border: radius ? '1px solid var(--border)' : 0 }} />
  );
}
