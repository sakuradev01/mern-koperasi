import { useState } from "react";
import PropTypes from "prop-types";

const CreditTable = ({ credits, onPayInstallment, onEditCredit, onDeleteCredit }) => {
  const [expandedCredit, setExpandedCredit] = useState(null);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      Active: { bg: "bg-green-100", text: "text-green-800", label: "🟢 Aktif" },
      Completed: { bg: "bg-blue-100", text: "text-blue-800", label: "✅ Selesai" },
      Overdue: { bg: "bg-red-100", text: "text-red-800", label: "⚠️ Terlambat" },
      Cancelled: { bg: "bg-gray-100", text: "text-gray-800", label: "❌ Dibatalkan" },
    };

    const config = statusMap[status] || statusMap.Active;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getInstallmentStatusBadge = (status) => {
    const statusMap = {
      Pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "⏳ Pending" },
      Paid: { bg: "bg-green-100", text: "text-green-800", label: "✅ Lunas" },
      Overdue: { bg: "bg-red-100", text: "text-red-800", label: "⚠️ Terlambat" },
      Partial: { bg: "bg-orange-100", text: "text-orange-800", label: "🔄 Sebagian" },
    };

    const config = statusMap[status] || statusMap.Pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const toggleExpandCredit = (creditId) => {
    setExpandedCredit(expandedCredit === creditId ? null : creditId);
  };

  if (!credits || credits.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            💳 Data Kredit Pinjaman
          </h3>
          <p className="text-sm text-gray-600">Riwayat kredit dan angsuran</p>
        </div>
        <div className="px-6 py-12 text-center">
          <div className="text-gray-400">
            <span className="text-4xl mb-4 block">💳</span>
            <p className="text-lg font-medium">Belum Ada Data Kredit</p>
            <p className="text-sm">
              Siswa belum memiliki riwayat kredit pinjaman
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          💳 Data Kredit Pinjaman
        </h3>
        <p className="text-sm text-gray-600">Riwayat kredit dan angsuran</p>
      </div>

      <div className="divide-y divide-gray-200">
        {credits.map((credit, index) => (
          <div key={credit._id || index} className="p-6">
            {/* Credit Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900">
                    {credit.productName}
                  </h4>
                  {getStatusBadge(credit.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Jumlah Pinjaman:</span>
                    <p className="font-semibold text-blue-600">
                      {formatCurrency(credit.principalAmount)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Cicilan/Bulan:</span>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(credit.monthlyInstallment)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Tenor:</span>
                    <p className="font-semibold text-gray-900">
                      {credit.tenor} bulan
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Progress:</span>
                    <p className="font-semibold text-purple-600">
                      {credit.paymentProgress || 0}%
                    </p>
                  </div>
                </div>

                {credit.productLink && (
                  <div className="mt-2">
                    <a
                      href={credit.productLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      🔗 Lihat Produk
                    </a>
                  </div>
                )}
              </div>

              <div className="ml-4 flex items-center gap-2">
                <button
                  onClick={() => onEditCredit(credit)}
                  className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
                  title="Edit Kredit"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => onDeleteCredit(credit._id, credit.productName)}
                  className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  title="Hapus Kredit"
                >
                  🗑️ Hapus
                </button>
                <button
                  onClick={() => toggleExpandCredit(credit._id)}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  {expandedCredit === credit._id ? "🔼 Tutup" : "🔽 Detail"}
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Terbayar: {formatCurrency(credit.totalPaid || 0)}</span>
                <span>Total: {formatCurrency(credit.totalAmount)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(credit.paymentProgress || 0, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Expanded Installment Details */}
            {expandedCredit === credit._id && (
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3">
                  📋 Jadwal Angsuran
                </h5>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2 px-3">Periode</th>
                        <th className="text-left py-2 px-3">Jatuh Tempo</th>
                        <th className="text-right py-2 px-3">Cicilan</th>
                        <th className="text-right py-2 px-3">Terbayar</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-left py-2 px-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {credit.installments?.map((installment) => (
                        <tr key={installment.period} className="border-b border-gray-200">
                          <td className="py-2 px-3">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                              {installment.period}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {formatDate(installment.dueDate)}
                          </td>
                          <td className="text-right py-2 px-3 font-medium">
                            {formatCurrency(installment.amount)}
                          </td>
                          <td className="text-right py-2 px-3 font-medium text-green-600">
                            {formatCurrency(installment.paidAmount || 0)}
                          </td>
                          <td className="py-2 px-3">
                            {getInstallmentStatusBadge(installment.status)}
                          </td>
                          <td className="py-2 px-3">
                            {installment.status !== "Paid" && (
                              <button
                                onClick={() => onPayInstallment(credit._id, installment.period)}
                                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                              >
                                💰 Bayar
                              </button>
                            )}
                            {installment.proofFile && (
                              <button className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors">
                                👁️ Bukti
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-white rounded p-3">
                    <span className="text-gray-500">Total Terbayar:</span>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(credit.totalPaid || 0)}
                    </p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <span className="text-gray-500">Sisa Tagihan:</span>
                    <p className="font-semibold text-red-600">
                      {formatCurrency(credit.remainingAmount || credit.totalAmount)}
                    </p>
                  </div>
                  <div className="bg-white rounded p-3">
                    <span className="text-gray-500">Bunga:</span>
                    <p className="font-semibold text-gray-600">
                      {credit.interestRate}% / tahun
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

CreditTable.propTypes = {
  credits: PropTypes.array.isRequired,
  onPayInstallment: PropTypes.func.isRequired,
  onEditCredit: PropTypes.func.isRequired,
  onDeleteCredit: PropTypes.func.isRequired,
};

export default CreditTable;