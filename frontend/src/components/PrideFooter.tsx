/** Exact markup from templates/partials/pride_footer.html */
export function PrideFooter({ showLiveBadge = true }: { showLiveBadge?: boolean }) {
  const year = new Date().getFullYear()
  return (
    <>
      <footer
        style={{
          textAlign: 'center',
          padding: '40px 20px 24px',
          marginTop: 60,
          borderTop: '2px solid #e5e7eb',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
        }}
      >
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              marginBottom: 16,
            }}
          >
            <i className="fas fa-laptop-code" style={{ fontSize: 32, color: '#7b1fa2' }} />
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#1e293b',
                  letterSpacing: '-0.5px',
                  lineHeight: 1.2,
                }}
              >
                Pride in Technology
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#64748b',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                EXCELLENCE • INNOVATION • COMPETENCE
              </div>
            </div>
          </div>
          <p style={{ margin: '12px 0 8px', color: '#475569', fontSize: 14, lineHeight: 1.6 }}>
            Thika Technical Training Institute Academic Management System
          </p>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>
            &copy; {year} TTTI. Empowering the next generation of skilled professionals.
          </p>
        </div>
      </footer>

      {showLiveBadge ? (
        <div
          id="dashboard-live-status"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: 18,
            bottom: 18,
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            padding: '7px 12px',
            border: '1px solid #a7f3d0',
            borderRadius: 999,
            background: '#ecfdf5',
            color: '#047857',
            boxShadow: '0 4px 16px rgba(15,23,42,.12)',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <span
            id="dashboard-live-dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#10b981',
              animation: 'dashboardLivePulse 1.8s infinite',
            }}
          />
          <span id="dashboard-live-text">Live · refresh in 20s</span>
          <style>{`
            @keyframes dashboardLivePulse {
              0% { box-shadow:0 0 0 0 rgba(16,185,129,.55) }
              70% { box-shadow:0 0 0 7px rgba(16,185,129,0) }
              100% { box-shadow:0 0 0 0 rgba(16,185,129,0) }
            }
          `}</style>
        </div>
      ) : null}
    </>
  )
}
