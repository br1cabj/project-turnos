import React from 'react'
import Chart from 'react-apexcharts'

export const RevenueChart = ({ data }) => {

  const options = {
    chart: {
      type: "area",
      toolbar: { show: false },
      fontFamily: 'inherit',
    },
    colors: ["#0d6efd"],
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.2,
        stops: [0, 90, 100]
      }
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth", width: 2 },
    xaxis: {
      categories: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    grid: {
      strokeDashArray: 4,
      borderColor: "#f1f1f1",
    },
    tooltip: { theme: "light" }
  };

  const series = [{ name: 'Ingresos', data: data || [] }];

  return <Chart options={options} series={series} type="area" height={300} />;
};

//--- ESTADO DE TURNOS (Donut Chart) --- 
export const AppointmentsChart = ({ data }) => {
  const options = {
    chart: { type: "donut" },
    labels: ["Completados", "Pendientes", "Cancelados"],
    colors: ["#198754", "#ffc107", "#dc3545"],
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total",
              fontSize: "16px",
              fontWeight: 600,
              color: "#333",
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    legend: { position: "bottom" },
    stroke: { show: false }
  };

  const series = data || [0, 0, 0];

  return <Chart options={options} series={series} type="donut" height={320} />;
};