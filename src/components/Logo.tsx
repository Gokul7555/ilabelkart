import { BRAND } from '../config/brand';

export function Logo({ size }: { size?: number }) {
  return (
    <span className="logo" style={size ? { fontSize: size } : undefined}>
      {BRAND.logoA}<span className="accent">{BRAND.logoB}</span>
    </span>
  );
}
