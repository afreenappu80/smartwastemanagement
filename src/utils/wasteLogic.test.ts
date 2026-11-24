import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSimulatedDetection,
  complaintsToCsv,
  computeAnalyticsForRange,
  computeCategoryDistribution,
  computeDashboardMetrics,
  filterComplaints,
  generateNextComplaintId,
  getComplaintTimeline,
  validateAuthForm,
  validateReportForm,
} from './wasteLogic';
import type { Complaint } from '../types/waste';

const SAMPLE_COMPLAINTS: Complaint[] = [
  {
    id: 'WS-2026-1041',
    citizenId: 'cit-1',
    citizenName: 'Aarav Patel',
    title: 'Plastic bottles dumped along Main Ave',
    description: 'Multiple plastic sacks and PET bottles overflowing beside the sidewalk.',
    category: 'Plastic',
    aiDetected: true,
    aiConfidence: 94,
    status: 'Pending',
    severity: 'High',
    locationName: 'Main Avenue & 4th Cross',
    ward: 'Ward 4 - Central Market',
    coordinates: { lat: 12.9716, lng: 77.5946 },
    imageUrl: '/assets/images/waste-plastic.svg',
    reportedAt: '2026-11-24 08:15',
    updatedAt: '2026-11-24 08:15',
    assignedWorkerId: null,
    assignedWorkerName: null,
    estimatedWeightKg: 18,
  },
  {
    id: 'WS-2026-1042',
    citizenId: 'cit-1',
    citizenName: 'Aarav Patel',
    title: 'Organic market peels beside bus bay',
    description: 'Wet vegetable waste and produce cartons stacked near curb.',
    category: 'Organic',
    aiDetected: true,
    aiConfidence: 96,
    status: 'Resolved',
    severity: 'Medium',
    locationName: 'Greenpark Market Road',
    ward: 'Ward 2 - Greenpark',
    coordinates: { lat: 12.9784, lng: 77.6012 },
    imageUrl: '/assets/images/waste-organic.svg',
    reportedAt: '2026-11-23 14:20',
    updatedAt: '2026-11-23 18:40',
    assignedWorkerId: 'wrk-1',
    assignedWorkerName: 'Ramesh Kumar',
    estimatedWeightKg: 26,
    resolutionNotes: 'Cleared by bio-compost truck #04.',
  },
  {
    id: 'WS-2026-1043',
    citizenId: 'cit-2',
    citizenName: 'Meera Nair',
    title: 'Scrap metal tins in service lane',
    description: 'Rusted tin containers and aluminum cans piled near fence.',
    category: 'Metal',
    aiDetected: false,
    aiConfidence: 0,
    status: 'Assigned',
    severity: 'Medium',
    locationName: 'Oakwood Lane, Block B',
    ward: 'Ward 7 - Riverside',
    coordinates: { lat: 12.9652, lng: 77.5881 },
    imageUrl: '/assets/images/waste-metal.svg',
    reportedAt: '2026-11-24 06:45',
    updatedAt: '2026-11-24 07:30',
    assignedWorkerId: 'wrk-2',
    assignedWorkerName: 'Suresh Verma',
    estimatedWeightKg: 32,
  },
];

test('computeDashboardMetrics calculates counts and resolution rate accurately', () => {
  const m = computeDashboardMetrics(SAMPLE_COMPLAINTS);
  assert.equal(m.totalComplaints, 3);
  assert.equal(m.wasteDetectedCount, 2);
  assert.equal(m.resolvedIssues, 1);
  assert.equal(m.pendingComplaints, 1);
  assert.equal(m.inProgressCount, 1);
  assert.equal(m.resolutionRate, 33);
  assert.equal(m.totalEstimatedKg, 76);
});

test('computeCategoryDistribution returns all four categories with accurate counts', () => {
  const dist = computeCategoryDistribution(SAMPLE_COMPLAINTS);
  assert.equal(dist.length, 4);
  const plastic = dist.find((d) => d.category === 'Plastic');
  const others = dist.find((d) => d.category === 'Others');
  assert.equal(plastic?.count, 1);
  assert.equal(plastic?.percentage, 33);
  assert.equal(others?.count, 0);
  assert.equal(others?.percentage, 0);
});

test('filterComplaints narrows by search, status, category, and citizenId', () => {
  assert.equal(filterComplaints(SAMPLE_COMPLAINTS, { search: 'market' }).length, 2);
  assert.equal(filterComplaints(SAMPLE_COMPLAINTS, { status: 'Resolved' }).length, 1);
  assert.equal(filterComplaints(SAMPLE_COMPLAINTS, { category: 'Metal' }).length, 1);
  assert.equal(filterComplaints(SAMPLE_COMPLAINTS, { citizenId: 'cit-1' }).length, 2);
});

test('computeAnalyticsForRange scales correctly across 7d, 30d, and 6m ranges', () => {
  const a7 = computeAnalyticsForRange(SAMPLE_COMPLAINTS, '7d');
  const a30 = computeAnalyticsForRange(SAMPLE_COMPLAINTS, '30d');
  const a6m = computeAnalyticsForRange(SAMPLE_COMPLAINTS, '6m');

  assert.equal(a7.trendLabels.length, 7);
  assert.equal(a30.trendLabels.length, 4);
  assert.equal(a6m.trendLabels.length, 6);
  assert.ok(a30.wasteCollectedKg > a7.wasteCollectedKg);
  assert.ok(a6m.wasteCollectedKg > a30.wasteCollectedKg);
  assert.equal(a7.areaStats.length, 3);
});

test('getComplaintTimeline marks steps progressively by status', () => {
  const pendingSteps = getComplaintTimeline(SAMPLE_COMPLAINTS[0]);
  assert.equal(pendingSteps[0].completed, true);
  assert.equal(pendingSteps[2].completed, false);
  assert.equal(pendingSteps[3].completed, false);

  const resolvedSteps = getComplaintTimeline(SAMPLE_COMPLAINTS[1]);
  assert.equal(resolvedSteps.every((s) => s.completed), true);
});

test('validateAuthForm and validateReportForm reject empty or invalid inputs', () => {
  assert.ok(validateAuthForm({ mode: 'login', email: 'bad-email', password: 'secret' }));
  assert.ok(validateAuthForm({ mode: 'login', email: 'user@city.gov', password: '123' }));
  assert.equal(
    validateAuthForm({ mode: 'register', name: 'Ananya', email: 'ananya@city.gov', password: 'password123' }),
    null
  );

  assert.ok(validateReportForm({ title: 'Trash', locationName: 'Road', imageUrl: '', description: 'Long enough text' }));
  assert.equal(
    validateReportForm({
      title: 'Roadside plastic heap',
      locationName: '5th Cross',
      imageUrl: '/assets/images/waste-plastic.svg',
      description: 'Large stack of plastic bags near bus stop.',
    }),
    null
  );
});

test('complaintsToCsv generates valid escaped CSV with header row', () => {
  const csv = complaintsToCsv([
    { ...SAMPLE_COMPLAINTS[0], title: 'Plastic, "bottles" dumped' },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[0].startsWith('Complaint ID,Title,Category'));
  assert.ok(lines[1].includes('"Plastic, ""bottles"" dumped"'));
});

test('generateNextComplaintId increments sequentially and buildSimulatedDetection flags mock mode', () => {
  assert.equal(generateNextComplaintId(SAMPLE_COMPLAINTS), 'WS-2026-1044');
  const det = buildSimulatedDetection('sample-organic-market.jpg');
  assert.equal(det.category, 'Organic');
  assert.equal(det.isMockResult, true);
  assert.ok(det.boundingBoxes.length > 0);
});
