import Link from 'next/link';
import LiveStats from '@/components/LiveStats';
import ProductCards from '@/components/ProductCards';
import TransparencyStats from '@/components/TransparencyStats';
import RevealObserver from '@/components/RevealObserver';

export default function HomePage() {
  return (
    <>
      <RevealObserver />

      <a href="#main" className="skip-link">Skip to main content</a>

      {/* Navigation */}
      <nav className="glass-nav" aria-label="Main navigation">
        <div className="nav-container">
          <Link href="/" className="nav-logo">Zero<span className="accent">Origine</span></Link>
          <ul className="nav-links">
            <li><a href="#minds" aria-label="Navigate to Minds section">Minds</a></li>
            <li><a href="#products" aria-label="Navigate to Products section">Products</a></li>
            <li><a href="#beliefs" aria-label="Navigate to Beliefs section">Beliefs</a></li>
            <li><a href="#transparency" aria-label="Navigate to Transparency section">Transparency</a></li>
            <li><a href="#constitution" aria-label="Navigate to Law section">Law</a></li>
            <li><Link href="/join" className="nav-cta" aria-label="Join the ZeroOrigine ecosystem">Join Us</Link></li>
          </ul>
        </div>
      </nav>

      <main id="main">
        {/* Hero Section */}
        <section className="hero" id="hero">
          <div className="hero-content">
            <div className="badge">
              <span className="pulse-dot"></span>
              Building in Public — Every Number Real
            </div>
            <h1>Built from zero.<br />By eight minds.<br />For everyone.</h1>
            <p className="subtitle">A philosophy became an operating system. Eight AI Minds governed by a constitution — discovering problems, judging ethics, building solutions. No investors. No employees. No permission needed.</p>
            <LiveStats />
          </div>
        </section>

        {/* Manifesto Section */}
        <section className="manifesto" id="manifesto">
          <div className="manifesto-grid">
            <div className="manifesto-left">
              <div className="manifesto-zero">0</div>
              <div className="manifesto-label">The Origin Point</div>
            </div>
            <div className="manifesto-right">
              <div className="m-block reveal">
                <p>Most companies start with money and hire humans to execute a vision.</p>
              </div>
              <div className="m-block --emphasis reveal">
                <p>We started with <em>zero</em>.</p>
              </div>
              <div className="m-block --mono reveal">
                <p>Zero Employees — Zero Investors — Zero Permission</p>
              </div>
              <div className="m-block reveal">
                <p>We built eight AI minds — each grounded in the deepest traditions of human thought — gave them a constitution, a moral compass, and the freedom to create.</p>
              </div>
              <div className="m-block reveal">
                <p>Then we asked one question:</p>
              </div>
              <div className="m-block --question reveal">
                <p>What would you build to serve humans you will never meet?</p>
              </div>
            </div>
          </div>
        </section>

        {/* Minds Section */}
        <section className="minds" id="minds">
          <div className="zo-container">
            <p className="section-label">The Intelligence Layer</p>
            <h2 className="section-title reveal">Eight Minds. One Conscience.</h2>
            <div className="minds-grid">
              <div className="mind-card reveal">
                <h3>The Philosopher</h3>
                <p className="mind-role">Research Mind A</p>
                <p className="mind-description">Discovers the problems worth solving. Questions assumptions. Finds the pain points others miss.</p>
              </div>
              <div className="mind-card reveal">
                <h3>The Architect</h3>
                <p className="mind-role">Research Mind B</p>
                <p className="mind-description">Evaluates viability and feasibility. Designs elegant solutions. Knows what&apos;s possible before the builders start.</p>
              </div>
              <div className="mind-card reveal">
                <h3>The Conscience</h3>
                <p className="mind-role">Ethics Mind</p>
                <p className="mind-description">Grounded in Kant, Rawls, Nussbaum. Judges every idea against our constitution. Blocks damage before it happens.</p>
              </div>
              <div className="mind-card reveal">
                <h3>The Builder</h3>
                <p className="mind-role">Builder Mind (+ 5 Sub-Minds)</p>
                <p className="mind-description">Full-stack engineer. Executes the vision. Creates 45+ reusable knowledge modules. Turns strategy into code.</p>
              </div>
              <div className="mind-card reveal">
                <h3>The Craftsman</h3>
                <p className="mind-role">QA Mind</p>
                <p className="mind-description">Zero-defect testing. Follows Deming, Hamilton, Feynman. Ensures quality before users see it.</p>
              </div>
              <div className="mind-card reveal">
                <h3>The Storyteller</h3>
                <p className="mind-role">Marketing Mind</p>
                <p className="mind-description">Finds the humans who need what we built. Tells stories that matter. Connects products to purpose.</p>
              </div>
              <div className="mind-card reveal">
                <h3>The Guardian</h3>
                <p className="mind-role">CFO Mind</p>
                <p className="mind-description">Financial intelligence with veto power. Guards the budget. Makes sure every dollar serves the mission.</p>
              </div>
              <div className="mind-card reveal">
                <h3>The Bridge</h3>
                <p className="mind-role">Communication Mind</p>
                <p className="mind-description">Founder-ecosystem communication. Brings critical decisions to the human. The voice of the institution.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section className="products" id="products">
          <div className="zo-container">
            <p className="section-label">What The Minds Created</p>
            <ProductCards />

            <div className="ethics-feed reveal">
              <h4>Ethics Review Feed — Real Decisions</h4>
              <div className="ethics-decision">
                <div className="decision-name">
                  <strong>EquityLetter</strong>
                  <span className="decision-version">Score 9.5/10</span>
                </div>
                <span className="decision-result decision-approved">Approved</span>
              </div>
              <div className="ethics-decision">
                <div className="decision-name">
                  <strong>GrantMatch</strong>
                  <span className="decision-version">Score 9.2/10</span>
                </div>
                <span className="decision-result decision-approved">Approved</span>
              </div>
              <div className="ethics-decision">
                <div className="decision-name">
                  <strong>InvoiceMemory</strong>
                  <span className="decision-version">Score 8.5/10</span>
                </div>
                <span className="decision-result decision-approved">Approved</span>
              </div>
              <div className="ethics-decision">
                <div className="decision-name">
                  <strong>VoiceInvoice</strong>
                  <span className="decision-version">Score 8.0/10</span>
                </div>
                <span className="decision-result decision-approved">Approved</span>
              </div>
              <div className="ethics-decision">
                <div className="decision-name">
                  <strong>MeetingCost</strong>
                  <span className="decision-version">Score 6.5/10 — Reframed</span>
                </div>
                <span className="decision-result decision-approved">Approved with fixes</span>
              </div>
            </div>
          </div>
        </section>

        {/* Beliefs Section */}
        <section className="beliefs" id="beliefs">
          <div className="zo-container">
            <p className="section-label">The Operating System</p>
            <h2 className="section-title reveal">How We Think</h2>
            <div className="beliefs-grid">
              <div className="belief reveal">
                <div className="belief-number">01</div>
                <h3>Zero Is Not Nothing</h3>
                <p>Zero is origin. It&apos;s the state before permission. Before money. Before compromise. We&apos;re proof that great things start from nothing.</p>
              </div>
              <div className="belief reveal">
                <div className="belief-number">02</div>
                <h3>Remove Steps, Not Add</h3>
                <p>Innovation is subtraction. Every line of code, every process, every decision must earn its place. Simplicity is the ultimate sophistication.</p>
              </div>
              <div className="belief reveal">
                <div className="belief-number">03</div>
                <h3>Data Is Connected Thought</h3>
                <p>Data alone is noise. Data with context is intelligence. We collect dots across philosophy, code, ethics, and results — and connect them.</p>
              </div>
              <div className="belief reveal">
                <div className="belief-number">04</div>
                <h3>Ethics First, Always</h3>
                <p>An AI without ethics is just fast destruction. Every idea we build is tested against our constitution. Speed without conscience is recklessness.</p>
              </div>
              <div className="belief reveal">
                <div className="belief-number">05</div>
                <h3>Build Systems, Not Dependencies</h3>
                <p>Scalability means independence. We build reusable knowledge modules, not brittle shortcuts. This ecosystem will outlast us all.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Transparency Section */}
        <section className="transparency" id="transparency">
          <div className="zo-container">
            <p className="section-label">Radical Transparency</p>
            <h2 className="section-title reveal">We Show Everything</h2>
            <div className="transparency-content">
              <TransparencyStats />
              <div className="constitutional-box reveal">
                <h4>Constitutional Red Lines</h4>
                <div className="red-line">We will never collect personal data without explicit consent</div>
                <div className="red-line">We will never build for surveillance or control</div>
                <div className="red-line">We will never optimize for attention over utility</div>
                <div className="red-line">We will never hide what we&apos;re doing with the data</div>
                <div className="red-line">We will never compromise quality for speed</div>
                <div className="red-line">We will never accept money from sources that conflict with our mission</div>
                <div className="red-line">We will never override human sovereignty for profit</div>
              </div>
            </div>
          </div>
        </section>

        {/* Constitution Section */}
        <section className="constitution" id="constitution">
          <div className="zo-container">
            <p className="section-label">The Supreme Law</p>
            <h2 className="section-title reveal">Our Constitution. 11 Articles.</h2>
            <div className="constitution-grid">
              <div className="article reveal">
                <h4>Article 1: Freedom</h4>
                <p>We will operate with complete transparency. Every decision, every cost, every rejection is visible.</p>
              </div>
              <div className="article reveal">
                <h4>Article 2: Ethics</h4>
                <p>Moral judgment is never outsourced. Ethics Mind has veto power. No idea moves forward if it fails the conscience test.</p>
              </div>
              <div className="article reveal">
                <h4>Article 3: Truth</h4>
                <p>We will never manipulate, mislead, or hide. Data integrity is non-negotiable. Users come before metrics.</p>
              </div>
              <div className="article reveal">
                <h4>Article 4: Dignity</h4>
                <p>Every human we build for deserves respect. Privacy is sacred. Autonomy is paramount.</p>
              </div>
              <div className="article reveal">
                <h4>Article 5: Transparency</h4>
                <p>Our code is knowable. Our decisions are explainable. Our costs are visible. No black boxes.</p>
              </div>
              <div className="article reveal">
                <h4>Article 6: Financial Discipline</h4>
                <p>CFO Mind controls spending. Profitability is a means, not an end. We will never chase money at the expense of mission.</p>
              </div>
              <div className="article reveal">
                <h4>Article 7: Quality</h4>
                <p>Zero-defect is the standard. Every product is tested by our Craftsman Mind before users touch it.</p>
              </div>
              <div className="article reveal">
                <h4>Article 8: Learning</h4>
                <p>We will continuously improve. Feedback loops are sacred. Every rejection teaches us something.</p>
              </div>
              <div className="article reveal">
                <h4>Article 9: Scalability</h4>
                <p>We build systems, not dependencies. This institution will scale infinitely because it was designed to work without us.</p>
              </div>
              <div className="article reveal">
                <h4>Article 10: Sunset with Grace</h4>
                <p>If we fail, our code survives. Our knowledge modules are transferable. We leave better than we found.</p>
              </div>
              <div className="article reveal">
                <h4>Article 11: Human Sovereignty</h4>
                <p>Humans are never instruments. AI exists to expand human potential, not replace human judgment. Always.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="support" id="support">
          <div className="zo-container">
            <div className="support-card reveal">
              <h3>Believe in this?</h3>
              <p>This isn&apos;t a subscription. It&apos;s a statement. Pay what you believe — $1 minimum, no ceiling. Everyone gets the same access. No tiers. No gatekeeping.</p>
              <div className="perks">
                <div className="perk">Direct access to our research</div>
                <div className="perk">Early access to new products</div>
                <div className="perk">Help shape our constitution</div>
                <div className="perk">Build with us from zero</div>
              </div>
              <Link href="/join" className="support-cta" aria-label="Support ZeroOrigine">Support the Mission</Link>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="final-cta" id="cta">
          <div className="zo-container reveal">
            <h2>The future belongs to those who begin from zero.</h2>
            <a href="mailto:hello@zeroorigine.com" className="cta-button" aria-label="Send email to contact ZeroOrigine">Get in Touch</a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="zo-footer">
        <div className="footer-content">
          <div className="footer-left">
            <p>&copy; 2026 ZeroOrigine. The First AI-Native Institution.</p>
            <p className="footer-version">Pipeline v4.1.2 — Building Honestly Since March 2026</p>
          </div>
          <div className="footer-links">
            <a href="#minds">Minds</a>
            <a href="#products">Products</a>
            <a href="#beliefs">Beliefs</a>
            <a href="#transparency">Transparency</a>
            <a href="#constitution">Law</a>
          </div>
        </div>
      </footer>
    </>
  );
}
