// ClearFund — sample data (DEMO only, no real funds)

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'verified';
export type CampaignStatus = 'active' | 'completed' | 'draft';
export type EvidenceType = 'link' | 'document' | 'image' | 'report';
export type EvidenceStatus = 'submitted' | 'under_review' | 'approved';

export interface Evidence {
  id: string;
  milestoneId: string;
  title: string;
  description: string;
  type: EvidenceType;
  url: string;
  submittedAt: string;
  submittedBy: string;
  /** @deprecated use evidenceStatus instead */
  verified: boolean;
  evidenceStatus: EvidenceStatus;
}

export interface Milestone {
  id: string;
  campaignId: string;
  title: string;
  description: string;
  targetAmount: number;
  releasedAmount: number;
  status: MilestoneStatus;
  dueDate: string;
  completedAt?: string;
  evidence: Evidence[];
  txRef?: string;
}

export interface Contribution {
  id: string;
  campaignId: string;
  contributor: string;
  amount: number;
  timestamp: string;
  txRef: string;
  note?: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  organizer: string;
  organizerAvatar: string;
  recipientName: string;
  recipientAddress: string;
  targetAmount: number;
  raisedAmount: number;
  contributorCount: number;
  status: CampaignStatus;
  createdAt: string;
  endsAt: string;
  milestones: Milestone[];
  contributions: Contribution[];
  coverColor: string;
  /** true = bundled sample, false/undefined = user-created */
  isDemo?: boolean;
}

export const COVER_COLORS = [
  '#1a3a5c', '#1a2e1a', '#2e1e0a', '#1e1a2e',
  '#1a2a3a', '#2a1a1a', '#0a2e2e', '#1e2a1a',
];

const DEMO_TX_REFS = [
  'arc:0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  'arc:0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
  'arc:0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
  'arc:0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
  'arc:0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
  'arc:0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
];

export const SAMPLE_CAMPAIGNS: Campaign[] = [
  {
    id: 'c1',
    isDemo: true,
    title: 'Open-Source Hydrology Sensor Network',
    description:
      'Deploying 24 low-cost water quality sensors across the Mekong Delta communities to enable real-time pollution monitoring and publish findings under a Creative Commons license.',
    category: 'Science',
    organizer: 'Dr. Linh Tran',
    organizerAvatar: 'LT',
    recipientName: 'Delta Water Collective',
    recipientAddress: '0xRecip...a1b2',
    targetAmount: 18000,
    raisedAmount: 12540,
    contributorCount: 87,
    status: 'active',
    createdAt: '2026-08-15',
    endsAt: '2026-11-30',
    coverColor: '#1a3a5c',
    milestones: [
      {
        id: 'm1',
        campaignId: 'c1',
        title: 'Procurement & Lab Setup',
        description: 'Purchase sensors, calibration equipment, and set up the field analysis lab.',
        targetAmount: 5000,
        releasedAmount: 5000,
        status: 'completed',
        dueDate: '2026-09-15',
        completedAt: '2026-09-12',
        txRef: DEMO_TX_REFS[0],
        evidence: [
          {
            id: 'e1',
            milestoneId: 'm1',
            title: 'Supplier Invoice — 24 Sensors',
            description: 'Official invoice from SensorTech Ltd for 24 YSI ProDSS units.',
            type: 'document',
            url: 'https://example.com/invoice-sensortech.pdf',
            submittedAt: '2026-09-10',
            submittedBy: 'Dr. Linh Tran',
            verified: true,
            evidenceStatus: 'approved',
          },
          {
            id: 'e2',
            milestoneId: 'm1',
            title: 'Lab Setup Photos',
            description: 'Photo documentation of field lab installation at Site Alpha.',
            type: 'image',
            url: 'https://example.com/lab-setup-photos',
            submittedAt: '2026-09-12',
            submittedBy: 'Dr. Linh Tran',
            verified: true,
            evidenceStatus: 'approved',
          },
        ],
      },
      {
        id: 'm2',
        campaignId: 'c1',
        title: 'Field Deployment — Phase 1 (12 sites)',
        description: 'Install and calibrate the first 12 sensors at priority pollution sites.',
        targetAmount: 4500,
        releasedAmount: 4500,
        status: 'completed',
        dueDate: '2026-10-20',
        completedAt: '2026-10-18',
        txRef: DEMO_TX_REFS[1],
        evidence: [
          {
            id: 'e3',
            milestoneId: 'm2',
            title: 'Deployment Report — Sites 1–12',
            description: 'Field deployment report with GPS coordinates and calibration readings.',
            type: 'report',
            url: 'https://example.com/deployment-report-phase1.pdf',
            submittedAt: '2026-10-18',
            submittedBy: 'Field Team',
            verified: true,
            evidenceStatus: 'approved',
          },
        ],
      },
      {
        id: 'm3',
        campaignId: 'c1',
        title: 'Field Deployment — Phase 2 (12 sites)',
        description: 'Install remaining 12 sensors and integrate live data feed to public dashboard.',
        targetAmount: 4500,
        releasedAmount: 0,
        status: 'in_progress',
        dueDate: '2026-11-20',
        evidence: [],
      },
      {
        id: 'm4',
        campaignId: 'c1',
        title: 'Public Data Portal & Final Report',
        description: 'Launch the public sensor dashboard and publish the CC-licensed findings report.',
        targetAmount: 4000,
        releasedAmount: 0,
        status: 'pending',
        dueDate: '2026-11-30',
        evidence: [],
      },
    ],
    contributions: [
      { id: 'cn1', campaignId: 'c1', contributor: '0xA1b2...', amount: 500, timestamp: '2026-08-16T09:12:00Z', txRef: DEMO_TX_REFS[2] },
      { id: 'cn2', campaignId: 'c1', contributor: '0xC3d4...', amount: 1000, timestamp: '2026-08-18T14:30:00Z', txRef: DEMO_TX_REFS[3] },
      { id: 'cn3', campaignId: 'c1', contributor: '0xE5f6...', amount: 250, timestamp: '2026-09-02T11:05:00Z', txRef: DEMO_TX_REFS[4], note: 'Great project!' },
      { id: 'cn4', campaignId: 'c1', contributor: '0xA7b8...', amount: 750, timestamp: '2026-09-14T16:45:00Z', txRef: DEMO_TX_REFS[5] },
      { id: 'cn5', campaignId: 'c1', contributor: '0xC9d0...', amount: 300, timestamp: '2026-10-01T08:22:00Z', txRef: DEMO_TX_REFS[0] },
    ],
  },
  {
    id: 'c2',
    isDemo: true,
    title: 'Rural Coding Bootcamp — West Africa Cohort 3',
    description:
      'Twelve weeks of intensive full-stack web development training for 30 students in rural Ghana and Togo, with job placement support and open curriculum.',
    category: 'Education',
    organizer: 'Kwame Asante',
    organizerAvatar: 'KA',
    recipientName: 'AfriCode Foundation',
    recipientAddress: '0xRecip...c3d4',
    targetAmount: 24000,
    raisedAmount: 24000,
    contributorCount: 142,
    status: 'completed',
    createdAt: '2026-05-01',
    endsAt: '2026-09-30',
    coverColor: '#1a2e1a',
    milestones: [
      {
        id: 'm5',
        campaignId: 'c2',
        title: 'Curriculum & Instructor Contracts',
        description: 'Finalize the 12-week curriculum and sign instructor agreements.',
        targetAmount: 6000,
        releasedAmount: 6000,
        status: 'verified',
        dueDate: '2026-05-30',
        completedAt: '2026-05-28',
        txRef: DEMO_TX_REFS[1],
        evidence: [
          {
            id: 'e4',
            milestoneId: 'm5',
            title: 'Signed Instructor Agreements',
            description: 'Executed agreements for 4 lead instructors and 2 teaching assistants.',
            type: 'document',
            url: 'https://example.com/instructor-agreements.pdf',
            submittedAt: '2026-05-28',
            submittedBy: 'Kwame Asante',
            verified: true,
            evidenceStatus: 'approved',
          },
        ],
      },
      {
        id: 'm6',
        campaignId: 'c2',
        title: 'Equipment Procurement',
        description: 'Purchase 35 laptops and networking equipment for the bootcamp sites.',
        targetAmount: 9000,
        releasedAmount: 9000,
        status: 'verified',
        dueDate: '2026-06-30',
        completedAt: '2026-06-25',
        txRef: DEMO_TX_REFS[2],
        evidence: [
          {
            id: 'e5',
            milestoneId: 'm6',
            title: 'Equipment Delivery Receipt',
            description: '35 Lenovo laptops delivered to Accra facility, serial numbers logged.',
            type: 'document',
            url: 'https://example.com/equipment-receipt.pdf',
            submittedAt: '2026-06-26',
            submittedBy: 'Kwame Asante',
            verified: true,
            evidenceStatus: 'approved',
          },
        ],
      },
      {
        id: 'm7',
        campaignId: 'c2',
        title: 'Cohort Graduation & Placement',
        description: '30 students complete the program; at least 60% placed in jobs or freelance contracts.',
        targetAmount: 9000,
        releasedAmount: 9000,
        status: 'verified',
        dueDate: '2026-09-25',
        completedAt: '2026-09-22',
        txRef: DEMO_TX_REFS[3],
        evidence: [
          {
            id: 'e6',
            milestoneId: 'm7',
            title: 'Graduation Ceremony Report',
            description: '30 graduates, 22 placed in roles — 73% placement rate.',
            type: 'report',
            url: 'https://example.com/graduation-report.pdf',
            submittedAt: '2026-09-23',
            submittedBy: 'Kwame Asante',
            verified: true,
            evidenceStatus: 'approved',
          },
        ],
      },
    ],
    contributions: [
      { id: 'cn6', campaignId: 'c2', contributor: '0xF1e2...', amount: 2000, timestamp: '2026-05-03T10:00:00Z', txRef: DEMO_TX_REFS[4] },
      { id: 'cn7', campaignId: 'c2', contributor: '0xD3c4...', amount: 500, timestamp: '2026-05-10T12:15:00Z', txRef: DEMO_TX_REFS[5] },
      { id: 'cn8', campaignId: 'c2', contributor: '0xB5a6...', amount: 1500, timestamp: '2026-06-01T09:30:00Z', txRef: DEMO_TX_REFS[0] },
    ],
  },
  {
    id: 'c3',
    isDemo: true,
    title: 'Community Solar Microgrid — Oaxaca Villages',
    description:
      'Funding a 50kW solar microgrid serving three off-grid villages in the Sierra Norte of Oaxaca, Mexico, with community ownership and transparent energy billing.',
    category: 'Energy',
    organizer: 'Sofia Reyes',
    organizerAvatar: 'SR',
    recipientName: 'Red Solar Comunitaria',
    recipientAddress: '0xRecip...e5f6',
    targetAmount: 45000,
    raisedAmount: 9800,
    contributorCount: 38,
    status: 'active',
    createdAt: '2026-10-01',
    endsAt: '2027-02-28',
    coverColor: '#2e1e0a',
    milestones: [
      {
        id: 'm8',
        campaignId: 'c3',
        title: 'Site Assessment & Engineering',
        description: 'Complete engineering survey, load analysis, and regulatory permits for all three sites.',
        targetAmount: 8000,
        releasedAmount: 0,
        status: 'in_progress',
        dueDate: '2026-12-15',
        evidence: [],
      },
      {
        id: 'm9',
        campaignId: 'c3',
        title: 'Panel & Inverter Procurement',
        description: 'Source and purchase 200 solar panels and 3 hybrid inverters.',
        targetAmount: 18000,
        releasedAmount: 0,
        status: 'pending',
        dueDate: '2027-01-15',
        evidence: [],
      },
      {
        id: 'm10',
        campaignId: 'c3',
        title: 'Installation & Grid Commissioning',
        description: 'Install the microgrid and commission with all three villages energized.',
        targetAmount: 14000,
        releasedAmount: 0,
        status: 'pending',
        dueDate: '2027-02-20',
        evidence: [],
      },
      {
        id: 'm11',
        campaignId: 'c3',
        title: 'Community Training & Handoff',
        description: 'Train local technicians and formally transfer ownership to the community co-op.',
        targetAmount: 5000,
        releasedAmount: 0,
        status: 'pending',
        dueDate: '2027-02-28',
        evidence: [],
      },
    ],
    contributions: [
      { id: 'cn9', campaignId: 'c3', contributor: '0xA2b3...', amount: 800, timestamp: '2026-10-04T13:00:00Z', txRef: DEMO_TX_REFS[1] },
      { id: 'cn10', campaignId: 'c3', contributor: '0xC4d5...', amount: 1200, timestamp: '2026-10-07T16:20:00Z', txRef: DEMO_TX_REFS[2] },
    ],
  },
  {
    id: 'c4',
    isDemo: true,
    title: 'Open Research: Urban Heat Island Mitigation',
    description:
      'Independent urban climate research team mapping heat island hotspots in 5 mid-sized cities and publishing policy recommendations and an open dataset.',
    category: 'Research',
    organizer: 'Aiko Yamamoto',
    organizerAvatar: 'AY',
    recipientName: 'Urban Climate Lab',
    recipientAddress: '0xRecip...g7h8',
    targetAmount: 31000,
    raisedAmount: 22100,
    contributorCount: 119,
    status: 'active',
    createdAt: '2026-07-10',
    endsAt: '2026-12-31',
    coverColor: '#1e1a2e',
    milestones: [
      {
        id: 'm12',
        campaignId: 'c4',
        title: 'Data Collection — Cities 1–2',
        description: 'Deploy IoT temperature sensors and collect 30-day baseline data in Tokyo and Seoul.',
        targetAmount: 7000,
        releasedAmount: 7000,
        status: 'verified',
        dueDate: '2026-08-20',
        completedAt: '2026-08-18',
        txRef: DEMO_TX_REFS[4],
        evidence: [
          {
            id: 'e7',
            milestoneId: 'm12',
            title: 'Dataset: Tokyo & Seoul Baseline',
            description: 'Raw CSV dataset for 30-day temperature readings, 218 sensor nodes.',
            type: 'link',
            url: 'https://example.com/dataset-cities-1-2',
            submittedAt: '2026-08-18',
            submittedBy: 'Aiko Yamamoto',
            verified: true,
            evidenceStatus: 'approved',
          },
        ],
      },
      {
        id: 'm13',
        campaignId: 'c4',
        title: 'Data Collection — Cities 3–5',
        description: 'Deploy sensors in Nairobi, Mexico City, and Karachi.',
        targetAmount: 9000,
        releasedAmount: 9000,
        status: 'completed',
        dueDate: '2026-10-10',
        completedAt: '2026-10-08',
        txRef: DEMO_TX_REFS[5],
        evidence: [],
      },
      {
        id: 'm14',
        campaignId: 'c4',
        title: 'Analysis & Policy Report',
        description: 'Statistical analysis and peer-reviewed policy recommendations paper.',
        targetAmount: 10000,
        releasedAmount: 0,
        status: 'in_progress',
        dueDate: '2026-12-15',
        evidence: [],
      },
      {
        id: 'm15',
        campaignId: 'c4',
        title: 'Open Dataset & Visualization Portal',
        description: 'Publish the open dataset and an interactive heatmap portal.',
        targetAmount: 5000,
        releasedAmount: 0,
        status: 'pending',
        dueDate: '2026-12-31',
        evidence: [],
      },
    ],
    contributions: [
      { id: 'cn11', campaignId: 'c4', contributor: '0xE6f7...', amount: 1000, timestamp: '2026-07-12T09:00:00Z', txRef: DEMO_TX_REFS[0] },
      { id: 'cn12', campaignId: 'c4', contributor: '0xG8h9...', amount: 3000, timestamp: '2026-07-20T11:30:00Z', txRef: DEMO_TX_REFS[1] },
      { id: 'cn13', campaignId: 'c4', contributor: '0xI0j1...', amount: 500, timestamp: '2026-08-05T14:00:00Z', txRef: DEMO_TX_REFS[2] },
    ],
  },
];

export function formatUSDC(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function progressPercent(raised: number, target: number): number {
  return Math.min(100, Math.round((raised / target) * 100));
}

export function shortTxRef(ref: string): string {
  const hash = ref.replace('arc:', '');
  return hash.slice(0, 10) + '...' + hash.slice(-6);
}

export const CATEGORIES = ['All', 'Arts', 'Community', 'Education', 'Energy', 'Health', 'Research', 'Science', 'Technology'];
