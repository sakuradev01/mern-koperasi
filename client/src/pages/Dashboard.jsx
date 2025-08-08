/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../api/index.jsx";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalDeposits: 0,
    totalProducts: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get("/api/admin/dashboard");
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (err) {
        setError("Gagal memuat data dashboard");
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Selamat datang, {user?.name}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Anggota"
          value={stats.totalMembers}
          icon="👥"
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Total Setoran"
          value={stats.totalDeposits}
          icon="💰"
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Produk Aktif"
          value={stats.totalProducts}
          icon="📋"
          color="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Aksi Cepat
          </h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-blue-600 mr-3">👤</span>
                <span className="text-sm font-medium text-gray-900">
                  Tambah Anggota Baru
                </span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-green-600 mr-3">💰</span>
                <span className="text-sm font-medium text-gray-900">
                  Proses Setoran
                </span>
              </div>
            </button>
            <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-purple-600 mr-3">📋</span>
                <span className="text-sm font-medium text-gray-900">
                  Tambah Produk
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Aktivitas Terkini
          </h3>
          <div className="space-y-4">
            {stats.recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
    <div className="flex items-center">
      <div className={`p-3 rounded-lg ${color}`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

// Transaction Item Component
const TransactionItem = ({ transaction }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
    <div className="flex items-center">
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
        <span className="text-gray-600 text-sm font-bold">
          {transaction.member.charAt(0)}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">
          {transaction.member}
        </p>
        <p className="text-xs text-gray-500">{transaction.date}</p>
      </div>
    </div>
    <div className="text-right">
      <p
        className={`text-sm font-medium ${
          transaction.type === "Setoran" ? "text-green-600" : "text-red-600"
        }`}
      >
        {transaction.type === "Setoran" ? "+" : "-"}Rp{" "}
        {transaction.amount.toLocaleString("id-ID")}
      </p>
      <p className="text-xs text-gray-500">{transaction.type}</p>
    </div>
  </div>
);

export default Dashboard;
