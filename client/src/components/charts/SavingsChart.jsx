/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const SavingsChart = ({ data }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    if (data && data.length > 0) {
      const ctx = chartRef.current.getContext("2d");

      // Proses data untuk chart
      const labels = data.map((item) => item.month);
      const deposits = data.map((item) => item.deposits);
      const withdrawals = data.map((item) => item.withdrawals);

      chartInstance.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Setoran",
              data: deposits,
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, "rgba(16, 185, 129, 0.9)");
                gradient.addColorStop(0.5, "rgba(34, 197, 94, 0.7)");
                gradient.addColorStop(1, "rgba(34, 197, 94, 0.3)");
                return gradient;
              },
              borderColor: "rgba(16, 185, 129, 1)",
              borderWidth: 2,
              borderRadius: {
                topLeft: 12,
                topRight: 12,
                bottomLeft: 4,
                bottomRight: 4,
              },
              borderSkipped: false,
              barThickness: 'flex',
              maxBarThickness: 60,
            },
            {
              label: "Penarikan",
              data: withdrawals,
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                gradient.addColorStop(0, "rgba(239, 68, 68, 0.9)");
                gradient.addColorStop(0.5, "rgba(248, 113, 113, 0.7)");
                gradient.addColorStop(1, "rgba(239, 68, 68, 0.3)");
                return gradient;
              },
              borderColor: "rgba(239, 68, 68, 1)",
              borderWidth: 2,
              borderRadius: {
                topLeft: 12,
                topRight: 12,
                bottomLeft: 4,
                bottomRight: 4,
              },
              borderSkipped: false,
              barThickness: 'flex',
              maxBarThickness: 60,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 20,
              bottom: 20,
              left: 10,
              right: 10,
            },
          },
          plugins: {
            legend: {
              position: "top",
              align: "center",
              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                padding: 25,
                font: {
                  size: 14,
                  family: "Inter",
                  weight: "600",
                },
                color: "#374151",
                generateLabels: function(chart) {
                  const original = Chart.defaults.plugins.legend.labels.generateLabels;
                  const labels = original.call(this, chart);
                  labels.forEach(label => {
                    label.pointStyle = 'circle';
                  });
                  return labels;
                }
              },
            },
            tooltip: {
              backgroundColor: "rgba(17, 24, 39, 0.95)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "rgba(255, 255, 255, 0.2)",
              borderWidth: 1,
              cornerRadius: 16,
              displayColors: true,
              padding: 16,
              titleFont: {
                size: 14,
                weight: "600",
              },
              bodyFont: {
                size: 13,
                weight: "500",
              },
              callbacks: {
                title: function(context) {
                  return `Bulan ${context[0].label}`;
                },
                label: function (context) {
                  const value = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(context.parsed.y);
                  return `${context.dataset.label}: ${value}`;
                },
                afterBody: function(context) {
                  const total = context.reduce((sum, item) => sum + item.parsed.y, 0);
                  const totalFormatted = new Intl.NumberFormat("id-ID", {
                    style: "currency",
                    currency: "IDR",
                    minimumFractionDigits: 0,
                  }).format(total);
                  return `Total: ${totalFormatted}`;
                }
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              border: {
                display: false,
              },
              ticks: {
                font: {
                  size: 12,
                  family: "Inter",
                  weight: "500",
                },
                color: "#6B7280",
                padding: 10,
              },
            },
            y: {
              beginAtZero: true,
              border: {
                display: false,
              },
              grid: {
                color: "rgba(156, 163, 175, 0.2)",
                drawBorder: false,
                lineWidth: 1,
              },
              ticks: {
                font: {
                  size: 12,
                  family: "Inter",
                  weight: "500",
                },
                color: "#6B7280",
                padding: 15,
                callback: function (value) {
                  if (value >= 1000000) {
                    return "Rp " + (value / 1000000).toFixed(1) + "M";
                  } else if (value >= 1000) {
                    return "Rp " + (value / 1000).toFixed(0) + "K";
                  }
                  return "Rp " + value.toLocaleString("id-ID");
                },
              },
            },
          },
          animation: {
            duration: 2500,
            easing: "easeInOutCubic",
            delay: (context) => {
              return context.dataIndex * 100;
            },
          },
          interaction: {
            intersect: false,
            mode: "index",
          },
          elements: {
            bar: {
              borderWidth: 2,
            }
          }
        },
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
        <div className="text-center p-8">
          <div className="text-6xl mb-4 animate-bounce">📊</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Belum Ada Data Statistik
          </h3>
          <p className="text-gray-500 text-sm max-w-sm">
            Data statistik akan muncul setelah ada transaksi setoran atau penarikan yang disetujui
          </p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative h-96 bg-white rounded-xl p-4">
        <canvas ref={chartRef}></canvas>
      </div>
      <div className="mt-6 flex items-center justify-between text-sm">
        <p className="text-gray-500 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
          Data berdasarkan transaksi yang sudah disetujui
        </p>
        <div className="flex items-center space-x-4 text-gray-400">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span>Setoran</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span>Penarikan</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavingsChart;
