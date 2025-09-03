/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../api/index.jsx";
import { SavingsChart } from "../components/charts/index.jsx";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDateTime } from "../utils/formatDate";
import ConfirmDialog from "../components/common/ConfirmDialog";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalDeposits: 0,
    totalProducts: 0,
    activeSavingsCount: 0,
    recentTransactions: [],
    monthlyStats: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get("/api/admin/dashboard");
        if (response.data.success) {
          setStats({
            totalMembers: response.data.data.totalMembers,
            totalDeposits: response.data.data.totalSavings,
            totalProducts: response.data.data.totalProducts,
            activeSavingsCount: response.data.data.activeSavingsCount || 0,
            recentTransactions: response.data.data.recentTransactions,
            monthlyStats: response.data.data.monthlyStats || [],
          });
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

  // Quick delete function
  const handleQuickDelete = (transactionId, type) => {
    setTransactionToDelete({ id: transactionId, type });
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;

    setDeletingId(transactionToDelete.id);
    try {
      await api.delete(`/api/savings/${transactionToDelete.id}`);
      toast.success(`${transactionToDelete.type} berhasil dihapus`);
      
      // Refresh dashboard data
      const response = await api.get("/api/admin/dashboard");
      if (response.data.success) {
        setStats({
          totalMembers: response.data.data.totalMembers,
          totalDeposits: response.data.data.totalSavings,
          totalProducts: response.data.data.totalProducts,
          activeSavingsCount: response.data.data.activeSavingsCount || 0,
          recentTransactions: response.data.data.recentTransactions,
          monthlyStats: response.data.data.monthlyStats || [],
        });
      }
    } catch (err) {
      toast.error(`Gagal menghapus ${transactionToDelete.type.toLowerCase()}`);
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
      setTransactionToDelete(null);
    }
  };

  // Quick navigation functions
  const handleQuickAction = (action) => {
    switch (action) {
      case 'add-member':
        navigate('/members');
        break;
      case 'process-savings':
        navigate('/savings');
        break;
      case 'add-product':
        navigate('/products');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">🌸 Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-red-600 text-4xl sm:text-6xl mb-4">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-sm sm:text-base text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4 sm:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                🌸 Dashboard LPK SAMIT
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Selamat datang, <span className="font-semibold text-pink-600">{user?.name}</span> - Sakura Mitra
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>🕒</span>
                <span>{new Date().toLocaleDateString('id-ID', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Anggota"
          value={stats.totalMembers}
          icon="👥"
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          bgColor="bg-blue-50"
          trend="+12%"
        />
        <StatCard
          title="Total Setoran"
          value={formatCurrency(stats.totalDeposits)}
          icon="💰"
          color="bg-gradient-to-br from-green-500 to-green-600"
          bgColor="bg-green-50"
          trend="+8%"
        />
        <StatCard
          title="Produk Aktif"
          value={stats.totalProducts}
          icon="📋"
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          bgColor="bg-purple-50"
          trend="+5%"
        />
        <StatCard
          title="Simpanan Aktif"
          value={stats.activeSavingsCount}
          icon="🌸"
          color="bg-gradient-to-br from-pink-500 to-pink-600"
          bgColor="bg-pink-50"
          trend="+15%"
        />
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              ⚡ Aksi Cepat
            </h3>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => handleQuickAction('add-member')}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">👤</span>
                  <span className="font-semibold">Tambah Anggota Baru</span>
                </div>
                <span className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </button>
            
            <button 
              onClick={() => handleQuickAction('process-savings')}
              className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">💰</span>
                  <span className="font-semibold">Proses Setoran</span>
                </div>
                <span className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </button>
            
            <button 
              onClick={() => handleQuickAction('add-product')}
              className="group relative overflow-hidden bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🌸</span>
                  <span className="font-semibold">Tambah Produk</span>
                </div>
                <span className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/savings')}
              className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🗑️</span>
                  <span className="font-semibold">Kelola & Hapus Data</span>
                </div>
                <span className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              📊 Aktivitas Terkini
            </h3>
            <button 
              onClick={() => navigate('/savings')}
              className="text-sm text-pink-600 hover:text-pink-700 font-medium"
            >
              Lihat Semua
            </button>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {stats.recentTransactions.slice(0, 5).map((transaction) => (
              <TransactionItem 
                key={transaction.id} 
                transaction={transaction} 
                onDelete={handleQuickDelete}
                isDeleting={deletingId === transaction.id}
              />
            ))}
            {stats.recentTransactions.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-500 text-lg">Belum ada aktivitas terkini</p>
                <button 
                  onClick={() => navigate('/savings')}
                  className="mt-4 px-4 py-2 bg-pink-100 text-pink-600 rounded-lg hover:bg-pink-200 transition-colors"
                >
                  Tambah Transaksi
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Chart */}
      <div className="bg-white rounded-2xl shadow-lg border border-pink-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">
            📈 Statistik Bulanan
          </h3>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-sm text-gray-500">Live Data</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4">
          <SavingsChart data={stats.monthlyStats} />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setTransactionToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Transaksi"
        message={`Apakah Anda yakin ingin menghapus ${transactionToDelete?.type?.toLowerCase()} ini? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, bgColor, trend }) => (
  <div className={`${bgColor} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 p-6 border border-white/20`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} text-white shadow-lg`}>
        <span className="text-2xl">{icon}</span>
      </div>
      {trend && (
        <div className="flex items-center space-x-1 text-green-600 text-sm font-medium">
          <span>↗</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

// Transaction Item Component
const TransactionItem = ({ transaction, onDelete, isDeleting }) => (
  <div className="group flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200">
    <div className="flex items-center flex-1">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
        transaction.type === "Setoran" 
          ? "bg-green-100 text-green-600" 
          : "bg-red-100 text-red-600"
      }`}>
        <span className="text-lg font-bold">
          {transaction.member ? transaction.member.charAt(0).toUpperCase() : "?"}
        </span>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900">
          {transaction.member || "Unknown Member"}
        </p>
        <p className="text-sm text-gray-500">
          {formatDateTime(transaction.date)} • {transaction.type}
        </p>
      </div>
    </div>
    
    <div className="flex items-center space-x-3">
      <div className="text-right">
        <p className={`text-lg font-bold ${
          transaction.type === "Setoran" ? "text-green-600" : "text-red-600"
        }`}>
          {transaction.type === "Setoran" ? "+" : "-"}{formatCurrency(transaction.amount)}
        </p>
        <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
          transaction.status === "Approved" 
            ? "bg-green-100 text-green-800"
            : transaction.status === "Rejected"
            ? "bg-red-100 text-red-800"
            : "bg-yellow-100 text-yellow-800"
        }`}>
          {transaction.status === "Approved" ? "✅ Disetujui" 
           : transaction.status === "Rejected" ? "❌ Ditolak"
           : "⏳ Menunggu"}
        </div>
      </div>
      
      {/* Quick Delete Button */}
      <button
        onClick={() => onDelete(transaction.id, transaction.type)}
        disabled={isDeleting}
        className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50"
        title="Hapus transaksi"
      >
        {isDeleting ? (
          <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    </div>
  </div>
);

export default Dashboard;
