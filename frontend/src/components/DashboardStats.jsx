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
        backgroundColor: ['#007aff', '#d1d5db'],
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
        color: '#475569',
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 18,
      },
    },
    tooltip: {
      backgroundColor: '#ffffff',
      titleColor: '#0f172a',
      bodyColor: '#0f172a',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      displayColors: false,
    },
  },
  cutout: '68%',
};

function StatCard({ title, count, total, percentage, description, chartColor, chartData }) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_10px_40px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-900">{percentage}%</h3>
          <p className="mt-1 text-sm text-slate-600">
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
        <div className="h-80 rounded-[2rem] border border-slate-200 bg-white" />
        <div className="h-80 rounded-[2rem] border border-slate-200 bg-white" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-700">
        <p className="font-semibold">No fue posible cargar las estadísticas.</p>
        <p className="mt-1 text-sm text-rose-600">{error}</p>
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
        chartColor="bg-blue-50 text-blue-700 ring-1 ring-blue-100"
        chartData={objectiveChartData}
      />
      <StatCard
        title="Competencias vacías"
        count={stats?.competencies_without_objectives?.count ?? 0}
        total={stats?.competencies_without_objectives?.total ?? 0}
        percentage={stats?.competencies_without_objectives?.percentage ?? 0}
        description="competencias no tienen objetivos asociados"
        chartColor="bg-slate-100 text-slate-700 ring-1 ring-slate-200"
        chartData={competencyChartData}
      />
    </section>
  );
}
