import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthShell } from '../components/AuthShell';
import { User, Mail, Lock, Globe, ArrowRight, Truck, Weight, ChevronLeft } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { api, getErrorMessage } from '../api/axios';

export const Register: React.FC = () => {
  const { register } = useAuth();
  const { success: toastSuccess, warning: toastWarning } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: User Account details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('en');

  // Step 2: Optional Vehicle details
  const [regNo, setRegNo] = useState('');
  const [vehicleType, setVehicleType] = useState('LIGHT_TRUCK');
  const [capacityKg, setCapacityKg] = useState('2500');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all account fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    setStep(2);
  };

  const handleCompleteRegistration = async (withVehicle: boolean) => {
    setError(null);
    setIsLoading(true);

    try {
      await register(email, password, name, language);

      if (withVehicle && regNo.trim()) {
        try {
          await api.post('/users/me/vehicles', {
            regNo: regNo.trim().toUpperCase(),
            type: vehicleType,
            capacityKg: parseFloat(capacityKg) || 2000,
          });
          toastSuccess('Vehicle registered successfully');
        } catch (vehicleErr) {
          console.warn('Vehicle registration warning:', vehicleErr);
          toastWarning(`Vehicle notice: ${getErrorMessage(vehicleErr)}`);
        }
      }

      navigate('/dashboard');
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string } } }).response;
        setError(res?.data?.message || 'Registration failed. Check details and password policy.');
      } else {
        setError('An unexpected error occurred.');
      }
      setStep(1); // Return to step 1 so user can correct account info if needed
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell titleKey="fieldUser">
      {error && (
        <div className="p-3 bg-rust-100 border border-rust-200 text-rust-700 text-xs rounded-control font-medium">
          {error}
        </div>
      )}

      {/* Progress Indicator */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-mist-200 text-xs text-ink-500 font-semibold">
        <span className={step === 1 ? 'text-river-600 font-bold' : ''}>1. Account Details</span>
        <span>→</span>
        <span className={step === 2 ? 'text-river-600 font-bold' : ''}>2. Vehicle Details (Optional)</span>
      </div>

      {step === 1 ? (
        <form onSubmit={handleStep1Next} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-ink-600">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Das"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-ink-600">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-ink-600">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ chars with uppercase, number & symbol"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-ink-600">Preferred System Language</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-ink-400 absolute left-3 top-3 pointer-events-none" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
                <option value="as">Assamese (অসমীয়া)</option>
                <option value="bn">Bengali (বাংলা)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-river-600 hover:bg-river-700 text-white font-semibold text-sm rounded-control transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            <span>Next: Vehicle Registration</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-river-50 border border-river-200 rounded-control p-3 text-xs text-river-800">
            <p className="font-semibold mb-1">Do you own or operate commercial vehicles?</p>
            <p className="text-ink-600">
              Register your vehicle now to receive direct cargo dispatches, or skip to complete registration without a vehicle.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-600">Vehicle Registration Number</label>
              <div className="relative">
                <Truck className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  placeholder="e.g. AS-01-AB-1234"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium uppercase focus:outline-none focus:ring-2 focus:ring-river-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-600">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
              >
                <option value="LIGHT_TRUCK">Light Commercial Truck</option>
                <option value="HEAVY_TRUCK">Heavy Multi-Axle Truck</option>
                <option value="MINIVAN">Cargo Minivan</option>
                <option value="TANKER">Fuel / Liquid Tanker</option>
                <option value="REFRIGERATED">Refrigerated Truck (Cold Chain)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-ink-600">Payload Capacity (kg)</label>
              <div className="relative">
                <Weight className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
                <input
                  type="number"
                  min="100"
                  max="50000"
                  value={capacityKg}
                  onChange={(e) => setCapacityKg(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-mist-200 rounded-control text-sm font-medium focus:outline-none focus:ring-2 focus:ring-river-600"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              disabled={isLoading || !regNo.trim()}
              onClick={() => handleCompleteRegistration(true)}
              className="w-full py-3 bg-river-600 hover:bg-river-700 text-white font-semibold text-sm rounded-control transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{isLoading ? 'Creating Account & Vehicle...' : 'Register Vehicle & Complete'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleCompleteRegistration(false)}
              className="w-full py-2.5 bg-mist-100 hover:bg-mist-200 text-ink-700 font-semibold text-xs rounded-control transition-colors disabled:opacity-50"
            >
              Skip Vehicle Registration & Finish
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => setStep(1)}
              className="w-full text-xs text-ink-500 hover:text-ink-800 flex items-center justify-center gap-1 pt-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Back to Account Details</span>
            </button>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-mist-200 text-center text-xs">
        <Link to="/login" className="text-river-600 font-semibold hover:underline">
          Already have an account? Sign in
        </Link>
      </div>
    </AuthShell>
  );
};
