import { useState } from 'react';
import { useCampaigns } from './hooks/useCampaigns';
import Nav from './components/Nav';
import ContractModeBanner from './components/ContractModeBanner';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CreateCampaign from './pages/CreateCampaign';
import CampaignDetails from './pages/CampaignDetails';
import ProofCenter from './pages/ProofCenter';
import TxExplorer from './pages/TxExplorer';
import ReviewerDashboard from './pages/ReviewerDashboard';

type Page = 'landing' | 'dashboard' | 'create' | 'proof' | 'explorer' | 'campaign' | 'reviewer';

export default function App() {
  const store = useCampaigns();
  const [page, setPage] = useState<Page>('landing');
  // activeCampaignId: ID of the campaign that triggered the last campaign-specific navigation.
  // Used by CampaignDetails and to pre-focus a campaign in ProofCenter when arriving from
  // that campaign's page. Reset to undefined when navigating to non-campaign pages directly.
  const [activeCampaignId, setActiveCampaignId] = useState<string | undefined>(undefined);
  // proofFocusCampaignId: only set when the user navigated to Proof Center from a campaign
  // page (via "Submit Evidence" button). Cleared when navigating away.
  const [proofFocusCampaignId, setProofFocusCampaignId] = useState<string | undefined>(undefined);

  const navigate = (target: Page, campaignId?: string) => {
    if (campaignId) setActiveCampaignId(campaignId);
    // Only propagate a focus campaign to ProofCenter when explicitly coming from a campaign page
    if (target === 'proof' && campaignId) {
      setProofFocusCampaignId(campaignId);
    } else if (target !== 'proof') {
      setProofFocusCampaignId(undefined);
    }
    setPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-dvh" style={{ background: 'var(--bg)' }}>
      <Nav currentPage={page} onNavigate={navigate} />
      <ContractModeBanner />
      {page === 'landing' && <Landing onNavigate={navigate} store={store} />}
      {page === 'dashboard' && <Dashboard onNavigate={navigate} store={store} />}
      {page === 'create' && <CreateCampaign onNavigate={navigate} store={store} />}
      {page === 'campaign' && activeCampaignId && (
        <CampaignDetails campaignId={activeCampaignId} onNavigate={navigate} store={store} />
      )}
      {page === 'campaign' && !activeCampaignId && (
        <Dashboard onNavigate={navigate} store={store} />
      )}
      {page === 'proof' && <ProofCenter onNavigate={navigate} store={store} focusCampaignId={proofFocusCampaignId} />}
      {page === 'explorer' && <TxExplorer onNavigate={navigate} store={store} />}
      {page === 'reviewer' && <ReviewerDashboard onNavigate={navigate} store={store} />}
    </div>
  );
}
