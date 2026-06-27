import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, User, Lock, AlertTriangle } from 'lucide-react';
import api from '../services/api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
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
      
      // Determine a random start node on grid
      const grid = 40;
      let x = Math.floor((Math.random() * width) / grid) * grid;
      let y = Math.floor((Math.random() * height) / grid) * grid;
      points.push({ x, y });

      const numSegments = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numSegments; i++) {
        const dir = Math.floor(Math.random() * 4);
        const len = (2 + Math.floor(Math.random() * 3)) * grid; // Multiples of grid size
        
        if (dir === 0) x += len;
        else if (dir === 1) x -= len;
        else if (dir === 2) y += len;
        else y -= len;

        // Bound check
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

    // Populate initial paths
    for (let i = 0; i < maxPaths; i++) {
      paths.push(createPath());
    }

    const draw = () => {
      // Semi-transparent overlay to create electronic trails
      ctx.fillStyle = 'rgba(8, 10, 20, 0.18)'; 
      ctx.fillRect(0, 0, width, height);

      // Render static grids
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

      // Render circuit paths and traces
      paths.forEach((path, idx) => {
        // Draw the background wire line (faint/dim trace)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = path.width * 0.5;
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        ctx.stroke();

        // Draw static node dots at bends
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        path.points.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Compute pulse position
        path.progress += path.speed;
        if (path.progress >= 1) {
          paths[idx] = createPath();
          return;
        }

        const totalSegments = path.points.length - 1;
        const currentSegmentProgress = path.progress * totalSegments;
        const segmentIndex = Math.floor(currentSegmentProgress);
        const segmentPercent = currentSegmentProgress - segmentIndex;

        if (segmentIndex < totalSegments) {
          const p1 = path.points[segmentIndex];
          const p2 = path.points[segmentIndex + 1];
          const currentX = p1.x + (p2.x - p1.x) * segmentPercent;
          const currentY = p1.y + (p2.y - p1.y) * segmentPercent;

          // Glowing glowing trace point (pulse particle)
          ctx.fillStyle = path.color;
          ctx.shadowColor = path.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(currentX, currentY, path.width * 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw trail tail
          ctx.strokeStyle = path.color;
          ctx.lineWidth = path.width * 1.2;
          ctx.beginPath();
          ctx.moveTo(p1.x + (currentX - p1.x) * 0.6, p1.y + (currentY - p1.y) * 0.6);
          ctx.lineTo(currentX, currentY);
          ctx.stroke();

          ctx.shadowBlur = 0; // Reset shadow
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      document.cookie = `token=${res.data.token}; path=/; max-age=28800; SameSite=Lax`;
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden', height: '100%', width: '100%' }}
      className="bg-[#05070f] flex items-center justify-center font-sans"
    >
      {/* Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full z-0 pointer-events-none" />

      {/* Decorative Neon Blurs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 bg-slate-955/40 border border-white/[0.08] backdrop-blur-xl p-8 rounded-2xl w-[90%] max-w-[390px] mx-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:border-cyan-500/20 transition-all duration-500 flex flex-col gap-6">
        
        {/* Header section with Shield Check Icon */}
        <div className="flex flex-col items-center text-center">
          <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600/30 to-cyan-500/30 border border-cyan-500/30 rounded-2xl mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] group hover:scale-105 transition-transform duration-300">
            <ShieldCheck size={30} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            Hi Secure <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">ERP</span>
          </h1>
          <p className="text-[11.5px] text-gray-400 font-medium mt-1">
            Enterprise Resources Administration Console
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-955/40 border border-red-500/30 text-red-300 text-[11.5px] px-3.5 py-2.5 rounded-lg flex items-start gap-2 animate-fade-in shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Username</label>
            <div className="relative flex items-center">
              <User size={15} style={{ position: 'absolute', left: '12px', color: '#6b7280', pointerEvents: 'none' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '36px' }}
                className="w-full login-input-fix bg-slate-900/60 border border-white/[0.08] hover:border-white/[0.16] focus:border-cyan-500 text-white placeholder-gray-600 rounded-lg pr-3.5 h-[40px] text-[12.5px] outline-none transition-all duration-200 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-slate-950/80"
                placeholder="Enter console username"
                required
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Password</label>
            <div className="relative flex items-center">
              <Lock size={15} style={{ position: 'absolute', left: '12px', color: '#6b7280', pointerEvents: 'none' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '36px' }}
                className="w-full login-input-fix bg-slate-900/60 border border-white/[0.08] hover:border-white/[0.16] focus:border-cyan-500 text-white placeholder-gray-600 rounded-lg pr-3.5 h-[40px] text-[12.5px] outline-none transition-all duration-200 focus:shadow-[0_0_15px_rgba(6,182,212,0.15)] focus:bg-slate-950/80"
                placeholder="Enter console password"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[40px] rounded-lg text-white font-bold text-[13.5px] bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-[0_0_15px_rgba(59,130,246,0.35)] hover:shadow-[0_0_22px_rgba(6,182,212,0.55)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none mt-2.5 flex items-center justify-center gap-1.5"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Validating Console...
              </>
            ) : (
              'Access console'
            )}
          </button>
        </form>
        
        {/* Footer notes */}
        <div className="text-center">
          <p className="text-[10px] text-gray-500">
            © 2026 Hi Secure Solutions. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
