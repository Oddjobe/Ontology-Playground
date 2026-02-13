import { useState, useEffect, lazy, Suspense } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
  Header, 
  OntologyGraph, 
  QuestPanel, 
  InspectorPanel, 
  QueryPlayground,
  SearchFilter,
  WelcomeModal,
  HelpModal,
  DataSourcesModal,
  ImportExportModal,
  GalleryModal,
  OntologySummaryModal,
  Toast
} from './components';
import { useAppStore } from './store/appStore';
import './styles/app.css';

const AI_BUILDER_ENABLED = import.meta.env.VITE_ENABLE_AI_BUILDER === 'true';

const NLBuilderModal = AI_BUILDER_ENABLED
  ? lazy(() => import('./components/NLBuilderModal').then(m => ({ default: m.NLBuilderModal })))
  : null;

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [showHelp, setShowHelp] = useState(false);
  const [showDataSources, setShowDataSources] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showNLBuilder, setShowNLBuilder] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [toast, setToast] = useState<{ message: string; icon: string } | null>(null);
  const { darkMode, earnedBadges } = useAppStore();

  // Show toast when a new badge is earned
  useEffect(() => {
    if (earnedBadges.length > 0) {
      const latestBadge = earnedBadges[earnedBadges.length - 1];
      setToast({
        message: `Quest Complete! Earned: ${latestBadge.badge}`,
        icon: latestBadge.icon
      });
      
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [earnedBadges.length]);

  return (
    <div className={`app-container ${darkMode ? '' : 'light-theme'}`}>
      <Header 
        onHelpClick={() => setShowHelp(true)} 
        onDataSourcesClick={() => setShowDataSources(true)}
        onImportExportClick={() => setShowImportExport(true)}
        onGalleryClick={() => setShowGallery(true)}
        onNLBuilderClick={AI_BUILDER_ENABLED ? () => setShowNLBuilder(true) : undefined}
        onSummaryClick={() => setShowSummary(true)}
      />
      <QuestPanel />
      <OntologyGraph />
      <div className="right-sidebar">
        <SearchFilter />
        <InspectorPanel />
        <QueryPlayground />
      </div>

      <AnimatePresence>
        {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showDataSources && <DataSourcesModal onClose={() => setShowDataSources(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showImportExport && <ImportExportModal onClose={() => setShowImportExport(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showGallery && <GalleryModal onClose={() => setShowGallery(false)} />}
      </AnimatePresence>

      {AI_BUILDER_ENABLED && NLBuilderModal && (
        <AnimatePresence>
          {showNLBuilder && (
            <Suspense fallback={null}>
              <NLBuilderModal onClose={() => setShowNLBuilder(false)} />
            </Suspense>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {showSummary && <OntologySummaryModal onClose={() => setShowSummary(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast message={toast.message} icon={toast.icon} />}
      </AnimatePresence>
    </div>
  );
}

export default App;
