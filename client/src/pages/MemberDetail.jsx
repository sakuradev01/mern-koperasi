import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/index.jsx";
import ProductUpgradeCard from "../components/ProductUpgradeCard.jsx";
import { CreditModal, CreditTable } from "../components/credits/index.jsx";

const MemberDetail = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [memberData, setMemberData] = useState(null);
  const [savingsData, setSavingsData] = useState([]);
  const [creditsData, setCreditsData] = useState([]);
  const [upgradeHistory, setUpgradeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState(null);
  const [activeTab, setActiveTab] = useState("simpanan"); // "simpanan" or "kredit"
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [editingCredit, setEditingCredit] = useState(null);

  // Handler untuk refresh data setelah upgrade
  const handleUpgradeSuccess = () => {
    fetchMemberDetail();
  };

  // Handler untuk refresh data setelah credit action
  const handleCreditSuccess = () => {
    fetchMemberCredits();
  };

  // Handler untuk pay installment - redirect to credits page
  const handlePayInstallment = (creditId, period) => {
    // Redirect to credits page with pre-selected credit
    window.open(`/kredit-pinjaman?creditId=${creditId}&period=${period}`, '_blank');
  };

  // Handler untuk edit credit
  const handleEditCredit = (credit) => {
    setEditingCredit(credit);
    setShowCreditModal(true);
  };

  // Handler untuk delete credit
  const handleDeleteCredit = async (creditId, productName) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kredit "${productName}"?`)) {
      try {
        const response = await api.delete(`/api/credits/${creditId}`);
        if (response.data.success) {
          handleCreditSuccess();
          // Show success message or toast
          console.log("Credit deleted successfully");
        }
      } catch (error) {
        console.error("Delete credit error:", error);
        alert("Gagal menghapus kredit: " + (error.response?.data?.message || error.message));
      }
    }
  };

  useEffect(() => {
    if (uuid) {
      fetchMemberDetail();
    }
  }, [uuid]);

  useEffect(() => {
    if (memberData) {
      fetchMemberSavings();
      fetchMemberCredits();
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
        const response = await api.get(
          `/api/savings/member-by-uuid/${memberData.uuid}`
        );
        console.log("Direct DB response:", response.data); // Debug

        // Check apakah ada upgrade aktif dan riwayat upgrade
        let activeUpgrade = null;
        let upgradeHistory = [];
        try {
          const upgradeResponse = await api.get(
            `/api/product-upgrade/active/${memberData.uuid}`
          );
          if (upgradeResponse.data.success && upgradeResponse.data.data.hasActiveUpgrade) {
            activeUpgrade = upgradeResponse.data.data.activeUpgrade;
            console.log("Active upgrade found:", activeUpgrade); // Debug
          }
        } catch (upgradeError) {
          console.log("No active upgrade or error:", upgradeError.message);
        }

        // Ambil riwayat upgrade
        try {
          const historyResponse = await api.get(
            `/api/product-upgrade/history/${memberData.uuid}`
          );
          if (historyResponse.data.success && historyResponse.data.data.upgradeHistory) {
            upgradeHistory = historyResponse.data.data.upgradeHistory;
            console.log("Upgrade history found:", upgradeHistory); // Debug
          }
        } catch (historyError) {
          console.log("No upgrade history or error:", historyError.message);
        }

        if (response.data && response.data.success && response.data.data) {
          const savingsArray = response.data.data.savings || [];
          console.log("Raw savings from DB:", savingsArray); // Debug

          // Get product info untuk term duration
          const productInfo = memberData.product;
          const termDuration = productInfo?.termDuration || 12;
          
  // PERBAIKAN: Simpan nominal asli sebelum upgrade
          let originalDepositAmount = productInfo?.depositAmount || 0;
          let upgradeStartPeriod = null;
          let isUpgraded = false;
          
          // Jika ada upgrade aktif, gunakan nominal lama dari upgrade record
          if (activeUpgrade) {
            upgradeStartPeriod = activeUpgrade.periodWhenUpgraded + 1;
            isUpgraded = true;
            // PENTING: Gunakan oldProduct depositAmount dari upgrade record untuk proyeksi periode awal
            originalDepositAmount = activeUpgrade.oldProduct?.depositAmount || originalDepositAmount;
            console.log("Upgrade active from period:", upgradeStartPeriod);
            console.log("Original deposit amount:", originalDepositAmount);
            console.log("New deposit amount:", activeUpgrade.newMonthlyAmount);
          }

          // Create map dari existing savings berdasarkan installment period
          const savingsMap = {};
          savingsArray.forEach((saving) => {
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
            const projectionDate = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth() + period,
              1
            );
            const dateProjection = projectionDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            });

            // PERBAIKAN: Tentukan nominal projection berdasarkan upgrade
            let projectionAmount;
            
            if (isUpgraded && period >= upgradeStartPeriod) {
              // Untuk periode setelah upgrade, gunakan nominal baru + kompensasi
              projectionAmount = activeUpgrade.newMonthlyAmount;
            } else {
              // Untuk periode sebelum upgrade atau tidak ada upgrade, gunakan nominal asli
              projectionAmount = originalDepositAmount;
            }

            convertedData.push({
              installment_period: period,
              projection: projectionAmount.toString(),
              dateProjection: dateProjection,
              realization: existingSaving
                ? existingSaving.amount.toString()
                : "0",
              payment_proof: existingSaving
                ? existingSaving.proofFile || "0"
                : "0",
              status: existingSaving ? existingSaving.status : "Belum Bayar",
              isUpgradePeriod: activeUpgrade && period >= upgradeStartPeriod,
              upgradeInfo: activeUpgrade && period >= upgradeStartPeriod ? {
                oldAmount: originalDepositAmount, // Gunakan nominal asli, bukan yang sudah berubah
                newAmount: activeUpgrade.newMonthlyAmount,
                compensation: activeUpgrade.compensationPerMonth
              } : null
            });
          }

          console.log("Final converted data:", convertedData); // Debug
          setSavingsData(convertedData);
          setUpgradeHistory(upgradeHistory); // Simpan riwayat upgrade ke state
        } else {
          setSavingsData([]);
          setUpgradeHistory([]);
        }
      } else {
        setSavingsData([]);
        setUpgradeHistory([]);
      }
    } catch (err) {
      console.error("Member savings fetch error:", err);
      setSavingsData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberCredits = async () => {
    try {
      if (memberData && memberData.uuid) {
        console.log("Fetching credits for member UUID:", memberData.uuid);
        
        const response = await api.get(
          `/api/credits/member-by-uuid/${memberData.uuid}`
        );
        console.log("Credits response:", response.data);

        if (response.data && response.data.success && response.data.data) {
          const creditsArray = response.data.data.credits || [];
          setCreditsData(creditsArray);
        } else {
          setCreditsData([]);
        }
      } else {
        setCreditsData([]);
      }
    } catch (err) {
      console.error("Member credits fetch error:", err);
      setCreditsData([]);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (period) => {
    // Langsung gunakan status dari database, simple!
    const statusColors = {
      Approved: "bg-green-100 text-green-800",
      Pending: "bg-yellow-100 text-yellow-800",
      Rejected: "bg-red-100 text-red-800",
      "Belum Bayar": "bg-gray-100 text-gray-800",
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

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}
      >
        {displayText}
      </span>
    );
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

  // Calculate credit summary data
  const calculateCreditSummary = () => {
    const totalCredits = creditsData.length;
    const activeCredits = creditsData.filter(c => c.status === "Active").length;
    const completedCredits = creditsData.filter(c => c.status === "Completed").length;
    const totalPrincipalAmount = creditsData.reduce((sum, c) => sum + (c.principalAmount || 0), 0);
    const totalPaidAmount = creditsData.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    const totalRemainingAmount = creditsData.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

    return {
      totalCredits,
      activeCredits,
      completedCredits,
      totalPrincipalAmount,
      totalPaidAmount,
      totalRemainingAmount
    };
  };

  const creditSummary = calculateCreditSummary();

  const handleShowProof = (proofFile, period) => {
    if (proofFile && proofFile !== "0") {
      const baseApi =
        import.meta.env.VITE_API_URL ||
        import.meta.env.VITE_SERVER_URL ||
        "http://localhost:5000";

      // Primary and fallback URLs
      const primaryUrl = `${baseApi}/${proofFile}`;
      const fallbackUrl = `${baseApi}/api/${proofFile}`;

      console.log("Proof file:", proofFile); // Debug
      console.log("Generated URL primary:", primaryUrl); // Debug
      console.log("Generated URL fallback:", fallbackUrl); // Debug

      setSelectedProof({
        file: proofFile,
        period: period,
        url: primaryUrl,
        fallbackUrl,
      });
      setShowProofModal(true);
    }
  };

  const getFileExtension = (filename) => {
    if (!filename || typeof filename !== "string") return "";
    return filename.split(".").pop().toLowerCase();
  };

  const isImageFile = (filename) => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];
    return imageExtensions.includes(getFileExtension(filename));
  };

  const isPdfFile = (filename) => {
    return getFileExtension(filename) === "pdf";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">
            🌸 Memuat data siswa...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-red-600 text-4xl sm:text-6xl mb-4">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            Error
          </h2>
          <p className="text-sm sm:text-base text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/master/anggota")}
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            Data Tidak Ditemukan
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Member dengan UUID {uuid} tidak ditemukan
          </p>
          <button
            onClick={() => navigate("/master/anggota")}
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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/master/anggota")}
            className="mr-4 p-2 text-pink-600 hover:text-pink-800 hover:bg-pink-50 rounded-lg transition-colors"
          >
            ← Kembali
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            📊 Detail {activeTab === "simpanan" ? "Tabungan" : "Kredit"} Siswa
          </h1>
        </div>
        
        {/* Toggle Button */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("simpanan")}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === "simpanan"
                ? "bg-white text-pink-600 shadow-sm font-medium"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            💰 Simpanan
          </button>
          <button
            onClick={() => setActiveTab("kredit")}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === "kredit"
                ? "bg-white text-blue-600 shadow-sm font-medium"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            💳 Kredit
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg shadow-sm border border-pink-100 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center mb-4 lg:mb-0">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
              {memberData.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {memberData.name}
              </h2>
              <p className="text-sm text-gray-600 font-mono">
                {memberData.uuid}
              </p>
              <p className="text-sm text-gray-600">
                {memberData.user?.username}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Gender
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {memberData.gender === "L" ? "👨 Laki-laki" : "👩 Perempuan"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Kota
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {memberData.city || "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Telepon
              </p>
              <p className="text-lg font-semibold text-gray-900">
                {memberData.phone || "-"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Produk
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {memberData.product
                  ? memberData.product.title
                  : "Belum dipilih"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Upgrade Card - Hanya untuk tab simpanan */}
      {activeTab === "simpanan" && (
        <ProductUpgradeCard 
          memberData={memberData} 
          onUpgradeSuccess={handleUpgradeSuccess}
        />
      )}

      {/* Upgrade History Card - Hanya untuk tab simpanan */}
      {activeTab === "simpanan" && upgradeHistory.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow-sm border border-purple-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-purple-900 mb-2">
                📈 Riwayat Upgrade Paket
              </h3>
              <p className="text-sm text-purple-700">
                Member ini sudah pernah upgrade paket sebanyak {upgradeHistory.length} kali
              </p>
            </div>
            <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
              {upgradeHistory.filter(h => h.status === "Active").length > 0 ? "🔄 Aktif" : "✅ Selesai"}
            </div>
          </div>

          <div className="space-y-3">
            {upgradeHistory.map((upgrade, index) => (
              <div key={upgrade._id || index} className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        #{upgradeHistory.length - index}
                      </span>
                      <span className="text-sm text-gray-500">
                        {new Date(upgrade.upgradeDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long", 
                          year: "numeric"
                        })}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        upgrade.status === "Active" 
                          ? "bg-green-100 text-green-800" 
                          : upgrade.status === "Completed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {upgrade.status === "Active" ? "Aktif" : upgrade.status === "Completed" ? "Selesai" : upgrade.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">
                          <strong>Dari:</strong> {upgrade.oldProduct?.title || "Produk Lama"} 
                          <span className="text-blue-600 ml-1">
                            ({formatCurrency(upgrade.oldProduct?.depositAmount || 0)})
                          </span>
                        </p>
                        <p className="text-gray-600">
                          <strong>Ke:</strong> {upgrade.newProduct?.title || "Produk Baru"}
                          <span className="text-green-600 ml-1">
                            ({formatCurrency(upgrade.newProduct?.depositAmount || 0)})
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">
                          <strong>Periode Upgrade:</strong> Bulan {upgrade.periodWhenUpgraded + 1}
                        </p>
                        <p className="text-gray-600">
                          <strong>Kompensasi:</strong> 
                          <span className="text-orange-600 ml-1 font-medium">
                            +{formatCurrency(upgrade.compensationPerMonth)}/bulan
                          </span>
                        </p>
                        <p className="text-gray-600">
                          <strong>Setoran Baru:</strong> 
                          <span className="text-purple-600 ml-1 font-medium">
                            {formatCurrency(upgrade.newMonthlyAmount)}/bulan
                          </span>
                        </p>
                      </div>
                    </div>

                    {upgrade.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <strong>Catatan:</strong> {upgrade.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {activeTab === "simpanan" && (
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
              <p className="text-sm font-medium text-gray-500">
                Total Terealisasi
              </p>
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
                  ? Math.round(
                      (calculateTotalRealization() /
                        calculateTotalProjection()) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Konten berdasarkan tab aktif */}
      {activeTab === "simpanan" ? (
        <>
          {/* Tabel Tabungan */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            📋 Riwayat Tabungan
          </h3>
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
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
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
                      {period.dateProjection || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={`text-sm font-semibold ${period.isUpgradePeriod ? 'text-orange-600' : 'text-blue-600'}`}>
                          {formatCurrency(parseInt(period.projection) || 0)}
                        </span>
                        {period.isUpgradePeriod && (
                          <div className="text-xs text-orange-500 mt-1">
                            🚀 Upgrade: {formatCurrency(period.upgradeInfo.oldAmount)} → {formatCurrency(period.upgradeInfo.newAmount)}
                            <br />
                            💰 Kompensasi: +{formatCurrency(period.upgradeInfo.compensation)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {formatCurrency(parseInt(period.realization) || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {period.payment_proof && period.payment_proof !== "0" ? (
                        <button
                          onClick={() =>
                            handleShowProof(
                              period.payment_proof,
                              period.installment_period
                            )
                          }
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
                      <p className="text-lg font-medium">
                        Belum Ada Data Tabungan
                      </p>
                      <p className="text-sm">
                        Siswa belum memiliki riwayat tabungan atau belum memilih
                        produk simpanan
                      </p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📈 Progress Keseluruhan
          </h3>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-pink-500 to-rose-500 h-4 rounded-full transition-all duration-500"
              style={{
                width: `${
                  calculateTotalProjection() > 0
                    ? Math.min(
                        (calculateTotalRealization() /
                          calculateTotalProjection()) *
                          100,
                        100
                      )
                    : 0
                }%`,
              }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mt-2">
            <span>
              Terealisasi: {formatCurrency(calculateTotalRealization())}
            </span>
            <span>Target: {formatCurrency(calculateTotalProjection())}</span>
          </div>
        </div>
      )}
        </>
      ) : (
        <>
          {/* Credit Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Pinjaman</h3>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(creditSummary.totalPrincipalAmount)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Sudah Dibayar</h3>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(creditSummary.totalPaidAmount)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Sisa Pinjaman</h3>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(creditSummary.totalRemainingAmount)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Kredit Aktif</h3>
              <p className="text-2xl font-bold text-purple-600">
                {creditSummary.activeCredits} / {creditSummary.totalCredits}
              </p>
            </div>
          </div>

          {/* Kredit Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  💳 Data Kredit Pinjaman
                </h3>
                <p className="text-sm text-gray-600">
                  Kelola kredit dan angsuran member
                </p>
              </div>
              <button
                onClick={() => setShowCreditModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                ➕ Tambah Kredit
              </button>
            </div>
            
            <CreditTable
              credits={creditsData}
              onPayInstallment={handlePayInstallment}
              onEditCredit={handleEditCredit}
              onDeleteCredit={handleDeleteCredit}
            />
          </div>
        </>
      )}

      {/* Modal untuk Kredit */}
      <CreditModal
        isOpen={showCreditModal}
        onClose={() => {
          setShowCreditModal(false);
          setEditingCredit(null);
        }}
        onSuccess={() => {
          handleCreditSuccess();
          setEditingCredit(null);
        }}
        memberData={memberData}
        creditData={editingCredit}
      />

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
                        // Try fallback URL once if primary fails
                        if (selectedProof.fallbackUrl && e.currentTarget.src !== selectedProof.fallbackUrl) {
                          e.currentTarget.src = selectedProof.fallbackUrl;
                        } else {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextSibling.style.display = "block";
                        }
                      }}
                    />
                    <div style={{ display: "none" }} className="text-red-500">
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
                      File ini tidak dapat ditampilkan di browser. Silakan
                      download untuk melihat.
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
