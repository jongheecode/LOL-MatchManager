import { Hexagon } from '../components/Hexagon';
import { Avatar } from '../components/Avatar';

export interface AnalyzeRow {
  name: string;
  hue: number;
  profileIconId: number | null;
  state: 'waiting' | 'current' | 'done' | 'error';
}

export function AnalyzingScreen({ rows, currentText, percent }: { rows: AnalyzeRow[]; currentText: string; percent: number }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '90px 40px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ margin: '0 auto 18px', width: 56, animation: 'pulse 1.6s ease-in-out infinite' }}>
          <Hexagon width={56} height={56} background="linear-gradient(140deg, #e6c574, #b98f38)">
            <div
              style={{
                width: 20,
                height: 20,
                border: '3px solid rgba(11,15,24,.35)',
                borderTopColor: '#0b0f18',
                borderRadius: '50%',
                animation: 'spin .8s linear infinite',
              }}
            />
          </Hexagon>
        </div>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: 28, letterSpacing: 0.5 }}>전적 분석 중</div>
        <div style={{ fontSize: 13.5, color: '#8b93a7', marginTop: 6, minHeight: 20, fontFamily: "'IBM Plex Mono'" }}>{currentText}</div>
      </div>

      <div style={{ margin: '26px 0 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono'", fontSize: 12, color: '#8b93a7', marginBottom: 8 }}>
          <span>전체 진행률</span>
          <span style={{ color: '#d8b463' }}>{percent}%</span>
        </div>
        <div style={{ height: 8, background: '#131a29', borderRadius: 6, overflow: 'hidden', border: '1px solid #1e2740' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 6,
              background: 'linear-gradient(90deg, #b98f38, #e6c574)',
              transition: 'width .4s ease',
              width: `${percent}%`,
            }}
          />
        </div>
      </div>

      <div style={{ background: '#0f1524', border: '1px solid #1e2740', borderRadius: 14, padding: 10 }}>
        {rows.map((row, i) => {
          const isDone = row.state === 'done';
          const isCur = row.state === 'current';
          const isErr = row.state === 'error';
          const statusText = isDone ? '완료' : isErr ? '오류' : isCur ? '분석 중' : '대기';
          const statusStyle = isDone
            ? { fontSize: 11.5, color: '#4fd18a', fontWeight: 600 }
            : isErr
              ? { fontSize: 11.5, color: '#f0797d', fontWeight: 600 }
              : isCur
                ? { fontSize: 11.5, color: '#d8b463', fontWeight: 600, animation: 'pulse 1.2s infinite' }
                : { fontSize: 11.5, color: '#7f8aa3' };
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 11px',
                borderRadius: 9,
                transition: 'background .2s',
                background: isCur ? 'rgba(216,180,99,.07)' : 'transparent',
              }}
            >
              <div style={{ filter: isDone ? 'none' : 'grayscale(.6)', opacity: isDone ? 1 : 0.7 }}>
                <Avatar name={row.name} hue={row.hue} profileIconId={row.profileIconId} size={30} radius={8} fontSize={12} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#dbe1ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
              </div>
              <div style={statusStyle}>{statusText}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
