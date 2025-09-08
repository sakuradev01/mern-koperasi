import { useState, useEffect } from "react";
import api from "../api/index.jsx";

const ProductUpgradeCard = ({ memberData, onUpgradeSuccess }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [upgradeCalculation, setUpgradeCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [isAtHighestPackage, setIsAtHighestPackage] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/products");
      if (response.data.success) {
        const allProducts = response.data.data;
        const currentDeposit = memberData.product?.depositAmount || 0;
        
        // Filter produk yang depositAmount lebih tinggi dari produk saat ini
        const higherProducts = allProducts.filter(
          (product) => 
            product.depositAmount > currentDeposit && 
            product._id !== memberData.productId
        );
        
        // Cek apakah sudah di paket termahal
        const isAtHighest = allProducts.every(
          (product) => product.depositAmount <= currentDeposit || product._id === memberData.productId
        );
        
        setProducts(higherProducts);
        setIsAtHighestPackage(isAtHighest && higherProducts.length === 0);
        
        console.log(`Member ${memberData.name}: Current ${currentDeposit}, Higher products: ${higherProducts.length}, Is at highest: ${isAtHighest && higherProducts.length === 0}`);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const calculateUpgrade = async () => {
    if (!selectedProduct) return;

    setCalculating(true);
    try {
      const response = await api.post(
        `/api/product-upgrade/calculate/${memberData.uuid}`,
        { newProductId: selectedProduct }
      );

      if (response.data.success) {
        setUpgradeCalculation(response.data.data);
      }
    } catch (error) {
      console.error("Error calculating upgrade:", error);
      alert("Gagal menghitung kompensasi upgrade: " + (error.response?.data?.message || error.message));
    } finally {
      setCalculating(false);
    }
  };

  const executeUpgrade = async () => {
    if (!upgradeCalculation) return;

    setLoading(true);
    try {
      const response = await api.post(
        `/api/product-upgrade/execute/${memberData.uuid}`,
        { 
          newProductId: selectedProduct,
          confirmUpgrade: true 
        }
      );

      if (response.data.success) {
        alert("Upgrade produk berhasil!");
        setShowUpgradeModal(false);
        setUpgradeCalculation(null);
        setSelectedProduct("");
        if (onUpgradeSuccess) {
          onUpgradeSuccess();
        }
      }
    } catch (error) {
      console.error("Error executing upgrade:", error);
      alert("Gagal melakukan upgrade: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Jika tidak ada produk yang bisa di-upgrade dan bukan karena sudah di paket termahal, jangan tampilkan card
  if (products.length === 0 && !isAtHighestPackage) {
    return null;
  }

  return (
    <>
      {/* Upgrade Card */}
      <div className={`rounded-lg shadow-sm border p-6 mb-6 ${
        isAtHighestPackage 
          ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200" 
          : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            {isAtHighestPackage ? (
              <>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  👑 Paket Premium Tertinggi
                </h3>
                <p className="text-sm text-green-700">
                  Member sudah menggunakan paket dengan benefit terbaik
                </p>
                <div className="mt-2 text-xs text-green-600">
                  <strong>Paket Saat Ini:</strong> {memberData.product?.title} 
                  <span className="ml-1">({formatCurrency(memberData.product?.depositAmount || 0)})</span>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  🚀 Upgrade Produk Simpanan
                </h3>
                <p className="text-sm text-blue-700">
                  Tingkatkan produk simpanan untuk benefit yang lebih baik
                </p>
              </>
            )}
          </div>
          
          {isAtHighestPackage ? (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm font-medium">
              ✅ Paket Terbaik
            </div>
          ) : (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Lihat Opsi Upgrade
            </button>
          )}
        </div>

        {/* Tampilkan badge kompensasi jika ada calculation */}
        {upgradeCalculation && upgradeCalculation.upgradeViability.canUpgrade && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-2">
              💰 Sisa Penggantian Paket
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-yellow-700">
                  <strong>Kompensasi per bulan:</strong> {formatCurrency(upgradeCalculation.compensation.kompensasiPerBulan)}
                </p>
                <p className="text-yellow-700">
                  <strong>Setoran baru per bulan:</strong> {formatCurrency(upgradeCalculation.compensation.setoranBaruPerBulan)}
                </p>
              </div>
              <div>
                <p className="text-yellow-700">
                  <strong>Sisa periode:</strong> {upgradeCalculation.savingsProgress.sisaBulan} bulan
                </p>
                <p className="text-yellow-700">
                  <strong>Total kompensasi:</strong> {formatCurrency(upgradeCalculation.compensation.totalKompensasi)}
                </p>
              </div>
            </div>
            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
              <strong>Rumus:</strong> {upgradeCalculation.compensation.formula}
            </div>
          </div>
        )}
      </div>

      {/* Modal Upgrade */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-xl font-semibold text-gray-900">
                🚀 Upgrade Produk Simpanan
              </h3>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setUpgradeCalculation(null);
                  setSelectedProduct("");
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-180px)] overflow-auto">
              {/* Current Product Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Produk Saat Ini</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Nama Produk:</p>
                    <p className="font-medium">{memberData.product?.title || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Setoran per Bulan:</p>
                    <p className="font-medium">{formatCurrency(memberData.product?.depositAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Durasi:</p>
                    <p className="font-medium">{memberData.product?.termDuration || 0} bulan</p>
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Produk Upgrade
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- Pilih Produk --</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.title} - {formatCurrency(product.depositAmount)}/bulan ({product.termDuration} bulan)
                    </option>
                  ))}
                </select>
              </div>

              {/* Calculate Button */}
              <div className="mb-6">
                <button
                  onClick={calculateUpgrade}
                  disabled={!selectedProduct || calculating}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {calculating ? "Menghitung..." : "Hitung Kompensasi Upgrade"}
                </button>
              </div>

              {/* Calculation Result */}
              {upgradeCalculation && (
                <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-4">Hasil Perhitungan</h4>
                  
                  {upgradeCalculation.upgradeViability.canUpgrade ? (
                    <div className="space-y-4">
                      {/* Progress Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-blue-50 rounded">
                          <p className="text-blue-700"><strong>Sudah Nabung:</strong> {upgradeCalculation.savingsProgress.bulanSudahNabung} bulan</p>
                          <p className="text-blue-700"><strong>Sisa Periode:</strong> {upgradeCalculation.savingsProgress.sisaBulan} bulan</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <p className="text-green-700"><strong>Total Sudah Dibayar:</strong> {formatCurrency(upgradeCalculation.savingsProgress.totalSudahDibayar)}</p>
                          <p className="text-green-700"><strong>Selisih Setoran:</strong> {formatCurrency(upgradeCalculation.compensation.selisihSetoran)}</p>
                        </div>
                      </div>

                      {/* Compensation Details */}
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h5 className="font-semibold text-yellow-800 mb-2">💰 Detail Kompensasi</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-yellow-700"><strong>Kompensasi per Bulan:</strong> {formatCurrency(upgradeCalculation.compensation.kompensasiPerBulan)}</p>
                            <p className="text-yellow-700"><strong>Setoran Baru per Bulan:</strong> {formatCurrency(upgradeCalculation.compensation.setoranBaruPerBulan)}</p>
                          </div>
                          <div>
                            <p className="text-yellow-700"><strong>Total Kompensasi:</strong> {formatCurrency(upgradeCalculation.compensation.totalKompensasi)}</p>
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                          <strong>Rumus:</strong> {upgradeCalculation.compensation.formula}
                        </div>
                      </div>

                      {/* Execute Button */}
                      <button
                        onClick={executeUpgrade}
                        disabled={loading}
                        className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? "Memproses Upgrade..." : "Konfirmasi Upgrade"}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-700">❌ {upgradeCalculation.upgradeViability.reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setUpgradeCalculation(null);
                  setSelectedProduct("");
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductUpgradeCard;