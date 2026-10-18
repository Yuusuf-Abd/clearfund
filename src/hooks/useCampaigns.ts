import { useState, useCallback } from 'react';
import { Campaign, Evidence, SAMPLE_CAMPAIGNS, EvidenceStatus } from '../data/sampleData';

const LS_KEY = 'clearfund_user_campaigns';

function loadUserCampaigns(): Campaign[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Campaign[];
  } catch {
    return [];
  }
}

function saveUserCampaigns(campaigns: Campaign[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(campaigns));
  } catch {
    // ignore quota errors in sandboxed environments
  }
}

export interface CampaignsStore {
  /** All campaigns: DEMO samples + user-created */
  campaigns: Campaign[];
  addCampaign: (c: Campaign) => void;
  addEvidence: (campaignId: string, milestoneId: string, ev: Evidence) => void;
  getCampaign: (id: string) => Campaign | undefined;
}

export function useCampaigns(): CampaignsStore {
  const [userCampaigns, setUserCampaigns] = useState<Campaign[]>(loadUserCampaigns);

  const addCampaign = useCallback((c: Campaign) => {
    setUserCampaigns((prev) => {
      const next = [...prev, c];
      saveUserCampaigns(next);
      return next;
    });
  }, []);

  const addEvidence = useCallback(
    (campaignId: string, milestoneId: string, ev: Evidence) => {
      // User-created campaigns live in state; sample campaigns are immutable here.
      // We store a parallel evidence overlay for both, keyed by campaign id.
      setUserCampaigns((prev) => {
        const existing = prev.find((c) => c.id === campaignId);
        if (existing) {
          // User-created: mutate in place
          const next = prev.map((c) => {
            if (c.id !== campaignId) return c;
            return {
              ...c,
              milestones: c.milestones.map((m) => {
                if (m.id !== milestoneId) return m;
                return { ...m, evidence: [...m.evidence, ev] };
              }),
            };
          });
          saveUserCampaigns(next);
          return next;
        }
        // Sample campaign: create an "override" entry that carries just the extra evidence
        // by storing a shadow copy with the new evidence merged in.
        const sampleCampaign = SAMPLE_CAMPAIGNS.find((c) => c.id === campaignId);
        if (!sampleCampaign) return prev;
        const shadowKey = `__shadow_${campaignId}`;
        const existingShadow = prev.find((c) => c.id === shadowKey);
        if (existingShadow) {
          const next = prev.map((c) => {
            if (c.id !== shadowKey) return c;
            return {
              ...c,
              milestones: c.milestones.map((m) => {
                if (m.id !== milestoneId) return m;
                return { ...m, evidence: [...m.evidence, ev] };
              }),
            };
          });
          saveUserCampaigns(next);
          return next;
        }
        // First evidence submission for this sample campaign — create shadow
        const shadow: Campaign = {
          ...sampleCampaign,
          id: shadowKey,
          milestones: sampleCampaign.milestones.map((m) => {
            if (m.id !== milestoneId) return m;
            return { ...m, evidence: [...m.evidence, ev] };
          }),
        };
        const next = [...prev, shadow];
        saveUserCampaigns(next);
        return next;
      });
    },
    []
  );

  const getCampaign = useCallback(
    (id: string): Campaign | undefined => {
      // Prefer shadow for sample campaigns so new evidence shows up
      const shadowKey = `__shadow_${id}`;
      const shadow = userCampaigns.find((c) => c.id === shadowKey);
      if (shadow) {
        // Return the original sample fields + shadow milestones (which have extra evidence)
        const sample = SAMPLE_CAMPAIGNS.find((c) => c.id === id);
        if (sample) return { ...sample, milestones: shadow.milestones };
      }
      // Fall through: check user campaigns then sample campaigns
      return (
        userCampaigns.find((c) => c.id === id) ??
        SAMPLE_CAMPAIGNS.find((c) => c.id === id)
      );
    },
    [userCampaigns]
  );

  // Build the visible list: samples + user-created (no shadow entries)
  const visibleCampaigns = [
    ...SAMPLE_CAMPAIGNS.map((s) => {
      const shadow = userCampaigns.find((c) => c.id === `__shadow_${s.id}`);
      if (shadow) return { ...s, milestones: shadow.milestones };
      return s;
    }),
    ...userCampaigns.filter((c) => !c.id.startsWith('__shadow_')),
  ];

  return { campaigns: visibleCampaigns, addCampaign, addEvidence, getCampaign };
}

/** Derive initials from a name */
export function nameInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Evidence status label + color */
export function evidenceStatusMeta(status: EvidenceStatus): { label: string; color: string; dim: string } {
  if (status === 'approved') return { label: 'Approved', color: 'var(--success)', dim: 'var(--success-dim)' };
  if (status === 'under_review') return { label: 'Under Review', color: 'var(--warning)', dim: 'var(--warning-dim)' };
  return { label: 'Submitted', color: 'var(--accent)', dim: 'var(--accent-dim)' };
}
