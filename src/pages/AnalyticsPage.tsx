import { useMemo, useState } from 'react';
import { ArrowUpRight, CheckCircle2, ClipboardList, Recycle, TrendingUp } from 'lucide-react';
import type { ChartConfiguration } from 'chart.js';
import { ChartCanvas } from '../components/ChartCanvas';
import type { AnalyticsRange, Complaint } from '../types/waste';
import {
  computeAnalyticsForRange,
  computeCategoryDistribution,
} from '../utils/wasteLogic';

interface AnalyticsPageProps {
  complaints: Complaint[];
}

export function AnalyticsPage({ complaints }: AnalyticsPageProps) {
  const [range, setRange] = useState<AnalyticsRange>('30d');

  const snapshot = useMemo(
    () => computeAnalyticsForRange(complaints, range),
    [complaints, range]
  );
  const distribution = useMemo(
    () => computeCategoryDistribution(complaints),
    [complaints]
  );

  const lineConfig = useMemo<ChartConfiguration<'line'>>(
    () => ({
      type: 'line',
      data: {
        labels: snapshot.trendLabels,
        datasets: [
          {
            label: 'Waste Collected (kg)',
            data: snapshot.trendValuesKg,
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.14)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#064E3B',
            pointBorderColor: '#FFFFFF',
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#022C22',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y} kg collected`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#4B5563', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#EEF3F0' },
            ticks: { color: '#6B7280', font: { size: 11 } },
          },
        },
      },
    }),
    [snapshot]
  );

  const doughnutConfig = useMemo<ChartConfiguration<'doughnut'>>(
    () => ({
      type: 'doughnut',
      data: {
        labels: distribution.map((d) => d.category),
        datasets: [
          {
            data: distribution.map((d) => d.count),
            backgroundColor: distribution.map((d) => d.color),
            borderColor: '#FFFFFF',
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#022C22',
            padding: 10,
            cornerRadius: 8,
          },
        },
      },
    }),
    [distribution]
  );

  const barConfig = useMemo<ChartConfiguration<'bar'>>(
    () => ({
      type: 'bar',
      data: {
        labels: snapshot.monthlyLabels,
        datasets: [
          {
            label: 'Reported',
            data: snapshot.monthlyReported,
            backgroundColor: '#064E3B',
            borderRadius: 6,
            maxBarThickness: 28,
          },
          {
            label: 'Resolved',
            data: snapshot.monthlyResolved,
            backgroundColor: '#34D399',
            borderRadius: 6,
            maxBarThickness: 28,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              color: '#374151',
              font: { size: 11 },
            },
          },
          tooltip: {
            backgroundColor: '#022C22',
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#4B5563', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#EEF3F0' },
            ticks: { color: '#6B7280', font: { size: 11 } },
          },
        },
      },
    }),
    [snapshot]
  );

  const ranges: Array<{ id: AnalyticsRange; label: string }> = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '6m', label: '6 Months' },
  ];

  return (
    <div className="space-y-6">
      {/* Header + Working Date Range Segmented Filter */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-extrabold text-[#022C22]">
            Analytics
          </h2>
          <p className="mt-1 text-sm text-[#4B5563]">
            Municipal waste collection volume, category mix, and ward resolution performance for{' '}
            <span className="font-semibold text-[#064E3B]">{snapshot.rangeLabel}</span>.
          </p>
        </div>

        <div
          role="group"
          aria-label="Analytics time range"
          className="inline-flex rounded-xl border border-[#DCE6E0] bg-white p-1 self-start"
        >
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              aria-pressed={range === r.id}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                range === r.id
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'text-[#4B5563] hover:text-[#022C22]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPI Row */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E2EAE5] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#4B5563]">Waste Collected</span>
            <Recycle className="h-4.5 w-4.5 text-[#059669]" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#022C22] tabular-nums">
            {snapshot.wasteCollectedKg.toLocaleString()} kg
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-[#059669] tabular-nums">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>+{snapshot.growthPercentage}% vs prior period</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#E2EAE5] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#4B5563]">Total Complaints</span>
            <ClipboardList className="h-4.5 w-4.5 text-[#064E3B]" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#022C22] tabular-nums">
            {snapshot.totalComplaints}
          </p>
          <p className="mt-1.5 text-xs text-[#6B7280]">Recorded across all city wards</p>
        </div>

        <div className="rounded-2xl border border-[#E2EAE5] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#4B5563]">Resolved Complaints</span>
            <CheckCircle2 className="h-4.5 w-4.5 text-[#059669]" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#022C22] tabular-nums">
            {snapshot.resolvedComplaints}
          </p>
          <p className="mt-1.5 text-xs text-[#6B7280]">Verified clean by field teams</p>
        </div>

        <div className="rounded-2xl border border-[#E2EAE5] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#4B5563]">Resolution Rate</span>
            <TrendingUp className="h-4.5 w-4.5 text-[#059669]" />
          </div>
          <p className="mt-2 font-display text-3xl font-extrabold text-[#022C22] tabular-nums">
            {snapshot.resolutionRate}%
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EEF3F0]">
            <div
              className="h-full rounded-full bg-[#059669] transition-all duration-300"
              style={{ width: `${snapshot.resolutionRate}%` }}
            />
          </div>
        </div>
      </section>

      {/* Main Charts Row: Waste Collected Line Chart + Waste by Type Doughnut */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#E2EAE5] bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-[#022C22]">
                Waste Collected Trend
              </h3>
              <p className="mt-0.5 text-xs text-[#6B7280]">
                Total tonnage cleared across {snapshot.rangeLabel.toLowerCase()}
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-[#059669] tabular-nums">
              +{snapshot.growthPercentage}%
            </span>
          </div>
          <div className="mt-5">
            <ChartCanvas
              config={lineConfig}
              heightClass="h-64"
              ariaLabel={`Waste collected line chart for ${snapshot.rangeLabel}`}
              testId="analytics-line-chart"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2EAE5] bg-white p-6 lg:col-span-5">
          <h3 className="font-display text-base font-bold text-[#022C22]">
            Waste by Type
          </h3>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            Category breakdown from citizen &amp; AI submissions
          </p>
          <div className="mt-5 grid grid-cols-1 items-center gap-5 sm:grid-cols-2">
            <div className="mx-auto w-full max-w-[190px]">
              <ChartCanvas
                config={doughnutConfig}
                heightClass="h-48"
                ariaLabel="Waste by type doughnut chart"
                testId="analytics-doughnut-chart"
              />
            </div>
            <div className="space-y-3">
              {distribution.map((item) => (
                <div key={item.category} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-semibold text-[#1F2937]">
                    <span
                      className="h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.category}
                  </span>
                  <span className="font-mono font-bold text-[#022C22] tabular-nums">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Row: Period Complaint Bar Chart + Area-Wise Statistics Table */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-[#E2EAE5] bg-white p-6 lg:col-span-6">
          <h3 className="font-display text-base font-bold text-[#022C22]">
            Reported vs Resolved Complaints
          </h3>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            Municipal clearance throughput ({snapshot.rangeLabel})
          </p>
          <div className="mt-4">
            <ChartCanvas
              config={barConfig}
              heightClass="h-64"
              ariaLabel="Reported versus resolved complaints bar chart"
              testId="analytics-bar-chart"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E2EAE5] bg-white lg:col-span-6">
          <div className="border-b border-[#EEF3F0] px-6 py-4">
            <h3 className="font-display text-base font-bold text-[#022C22]">
              Area-Wise Statistics
            </h3>
            <p className="mt-0.5 text-xs text-[#6B7280]">
              Ward volume and clearance effectiveness
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#EEF3F0] bg-[#F8FAF9] font-semibold text-[#4B5563]">
                  <th className="px-6 py-3">Municipal Ward</th>
                  <th className="px-3 py-3 text-right">Reports</th>
                  <th className="px-3 py-3 text-right">Resolved</th>
                  <th className="px-3 py-3 text-right">Volume</th>
                  <th className="px-6 py-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF3F0]">
                {snapshot.areaStats.map((area) => (
                  <tr key={area.ward} className="hover:bg-[#F9FBFA]">
                    <td className="px-6 py-3.5 font-semibold text-[#1F2937]">{area.ward}</td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-[#374151]">
                      {area.total}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-[#059669]">
                      {area.resolved}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-[#374151]">
                      {area.collectedKg} kg
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono font-bold tabular-nums text-[#022C22]">
                      {area.resolutionRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
