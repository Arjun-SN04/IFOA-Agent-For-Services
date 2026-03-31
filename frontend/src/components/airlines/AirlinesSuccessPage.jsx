import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Footer from '../layout/footer'

const STEPS = [
  { icon: '📧', title: 'Check your email', desc: 'A PayPal invoice will be sent to the address you provided.' },
  { icon: '💵', title: 'Complete payment', desc: 'Pay the invoice to activate your Airlines Agent for Service plan.' },
  { icon: '✅', title: "You're all set!", desc: "You'll receive a confirmation email once your account is active." },
]

export default function AirlinesSuccessPage({ airlineName }) {
  return (
    <>
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 flex items-center justify-center py-16 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="max-w-lg w-full"
      >
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header — blue instead of amber */}
          <div className="bg-gradient-to-br from-blue-700 to-blue-500 px-8 pt-10 pb-8 text-center">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 14 }}
              className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <h2 className="text-2xl font-black text-white mb-1">Airlines Registration Submitted!</h2>
            <p className="text-blue-100 text-sm">
              Thank you, <strong className="text-white">{airlineName || 'your airline'}</strong>. We've received your application.
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-7">
            <p className="text-sm text-gray-500 mb-6 text-center">
              Your Airlines Agent for Service registration is being processed. Follow the steps below to complete activation.
            </p>

            <div className="space-y-3 mb-7">
              {STEPS.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl flex-shrink-0 shadow-sm">
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                  <div className="ml-auto flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center">
                    {i + 1}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-center text-blue-800 mb-7">
              Questions? Contact us at{' '}
              <a href="mailto:agent@theifoa.com" className="font-bold text-blue-700 hover:underline">
                agent@theifoa.com
              </a>
            </div>

            <div className="flex flex-col gap-3">
              <Link to="/dashboard/subscription"
                className="flex w-full items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-150 shadow-md shadow-blue-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <rect x="2" y="5" width="20" height="14" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 10h20" />
                </svg>
                View My Subscription
              </Link>
              <Link to="/dashboard"
                className="flex w-full items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 py-3.5 rounded-xl transition-all duration-150 shadow-sm hover:shadow-md">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go to Dashboard
              </Link>
              <Link to="/"
                className="flex w-full items-center justify-center gap-2 border border-gray-200 text-gray-600 font-bold px-8 py-3 rounded-xl transition-all hover:bg-gray-50">
                Return to Home
              </Link>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          IFOA USA Corp — U.S. Agent for Service · Daytona Beach, FL
        </p>
      </motion.div>
    </div>
    <Footer />
    </>
  )
}
