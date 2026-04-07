import { motion } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import HeaderNav from './HeaderNav'

export default function DashboardLayout({ children }) {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderNav />
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mx-auto w-full max-w-7xl px-5 pt-[100px] pb-14 sm:px-7 lg:px-10"
      >
        {children}
      </motion.main>
    </div>
  )
}
