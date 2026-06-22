import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';

interface PageBannerProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  backLabel?: string;
  backPath?: string;
  action?: ReactNode;
}

export default function PageBanner({
  icon, title, subtitle, backLabel, backPath, action,
}: PageBannerProps) {
  const navigate = useNavigate();

  return (
    <div className="page-banner">
      <div className="flex items-center gap-3">
        <div className="text-white/80 text-[28px]">{icon}</div>
        <div>
          <h1 className="text-white text-[22px] font-semibold leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-white/65 text-[13px] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 banner-actions">
        {action}
        {backLabel && backPath && (
          <button
            onClick={() => navigate(backPath)}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-[13px] px-3 py-1.5 rounded-lg transition-colors"
          >
            <IconArrowLeft size={15} />
            {backLabel}
          </button>
        )}
      </div>
    </div>
  );
}