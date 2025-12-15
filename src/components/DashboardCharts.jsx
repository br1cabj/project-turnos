import React from 'react';
import Chart from 'react-apexcharts';

const getLast6MonthsLabels = () => {
  const labels = [];
  const today = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = d.toLocaleString('es-ES', { month: 'short' });
    labels.push(monthName.charAt(0).toUpperCase() + monthName.slice(1));
  }
  return labels;
};

// --- GRÁFICO DE INGRESOS ---
export const RevenueChart = ({ data }) => {
  const chartData = data && data.length > 0 ? data : [0, 0, 0, 0, 0, 0];
  const categories = getLast6MonthsLabels();

  const options = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: 'inherit',
      zoom: { enabled: false }
    },
    colors: ["#0d6efd"],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100]
      }
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 3
    },
    xaxis: {
      categories: categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { colors: '#6c757d', fontSize: '12px' }
      }
    },
    yaxis: {
      labels: {
        style: { colors: '#6c757d', fontSize: '12px' },
        formatter: (value) => {
          // Formato moneda
          return `$${new Intl.NumberFormat('es-AR').format(value)}`;
        }
      }
    },
    grid: {
      show: true,
      borderColor: "#f3f4f6",
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: { top: 0, right: 0, bottom: 0, left: 10 }
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (value) => `$${new Intl.NumberFormat('es-AR').format(value)}`
      }
    }
  };

  const series = [{ name: 'Ingresos', data: chartData }];

  return <Chart options={options} series={series} type="area" height={300} />;
};

// --- ESTADO DE TURNOS 
export const AppointmentsChart = ({ data }) => {
  // Validaciones
  const hasData = data && data.some(val => val > 0);

  const chartSeries = hasData ? data : [1];
  const chartLabels = hasData
    ? ["Completados", "Pendientes", "Cancelados"]
    : ["Sin datos"];
  const chartColors = hasData
    ? ["#198754", "#ffc107", "#dc3545"]
    : ["#e9ecef"]; // Gris claro

  const options = {
    chart: {
      type: "donut",
      fontFamily: 'inherit',
    },
    labels: chartLabels,
    colors: chartColors,
    plotOptions: {
      pie: {
        startAngle: -90,
        endAngle: 270,
        donut: {
          size: "75%",
          labels: {
            show: true,
            name: { show: true, fontSize: '14px', color: '#6c757d' },
            value: {
              show: true,
              fontSize: "24px",
              fontWeight: 700,
              color: "#333",
              formatter: (val) => hasData ? val : '-'
            },
            total: {
              show: true,
              showAlways: true,
              label: hasData ? "Total" : "Turnos",
              fontSize: "14px",
              fontWeight: 600,
              color: "#999",
              formatter: (w) => {
                if (!hasData) return "0";
                // Sumar los valores reales
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              }
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    legend: {
      show: hasData,
      position: "bottom",
      markers: { radius: 12 },
      itemMargin: { horizontal: 10, vertical: 5 }
    },
    stroke: { show: false },
    tooltip: { enabled: hasData }
  };

  return <Chart options={options} series={chartSeries} type="donut" height={320} />;
};