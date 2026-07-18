export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1a2236',
        border: '1px solid #d8b46355',
        color: '#ecca82',
        padding: '12px 22px',
        borderRadius: 10,
        fontSize: 13.5,
        boxShadow: '0 12px 40px rgba(0,0,0,.5)',
        zIndex: 50,
        animation: 'fadeUp .25s',
      }}
    >
      {message}
    </div>
  );
}
