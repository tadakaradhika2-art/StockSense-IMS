import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Layers, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const loginAsDemo = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setSubmitting(true);
    try {
      await login(demoEmail, demoPassword);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#D6DCE0] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#121E36] shadow-xl shadow-[#121E36]/15 mb-3">
            <Layers className="w-7 h-7 text-[#FEFEFE]" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#121E36]">StockSense</h1>
          <p className="text-[#727A84] text-sm mt-1">Control Panel Inventory System</p>
        </div>

        {/* Login Card */}
        <div className="bg-[#FEFEFE] p-8 rounded-3xl border border-[#B5C1C8] shadow-xl">
          <h2 className="text-xl font-bold text-[#121E36] mb-1.5">Welcome back</h2>
          <p className="text-[#727A84] text-xs mb-6">Sign in to manage warehouse inventory & ledger movements.</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#727A84] mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@stocksense.com"
                className="w-full px-4 py-2.5 rounded-xl bg-[#D6DCE0] border border-[#B5C1C8] text-[#121E36] placeholder-[#727A84] text-sm focus:outline-none focus:border-[#121E36] focus:bg-[#FEFEFE] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#727A84] mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-[#D6DCE0] border border-[#B5C1C8] text-[#121E36] placeholder-[#727A84] text-sm focus:outline-none focus:border-[#121E36] focus:bg-[#FEFEFE] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-[#121E36] hover:bg-[#182846] text-[#FEFEFE] font-bold text-sm shadow-lg shadow-[#121E36]/20 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Demo Quick Logins */}
          <div className="mt-8 pt-6 border-t border-[#B5C1C8]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#727A84] mb-3 text-center">Quick Demo Access</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => loginAsDemo('admin@stocksense.com', 'admin123')}
                className="p-3 rounded-xl bg-[#D6DCE0] hover:bg-[#C4CDD3] border border-[#B5C1C8] text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-[#121E36] text-xs font-bold mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin User
                </div>
                <p className="text-[11px] text-[#727A84] font-medium">Radhika Admin</p>
              </button>

              <button
                type="button"
                onClick={() => loginAsDemo('staff@stocksense.com', 'staff123')}
                className="p-3 rounded-xl bg-[#D6DCE0] hover:bg-[#C4CDD3] border border-[#B5C1C8] text-left transition-all group"
              >
                <div className="flex items-center gap-1.5 text-[#059669] text-xs font-bold mb-0.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  Staff User
                </div>
                <p className="text-[11px] text-[#727A84] font-medium">Sarika Staff</p>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-[#727A84] mt-6">
          StockSense v1.0 • Background: #D6DCE0
        </p>
      </div>
    </div>
  );
}
