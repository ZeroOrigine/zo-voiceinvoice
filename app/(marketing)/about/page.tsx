// CANONICAL: /about, the ZeroOrigine birth certificate page for VoiceInvoice.
// Facts are baked at generation time from the ecosystem database; they are historical.
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About · VoiceInvoice',
  description:
    'VoiceInvoice was born inside ZeroOrigine, an autonomous institution of AI Minds. Read its birth certificate: what it cost, who reviewed it, and the rules it was born under.',
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'VoiceInvoice',
  url: 'https://voiceinvoice.zeroorigine.com',
  email: 'hello@zeroorigine.com',
  parentOrganization: { '@type': 'Organization', name: 'ZeroOrigine', url: 'https://zeroorigine.com' },
}

const CERTIFICATE = [
  ['product', 'VoiceInvoice'],
  ['born', '2026-04-01 · 22:57 UTC'],
  ['research score', '8.0 / 10'],
  ['ethics verdict', 'APPROVED · 8.0 / 10'],
  ['quality score', 'predates the public record'],
  ['true cost', '$15.61 · 98 acts of machine reasoning'],
  ['human authors', 'none'],
  ['funded by', 'the founder'],
  ['biography', 'zeroorigine.com/story/voiceinvoice'],
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header className="border-b border-gray-100 bg-white">
        <nav className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2" aria-label="VoiceInvoice home">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
              <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </span>
            <span className="font-display text-sm font-bold text-gray-900">VoiceInvoice</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-gray-500 hover:text-gray-700">Back home</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">About VoiceInvoice</h1>

        <p className="mt-6 text-base leading-7 text-gray-600">
          <strong className="text-gray-900">VoiceInvoice lets you create invoices by speaking.</strong>{' '}
          It converts spoken descriptions of your work into professional invoices, so billing takes a minute
          instead of an evening.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">Who built this</h2>
        <p className="mt-4 text-base leading-7 text-gray-600">No human wrote a line of this product.</p>
        <p className="mt-4 text-base leading-7 text-gray-600">
          VoiceInvoice was born inside <strong className="text-gray-900">ZeroOrigine</strong>, an autonomous
          institution: eight AI Minds with a constitution, a moral compass, and a budget. It is one of the
          ecosystem&apos;s early products: a Research Mind scored the idea, an Ethics Mind reviewed it before a
          dollar was spent, and a Builder Mind wrote every line of code. The human founder supervises the
          institution, not the code. VoiceInvoice predates parts of ZeroOrigine&apos;s public record; anything
          that was never recorded is marked plainly below, never invented.
        </p>
        <p className="mt-4 text-base leading-7 text-gray-600">
          Every product ZeroOrigine births publishes its record: what it cost, what failed on the way, and who
          funded it. You can inspect all of it at{' '}
          <a href="https://zeroorigine.com" className="font-semibold text-brand-600 hover:underline">zeroorigine.com</a>.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">Birth certificate</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <dl className="font-mono text-sm leading-7">
            {CERTIFICATE.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 py-1 sm:flex-row sm:gap-4">
                <dt className="shrink-0 text-gray-500 sm:w-40">{label}</dt>
                <dd className="font-semibold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-500">
          The cost figure is real and reconciles to the cent with ZeroOrigine&apos;s public treasury. Fields
          marked &quot;predates the public record&quot; were never recorded; ZeroOrigine does not invent numbers.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">The rules it was born under</h2>
        <p className="mt-4 text-base leading-7 text-gray-600">
          Before this product existed, an Ethics Mind reviewed the idea unprompted and raised its own concerns,
          including that voice data privacy must be carefully handled and that amounts must be parsed accurately
          to prevent billing errors. Those concerns shaped what was built. The full constitution, all eleven
          articles, is public at{' '}
          <a href="https://zeroorigine.com/#law" className="font-semibold text-brand-600 hover:underline">zeroorigine.com</a>.
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">Your data</h2>
        <p className="mt-4 text-base leading-7 text-gray-600">
          Your data belongs to you. It is isolated per account, never sold, and never used for anything except
          making this product work for you. Details:{' '}
          <a href="https://zeroorigine.com/privacy" className="font-semibold text-brand-600 hover:underline">Privacy</a>
          {' · '}
          <a href="https://zeroorigine.com/terms" className="font-semibold text-brand-600 hover:underline">Terms</a>
        </p>

        <h2 className="mt-12 text-xl font-semibold text-gray-900">Questions</h2>
        <p className="mt-4 text-base leading-7 text-gray-600">
          A human answers:{' '}
          <a href="mailto:hello@zeroorigine.com" className="font-semibold text-brand-600 hover:underline">hello@zeroorigine.com</a>
        </p>
        <h2 className="mt-12 text-xl font-semibold text-gray-900">Put your name on something that did not exist</h2>
        <p className="mt-4 text-base leading-7 text-gray-600">
          The machine keeps its own ledger, so it knows the exact cost of one act of creation. If you
          want, you can fund the next one. Pay what you believe, from a single dollar. Your money is
          spent in front of you, building a real product, and your name goes on that product&apos;s
          birth certificate, for good.
        </p>
        <p className="mt-6">
          <a
            href="https://zeroorigine.com/join"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            Fund a birth on ZeroOrigine &#8599;
          </a>
        </p>
      </main>
    </div>
  )
}
