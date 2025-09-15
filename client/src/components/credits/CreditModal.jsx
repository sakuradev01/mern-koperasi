import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import PropTypes from "prop-types";
import api from "../../api/index.jsx";

const CreditModal = ({ isOpen, onClose, onSuccess, memberData, creditData }) => {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [installmentCalculation, setInstallmentCalculation] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      tenor: 12,
      interestRate: 0,
    },
  });

  const principalAmount = watch("principalAmount");
  const interestRate = watch("interestRate");
  const tenor = watch("tenor");

  // Calculate installment when values change
  useEffect(() => {
    const calculateInstallment = async () => {
      if (principalAmount && tenor && principalAmount > 0 && tenor > 0) {
        try {
          const response = await api.post("/api/credits/calculate", {
            principalAmount: parseFloat(principalAmount),
            interestRate: parseFloat(interestRate) || 0,
            tenor: parseInt(tenor),
          });
          
          if (response.data.success) {
            setInstallmentCalculation(response.data.data);
          }
        } catch (error) {
          console.error("Error calculating installment:", error);
        }
      } else {
        setInstallmentCalculation(null);
      }
    };

    const timeoutId = setTimeout(calculateInstallment, 500);
    return () => clearTimeout(timeoutId);
  }, [principalAmount, interestRate, tenor]);

  useEffect(() => {
    if (isOpen) {
      setSubmitError("");
      setInstallmentCalculation(null);
      
      if (creditData) {
        // Edit mode - populate form with existing data
        reset({
          productName: creditData.productName || "",
          principalAmount: creditData.principalAmount || "",
          interestRate: creditData.interestRate || 0,
          tenor: creditData.tenor || 12,
          productLink: creditData.productLink || "",
          description: creditData.description || "",
        });
      } else {
        // Create mode - default values
        reset({
          tenor: 12,
          interestRate: 0,
        });
      }
    }
  }, [isOpen, creditData, reset]);

  const onSubmit = async (data) => {
    setLoading(true);
    setSubmitError("");

    try {
      const submitData = {
        memberUuid: memberData.uuid,
        productName: data.productName,
        principalAmount: parseFloat(data.principalAmount),
        interestRate: parseFloat(data.interestRate) || 0,
        tenor: parseInt(data.tenor),
        productLink: data.productLink || "",
        description: data.description || "",
      };

      let response;
      if (creditData) {
        // Edit mode - update existing credit
        response = await api.patch(`/api/credits/${creditData._id}`, submitData);
      } else {
        // Create mode - create new credit
        response = await api.post("/api/credits", submitData);
      }

      if (response.data.success) {
        onSuccess();
        onClose();
        reset();
      }
    } catch (error) {
      console.error(`${creditData ? "Update" : "Create"} credit error:`, error);
      setSubmitError(
        error.response?.data?.message || `Gagal ${creditData ? "mengupdate" : "menambahkan"} kredit`
      );
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-xl font-semibold text-gray-900">
            {creditData ? "✏️ Edit Kredit" : "💳 Tambah Kredit Baru"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-auto">
          {/* Member Info */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">📋 Informasi Member</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Nama:</span>
                <span className="ml-2 font-medium">{memberData?.name}</span>
              </div>
              <div>
                <span className="text-gray-600">UUID:</span>
                <span className="ml-2 font-mono text-blue-600">{memberData?.uuid}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🏷️ Nama Produk Kredit *
                  </label>
                  <input
                    type="text"
                    {...register("productName", {
                      required: "Nama produk wajib diisi",
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contoh: Kredit Laptop ASUS, Kredit Motor Honda, dll"
                  />
                  {errors.productName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.productName.message}
                    </p>
                  )}
                </div>

                {/* Principal Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💰 Jumlah Pinjaman *
                  </label>
                  <input
                    type="number"
                    {...register("principalAmount", {
                      required: "Jumlah pinjaman wajib diisi",
                      min: { value: 1, message: "Jumlah minimal Rp 1" },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="5000000"
                  />
                  {errors.principalAmount && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.principalAmount.message}
                    </p>
                  )}
                </div>

                {/* Interest Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📊 Bunga per Tahun (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register("interestRate")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="12.5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Menggunakan sistem <strong>bunga flat</strong> (bunga tetap dari pokok pinjaman)
                  </p>
                  <p className="text-xs text-gray-400">
                    Kosongkan atau isi 0 jika tanpa bunga
                  </p>
                </div>

                {/* Tenor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 Tenor (Bulan) *
                  </label>
                  <input
                    type="number"
                    {...register("tenor", {
                      required: "Tenor wajib diisi",
                      min: { value: 1, message: "Tenor minimal 1 bulan" },
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="12"
                  />
                  {errors.tenor && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.tenor.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {/* Product Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🔗 Link Produk (Opsional)
                  </label>
                  <input
                    type="url"
                    {...register("productLink")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://tokopedia.com/product/laptop-asus"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📝 Keterangan
                  </label>
                  <textarea
                    {...register("description")}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Keterangan tambahan mengenai kredit ini..."
                  />
                </div>

                {/* Calculation Result */}
                {installmentCalculation && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h5 className="font-semibold text-green-800 mb-3">
                      🧮 Hasil Kalkulasi (Bunga Flat)
                    </h5>
                    
                    {/* Detailed Calculation Steps */}
                    <div className="bg-white rounded-lg p-3 mb-3 text-sm border border-green-200">
                      <h6 className="font-semibold text-gray-800 mb-2">📋 Rincian Perhitungan:</h6>
                      <div className="space-y-1 text-xs font-mono text-gray-700">
                        <div>
                          <strong>Pokok per bulan</strong> = {formatCurrency(installmentCalculation.principalAmount)} ÷ {installmentCalculation.tenor} = <span className="text-blue-600 font-semibold">{formatCurrency(installmentCalculation.principalAmount / installmentCalculation.tenor)}</span>
                        </div>
                        
                        {installmentCalculation.interestRate > 0 && (
                          <div>
                            <strong>Bunga per bulan</strong> = ({formatCurrency(installmentCalculation.principalAmount)} × {installmentCalculation.interestRate}%) ÷ 12 = <span className="text-orange-600 font-semibold">{formatCurrency(installmentCalculation.totalInterest / installmentCalculation.tenor)}</span>
                          </div>
                        )}
                        
                        <div>
                          <strong>Cicilan per bulan</strong> = {formatCurrency(installmentCalculation.principalAmount / installmentCalculation.tenor)} {installmentCalculation.interestRate > 0 ? `+ ${formatCurrency(installmentCalculation.totalInterest / installmentCalculation.tenor)}` : ''} = <span className="text-green-600 font-semibold">{formatCurrency(installmentCalculation.monthlyInstallment)}</span>
                        </div>
                        
                        <div>
                          <strong>Total bayar</strong> = {formatCurrency(installmentCalculation.monthlyInstallment)} × {installmentCalculation.tenor} = <span className="text-purple-600 font-semibold">{formatCurrency(installmentCalculation.totalAmount)}</span>
                        </div>
                        
                        {installmentCalculation.interestRate > 0 && (
                          <div>
                            <strong>Total bunga</strong> = <span className="text-red-600 font-semibold">{formatCurrency(installmentCalculation.totalInterest)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary Results */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">💰 Cicilan per Bulan:</span>
                        <span className="font-semibold text-green-700">
                          {formatCurrency(installmentCalculation.monthlyInstallment)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">💳 Total Pembayaran:</span>
                        <span className="font-semibold text-purple-700">
                          {formatCurrency(installmentCalculation.totalAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">📊 Total Bunga:</span>
                        <span className="font-semibold text-red-600">
                          {formatCurrency(installmentCalculation.totalInterest)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">⏱️ Tenor:</span>
                        <span className="font-semibold text-gray-700">
                          {installmentCalculation.tenor} bulan
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Installment Schedule Preview */}
            {installmentCalculation && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="font-semibold text-gray-800 mb-3">
                  📋 Preview Jadwal Angsuran Lengkap
                </h5>
                <div className="overflow-x-auto">
                  <div className="max-h-60 overflow-y-auto border border-gray-300 rounded">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2 px-3">Periode</th>
                          <th className="text-right py-2 px-3">Cicilan</th>
                          <th className="text-right py-2 px-3">Pokok</th>
                          <th className="text-right py-2 px-3">Bunga</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {installmentCalculation.schedule.map((item) => (
                          <tr key={item.period} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium">{item.period}</td>
                            <td className="text-right py-2 px-3 font-medium text-blue-600">
                              {formatCurrency(item.amount)}
                            </td>
                            <td className="text-right py-2 px-3">
                              {formatCurrency(item.principal)}
                            </td>
                            <td className="text-right py-2 px-3">
                              {formatCurrency(item.interest)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    💡 Total {installmentCalculation.schedule.length} periode angsuran
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">{submitError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={loading || !installmentCalculation}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading 
                  ? "Menyimpan..." 
                  : creditData 
                    ? "Update Kredit" 
                    : "Tambah Kredit"
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

CreditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  memberData: PropTypes.object,
  creditData: PropTypes.object,
};

export default CreditModal;