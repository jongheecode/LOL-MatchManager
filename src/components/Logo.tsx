import { Hexagon } from './Hexagon';

export function Logo({ size = 44, fontSize = 22 }: { size?: number; fontSize?: number }) {
  return (
    <Hexagon width={size} height={size} background="linear-gradient(140deg, #e6c574, #b98f38)">
      <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize, color: '#0b0f18' }}>P</span>
    </Hexagon>
  );
}

export function Wordmark({ subtitle }: { subtitle?: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 26, letterSpacing: 1, lineHeight: 1 }}>
        PENTA<span style={{ color: '#d8b463' }}>BALANCE</span>
      </div>
      {subtitle && (
        <div style={{ fontSize: 12.5, color: '#8b93a7', marginTop: 3, letterSpacing: 0.2 }}>{subtitle}</div>
      )}
    </div>
  );
}
