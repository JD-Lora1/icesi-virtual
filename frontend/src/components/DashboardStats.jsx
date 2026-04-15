import { useMemo } from 'react';
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function buildChart(unassignedPercentage) {
  const safePercentage = Number.isFinite(unassignedPercentage) ? unassignedPercentage : 0;
  const coveredPercentage = Math.max(0, 100 - safePercentage);

  return {
    labels: ['Sin asignar', 'Cubiertos'],
    datasets: [
      {
        data: [safePercentage, coveredPercentage],
        backgroundColor: ['#f97316', '#14b8a6'],
        borderWidth: 0,
        hoverOffset: 6,
      },
    ],
  };
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#cbd5e1',
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 18,
      },
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#e2e8f0',
      bodyColor: '#e2e8f0',
      displayColors: false,
    },
  },
  cutout: '68%',
};

function StatCard({ title, count, total, percentage, description, chartColor, chartData }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <h3 className="mt-2 text-3xl font-semibold text-white">{percentage}%</h3>
          <p className="mt-1 text-sm text-slate-300">
            {count} de {total} {description}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chartColor}`}>{title}</span>
      </div>

      <div className="mt-6 h-56">
        <Doughnut data={chartData} options={chartOptions} />
      </div>
    </article>
  );
}

export default function DashboardStats({ stats, loading, error }) {
  const objectiveChartData = useMemo(() => {
    return buildChart(stats?.objectives_without_courses?.percentage ?? 0);
  }, [stats]);

  const competencyChartData = useMemo(() => {
    return buildChart(stats?.competencies_without_objectives?.percentage ?? 0);
  }, [stats]);

  if (loading) {
    return (
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="h-80 rounded-3xl border border-white/10 bg-white/5" />
        <div className="h-80 rounded-3xl border border-white/10 bg-white/5" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
        <p className="font-semibold">No fue posible cargar las estadísticas.</p>
        <p className="mt-1 text-sm text-red-100/80">{error}</p>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <StatCard
        title="Objetivos sin asignar"
        count={stats?.objectives_without_courses?.count ?? 0}
        total={stats?.objectives_without_courses?.total ?? 0}
        percentage={stats?.objectives_without_courses?.percentage ?? 0}
        description="objetivos no tienen cursos asociados"
        chartColor="bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/20"
        chartData={objectiveChartData}
      />
      <StatCard
        title="Competencias vacías"
        count={stats?.competencies_without_objectives?.count ?? 0}
        total={stats?.competencies_without_objectives?.total ?? 0}
        percentage={stats?.competencies_without_objectives?.percentage ?? 0}
        description="competencias no tienen objetivos asociados"
        chartColor="bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/20"
        chartData={competencyChartData}
      />
    </section>
  );
}
