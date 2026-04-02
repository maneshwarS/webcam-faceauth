import { Link } from 'react-router-dom';
import s from './LandingPage.module.css';

export default function LandingPage() {
  return (
    <div className={s.page}>
      {/* Nav */}
      <nav className={s.nav}>
        <span className={s.navLogo}>FaceAuth</span>
        <ul className={s.navLinks}>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#features">Features</a></li>
          <li><a href="#stack">Stack</a></li>
          <li><Link to="/signup">Try It</Link></li>
        </ul>
      </nav>

      {/* Hero */}
      <section className={s.hero}>
        <div className={`${s.heroVisual} ${s.animateIn}`}>
          <div className={s.faceGraphic}>
            <div className={`${s.faceRing} ${s.faceRing1}`} />
            <div className={`${s.faceRing} ${s.faceRing2}`} />
            <div className={`${s.faceRing} ${s.faceRing3}`} />
            <div className={`${s.corner} ${s.cornerTl}`} />
            <div className={`${s.corner} ${s.cornerTr}`} />
            <div className={`${s.corner} ${s.cornerBl}`} />
            <div className={`${s.corner} ${s.cornerBr}`} />
            <div className={s.scanLine} />
            <div className={s.faceIcon}>🧑</div>
          </div>
        </div>

        <div className={s.heroBottom}>
          <div className={`${s.heroInfo} ${s.animateIn} ${s.delay1}`}>
            <div className={s.heroLabel}>Biometric Authentication</div>
            <h1 className={s.heroTitle}>
              Your face is the password.<br />
              <span className={s.accent}>No tokens. No codes. Just you.</span>
            </h1>
            <div className={s.heroMeta}>
              Browser-native facial recognition <span className={s.dot} /> 2FA with liveness detection<br />
              Built with React 19 + face-api.js + Node.js
            </div>
          </div>

          <div className={`${s.heroSocials} ${s.animateIn} ${s.delay2}`}>
            <a href="https://github.com/maneshwarS/webcam-faceauth" className={s.socialLink} target="_blank" rel="noreferrer">GitHub</a>
            <Link to="/signup" className={s.socialLink}>Sign Up</Link>
            <Link to="/signin" className={s.socialLink}>Sign In</Link>
            <Link to="/face-login" className={s.socialLink}>Face Login</Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className={`${s.stats} ${s.animateIn}`}>
        <div className={s.statsGrid}>
          <div>
            <div className={s.statNumber}>128</div>
            <div className={s.statLabel}>Dimensional Face Vectors</div>
          </div>
          <div>
            <div className={s.statNumber}>0.75</div>
            <div className={s.statLabel}>Euclidean Distance Threshold</div>
          </div>
          <div>
            <div className={s.statNumber}>&lt;2s</div>
            <div className={s.statLabel}>Face Match Latency</div>
          </div>
          <div>
            <div className={s.statNumber}>0</div>
            <div className={s.statLabel}>Images Sent to Server</div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <section className={s.section} id="how">
        <div className={s.container}>
          <div className={`${s.sectionLabel} ${s.animateIn}`}>How It Works</div>
          <h2 className={`${s.sectionTitle} ${s.animateIn} ${s.delay1}`}>Three steps. Zero friction.</h2>

          <div className={`${s.timeline} ${s.animateIn} ${s.delay2}`}>
            <div className={s.timelineStep}>
              <div className={s.timelineDot} />
              <div className={s.timelineStepLabel}>Step 01</div>
              <div className={s.timelineStepTitle}>Sign up with your face</div>
              <div className={s.timelineStepDesc}>Create an account with email + password, then register your face via webcam. The 128-dimensional face descriptor is extracted in-browser and sent atomically with your credentials. No partial records, no orphaned accounts.</div>
            </div>
            <div className={s.timelineStep}>
              <div className={s.timelineDot} />
              <div className={s.timelineStepLabel}>Step 02</div>
              <div className={s.timelineStepTitle}>Prove you're real</div>
              <div className={s.timelineStepDesc}>A randomized liveness challenge (blink or smile) ensures a real human is present, not a photo. Eye Aspect Ratio calculation detects blinks; expression confidence scores detect smiles. 12-second timeout keeps it snappy.</div>
            </div>
            <div className={s.timelineStep}>
              <div className={s.timelineDot} />
              <div className={s.timelineStepLabel}>Step 03</div>
              <div className={s.timelineStepTitle}>Sign in — your way</div>
              <div className={s.timelineStepDesc}>Choose password + face 2FA for maximum security, or face-only login for speed. The server matches your live descriptor against all registered faces via Euclidean distance. Match found? You're in. No TOTP apps, no SMS codes.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={s.section} id="features">
        <div className={s.container}>
          <div className={`${s.sectionLabel} ${s.animateIn}`}>Core Features</div>
          <p className={`${s.sectionText} ${s.animateIn} ${s.delay1}`}>
            A complete authentication system where your face replaces traditional 2FA. Everything runs in-browser — the server never sees a single pixel of your face.
          </p>
          <div className={s.featuresList}>
            {[
              ['Client-Side ML', 'All face detection, landmark extraction, and descriptor generation runs via face-api.js in the browser. Zero images uploaded.'],
              ['Liveness Detection', 'Randomized blink/smile challenges with Eye Aspect Ratio and expression scoring prevent photo-based spoofing.'],
              ['Temp Token 2FA', "Password sign-in issues a 60-second temp JWT. You're not authenticated until face verification passes too."],
              ['Face-Only Login', 'Skip the password entirely. Server matches your face against all registered users via 128-D Euclidean distance.'],
              ['Secure Token Architecture', 'Access tokens in memory only (never localStorage). Refresh tokens as httpOnly cookies with SHA-256 hashing in the DB.'],
              ['Atomic Signup', 'Credentials + face descriptor sent in a single POST. No partial user records if face capture fails mid-flow.'],
            ].map(([name, desc]) => (
              <div className={s.featureRow} key={name}>
                <span className={s.featureName}>{name}</span>
                <span className={s.featureDesc}>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className={s.section} id="stack">
        <div className={s.container}>
          <div className={`${s.sectionLabel} ${s.animateIn}`}>Tech Stack</div>
          <h2 className={`${s.sectionTitle} ${s.animateIn} ${s.delay1}`}>Built with modern, production-ready tools</h2>
          <div className={`${s.techGrid} ${s.animateIn} ${s.delay2}`}>
            {['React 19', 'Vite', 'face-api.js', 'TensorFlow.js', 'Node.js', 'Express', 'Turso', 'libSQL', 'JWT', 'bcrypt', 'Helmet', 'Render'].map(t => (
              <span className={s.techPill} key={t}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={s.ctaSection}>
        <h2 className={`${s.ctaTitle} ${s.animateIn}`}>See it in action</h2>
        <p className={`${s.ctaSubtitle} ${s.animateIn} ${s.delay1}`}>
          Try the live demo — sign up with your face in under 30 seconds.
        </p>
        <div className={`${s.ctaBtns} ${s.animateIn} ${s.delay2}`}>
          <Link to="/signup" className={s.ctaBtn}>Get Started →</Link>
          <a href="https://github.com/maneshwarS/webcam-faceauth" className={`${s.ctaBtn} ${s.ctaBtnOutline}`} target="_blank" rel="noreferrer">View Source</a>
        </div>
      </section>

      {/* Footer */}
      <footer className={s.footer}>
        <div className={s.footerText}>© 2026 FaceAuth <span className={s.dot} /> Built by Maneshwar Singh</div>
        <div className={s.footerLinks}>
          <a href="https://github.com/maneshwarS/webcam-faceauth" target="_blank" rel="noreferrer">GitHub</a>
          <Link to="/signin">Sign In</Link>
          <Link to="/signup">Sign Up</Link>
        </div>
      </footer>
    </div>
  );
}
