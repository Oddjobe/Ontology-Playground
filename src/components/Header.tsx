import { useAppStore } from '../store/appStore';
import { Moon, Sun, Database, Trophy, HelpCircle, FileJson, LayoutGrid, Sparkles, FileText } from 'lucide-react';

interface HeaderProps {
  onHelpClick: () => void;
  onDataSourcesClick: () => void;
  onImportExportClick: () => void;
  onGalleryClick: () => void;
  onNLBuilderClick?: () => void;
  onSummaryClick: () => void;
}

export function Header({ onHelpClick, onDataSourcesClick, onImportExportClick, onGalleryClick, onNLBuilderClick, onSummaryClick }: HeaderProps) {
  const { darkMode, toggleDarkMode, totalPoints, earnedBadges } = useAppStore();

  return (
    <header className="header">
      <div className="header-logo">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="4" fill="#0078D4"/>
          <path d="M8 8H15V15H8V8Z" fill="white"/>
          <path d="M17 8H24V15H17V8Z" fill="white" opacity="0.7"/>
          <path d="M8 17H15V24H8V17Z" fill="white" opacity="0.7"/>
          <path d="M17 17H24V24H17V17Z" fill="white" opacity="0.5"/>
        </svg>
        <div>
          <span className="header-title">Ontology Playground</span>
          <span className="header-subtitle">Microsoft Fabric IQ</span>
        </div>
      </div>

      <div className="header-stats">
        <div className="stat-item">
          <Trophy size={18} />
          <span className="stat-value">{totalPoints}</span>
          <span>points</span>
        </div>
        <div className="stat-item">
          <span style={{ fontSize: 18 }}>🏆</span>
          <span className="stat-value">{earnedBadges.length}</span>
          <span>badges</span>
        </div>
      </div>

      <div className="header-actions">
        <button className="header-text-btn" onClick={onSummaryClick} title="View Ontology Summary">
          <FileText size={16} />
          <span>Summary</span>
        </button>
        {onNLBuilderClick && (
          <button className="icon-btn" onClick={onNLBuilderClick} title="Build from Description">
            <Sparkles size={20} />
          </button>
        )}
        <button className="icon-btn" onClick={onGalleryClick} title="Ontology Gallery">
          <LayoutGrid size={20} />
        </button>
        <button className="icon-btn" onClick={onImportExportClick} title="Import / Export Ontology">
          <FileJson size={20} />
        </button>
        <button className="icon-btn" onClick={onHelpClick} title="Help">
          <HelpCircle size={20} />
        </button>
        <button className="icon-btn" onClick={onDataSourcesClick} title="Data Sources">
          <Database size={20} />
        </button>
        <button className="icon-btn" onClick={toggleDarkMode} title="Toggle Theme">
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}
