/**
 * @file src/features/landing/LandingPage.tsx
 * @description HealthSetu public landing page.
 * Sections: Nav, Hero, Stats, Features, How it works, CTA, Footer.
 * Fully responsive — mobile-first Tailwind CSS.
 * No external dependencies beyond what is already installed.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Video,
  Shield,
  Wifi,
  AlertTriangle,
  FileText,
  MessageSquare,
  Menu,
  X,
  ChevronRight,
  Heart,
  Users,
  Clock,
  CheckCircle,
  Stethoscope,
  Smartphone,
} from 'lucide-react';

// ── Nav ────────────────────────────────────────────────────────────────────

function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Stethoscope size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">
              Health<span className="text-primary-600">Setu</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-primary-600 transition-colors">Features</a>
            <a href="#how"      className="text-sm text-gray-600 hover:text-primary-600 transition-colors">How it works</a>
            <a href="#stats"    className="text-sm text-gray-600 hover:text-primary-600 transition-colors">Impact</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
              Get started free
              <ChevronRight size={14} />
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
          <a href="#features" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2.5">Features</a>
          <a href="#how"      onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2.5">How it works</a>
          <a href="#stats"    onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2.5">Impact</a>
          <div className="pt-3 flex flex-col gap-2 border-t border-gray-100 mt-2">
            <Link to="/login"    className="block text-center py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700">Sign in</Link>
            <Link to="/register" className="block text-center py-2.5 rounded-lg bg-primary-600 text-white text-sm font-semibold">Get started free</Link>
          </div>
        </div>
      )}
    </nav>
  );
}

// ── Hero ───────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-24 pb-16 sm:pt-32 sm:pb-24 bg-gradient-to-br from-primary-50 via-white to-accent-50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

          {/* Left — text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <Heart size={12} className="fill-primary-600" />
              Free healthcare, anywhere in India
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
              Doctor-quality care
              <span className="block text-primary-600 mt-1">from your village</span>
            </h1>

            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
              HealthSetu connects rural patients with certified doctors through
              secure video calls, real-time chat, digital prescriptions, and
              emergency SMS alerts — even on a 2G connection.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-base shadow-lg shadow-primary-200 transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <Users size={18} />
                Register as Patient
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border-2 border-primary-600 text-primary-700 hover:bg-primary-50 font-semibold text-base transition-colors"
              >
                <Stethoscope size={18} />
                Join as Doctor
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 justify-center lg:justify-start text-sm text-gray-500">
              <div className="flex items-center gap-1.5"><CheckCircle size={15} className="text-accent-500" />No consultation fees</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={15} className="text-accent-500" />Works offline</div>
              <div className="flex items-center gap-1.5"><CheckCircle size={15} className="text-accent-500" />Private &amp; secure</div>
            </div>
          </div>

          {/* Right — visual mockup */}
          <div className="flex-1 w-full max-w-sm sm:max-w-md lg:max-w-none">
            <div className="relative mx-auto" style={{ maxWidth: 400 }}>
              {/* Main card */}
              <div className="bg-white rounded-2xl shadow-2xl p-5 border border-gray-100">
                {/* Video call mockup */}
                <div className="bg-gray-900 rounded-xl overflow-hidden mb-4" style={{ aspectRatio: '16/9' }}>
                  <div className="w-full h-full bg-gradient-to-br from-primary-900 to-gray-900 flex items-center justify-center relative">
                    <div className="text-center text-white">
                      <div className="w-14 h-14 bg-primary-600/30 rounded-full flex items-center justify-center mx-auto mb-2 border-2 border-primary-400/40">
                        <Stethoscope size={24} className="text-primary-300" />
                      </div>
                      <p className="text-sm font-semibold text-primary-200">Dr. Rajan Sharma</p>
                      <p className="text-xs text-gray-400 mt-0.5">General Physician</p>
                    </div>
                    {/* PiP preview */}
                    <div className="absolute bottom-2 right-2 w-14 h-10 bg-primary-800 rounded-lg border border-primary-700 flex items-center justify-center">
                      <Users size={14} className="text-primary-300" />
                    </div>
                    {/* Live badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-accent-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Connected
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <MessageSquare size={15} className="text-gray-600" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center shadow-md shadow-red-200">
                    <Video size={18} className="text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <FileText size={15} className="text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Floating SOS card */}
              <div className="absolute -top-5 -left-5 bg-white rounded-xl shadow-lg px-3 py-2.5 border border-gray-100 flex items-center gap-2">
                <div className="w-7 h-7 bg-emergency-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={13} className="text-emergency-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">SOS Sent</p>
                  <p className="text-xs text-gray-400">Alert delivered</p>
                </div>
              </div>

              {/* Floating prescription card */}
              <div className="absolute -bottom-5 -right-5 bg-white rounded-xl shadow-lg px-3 py-2.5 border border-gray-100 flex items-center gap-2">
                <div className="w-7 h-7 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={13} className="text-accent-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Prescription</p>
                  <p className="text-xs text-gray-400">Ready to download</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats ──────────────────────────────────────────────────────────────────

function Stats() {
  const stats = [
    { value: '6+ Cr',  label: 'Rural Indians lack healthcare access' },
    { value: '2G',     label: 'Optimised for slow networks' },
    { value: '< 5s',   label: 'Emergency alert delivery time' },
    { value: '100%',   label: 'Free for patients' },
  ];

  return (
    <section id="stats" className="py-14 bg-primary-600">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">{s.value}</p>
              <p className="mt-1.5 text-sm text-primary-200 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Features ───────────────────────────────────────────────────────────────

const features = [
  {
    icon: <Video size={22} className="text-primary-600" />,
    bg:   'bg-primary-100',
    title:'HD Video Consultations',
    desc: 'Face-to-face video calls with certified doctors using WebRTC. Automatic quality adjustment for slow connections.',
  },
  {
    icon: <AlertTriangle size={22} className="text-emergency-600" />,
    bg:   'bg-emergency-100',
    title:'Emergency SOS Alert',
    desc: 'One tap sends an SMS with your GPS location to your emergency contact. Confirmed within seconds.',
  },
  {
    icon: <FileText size={22} className="text-accent-600" />,
    bg:   'bg-accent-100',
    title:'Digital Prescriptions',
    desc: 'Doctors upload PDF prescriptions directly to your health record. Download anytime, even offline.',
  },
  {
    icon: <Wifi size={22} className="text-blue-600" />,
    bg:   'bg-blue-100',
    title:'Works Offline',
    desc: 'Consultation history and prescriptions cached on your device. Access records without internet.',
  },
  {
    icon: <Shield size={22} className="text-purple-600" />,
    bg:   'bg-purple-100',
    title:'Private & Secure',
    desc: 'Encrypted video calls. Records secured with AWS S3. JWT authentication. HTTPS everywhere.',
  },
  {
    icon: <MessageSquare size={22} className="text-orange-600" />,
    bg:   'bg-orange-100',
    title:'In-Call Chat',
    desc: 'Text chat during video consultations. Share symptoms, ask follow-ups, keep a conversation record.',
  },
];

function Features() {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            Everything you need for better healthcare
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Built specifically for rural India — works on any smartphone, any network.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow border border-gray-100 group">
              <div className={`w-11 h-11 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                {f.icon}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ───────────────────────────────────────────────────────────

const steps = [
  {
    num:   '1',
    icon:  <Smartphone size={20} className="text-primary-600" />,
    title: 'Register for free',
    desc:  'Create your account as a patient or doctor in under 2 minutes.',
  },
  {
    num:   '2',
    icon:  <Stethoscope size={20} className="text-primary-600" />,
    title: 'Find a doctor',
    desc:  'Search by name or specialisation. See who is available right now.',
  },
  {
    num:   '3',
    icon:  <Video size={20} className="text-primary-600" />,
    title: 'Start your consultation',
    desc:  'Describe symptoms, book a slot, and join a secure video call from home.',
  },
  {
    num:   '4',
    icon:  <FileText size={20} className="text-primary-600" />,
    title: 'Get your prescription',
    desc:  'Receive a digital prescription and notes directly in your health records.',
  },
];

function HowItWorks() {
  return (
    <section id="how" className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
            How HealthSetu works
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            From registration to prescription in four simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="relative">
              {/* Arrow between steps — desktop only */}
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-10 left-full w-full items-center justify-center z-10" style={{ width: '100%', left: '75%' }}>
                  <ChevronRight size={20} className="text-primary-300" />
                </div>
              )}
              <div className="flex flex-col items-center text-center">
                <div className="relative w-20 h-20 bg-white rounded-full border-2 border-primary-200 shadow-sm flex items-center justify-center mb-5">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    {s.icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {s.num}
                  </span>
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-20 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white rounded-full" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Clock size={12} />
          Available 24 × 7
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
          Healthcare shouldn't depend
          <span className="block">on where you live.</span>
        </h2>

        <p className="mt-6 text-lg text-primary-200 max-w-2xl mx-auto leading-relaxed">
          Join thousands of patients and doctors already using HealthSetu
          to bridge the rural healthcare gap across India.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-primary-700 hover:bg-primary-50 font-bold text-base shadow-xl transition-all hover:-translate-y-0.5"
          >
            <Heart size={18} className="fill-primary-600 text-primary-600" />
            Start for free — no card needed
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border-2 border-white/40 text-white hover:bg-white/10 font-semibold text-base transition-colors"
          >
            Sign in to your account
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-gray-900 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
              <Stethoscope size={15} className="text-white" />
            </div>
            <span className="text-white font-bold">
              Health<span className="text-primary-400">Setu</span>
            </span>
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how"      className="hover:text-white transition-colors">How it works</a>
            <Link to="/login"   className="hover:text-white transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-white transition-colors">Register</Link>
          </div>

          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} HealthSetu. Built for rural India.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <Hero />
      <Stats />
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}