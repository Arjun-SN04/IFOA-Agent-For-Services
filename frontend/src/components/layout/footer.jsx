import { useAuth } from '../../context/AuthContext'

export default function Footer() {
  const { user } = useAuth()

  return (
    <footer style={{ background: '#000015', color: '#6b7280' }} className="py-4 px-6 text-center">
      <div className="max-w-6xl mx-auto">
        <p className="text-xs">© {new Date().getFullYear()} IFOA USA Corp. All rights reserved.</p>
      </div>
    </footer>
  )
}
