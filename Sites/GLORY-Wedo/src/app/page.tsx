'use client';

export const runtime = 'edge';

import dynamic from 'next/dynamic';

const PrototypeV4 = dynamic(() => import('@/components/PrototypeV4'), {
  ssr: false,
  loading: () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: "'Noto Sans TC', 'Hiragino Sans', sans-serif",
      color: '#64748b',
    }}>
      載入中…
    </div>
  ),
});

export default function Home() {
  return <PrototypeV4 />;
}
