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
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState(null);

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
        console.log("Full member response:", response.data.data); // Debug
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
      // SIMPLE: Langsung query database berdasarkan UUID member
      if (memberData && memberData.uuid) {
        console.log("Fetching ALL savings for member UUID:", memberData.uuid); // Debug
        
        // Query langsung ke database untuk semua savings dengan UUID ini
        const response = await api.get(`/api/savings/member-by-uuid/${memberData.uuid}`);
        console.log("Direct DB response:", response.data); // Debug
        
        if (response.data && response.data.success && response.data.data) {
          const savingsArray = response.data.data.savings || [];
          console.log("Raw savings from DB:", savingsArray); // Debug
          
          // Get product info untuk term duration
          const productInfo = memberData.product;
          const termDuration = productInfo?.termDuration || 12;
          const depositAmount = productInfo?.depositAmount || 0;
          
          // Create map dari existing savings berdasarkan installment period
          const savingsMap = {};
          savingsArray.forEach(saving => {
            // PERBAIKAN: Ambil SEMUA savings (Approved, Pending, Rejected) tipe Setoran
            if (saving.type === "Setoran") {
              savingsMap[saving.installmentPeriod] = saving;
            }
          });
          
          console.log("Approved savings map:", savingsMap); // Debug
          
          // Generate semua periode dari 1 sampai termDuration
          const convertedData = [];
          for (let period = 1; period <= termDuration; period++) {
            const existingSaving = savingsMap[period];
            
            // Calculate date projection
            const currentDate = new Date();
            const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + period, 1);
            const dateProjection = projectionDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            });
            
            convertedData.push({
              installment_period: period,
              projection: depositAmount.toString(),
              dateProjection: dateProjection,
              realization: existingSaving ? existingSaving.amount.toString() : "0",
              payment_proof: existingSaving ? (existingSaving.proofFile || "0") : "0",
              status: existingSaving ? existingSaving.status : "Belum Bayar"
            });
          }
          
          console.log("Final converted data:", convertedData); // Debug
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

  const getStatusBadge = (period) => {
    // Langsung gunakan status dari database, simple!
    const statusColors = {
      "Approved": "bg-green-100 text-green-800",
      "Pending": "bg-yellow-100 text-yellow-800", 
      "Rejected": "bg-red-100 text-red-800",
      "Belum Bayar": "bg-gray-100 text-gray-800"
    };
    
    const status = period.status || "Belum Bayar";
    const colorClass = statusColors[status] || "bg-gray-100 text-gray-800";
    
    // Tampilkan status sesuai database
    let displayText = status;
    if (status === "Approved") {
      displayText = "✅ Approved";
    } else if (status === "Pending") {
      displayText = "⏳ Pending";
    } else if (status === "Rejected") {
      displayText = "❌ Rejected";
    } else {
      displayText = "⏳ Belum Bayar";
    }
    
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
      {displayText}
    </span>;
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

  const handleShowProof = (proofFile, period) => {
    if (proofFile && proofFile !== "0") {
      // File sudah berisi path lengkap, langsung pakai
      const fileUrl = `http://localhost:5000/${proofFile}`;
      
      console.log("Proof file:", proofFile); // Debug
      console.log("Generated URL:", fileUrl); // Debug
      
      setSelectedProof({
        file: proofFile,
        period: period,
        url: fileUrl
      });
      setShowProofModal(true);
    }
  };

  const getFileExtension = (filename) => {
    if (!filename || typeof filename !== 'string') return '';
    return filename.split('.').pop().toLowerCase();
  };

  const isImageFile = (filename) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    return imageExtensions.includes(getFileExtension(filename));
  };

  const isPdfFile = (filename) => {
    return getFileExtension(filename) === 'pdf';
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
                        <button
                          onClick={() => handleShowProof(period.payment_proof, period.installment_period)}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors cursor-pointer"
                        >
                          👁️ Lihat Bukti
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          📄 Belum Ada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(period)}
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

      {/* Modal Popup untuk Bukti Pembayaran */}
      {showProofModal && selectedProof && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-rose-50">
              <h3 className="text-lg font-semibold text-gray-900">
                📄 Bukti Pembayaran - Periode {selectedProof.period}
              </h3>
              <button
                onClick={() => setShowProofModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-4 max-h-[calc(90vh-120px)] overflow-auto">
              <div className="text-center">
                {isImageFile(selectedProof.file) ? (
                  // Tampilkan gambar
                  <div className="space-y-4">
                    <img
                      src={selectedProof.url}
                      alt={`Bukti pembayaran periode ${selectedProof.period}`}
                      className="max-w-full max-h-[60vh] mx-auto rounded-lg shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div style={{display: 'none'}} className="text-red-500">
                      ❌ Gagal memuat gambar
                    </div>
                    <p className="text-sm text-gray-600">
                      📁 File: {selectedProof.file}
                    </p>
                  </div>
                ) : isPdfFile(selectedProof.file) ? (
                  // Tampilkan PDF
                  <div className="space-y-4">
                    <iframe
                      src={selectedProof.url}
                      className="w-full h-[60vh] border rounded-lg"
                      title={`Bukti pembayaran periode ${selectedProof.period}`}
                    />
                    <p className="text-sm text-gray-600">
                      📁 File: {selectedProof.file}
                    </p>
                    <a
                      href={selectedProof.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      📥 Download PDF
                    </a>
                  </div>
                ) : (
                  // File lainnya
                  <div className="space-y-4 py-8">
                    <div className="text-6xl mb-4">📎</div>
                    <h4 className="text-lg font-medium text-gray-900">
                      File Bukti Pembayaran
                    </h4>
                    <p className="text-sm text-gray-600">
                      📁 {selectedProof.file}
                    </p>
                    <p className="text-sm text-gray-500">
                      File ini tidak dapat ditampilkan di browser. Silakan download untuk melihat.
                    </p>
                    <a
                      href={selectedProof.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      📥 Download File
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowProofModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberDetail;