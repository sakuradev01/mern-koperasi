import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/index.jsx";

const MemberDetail = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [memberData, setMemberData] = useState(null);
  const [savingsData, setSavingsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (uuid) {
      fetchMemberDetail();
    }
  }, [uuid]);

  useEffect(() => {
    if (memberData) {
      fetchMemberSavings();
    }
  }, [memberData]);

  const fetchMemberDetail = async () => {
    try {
      const response = await api.get(`/api/members/${uuid}`);
      if (response.data.success) {
        setMemberData(response.data.data);
      } else {
        setError("Member tidak ditemukan");
        setLoading(false);
      }
    } catch (err) {
      setError("Gagal memuat data member");
      setLoading(false);
      console.error("Member detail fetch error:", err);
    }
  };

  const fetchMemberSavings = async () => {
    try {
      // Coba dulu endpoint student dashboard
      let response;
      try {
        response = await api.get(`/api/savings/student-dashboard/${uuid}`);
        if (response.data && Array.isArray(response.data)) {
          setSavingsData(response.data);
          return;
        }
      } catch (err) {
        console.log("Student dashboard endpoint failed, trying member savings...");
      }

      // Jika student dashboard gagal, coba endpoint savings by member
      if (memberData && memberData._id) {
        response = await api.get(`/api/savings/member/${memberData._id}`);
        if (response.data && response.data.success && response.data.data) {
          // Convert savings data ke format student dashboard
          const savingsArray = response.data.data.savings || [];
          const convertedData = savingsArray.map((saving, index) => ({
            installment_period: saving.installmentPeriod || (index + 1),
            projection: saving.productId?.depositAmount?.toString() || "0",
            dateProjection: new Date(saving.savingsDate).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            }),
            realization: saving.amount?.toString() || "0",
            payment_proof: saving.proofFile ? 1 : 0
          }));
          setSavingsData(convertedData);
        } else {
          setSavingsData([]);
        }
      } else {
        setSavingsData([]);
      }
    } catch (err) {
      console.error("Member savings fetch error:", err);
      setSavingsData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (realization, projection) => {
    const realAmount = parseInt(realization) || 0;
    const projAmount = parseInt(projection) || 0;
    
    if (realAmount >= projAmount) {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">✅ Lunas</span>;
    } else if (realAmount > 0) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">⏳ Sebagian</span>;
    } else {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">❌ Belum Bayar</span>;
    }
  };

  const calculateTotalRealization = () => {
    return savingsData.reduce((total, period) => {
      return total + (parseInt(period.realization) || 0);
    }, 0);
  };

  const calculateTotalProjection = () => {
    return savingsData.reduce((total, period) => {
      return total + (parseInt(period.projection) || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">🌸 Memuat data siswa...</p>
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
          <p className="text-sm sm:text-base text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/master/anggota')}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
          >
            ← Kembali ke Daftar Anggota
          </button>
        </div>
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-gray-400 text-4xl sm:text-6xl mb-4">👤</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Data Tidak Ditemukan</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Member dengan UUID {uuid} tidak ditemukan</p>
          <button
            onClick={() => navigate('/master/anggota')}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
          >
            ← Kembali ke Daftar Anggota
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header dengan tombol kembali */}
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate('/master/anggota')}
          className="mr-4 p-2 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded-lg transition-colors"
        >
          ← Kembali
        </button>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          📊 Detail Tabungan Siswa
        </h1>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg shadow-sm border border-pink-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center mb-4 lg:mb-0">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
              {memberData.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{memberData.name}</h2>
              <p className="text-sm text-gray-600 font-mono">{memberData.uuid}</p>
              <p className="text-sm text-gray-600">{memberData.user?.username}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Gender</p>
              <p className="text-lg font-semibold text-gray-900">
                {memberData.gender === 'L' ? '👨 Laki-laki' : '👩 Perempuan'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Kota</p>
              <p className="text-lg font-semibold text-gray-900">{memberData.city || '-'}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Telepon</p>
              <p className="text-lg font-semibold text-gray-900">{memberData.phone || '-'}</p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Produk</p>
              <p className="text-sm font-semibold text-gray-900">
                {memberData.product ? memberData.product.title : 'Belum dipilih'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Target</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(calculateTotalProjection())}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Terealisasi</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(calculateTotalRealization())}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Progress</p>
              <p className="text-2xl font-bold text-purple-600">
                {calculateTotalProjection() > 0 
                  ? Math.round((calculateTotalRealization() / calculateTotalProjection()) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Tabungan */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">📋 Riwayat Tabungan</h3>
          <p className="text-sm text-gray-600">Detail pembayaran per periode</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proyeksi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uang Disetor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bukti Pembayaran
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {savingsData.length > 0 ? (
                savingsData.map((period, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-semibold text-sm mr-3">
                          {period.installment_period}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          Periode {period.installment_period}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {period.dateProjection || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                      {formatCurrency(parseInt(period.projection) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(parseInt(period.realization) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {period.payment_proof && period.payment_proof !== "0" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ Ada Bukti
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          📄 Belum Ada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(period.realization, period.projection)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <span className="text-4xl mb-4 block">📊</span>
                      <p className="text-lg font-medium">Belum Ada Data Tabungan</p>
                      <p className="text-sm">Siswa belum memiliki riwayat tabungan atau belum memilih produk simpanan</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progress Bar */}
      {savingsData.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Progress Keseluruhan</h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-4 rounded-full transition-all duration-500"
              style={{ 
                width: `${calculateTotalProjection() > 0 
                  ? Math.min((calculateTotalRealization() / calculateTotalProjection()) * 100, 100)
                  : 0}%` 
              }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>Terealisasi: {formatCurrency(calculateTotalRealization())}</span>
            <span>Target: {formatCurrency(calculateTotalProjection())}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDetail;