import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Footer from '../layout/footer'

const STEPS = [
  {
    title: 'Watch for the invoice',
    desc: 'A PayPal invoice will be sent to the email address you entered during registration.',
  },
  {
    title: 'Complete payment',
    desc: 'Once payment is completed, the service team can continue activating your registration.',
  },
  {
    title: 'Receive confirmation',
    desc: 'You will receive a follow-up confirmation after the registration is fully processed.',
  },
]

export default function SuccessPage({ name }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])
  return (
    <>
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-4 py-14">
      <div className="pointer-events-none absolute left-0 top-20 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-16 h-80 w-80 rounded-full bg-sky-100/70 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative mx-auto max-w-3xl"
      >
        <div className="overflow-hidden rounded-[34px] border border-white/80 bg-white shadow-[0_40px_100px_-50px_rgba(37,99,235,0.45)]">
          <div className="border-b border-blue-100 bg-[linear-gradient(180deg,#ffffff_0%,#f4f9ff_100%)] px-8 py-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-blue-600 text-white shadow-[0_25px_55px_-30px_rgba(37,99,235,0.7)]">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Registration Submitted</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-slate-950">
              Thank you{name ? `, ${name}` : ''}.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Your individual registration has been recorded. The next steps below explain what happens before activation.
            </p>
          </div>

          <div className="px-8 py-8">
            <div className="space-y-4">
              {STEPS.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.1 }}
                  className="flex flex-col gap-3 rounded-[26px] border border-slate-200 bg-slate-50/80 p-5 sm:flex-row sm:items-start"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-sm font-bold text-white">
                    0{index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-950">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 rounded-[26px] border border-blue-100 bg-blue-50/80 px-5 py-4 text-sm leading-6 text-blue-900">
              Questions can be sent to{' '}
              <a href="mailto:agent@theifoa.com" className="font-semibold text-blue-700 hover:underline">
                agent@theifoa.com
              </a>
              .
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/dashboard/subscription"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 shadow-md shadow-blue-200"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
                View My Subscription
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Return home
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    <Footer />
  </>
  )
}
