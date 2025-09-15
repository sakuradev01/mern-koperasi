import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-toastify";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "../api/config";

const Credits = () => {
  const [searchParams] = useSearchParams();
  const [installments, setInstallments] = useState([]);
  const [credits, setCredits] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [prefillData, setPrefillData] = useState(null);
  const [formData, setFormData] = useState({
    memberUuid: "",
    creditId: "",
    period: 1,
    amount: "",
    paidDate: format(new Date(), "yyyy-MM-dd"),
    proofFile: null,
    notes: "",
    status: "Pending"
  });

  const [selectedCredit, setSelectedCredit] = useState(null);

  // Filter dan pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedProof, setSelectedProof] = useState(null);
  
  // Validation states
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch credit payments dari tabel creditPayments
  const fetchCreditPayments = async (page = 1, limit = 100) => {
    try {
      const token = localStorage.getItem("token");
      
      // Fetch credit payments
      const paymentsResponse = await axios.get(
        `${API_URL}/api/credit-payments?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Fetch credits untuk dropdown
      const creditsResponse = await axios.get(
        `${API_URL}/api/credits?page=1&limit=1000`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const creditPayments = paymentsResponse.data?.data?.creditPayments || [];
      const allCredits = creditsResponse.data?.data?.credits || [];
      
      // Format data untuk table
      const formattedPayments = creditPayments.map(payment => ({
        _id: payment._id,
        memberName: payment.memberId?.name || "N/A",
        memberUuid: payment.memberUuid,
        productName: payment.productName,
        period: payment.installmentPeriod,
        dueDate: null, // Credit payments don't have due date
        amount: payment.amount,
        paidAmount: payment.amount, // Same as amount since it's a payment
        status: payment.status === "Approved" ? "Paid" : payment.status === "Rejected" ? "Rejected" : "Pending",
        paidDate: payment.paymentDate,
        proofFile: payment.proofFile,
        notes: payment.description,
        creditId: payment.creditId,
        paymentId: payment._id
      }));
      
      setInstallments(formattedPayments);
      setCredits(allCredits);
    } catch {
      toast.error("Gagal memuat data pembayaran angsuran");
      setInstallments([]);
    }
  };

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data || response.data || [];
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat data anggota");
      setMembers([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCreditPayments(), fetchMembers()]);
      setLoading(false);

      // Check for prefill parameters
      const creditId = searchParams.get('creditId');
      const period = searchParams.get('period');

      if (creditId) {
        // Find the credit and member
        const targetCredit = credits.find(c => c._id === creditId);
        if (targetCredit) {
          const prefill = {
            creditId: creditId,
            period: parseInt(period) || 1,
            memberUuid: targetCredit.memberUuid
          };
          setPrefillData(prefill);

          // Auto-select member and credit
          setFormData(prev => ({
            ...prev,
            memberUuid: targetCredit.memberUuid
          }));

          // Auto-open modal with pre-filled data
          setTimeout(() => {
            setShowModal(true);
            // Auto-select credit after member is set
            setTimeout(() => {
              handleCreditChange(creditId);
              if (period) {
                setFormData(prev => ({ ...prev, period: parseInt(period) }));
              }
            }, 100);
          }, 500);
        }
      }
    };
    loadData();
  }, [searchParams]);

  // Handler untuk pilih member - tampilkan kredits member
  const handleMemberChange = async (memberUuid) => {
    if (!memberUuid) {
      setFormData(prev => ({ ...prev, memberUuid: "", creditId: "", amount: "", notes: "" }));
      setSelectedCredit(null);
      return;
    }

    const selectedMember = members.find(m => m.uuid === memberUuid);
    if (!selectedMember) return;

    // Reset form data
    setFormData(prev => ({
      ...prev,
      memberUuid: memberUuid,
      creditId: "",
      period: 1,
      amount: "",
      notes: ""
    }));
    setSelectedCredit(null);

    // If we have prefill data, set the credit after member is selected
    if (prefillData && prefillData.memberUuid === memberUuid) {
      setTimeout(() => {
        handleCreditChange(prefillData.creditId);
        if (prefillData.period) {
          setFormData(prev => ({ ...prev, period: prefillData.period }));
        }
      }, 100);
    }
  };

  // Handler untuk pilih kredit dari member
  const handleCreditChange = async (creditId) => {
    if (!creditId) {
      setFormData(prev => ({ ...prev, creditId: "", period: 1, amount: "", notes: "" }));
      setSelectedCredit(null);
      return;
    }

    const credit = credits.find(c => c._id === creditId);
    if (!credit) return;

    // Get existing payments for this credit
    try {
      const token = localStorage.getItem("token");
      const paymentsResponse = await axios.get(
        `${API_URL}/api/credits/${creditId}/payments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const payments = paymentsResponse.data?.data?.payments || [];

      // Find which periods have been paid (approved)
      const paidPeriods = payments
        .filter(payment => payment.status === "Approved")
        .map(payment => payment.installmentPeriod);

      // Find the next period that hasn't been paid yet
      let nextPeriod = 1;
      for (let i = 1; i <= credit.tenor; i++) {
        if (!paidPeriods.includes(i)) {
          nextPeriod = i;
          break;
        }
      }

      const installmentAmount = credit.monthlyInstallment || 0;

      setFormData(prev => ({
        ...prev,
        creditId: creditId,
        period: nextPeriod,
        amount: installmentAmount,
        notes: `Pembayaran angsuran periode ${nextPeriod} - ${credit.productName}`
      }));

      setSelectedCredit(credit);
    } catch (error) {
      console.error("Error fetching payments:", error);
      // Fallback to period 1 if there's an error
      setFormData(prev => ({
        ...prev,
        creditId: creditId,
        period: 1,
        amount: credit.monthlyInstallment || 0,
        notes: `Pembayaran angsuran periode 1 - ${credit.productName}`
      }));
      setSelectedCredit(credit);
    }
  };

  // Handler untuk submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const token = localStorage.getItem("token");
      
      // Prepare form data for submission
      const submitData = new FormData();
      submitData.append("memberUuid", formData.memberUuid);
      submitData.append("creditId", formData.creditId);
      submitData.append("installmentPeriod", formData.period);
      submitData.append("amount", formData.amount);
      submitData.append("paymentDate", formData.paidDate);
      submitData.append("description", formData.notes);
      submitData.append("status", formData.status);

      if (formData.proofFile) {
        submitData.append("proofFile", formData.proofFile);
      }

      // Submit to new credit-payments endpoint
      let response;
      if (editingId) {
        // Update existing payment
        response = await axios.patch(
          `${API_URL}/api/credit-payments/${editingId}`,
          submitData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data"
            },
          }
        );
      } else {
        // Create new payment
        response = await axios.post(
          `${API_URL}/api/credit-payments`,
          submitData,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data"
            },
          }
        );
      }

      if (response.data.success) {
        toast.success("Pembayaran angsuran berhasil ditambahkan!");
        setShowModal(false);
        setEditingId(null);
        setFormData({
          memberUuid: "",
          creditId: "",
          period: 1,
          amount: "",
          paidDate: format(new Date(), "yyyy-MM-dd"),
          proofFile: null,
          notes: "",
          status: "Pending"
        });
        setSelectedCredit(null);
        
        // Refresh data
        await fetchCreditPayments();
      }
    } catch (error) {
      console.error("Submit error:", error);
      const errorMessage = error.response?.data?.message || "Gagal menambahkan pembayaran angsuran";
      toast.error(errorMessage);
      
      // Set form errors if any
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler untuk approve payment
  const handleApprovePayment = async (paymentId) => {
    if (!window.confirm("Apakah Anda yakin ingin menyetujui pembayaran ini?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      console.log("Approving payment:", paymentId);

      // Update payment status to Approved
      const response = await axios.patch(
        `${API_URL}/api/credit-payments/${paymentId}`,
        { status: "Approved" },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Payment update response:", response.data);

      if (response.data.success) {
        const payment = response.data.data;
        console.log("Payment data:", payment);

        toast.success("Pembayaran berhasil disetujui!");

        // Refresh data
        await fetchCreditPayments();
      }
    } catch (error) {
      console.error("Approve payment error:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.message || error.message || "Gagal menyetujui pembayaran";
      toast.error(errorMessage);
    }
  };

  // Helper function untuk format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Hitung summary data
  const calculateSummary = () => {
    const totalPayments = installments.filter(s => s.status === "Paid").reduce((sum, s) => sum + s.amount, 0);
    const pendingPayments = installments.filter(s => s.status === "Pending").reduce((sum, s) => sum + s.amount, 0);
    const rejectedPayments = installments.filter(s => s.status === "Rejected").reduce((sum, s) => sum + s.amount, 0);

    return {
      totalPayments,
      pendingPayments,
      rejectedPayments,
      totalCredits: credits.length,
      activeCredits: credits.filter(c => c.status === "Active").length
    };
  };

  const summary = calculateSummary();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            💳 Data Angsuran Kredit
          </h1>
          <p className="text-gray-600">
            Kelola pembayaran angsuran kredit pinjaman anggota
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          ➕ Tambah Pembayaran Angsuran
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Pembayaran</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalPayments)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Menunggu Approve</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(summary.pendingPayments)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Ditolak</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.rejectedPayments)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Kredit Aktif</h3>
          <p className="text-2xl font-bold text-blue-600">
            {summary.activeCredits} / {summary.totalCredits}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Cari Nama Anggota / Produk
            </label>
            <input
              type="text"
              placeholder="Nama anggota atau produk kredit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="Paid">✅ Sudah Bayar</option>
              <option value="Pending">⏳ Menunggu Approve</option>
              <option value="Rejected">❌ Ditolak</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Filter Tanggal
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
                setDateFilter("");
              }}
              className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              🔄 Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anggota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produk Kredit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah Angsuran
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Terbayar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bukti
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <span className="text-2xl mb-2 block">⏳</span>
                      <p>Memuat data...</p>
                    </div>
                  </td>
                </tr>
              ) : installments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <span className="text-4xl mb-4 block">💳</span>
                      <p className="text-lg font-medium">Belum Ada Data Angsuran</p>
                      <p className="text-sm">
                        Buat kredit baru dari halaman detail member
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                installments.map((installment, index) => (
                  <tr key={`${installment.creditId}-${installment.period}` || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {installment.memberName || "N/A"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {installment.memberUuid || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {installment.productName || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Periode {installment.period}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {installment.paidDate
                        ? format(new Date(installment.paidDate), "dd/MM/yyyy", { locale: id })
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(installment.amount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        minimumFractionDigits: 0,
                      }).format(installment.paidAmount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          installment.status === "Paid"
                            ? "bg-green-100 text-green-800"
                            : installment.status === "Partial"
                            ? "bg-orange-100 text-orange-800"
                            : installment.status === "Overdue"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {installment.status === "Paid"
                          ? "✅ Lunas"
                          : installment.status === "Partial"
                          ? "🔄 Sebagian"
                          : installment.status === "Overdue"
                          ? "⚠️ Terlambat"
                          : "⏳ Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {installment.proofFile ? (
                        <button
                          onClick={() => {
                            setSelectedProof(`${API_URL}/uploads/savings/${installment.proofFile}`);
                            setShowProofModal(true);
                          }}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                        >
                          📎 Ada Bukti
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          📄 Tidak Ada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(installment.paymentId || installment._id);
                            setFormData({
                              memberUuid: installment.memberUuid,
                              creditId: installment.creditId,
                              period: installment.period,
                              amount: installment.amount,
                              paidDate: installment.paidDate
                                ? format(new Date(installment.paidDate), "yyyy-MM-dd")
                                : format(new Date(), "yyyy-MM-dd"),
                              proofFile: null,
                              notes: installment.notes || `Pembayaran angsuran periode ${installment.period}`,
                              status: installment.status === "Paid" ? "Approved" : "Pending"
                            });
                            setShowModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          ✏️ Edit
                        </button>
                        {installment.status === "Pending" && (
                          <button
                            onClick={() => handleApprovePayment(installment.paymentId || installment._id)}
                            className="text-green-600 hover:text-green-900"
                          >
                            ✅ Approve
                          </button>
                        )}
                        {installment.proofFile && (
                          <button
                            onClick={() => {
                              setSelectedProof(`${API_URL}/uploads/savings/${installment.proofFile}`);
                              setShowProofModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            👁️ Bukti
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Bukti Pembayaran */}
      {showProofModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                📎 Bukti Pembayaran
              </h3>
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setSelectedProof(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {selectedProof && (
                <div className="text-center">
                  {selectedProof.toLowerCase().includes('.pdf') ? (
                    <iframe
                      src={selectedProof}
                      className="w-full h-96 border border-gray-300 rounded"
                      title="Bukti Pembayaran PDF"
                    />
                  ) : (
                    <img
                      src={selectedProof}
                      alt="Bukti Pembayaran"
                      className="max-w-full max-h-96 mx-auto rounded border border-gray-300"
                    />
                  )}
                  <div className="mt-4">
                    <a
                      href={selectedProof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      📥 Download File
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <h3 className="text-xl font-semibold text-gray-900">
                💰 Bayar Angsuran Kredit
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setFormData({
                    memberUuid: "",
                    creditId: "",
                    period: 1,
                    amount: "",
                    paidDate: format(new Date(), "yyyy-MM-dd"),
                    proofFile: null,
                    notes: "",
                    status: "Pending"
                  });
                  setSelectedCredit(null);
                  setErrors({});
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[calc(90vh-140px)] overflow-auto">
              {/* Credit Info */}
              {selectedCredit && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-3">📋 Informasi Kredit</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Anggota:</span>
                      <span className="ml-2 font-medium">{selectedCredit.memberId?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Produk:</span>
                      <span className="ml-2 font-medium">{selectedCredit.productName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Total Pinjaman:</span>
                      <span className="ml-2 font-medium text-blue-600">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(selectedCredit.principalAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cicilan/Bulan:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                        }).format(selectedCredit.monthlyInstallment)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    {/* Member Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        👤 Pilih Anggota *
                      </label>
                      <select
                        value={formData.memberUuid}
                        onChange={(e) => handleMemberChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Pilih Anggota</option>
                        {members.map((member) => (
                          <option key={member._id} value={member.uuid}>
                            {member.name} ({member.uuid})
                          </option>
                        ))}
                      </select>
                      {errors.memberUuid && (
                        <p className="text-red-500 text-sm mt-1">{errors.memberUuid}</p>
                      )}
                    </div>

                    {/* Credit Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🏷️ Pilih Produk Kredit *
                      </label>
                      <select
                        value={formData.creditId}
                        onChange={(e) => handleCreditChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={!formData.memberUuid}
                      >
                        <option value="">Pilih Produk Kredit</option>
                        {credits
                          .filter(credit => credit.memberUuid === formData.memberUuid && credit.status === "Active")
                          .map((credit) => (
                            <option key={credit._id} value={credit._id}>
                              {credit.productName} - {new Intl.NumberFormat("id-ID", {
                                style: "currency",
                                currency: "IDR",
                                minimumFractionDigits: 0,
                              }).format(credit.monthlyInstallment)}/bulan
                            </option>
                          ))}
                      </select>
                      {!formData.memberUuid && (
                        <p className="text-sm text-gray-500 mt-1">
                          Pilih anggota terlebih dahulu
                        </p>
                      )}
                    </div>

                    {/* Period Selection - Auto filled */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📅 Periode Angsuran
                      </label>
                      <input
                        type="number"
                        value={formData.period}
                        onChange={(e) => {
                          const period = parseInt(e.target.value);
                          setFormData(prev => ({ 
                            ...prev, 
                            period: period,
                            notes: `Pembayaran angsuran periode ${period} - ${selectedCredit?.productName || ''}`
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        min="1"
                        required
                      />
                      {selectedCredit && (
                        <p className="text-sm text-blue-600 mt-1">
                          💡 Auto-fill periode berikutnya yang belum dibayar
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        💰 Jumlah Pembayaran *
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Jumlah yang dibayar"
                        required
                      />
                      {errors.amount && (
                        <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                      )}
                    </div>

                    {/* Paid Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📅 Tanggal Pembayaran *
                      </label>
                      <input
                        type="date"
                        value={formData.paidDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, paidDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">{/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📊 Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Pending">⏳ Pending</option>
                        <option value="Approved">✅ Approved</option>
                        <option value="Rejected">❌ Rejected</option>
                      </select>
                    </div>

                    {/* Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📝 Catatan
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Catatan pembayaran..."
                      />
                      {selectedCredit && (
                        <p className="text-sm text-gray-500 mt-1">
                          Auto-generate: Pembayaran angsuran periode X - Produk
                        </p>
                      )}
                    </div>

                    {/* Proof File */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        📎 Bukti Pembayaran
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setFormData(prev => ({ ...prev, proofFile: e.target.files[0] }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        accept="image/*,application/pdf"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Format: JPG, PNG, PDF (Max 5MB)
                      </p>
                    </div>

                    {/* Info Kredit Display */}
                    {selectedCredit && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h6 className="text-sm font-semibold text-gray-800 mb-2">Info Kredit:</h6>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div>Produk: {selectedCredit.productName}</div>
                          <div>Total Pinjaman: {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(selectedCredit.principalAmount)}</div>
                          <div>Cicilan/Bulan: {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                          }).format(selectedCredit.monthlyInstallment)}</div>
                          <div>Tenor: {selectedCredit.tenor} bulan</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingId(null);
                      setFormData({
                        memberUuid: "",
                        creditId: "",
                        period: 1,
                        amount: "",
                        paidDate: format(new Date(), "yyyy-MM-dd"),
                        proofFile: null,
                        notes: "",
                        status: "Pending"
                      });
                      setSelectedCredit(null);
                      setErrors({});
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting 
                      ? "Menyimpan..." 
                      : editingId 
                        ? "Update Angsuran" 
                        : "Tambah Angsuran"
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Credits;