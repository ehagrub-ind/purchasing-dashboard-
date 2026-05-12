'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Eye, EyeOff, Lock, Mail, ArrowRight, Shield,
  MapPin, Users, Package, Activity,
  ShoppingBag, DollarSign, FileText, UserCheck,
  Fingerprint, ChevronRight,
} from 'lucide-react';

const DEMO_EMAIL = 'dian@indohaircorp.co.id';
const DEMO_PASSWORD = 'indohair123';

const STATS = [
  { value: '3', label: 'Provinsi', icon: MapPin },
  { value: '26+', label: 'Supplier', icon: Users },
  { value: '10', label: 'Bahan', icon: Package },
  { value: '24/7', label: 'Real-time', icon: Activity },
];

const FEATURE_BADGES = [
  { label: 'Supplier', icon: UserCheck },
  { label: 'Pembelian', icon: ShoppingBag },
  { label: 'Keuangan', icon: DollarSign },
  { label: 'Laporan', icon: FileText },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">

      {/* ═══════ LEFT — Brand Panel ═══════ */}
      <div
        className="relative flex flex-col overflow-hidden md:w-[44%] md:min-h-screen"
        style={{
          background: 'linear-gradient(170deg, #3D1F6D 0%, #2A1350 30%, #1A0C38 70%, #110724 100%)',
        }}
      >
        {/* Ambient light layers */}
        <div
          className="pointer-events-none absolute -top-[20%] -right-[15%] h-[70%] w-[70%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.06) 0%, rgba(251,191,36,0.02) 40%, transparent 65%)',
          }}
        />
        <div
          className="pointer-events-none absolute -bottom-[15%] -left-[10%] h-[55%] w-[55%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)',
          }}
        />
        <div
          className="pointer-events-none absolute top-[40%] left-[50%] h-[30%] w-[40%] -translate-x-1/2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,60,180,0.06) 0%, transparent 60%)',
          }}
        />

        {/* Subtle noise texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Fine grid lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        {/* ── Mobile: compact header ── */}
        <div className="relative z-10 flex items-center gap-3 px-6 py-5 md:hidden">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            <span className="text-sm font-extrabold text-white">IH</span>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Indo Hair</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/35 mt-0.5">
              Purchasing System
            </p>
          </div>
        </div>

        {/* ── Desktop: full brand content ── */}
        <div className="relative z-10 hidden md:flex flex-col h-full px-10 lg:px-14 py-10">
          {/* Logo */}
          <div
            className="flex items-center gap-4"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(8px)',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <span className="text-base font-extrabold text-white tracking-tight">IH</span>
            </div>
            <div>
              <p className="text-[15px] font-bold text-white tracking-tight leading-none">Indo Hair</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-white/30 mt-1.5">
                Purchasing System
              </p>
            </div>
          </div>

          {/* Center block */}
          <div className="flex flex-1 flex-col justify-center -mt-2">
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
              }}
            >
              <div className="flex items-center gap-2 mb-5">
                <div className="h-[2px] w-8 rounded-full" style={{ background: 'linear-gradient(90deg, #FBBF24, transparent)' }} />
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/25">
                  Enterprise Platform
                </p>
              </div>

              <h2 className="text-[28px] lg:text-[36px] font-extrabold text-white leading-[1.15] tracking-tight mb-5">
                Kelola Pembelian{'\n'}Bahan Baku dengan{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Kontrol Terpusat
                </span>
              </h2>
              <p className="text-[13px] leading-[1.7] text-white/35 max-w-[380px] mb-10">
                Pantau supplier, pembelian, hutang, arus kas, dan stok bahan baku
                Indo Hair dalam satu sistem operasional.
              </p>
            </div>

            {/* Stats row */}
            <div
              className="rounded-2xl overflow-hidden mb-10"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.03)',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
              }}
            >
              <div className="grid grid-cols-4 divide-x divide-white/[0.04]">
                {STATS.map((s) => (
                  <div
                    key={s.label}
                    className="flex flex-col items-center py-6 transition-colors duration-300 hover:bg-white/[0.02]"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg mb-3"
                      style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <s.icon className="h-3.5 w-3.5 text-white/20" />
                    </div>
                    <p className="text-[18px] font-extrabold text-white leading-none tracking-tight">{s.value}</p>
                    <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-white/25 mt-2">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Operational feature card */}
            <div
              className="rounded-2xl p-6"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.03)',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
              }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <Shield className="h-3.5 w-3.5 text-white/25" />
                <p className="text-[12px] font-bold text-white/70">Kontrol Operasional</p>
              </div>
              <p className="text-[11px] leading-[1.7] text-white/30 mb-5">
                Pembelian, supplier, hutang, dan laporan owner dapat dipantau
                dari satu dashboard yang mudah diaudit.
              </p>
              <div className="flex flex-wrap gap-2">
                {FEATURE_BADGES.map((b) => (
                  <span
                    key={b.label}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all duration-200 hover:bg-white/[0.08]"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <b.icon className="h-3 w-3 text-white/25" />
                    <span className="text-[10px] font-semibold text-white/45">{b.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <p className="text-[10px] font-medium text-white/20">Sistem Aktif</p>
            </div>
            <p className="text-[10px] text-white/12">
              &copy; 2026 PT Indo Hair Corp
            </p>
          </div>
        </div>
      </div>

      {/* ═══════ RIGHT — Login Form ═══════ */}
      <div
        className="flex flex-1 items-center justify-center px-6 py-10 md:py-0 relative"
        style={{
          background: 'linear-gradient(180deg, #FAFAFE 0%, #F4F2F9 40%, #F0EDF6 100%)',
        }}
      >
        {/* Subtle dot grid */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(52,26,95,0.03) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Ambient glow on right panel */}
        <div
          className="pointer-events-none absolute top-[10%] right-[10%] h-[40%] w-[40%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 60%)',
          }}
        />

        <div
          className="w-full max-w-[480px] relative z-10"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s',
          }}
        >
          {/* Header */}
          <div className="mb-9">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="h-7 w-[3px] rounded-full" style={{ background: 'linear-gradient(180deg, #5B2FA0, #341A5F)' }} />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: '#8B7AA8' }}>
                Selamat Datang
              </p>
            </div>
            <h1 className="text-[26px] font-extrabold tracking-tight leading-snug mb-2" style={{ color: '#1A0E2E' }}>
              Masuk ke Purchasing System
            </h1>
            <p className="text-[13px] leading-relaxed" style={{ color: '#A499BA' }}>
              Akses dashboard pembelian Indo Hair Corp
            </p>
          </div>

          {/* Form card */}
          <div
            className="rounded-3xl p-8 lg:p-10"
            style={{
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FDFCFF 100%)',
              border: '1px solid rgba(200,188,222,0.35)',
              boxShadow: `
                0 1px 2px rgba(26,14,46,0.03),
                0 4px 12px rgba(26,14,46,0.04),
                0 16px 40px rgba(26,14,46,0.05),
                inset 0 1px 0 rgba(255,255,255,0.8)
              `,
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                  style={{
                    background: 'linear-gradient(135deg, #FEF2F2, #FFF5F5)',
                    border: '1px solid rgba(254,202,202,0.6)',
                    boxShadow: '0 1px 4px rgba(185,28,28,0.04)',
                  }}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
                    style={{ background: 'rgba(248,113,113,0.1)' }}>
                    <Shield className="h-3.5 w-3.5" style={{ color: '#F87171' }} />
                  </div>
                  <p className="text-[13px] font-medium" style={{ color: '#B91C1C' }}>{error}</p>
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: focusedField === 'email' ? '#5B2FA0' : '#A499BA' }}
                >
                  Email
                </label>
                <div className="relative group">
                  <div
                    className="absolute left-0 top-0 bottom-0 flex w-[52px] items-center justify-center rounded-l-2xl transition-colors duration-200"
                    style={{
                      background: focusedField === 'email' ? 'rgba(91,47,160,0.04)' : '#F8F7FB',
                      borderRight: `1px solid ${focusedField === 'email' ? 'rgba(91,47,160,0.15)' : '#E7E2F1'}`,
                    }}
                  >
                    <Mail className="h-[17px] w-[17px] transition-colors duration-200"
                      style={{ color: focusedField === 'email' ? '#7C5BBF' : '#B0A3C7' }} />
                  </div>
                  <Input
                    type="email"
                    placeholder="email@indohaircorp.co.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="h-[54px] rounded-2xl bg-white text-sm transition-all duration-200"
                    style={{
                      paddingLeft: '3.75rem',
                      border: `1px solid ${focusedField === 'email' ? 'rgba(91,47,160,0.3)' : '#E7E2F1'}`,
                      boxShadow: focusedField === 'email'
                        ? '0 0 0 3px rgba(91,47,160,0.06), 0 2px 8px rgba(91,47,160,0.06)'
                        : '0 1px 2px rgba(26,14,46,0.03)',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  className="mb-2.5 block text-[10px] font-bold uppercase tracking-[0.16em]"
                  style={{ color: focusedField === 'password' ? '#5B2FA0' : '#A499BA' }}
                >
                  Password
                </label>
                <div className="relative group">
                  <div
                    className="absolute left-0 top-0 bottom-0 flex w-[52px] items-center justify-center rounded-l-2xl transition-colors duration-200"
                    style={{
                      background: focusedField === 'password' ? 'rgba(91,47,160,0.04)' : '#F8F7FB',
                      borderRight: `1px solid ${focusedField === 'password' ? 'rgba(91,47,160,0.15)' : '#E7E2F1'}`,
                    }}
                  >
                    <Lock className="h-[17px] w-[17px] transition-colors duration-200"
                      style={{ color: focusedField === 'password' ? '#7C5BBF' : '#B0A3C7' }} />
                  </div>
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="h-[54px] rounded-2xl bg-white pr-12 text-sm transition-all duration-200"
                    style={{
                      paddingLeft: '3.75rem',
                      border: `1px solid ${focusedField === 'password' ? 'rgba(91,47,160,0.3)' : '#E7E2F1'}`,
                      boxShadow: focusedField === 'password'
                        ? '0 0 0 3px rgba(91,47,160,0.06), 0 2px 8px rgba(91,47,160,0.06)'
                        : '0 1px 2px rgba(26,14,46,0.03)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 transition-all duration-200 hover:bg-purple-50"
                    style={{ color: '#B0A3C7' }}
                  >
                    {showPw ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-1">
                <Button
                  type="submit"
                  disabled={loading}
                  className="group w-full h-[54px] rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:-translate-y-[1px] active:translate-y-0"
                  style={{
                    background: 'linear-gradient(135deg, #3D1A70 0%, #2A1055 50%, #1E0B45 100%)',
                    boxShadow: `
                      0 2px 4px rgba(30,11,69,0.15),
                      0 6px 20px rgba(30,11,69,0.2),
                      inset 0 1px 0 rgba(255,255,255,0.08)
                    `,
                  }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2.5">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memproses...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2.5">
                      Masuk ke Dashboard
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  )}
                </Button>
              </div>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #E7E2F1, transparent)' }} />
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#C8BCDE' }}>atau</p>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, #E7E2F1, transparent)' }} />
            </div>

            {/* Demo account button */}
            <button
              type="button"
              onClick={fillDemo}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl px-4 py-3.5 text-[12px] font-semibold transition-all duration-200 hover:-translate-y-[0.5px] active:translate-y-0"
              style={{
                color: '#6B5D82',
                background: 'linear-gradient(135deg, #F9F7FD, #F4F1FA)',
                border: '1px solid rgba(200,188,222,0.4)',
                boxShadow: '0 1px 3px rgba(26,14,46,0.03)',
              }}
            >
              <Fingerprint className="h-4 w-4" style={{ color: '#9B8BB8' }} />
              Gunakan Akun Demo
              <ChevronRight className="h-3.5 w-3.5 ml-auto" style={{ color: '#C8BCDE' }} />
            </button>
          </div>

          {/* Security badge */}
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full" style={{ background: '#C8BCDE' }} />
                <p className="text-[10px] font-medium" style={{ color: '#B0A3C7' }}>SSL Encrypted</p>
              </div>
              <div className="h-3 w-px" style={{ background: '#E7E2F1' }} />
              <div className="flex items-center gap-1.5">
                <div className="h-1 w-1 rounded-full" style={{ background: '#C8BCDE' }} />
                <p className="text-[10px] font-medium" style={{ color: '#B0A3C7' }}>Internal Only</p>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: '#C8BCDE' }}>
              &copy; 2026 PT Indo Hair Corp. Internal Purchasing System.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
