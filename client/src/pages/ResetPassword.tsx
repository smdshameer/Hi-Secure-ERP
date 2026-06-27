import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Lock, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Background Circuit Traces Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    interface Point { x: number; y: number; }
    interface Path {
      points: Point[];
      progress: number;
      speed: number;
      color: string;
      width: number;
    }

    const paths: Path[] = [];
    const maxPaths = 22;

    const createPath = (): Path => {
      const points: Point[] = [];
      const grid = 40;
      let x = Math.floor((Math.random() * width) / grid) * grid;
      let y = Math.floor((Math.random() * height) / grid) * grid;
      points.push({ x, y });

      const numSegments = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numSegments; i++) {
        const dir = Math.floor(Math.random() * 4);
        const len = (2 + Math.floor(Math.random() * 3)) * grid;
        
        if (dir === 0) x += len;
        else if (dir === 1) x -= len;
        else if (dir === 2) y += len;
        else y -= len;

        x = Math.max(grid, Math.min(width - grid, x));
        y = Math.max(grid, Math.min(height - grid, y));
        points.push({ x, y });
      }

      const colors = ['#06b6d4', '#3b82f6', '#6366f1', '#10b981'];
      return {
        points,
        progress: 0,
        speed: 0.004 + Math.random() * 0.009,
        color: colors[Math.floor(Math.random() * colors.length)],
        width: 1 + Math.random() * 1.5,
      };
    };

    for (let i = 0; i < maxPaths; i++) {
      paths.push(createPath());
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(8, 10, 20, 0.18)'; 
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      paths.forEach((p, idx) => {
        p.progress += p.speed;
        if (p.progress >= p.points.length - 1) {
          paths[idx] = createPath();
          return;
        }

        const currIdx = Math.floor(p.progress);
        const nextIdx = currIdx + 1;
        const subProg = p.progress - currIdx;

        const p1 = p.points[currIdx];
        const p2 = p.points[nextIdx];
        const currX = p1.x + (p2.x - p1.x) * subProg;
        const currY = p1.y + (p2.y - p1.y) * subProg;

        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width;
        ctx.lineCap = 'round';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        
        ctx.beginPath();
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let i = 1; i <= currIdx; i++) {
          ctx.lineTo(p.points[i].x, p.points[i].y);
        }
        ctx.lineTo(currX, currY);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(currX, currY, p.width * 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset link or reset token is missing.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Link might be expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', height: '100%', width: '100%' }}
      className="bg-[#05070f] flex items-center justify-center font-sans"
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full z-0 pointer-events-none" />

      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 bg-slate-955/40 border border-white/[0.08] backdrop-blur-xl p-8 rounded-2xl w-[90%] max-w-[390px] mx-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:border-cyan-500/20 transition-all duration-500 flex flex-col gap-6">
        
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600/30 to-cyan-500/30 border border-cyan-500/30 rounded-2xl mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] group hover:scale-105 transition-transform duration-300">
            <ShieldCheck size={30} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Hi Secure <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">ERP</span>
          </h1>
          <p className="text-[11.5px] text-gray-400 font-medium mt-1">
            Reset Account Credentials
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center gap-4 py-4 animate-fade-in">
            <CheckCircle size={48} className="text-emerald-400 animate-bounce" />
            <h2 className="text-lg font-bold text-white">Password Updated!</h2>
            <p className="text-[12px] text-gray-400">
              Your password has been successfully reset. Redirecting to console login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            
            {error && (
              <div className="bg-red-955/40 border border-red-500/30 text-red-300 text-[11.5px] px-3.5 py-2.5 rounded-lg flex items-start gap-2 animate-fade-in shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {!token && (
              <div className="bg-amber-955/40 border border-amber-500/30 text-amber-300 text-[11.5px] px-3.5 py-2.5 rounded-lg flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
                <span>Reset token is missing in URL. Link is invalid.</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">New Password</label>
              <div className="relative flex items-center">
                <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#6b7280', pointerEvents: 'none' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                  className="w-full login-input-fix bg-slate-900/60 border border-white/[0.08] hover:border-white/[0.16] focus:border-cyan-500 text-white placeholder-gray-600 rounded-lg pr-3.5 h-[40px] text-[12.5px] outline-none transition-all duration-200 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-slate-950/80"
                  placeholder="Enter new password"
                  required
                  autoComplete="new-password"
                  disabled={!token}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Confirm Password</label>
              <div className="relative flex items-center">
                <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#6b7280', pointerEvents: 'none' }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: '36px' }}
                  className="w-full login-input-fix bg-slate-900/60 border border-white/[0.08] hover:border-white/[0.16] focus:border-cyan-500 text-white placeholder-gray-600 rounded-lg pr-3.5 h-[40px] text-[12.5px] outline-none transition-all duration-200 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-slate-950/80"
                  placeholder="Confirm new password"
                  required
                  autoComplete="new-password"
                  disabled={!token}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full h-[40px] rounded-lg text-white font-bold text-[13.5px] bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.35)] hover:shadow-[0_0_22px_rgba(6,182,212,0.55)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2.5 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Save Password'
              )}
            </button>
          </form>
        )}
        
        <div className="text-center">
          <p className="text-[10px] text-gray-500">
            © 2026 Hi Secure Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
