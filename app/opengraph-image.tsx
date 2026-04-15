import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Crack Origins';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0f',
          backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0a0a0f 100%)',
          color: '#fff',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Grid Pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.1,
            backgroundImage: 'linear-gradient(#feb60c 1px, transparent 1px), linear-gradient(90deg, #feb60c 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Glowing Accents */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(254, 182, 12, 0.15) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            right: '-10%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(254, 182, 12, 0.15) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(254, 182, 12, 0.3)',
            padding: '60px 80px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
          }}
        >
          <div
            style={{
              fontSize: '24px',
              letterSpacing: '0.5em',
              color: '#feb60c',
              marginBottom: '20px',
              textTransform: 'uppercase',
              fontWeight: 'bold',
            }}
          >
            Transmission Active
          </div>
          
          <div
            style={{
              fontSize: '84px',
              fontWeight: 'black',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              display: 'flex',
            }}
          >
            CRACK ORIGINS
          </div>

          <div
            style={{
              marginTop: '30px',
              fontSize: '32px',
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              maxWidth: '800px',
            }}
          >
            Indie Game Development & Chronicles
          </div>
        </div>

        {/* Footer info */}
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          <span>CRACKORIGINS.COM</span>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#feb60c' }} />
          <span>EST. 2024</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
