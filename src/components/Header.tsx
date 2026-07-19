import { Logo } from './Logo';

export function Header({ onHome }: { onHome: () => void }) {
  return (
    <div style={{ borderBottom: '1px solid #161d2e' }}>
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '13px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={28} fontSize={13} />
          <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>
            MATCH<span style={{ color: '#d8b463' }}>MANAGER</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onHome}
          style={{
            background: 'transparent',
            border: '1px solid #2a3350',
            color: '#8b93a7',
            padding: '7px 14px',
            borderRadius: 8,
            fontSize: 12.5,
            cursor: 'pointer',
          }}
        >
          홈으로
        </button>
      </div>
    </div>
  );
}
