export function Footer() {
  return (
    <div style={{ borderTop: '1px solid #172033', background: '#0a0e17', marginTop: 30 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 40px 26px', textAlign: 'center' }}>
        <div style={{ fontSize: 10.5, color: '#7f8aa3', lineHeight: 1.6 }}>
          MatchManager isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone
          officially involved in producing or managing League of Legends. League of Legends and Riot Games are
          trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.
          <br />
          이 사이트는 Riot Games의 공식 서비스가 아니며, Riot Games와 무관하게 개인이 만든 비공식 팬 프로젝트입니다.
        </div>
        <a href="/privacy.html" style={{ display: 'inline-block', marginTop: 10, fontSize: 11, color: '#8b93a7' }}>
          개인정보처리방침
        </a>
      </div>
    </div>
  );
}
