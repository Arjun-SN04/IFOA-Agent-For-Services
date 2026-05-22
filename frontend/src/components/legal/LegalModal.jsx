import { useState } from 'react'

// ── Content ───────────────────────────────────────────────────────────────────

const TERMS_SECTIONS = [
  {
    heading: '1. Introduction',
    body: 'Welcome to IFOA USA Corporation, a trusted provider of U.S. Agent for Service solutions for individuals with foreign addresses who hold or apply for FAA certificates, ratings, or authorizations. These Terms & Conditions ("Terms") govern your use of our services and establish a binding agreement between you and IFOA USA Corporation.\n\nBy using our platform, you acknowledge and agree to these Terms. If you do not agree, you may not use our services.',
  },
  {
    heading: '2. Services Provided',
    body: 'IFOA USA Corporation acts as a U.S. Agent for Service in compliance with FAA regulations (14 CFR Part 3, Sections 3.301 – 3.303). Our services include:\n\n• Providing a U.S. address for FAA service of documents.\n• Receiving FAA-related correspondence on your behalf.\n• Scanning and forwarding documents electronically.\n• Assisting with compliance updates related to FAA requirements.',
  },
  {
    heading: '3. Eligibility',
    body: 'To use our services, you must:\n\n• Be an individual or entity required by the FAA to designate a U.S. Agent for Service.\n• Provide accurate personal and contact details.\n• Maintain an active account with IFOA USA Corporation.',
  },
  {
    heading: '4. Client Responsibilities',
    body: 'By using our services, you agree to:\n\n• Keep your contact information up to date.\n• Ensure that your designated U.S. Agent information is current with the FAA.\n• Respond to any forwarded FAA documents promptly.\n• Pay all fees associated with the service.\n\nFailure to comply with these responsibilities may result in service suspension or termination.',
  },
  {
    heading: '5. Document Handling & Liability',
    body: 'IFOA USA Corporation is responsible for receiving and forwarding FAA documents within two (2) business days of receipt.\n\nIFOA USA Corporation is not liable for any delays, losses, or damages resulting from:\n• Client\'s failure to update contact details.\n• Client\'s failure to act on forwarded documents.\n• Technical issues beyond IFOA USA Corporation\'s control.\n\nIFOA USA Corporation is not responsible for the legal consequences of missed deadlines due to client inaction.',
  },
  {
    heading: '6. Fees & Payment',
    body: 'The standard service fee is mentioned on the website (subject to change with notice). Payment must be made in advance to activate services.\n\nThe service will automatically renew every year, after the selected term (multi-year or unlimited), and the payment method on file will be charged unless the client cancels before the renewal date.\n\nRefunds are not available once the service period begins. Failure to renew on time may result in automatic cancellation of your agent designation.',
  },
  {
    heading: '7. Non-Payment Procedure',
    body: 'If payment is not received by the due date, services will be suspended, and no further documents will be processed.\n\nIFOA USA Corporation will retain any received documents for a grace period of 30 days from the suspension date. If payment is not received within the grace period, all stored documents will be permanently deleted, and the client\'s designation as a U.S. Agent for Service will be revoked.\n\nClients may reactivate their accounts within the grace period by paying outstanding fees. Beyond this period, a new registration will be required.',
  },
  {
    heading: '8. Shipping Costs for Forwarding',
    body: 'Document forwarding beyond electronic transmission will incur additional shipping costs. Shipping costs will be calculated based on the client\'s location and address.\n\nThe client agrees to cover all shipping expenses before documents are dispatched. Clients may choose between standard and express delivery options, with costs varying based on urgency and location.',
  },
  {
    heading: '9. Account Deletion',
    body: 'Deleting your account will result in the immediate deletion of all documents and certificates associated with your account. Any remaining subscription period will not be refunded.',
  },
  {
    heading: '10. Termination & Suspension',
    body: 'IFOA USA Corporation reserves the right to terminate or suspend services if:\n\n• The client provides false or misleading information.\n• Payments are not made on time.\n• The client fails to comply with FAA regulations.\n• The client engages in fraudulent or illegal activities.',
  },
  {
    heading: '11. Limitation of Liability',
    body: 'IFOA USA Corporation provides services on an "as is" and "as available" basis. IFOA USA Corporation shall not be liable for indirect, incidental, or consequential damages.\n\nIFOA USA Corporation\'s total liability, if any, shall be limited to the amount paid for the service within the last 12 months.',
  },
  {
    heading: '12. Governing Law & Dispute Resolution',
    body: 'These Terms are governed by the laws of the United States. Any disputes shall be resolved through arbitration in the state where IFOA USA Corporation operates, unless otherwise required by law.',
  },
  {
    heading: '13. Marketing Usage & Public Representation',
    body: 'By using our services, you grant IFOA USA Corporation the right to reference your company name and logo for marketing and promotional purposes — for example, on our website or in presentations. We will never use personal names or individual identities for promotional purposes without your explicit consent.\n\nYou may withdraw this permission at any time by contacting us at agent@theifoa.com.',
  },
  {
    heading: '14. Client Responsibility for FAA Designation',
    body: 'IFOA USA Corporation is not responsible for ensuring that clients correctly designate IFOA USA Corporation as their U.S. Agent for Service in the FAA\'s U.S. Agent for Service System (USAS) or through any other required FAA channels. It is the client\'s sole responsibility to complete the designation process accurately and in accordance with FAA regulations.',
  },
  {
    heading: '14.1 Removal of IFOA USA Corporation as U.S. Agent After Service Expiration',
    body: 'Upon expiration, suspension, or termination of your IFOA USA Corporation subscription, IFOA USA Corporation will immediately cease to act as your designated U.S. Agent for Service.\n\nIt is the client\'s sole responsibility to promptly remove IFOA USA Corporation as their designated agent within the FAA\'s U.S. Agent for Service System (USAS).\n\nIFOA USA Corporation will not receive, process, or forward any FAA documents received after the expiration date. Any such documents will be discarded without notice. IFOA USA Corporation assumes no responsibility or liability for missed FAA correspondence or resulting compliance consequences once the service period has expired.',
  },
  {
    heading: '15. Amendments',
    body: 'IFOA USA Corporation may update these Terms at any time. Clients will be notified of significant changes, and continued use of the service constitutes acceptance of the updated Terms.',
  },
  {
    heading: 'Acknowledgment',
    body: 'By signing up for IFOA USA Corporation\'s Agent for Service platform, you confirm that you have read, understood, and agreed to these Terms & Conditions.',
  },
]

const PRIVACY_SECTIONS = [
  {
    heading: '1. Introduction',
    body: 'IFOA USA Corporation ("Company," "we," "us," or "our") is committed to protecting the privacy and security of individuals who interact with our website (www.theifoa.com) and U.S. Agent for Service offerings. This Privacy Policy outlines how we collect, use, disclose, and protect your personal data.\n\nBy using our Website or our Agent for Service, you agree to the practices described in this Privacy Policy.',
  },
  {
    heading: '2. Information We Collect',
    body: '2.1 Website Users\n• Personal Information: Name, email address, phone number, company details, and other data voluntarily provided.\n• Technical Information: IP address, browser type, device details, referring website, and interaction with our Website through cookies.\n• Mobile Number for SMS: If you provide a mobile number, we may use it to send SMS notifications regarding FAA correspondence or urgent compliance-related updates.\n\n2.2 U.S. Agent for Service Clients\n• Required FAA Data: Full legal name, U.S. agent designation details, physical address, and contact information.\n• Regulatory Communications: Documents or notices from the FAA or other regulatory authorities related to your designation.\n\n2.3 Cookies and Tracking Technologies\nWe use cookies and tracking technologies to enhance Website functionality, analyze usage patterns, and provide a personalized experience.',
  },
  {
    heading: '3. Legal Basis for Processing Data',
    body: '• Contractual Necessity: To provide Agent for Service representation and FAA compliance.\n• Legitimate Interests: To improve Website usability, optimize our services, and protect our platform.\n• Legal Obligations: To comply with FAA regulations, record-keeping requirements, and applicable laws.\n• Consent: Where required, we seek your explicit consent before processing specific types of data.',
  },
  {
    heading: '4. How We Use Your Information',
    body: '4.1 Website Users\n• To provide, improve, and personalize our Website and services.\n• To respond to inquiries, communicate with users, and manage customer relationships.\n• To analyze Website traffic and optimize performance.\n\n4.2 U.S. Agent for Service Clients\n• To process your FAA U.S. Agent designation and maintain compliance records.\n• To receive official FAA correspondence on your behalf and forward it securely.\n• To verify identity and maintain secure records in line with FAA requirements.\n• To notify you by SMS when we receive FAA correspondence on your behalf.',
  },
  {
    heading: '5. Data Retention',
    body: 'We retain personal data for as long as necessary to fulfill the purposes outlined in this Privacy Policy.\n\n• Website interactions: Retained as long as necessary for analytics and customer engagement.\n• U.S. Agent for Service clients: Retained for the duration of your FAA registration and any legally required period after termination.\n\nData may be stored longer if required for compliance with legal, regulatory, or dispute resolution purposes.',
  },
  {
    heading: '6. Disclosure of Your Information',
    body: 'We do not sell personal data. However, we may disclose data under these circumstances:\n\n6.1 Website Users\n• Service Providers: We may use third-party vendors for hosting, analytics, or customer support.\n• SMS Service Providers: We may use trusted third-party SMS gateways to deliver mobile notifications.\n\n6.2 U.S. Agent for Service Clients\n• FAA Compliance: As an official U.S. Agent, we may disclose necessary information to the FAA or other regulatory bodies as required by law.\n• Legal Compliance & Protection: We may disclose personal data if required by law, legal proceedings, or government requests.\n• Business Transfers: If IFOA USA Corporation undergoes a merger, acquisition, or sale, your data may be transferred accordingly.',
  },
  {
    heading: '7. Data Security',
    body: 'We implement industry-standard security measures to protect your data, including:\n\n• Encryption & Secure Storage: Personal and FAA-related data is securely stored and transmitted.\n• Access Controls: Only authorized personnel can access sensitive client data.\n• Compliance Monitoring: Regular audits ensure adherence to FAA and data protection regulations.\n\nHowever, no transmission over the Internet is completely secure.',
  },
  {
    heading: '8. International Data Transfers',
    body: 'As a U.S.-based company, we process and store personal data in the United States. If you are accessing our services from outside the U.S., your data may be transferred to jurisdictions with different data protection laws.\n\nFor European Economic Area (EEA) clients, we use Standard Contractual Clauses (SCCs) and other safeguards to protect personal data transfers.',
  },
  {
    heading: '9. FAA Communications and Regulatory Compliance',
    body: 'By engaging IFOA USA Corporation as your U.S. Agent for Service, you authorize us to:\n\n• Receive official FAA notices on your behalf.\n• Transmit FAA-related correspondence securely to your designated contact.\n• Retain necessary records for regulatory compliance.\n\nYour failure to keep your U.S. Agent information current may affect your FAA certification status.',
  },
  {
    heading: '10. Your Rights and Choices',
    body: 'Depending on your jurisdiction, you may have the following rights:\n\n• Access & Correction: Request access to and correction of your personal data.\n• Opt-Out of Communications: Withdraw consent for marketing communications.\n• Deletion: Request deletion of personal data, subject to legal retention obligations.\n• Restriction of Processing: Request processing limitations under certain circumstances.\n• Data Portability: Request a structured, machine-readable copy of your data.\n• Complaints: File a complaint with a data protection authority.\n\nTo exercise these rights, contact us at agent@theifoa.com.',
  },
  {
    heading: '11. Third-Party Websites',
    body: 'Our Website may contain links to third-party websites. We do not control or assume responsibility for their privacy policies. We recommend reviewing their policies independently.',
  },
  {
    heading: '12. Children\'s Privacy',
    body: 'Our Website and services are not directed at individuals under 18 years old. We do not knowingly collect personal data from minors.',
  },
  {
    heading: '13. Updates to This Privacy Policy',
    body: 'We reserve the right to update this Privacy Policy periodically. Changes will be posted on this page with a revised effective date.',
  },
  {
    heading: '14. Contact Information',
    body: 'IFOA USA Corporation\n1616 Concierge Blvd\nDaytona Beach, FL 32117\nEmail: agent@theifoa.com\nPhone: +1 (508) 838-5880',
  },
]

// ── Modal ─────────────────────────────────────────────────────────────────────

export function LegalModal({ open, onClose, type }) {
  if (!open) return null

  const isTerms = type === 'terms'
  const title = isTerms ? 'Terms & Conditions' : 'Privacy Policy'
  const subtitle = isTerms
    ? 'IFOA USA Corporation — U.S. Agent for Service Platform'
    : 'IFOA USA Corporation'
  const sections = isTerms ? TERMS_SECTIONS : PRIVACY_SECTIONS

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-0.5">
              {isTerms ? 'Legal Agreement' : 'Privacy & Data'}
            </p>
            <h2 className="text-base font-black text-slate-900">{title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex-shrink-0 ml-4 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {sections.map((s) => (
            <div key={s.heading}>
              <p className="text-xs font-bold text-slate-800 mb-1.5">{s.heading}</p>
              {s.body.split('\n').map((line, i) =>
                line.trim() === '' ? (
                  <div key={i} className="h-2" />
                ) : (
                  <p key={i} className={`text-xs leading-relaxed ${line.startsWith('•') ? 'pl-3 text-slate-600' : 'text-slate-600'}`}>
                    {line}
                  </p>
                )
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Checkbox component ────────────────────────────────────────────────────────

function LegalCheckbox({ checked, onChange, error, children }) {
  return (
    <label
      className="flex items-start gap-3 cursor-pointer p-4 rounded-2xl border transition-all duration-150"
      style={
        checked
          ? { background: '#eff6ff', borderColor: '#0000ff', boxShadow: '0 0 0 3px rgba(0,0,255,0.08)' }
          : error
          ? { background: 'rgba(254,242,242,0.5)', borderColor: '#fca5a5' }
          : { background: '#fff', borderColor: '#e2e8f0' }
      }
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
        <div
          className="w-5 h-5 rounded flex items-center justify-center transition-all duration-150"
          style={
            checked
              ? { background: '#0000ff', border: '2px solid #0000ff' }
              : error
              ? { background: '#fff1f2', border: '2px solid #f87171' }
              : { background: 'white', border: '2px solid #cbd5e1' }
          }
        >
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-sm leading-relaxed" style={{ color: checked ? '#1e3a8a' : '#475569' }}>{children}</span>
    </label>
  )
}

// ── Exported combined component ───────────────────────────────────────────────

export default function LegalCheckboxes({ agreedTerms, agreedPrivacy, onChangeTerms, onChangePrivacy, termsError, privacyError }) {
  const [modal, setModal] = useState(null) // 'terms' | 'privacy' | null

  return (
    <>
      <LegalModal open={!!modal} onClose={() => setModal(null)} type={modal} />

      <div className="space-y-3">
        <p className="text-sm font-bold text-slate-900">
          Legal Agreements <span className="text-red-400">*</span>
        </p>

        <LegalCheckbox checked={agreedTerms} onChange={onChangeTerms} error={termsError}>
          I have read and agree to the{' '}
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); setModal('terms') }}
            className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800 transition"
          >
            Terms & Conditions
          </button>
        </LegalCheckbox>
        {termsError && (
          <p className="text-red-500 text-xs mt-1 font-medium">You must agree to the Terms & Conditions to continue.</p>
        )}

        <LegalCheckbox checked={agreedPrivacy} onChange={onChangePrivacy} error={privacyError}>
          I have read and agree to the{' '}
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); setModal('privacy') }}
            className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-800 transition"
          >
            Privacy Policy
          </button>
        </LegalCheckbox>
        {privacyError && (
          <p className="text-red-500 text-xs mt-1 font-medium">You must agree to the Privacy Policy to continue.</p>
        )}
      </div>
    </>
  )
}
