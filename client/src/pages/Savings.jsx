import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-toastify";
import { API_URL } from "../api/config";

const Savings = () => {
  const [savings, setSavings] = useState([]);
  const [members, setMembers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    installmentPeriod: 1,
    memberId: "",
    productId: "",
    amount: "",
    savingsDate: format(new Date(), "yyyy-MM-dd"),
    type: "Setoran",
    description: "Simpanan bulanan periode 1",
    proofFile: null,
  });

  const [lastPeriod, setLastPeriod] = useState(0);
  const [originalSelection, setOriginalSelection] = useState({
    memberId: "",
    productId: "",
  });

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

  // Fetch data
  const fetchSavings = async (page = 1, limit = 100) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/api/savings?page=${page}&limit=${limit}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data =
        response.data?.data?.savings ||
        response.data?.savings ||
        response.data?.data ||
        response.data ||
        [];
      setSavings(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat data simpanan");
      setSavings([]);
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

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat data produk");
      setProducts([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSavings(), fetchMembers(), fetchProducts()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-fill product when member is selected
  useEffect(() => {
    if (formData.memberId && !editingId) {
      // Only auto-fill when creating new savings (not editing)
      const selectedMember = members.find(
        (member) => member._id === formData.memberId
      );
      if (selectedMember && selectedMember.productId) {
        setFormData((prev) => ({
          ...prev,
          productId: selectedMember.productId,
        }));
      } else if (selectedMember && !selectedMember.productId) {
        setFormData((prev) => ({ ...prev, productId: "" }));
      }
    }
  }, [formData.memberId, members, editingId]);

  // Auto-fill amount when product is selected
  useEffect(() => {
    if (formData.productId && !editingId) {
      // Only auto-fill when creating new savings (not editing)
      const selectedProduct = products.find(
        (product) => product._id === formData.productId
      );
      if (selectedProduct && selectedProduct.depositAmount) {
        setFormData((prev) => ({
          ...prev,
          amount: selectedProduct.depositAmount,
        }));
      }
    }
  }, [formData.productId, products, editingId]);

  // Auto-update installmentPeriod when member/product/type change
  useEffect(() => {
    if (formData.memberId && formData.productId) {
      checkLastInstallmentPeriod(formData.memberId, formData.productId);
    } else {
      // Reset when either field empty
      setLastPeriod(0);
      setFormData((prev) => ({ ...prev, installmentPeriod: 1 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.memberId,
    formData.productId,
    formData.type,
    editingId,
    originalSelection.memberId,
    originalSelection.productId,
  ]);

  // Auto-update description when period changes (only for new entries)
  useEffect(() => {
    if (!editingId && formData.installmentPeriod) {
      const defaultDesc = `Simpanan bulanan periode ${formData.installmentPeriod}`;
      // Only update if user hasn't changed the description manually
      if (!formData.description || formData.description.startsWith("Simpanan bulanan periode")) {
        setFormData((prev) => ({ ...prev, description: defaultDesc }));
      }
    }
  }, [formData.installmentPeriod, editingId, formData.description]);

  // Check for duplicate period in real-time
  useEffect(() => {
    if (formData.memberId && formData.productId && formData.installmentPeriod) {
      const existingSaving = savings.find(
        (saving) =>
          saving.memberId?._id === formData.memberId &&
          saving.productId?._id === formData.productId &&
          saving.installmentPeriod === formData.installmentPeriod &&
          (!editingId || saving._id !== editingId) // Exclude current editing item
      );
      
      if (existingSaving) {
        setErrors(prev => ({
          ...prev,
          installmentPeriod: `Periode ${formData.installmentPeriod} sudah pernah ditambahkan untuk member dan produk ini`
        }));
      } else if (errors.installmentPeriod && errors.installmentPeriod.includes("sudah pernah")) {
        setErrors(prev => ({
          ...prev,
          installmentPeriod: ""
        }));
      }
    }
  }, [formData.memberId, formData.productId, formData.installmentPeriod, savings, editingId, errors.installmentPeriod]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Auto-calc next installment period based on last saved period
  const checkLastInstallmentPeriod = async (memberId, productId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/api/savings/check-period/${memberId}/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = response.data?.data || response.data || {};
      const last = data.lastPeriod ?? 0;
      const next = (last || 0) + 1;
      setLastPeriod(last);
      const selectionChanged =
        originalSelection.memberId !== formData.memberId ||
        originalSelection.productId !== formData.productId;
      if (!editingId || selectionChanged) {
        setFormData((prev) => ({ ...prev, installmentPeriod: next }));
      }
    } catch (error) {
      console.error("Error checking last period:", error);
      setLastPeriod(0);
      const selectionChanged =
        originalSelection.memberId !== formData.memberId ||
        originalSelection.productId !== formData.productId;
      if (!editingId || selectionChanged) {
        setFormData((prev) => ({ ...prev, installmentPeriod: 1 }));
      }
    }
  };

  // Frontend validation function
  const validateForm = () => {
    const newErrors = {};
    
    // Check required fields
    if (!formData.memberId) {
      newErrors.memberId = "Anggota harus dipilih";
    }
    
    if (!formData.productId) {
      newErrors.productId = "Produk simpanan harus dipilih";
    }
    
    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Jumlah harus lebih dari 0";
    }
    
    if (!formData.savingsDate) {
      newErrors.savingsDate = "Tanggal harus diisi";
    }
    
    // Check description (add some basic validation)
    if (formData.description && formData.description.length > 500) {
      console.log("🔥 DESCRIPTION LENGTH ERROR:", formData.description.length);
      newErrors.description = "Keterangan tidak boleh lebih dari 500 karakter";
    }
    
    // Check minimum amount against product
    if (formData.productId && formData.amount) {
      const selectedProduct = products.find(p => p._id === formData.productId);
      if (selectedProduct && formData.amount < selectedProduct.depositAmount) {
        newErrors.amount = `Jumlah minimal ${formatCurrency(selectedProduct.depositAmount)}`;
      }
    }
    
    // IMPORTANT: Handle file validation properly
    if (formData.type === "Setoran" && !editingId) {
      // For new setoran, check if file is required
      if (!formData.proofFile && !errors.proofFile) {
        // Only show "required" error if no existing file error (like size/format)
        newErrors.proofFile = "Bukti pembayaran wajib untuk setoran baru";
      } else if (errors.proofFile) {
        // Preserve existing file error (like file size/format error)
        newErrors.proofFile = errors.proofFile;
      }
    }
    
    return newErrors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // DON'T clear all errors - preserve existing file errors
    // setErrors({}); // ❌ This was clearing file size errors!
    
    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Mohon perbaiki kesalahan pada form");
      return;
    }
    
    setIsSubmitting(true);

    const formDataToSend = new FormData();

    // Kirim semua field untuk create dan update
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null && formData[key] !== undefined) {
        formDataToSend.append(key, formData[key]);
      }
    });

    try {
      const token = localStorage.getItem("token");

      if (editingId) {
        // Update existing savings
        await axios.put(`${API_URL}/api/savings/${editingId}`, formDataToSend, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Data simpanan berhasil diperbarui");
      } else {
        // Create new savings
        await axios.post(`${API_URL}/api/savings`, formDataToSend, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Data simpanan berhasil ditambahkan");
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchSavings();
    } catch (error) {
      console.error("❌ Error saving savings:", error);
      console.error("❌ Error response:", error.response?.data);

      // Extract specific validation errors from backend
      const errorMessage = error.response?.data?.message || "Gagal menyimpan data";
      
      // Handle specific backend validation errors
      const newErrors = {};
      if (errorMessage.includes("periode") && errorMessage.includes("sudah pernah")) {
        newErrors.installmentPeriod = "Periode ini sudah pernah ditambahkan untuk member dan produk ini";
      }
      
      if (errorMessage.includes("minimal")) {
        newErrors.amount = errorMessage;
      }
      
      if (errorMessage.includes("bukti") || errorMessage.includes("upload") || errorMessage.includes("file")) {
        newErrors.proofFile = errorMessage;
      }
      
      if (errorMessage.includes("keterangan") || errorMessage.includes("description")) {
        newErrors.description = errorMessage;
      }
      
      if (errorMessage.includes("anggota") || errorMessage.includes("member")) {
        newErrors.memberId = errorMessage;
      }
      
      if (errorMessage.includes("produk") || errorMessage.includes("product")) {
        newErrors.productId = errorMessage;
      }
      
      if (errorMessage.includes("tanggal") || errorMessage.includes("date")) {
        newErrors.savingsDate = errorMessage;
      }
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      }

      // Show detailed validation errors if available
      if (error.response?.status === 400) {
        toast.error(`❌ ${errorMessage}`);
      } else if (error.response?.status === 404) {
        toast.error(`❌ Data Tidak Ditemukan: ${errorMessage}`);
      } else if (error.response?.status === 500) {
        toast.error(`❌ Server Error: ${errorMessage}. Silakan coba lagi.`);
      } else {
        toast.error(`❌ Error: ${errorMessage}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      installmentPeriod: 1,
      memberId: "",
      productId: "",
      amount: "",
      savingsDate: format(new Date(), "yyyy-MM-dd"),
      type: "Setoran",
      description: "Simpanan bulanan periode 1", // Will auto-update based on period
      proofFile: null,
    });
    setLastPeriod(0);
    setOriginalSelection({ memberId: "", productId: "" });
    setErrors({});
    setIsSubmitting(false);
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    console.log("🔥 HANDLE FILE CHANGE TRIGGERED:", file ? file.name : "No file");
    console.log("🔥 File size:", file ? file.size : "N/A");
    
    // Clear any existing file errors first
    if (errors.proofFile) {
      setErrors(prev => ({ ...prev, proofFile: "" }));
    }
    
    if (file) {
      // Check file size (5MB = 5 * 1024 * 1024 bytes)
      if (file.size > 5 * 1024 * 1024) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const errorMessage = `File terlalu besar (${fileSizeMB}MB). Maksimal ukuran file adalah 5MB.`;
        
        console.log("🔥 FILE SIZE ERROR TRIGGERED:", errorMessage);
        setErrors(prev => ({ ...prev, proofFile: errorMessage }));
        toast.error(`❌ ${errorMessage}`);
        
        // Reset file input
        e.target.value = '';
        setFormData(prev => ({ ...prev, proofFile: null }));
        return;
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        const errorMessage = "Format file tidak didukung. Gunakan format JPG, PNG, GIF, atau PDF.";
        
        setErrors(prev => ({ ...prev, proofFile: errorMessage }));
        toast.error(`❌ ${errorMessage}`);
        
        // Reset file input
        e.target.value = '';
        setFormData(prev => ({ ...prev, proofFile: null }));
        return;
      }
      
      // File is valid
      setFormData(prev => ({ ...prev, proofFile: file }));
      toast.success(`✅ File "${file.name}" berhasil dipilih`);
    } else {
      setFormData(prev => ({ ...prev, proofFile: null }));
    }
  };

  // Handle approve
  const handleApprove = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menyetujui simpanan ini?")) {
      try {
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("status", "Approved");

        await axios.put(`${API_URL}/api/savings/${id}`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
        toast.success("Simpanan berhasil disetujui");
        fetchSavings();
      } catch (error) {
        toast.error(
          error.response?.data?.message || "Gagal menyetujui simpanan"
        );
      }
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_URL}/api/savings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Data berhasil dihapus");
        fetchSavings();
      } catch {
        toast.error("Gagal menghapus data");
      }
    }
  };

  // Handle edit
  const handleEdit = (saving) => {
    setEditingId(saving._id);
    setFormData({
      installmentPeriod: saving.installmentPeriod || 1,
      memberId: saving.memberId?._id || saving.memberId || "",
      productId: saving.productId?._id || saving.productId || "",
      amount: saving.amount || 0,
      savingsDate: format(new Date(saving.savingsDate), "yyyy-MM-dd"),
      type: saving.type || "Setoran",
      description: saving.description || "",
      proofFile: null,
    });
    setOriginalSelection({
      memberId: saving.memberId?._id || saving.memberId || "",
      productId: saving.productId?._id || saving.productId || "",
    });
    setLastPeriod(0);
    setShowModal(true);
  };

  // Get member name
  const getMemberName = (memberId) => {
    if (!memberId) return "Unknown";
    const member = members.find(
      (m) => m._id === memberId || m._id === memberId._id
    );
    if (member) return member.name;

    // Handle populated member object
    if (typeof memberId === "object" && memberId.name) {
      return memberId.name;
    }
    return "Unknown";
  };

  // Get product name
  const getProductName = (productId) => {
    if (!productId) return "Unknown";
    const product = products.find(
      (p) => p._id === productId || p._id === productId._id
    );
    if (product) return product.title;

    // Handle populated product object
    if (typeof productId === "object" && productId.title) {
      return productId.title;
    }
    return "Unknown";
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      Pending: "bg-yellow-100 text-yellow-800",
      Approved: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  // Filter dan search functions
  const filteredSavings = savings.filter((saving) => {
    const memberName = getMemberName(saving.memberId).toLowerCase();
    const matchesSearch = memberName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "" || saving.status === statusFilter;
    const matchesDate =
      dateFilter === "" ||
      format(new Date(saving.savingsDate), "yyyy-MM-dd") === dateFilter;

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSavings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSavings = filteredSavings.slice(startIndex, endIndex);

  // Reset page when filters change
  const handleFilterChange = (filterType, value) => {
    setCurrentPage(1);
    switch (filterType) {
      case "search":
        setSearchTerm(value);
        break;
      case "status":
        setStatusFilter(value);
        break;
      case "date":
        setDateFilter(value);
        break;
      default:
        break;
    }
  };

  // Handle show proof
  const handleShowProof = (proofFile, saving) => {
    if (proofFile && proofFile !== "0") {
      // Primary: direct /uploads (served by Nginx if configured)
      const primaryUrl = `${API_URL}/${proofFile}`;
      // Fallback: proxy via backend /api/uploads (always proxied by Nginx)
      const fallbackUrl = `${API_URL}/api/${proofFile}`;

      setSelectedProof({
        file: proofFile,
        saving: saving,
        url: primaryUrl,
        fallbackUrl,
      });
      setShowProofModal(true);
    }
  };

  // File type detection
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          🌸 Data Simpanan
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all duration-200 font-medium text-sm sm:text-base shadow-lg hover:shadow-xl"
        >
          ➕ Tambah Simpanan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Setoran</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(
              savings
                .filter((s) => s.type === "Setoran" && s.status === "Approved")
                .reduce((sum, s) => sum + s.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Penarikan</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(
              savings
                .filter(
                  (s) => s.type === "Penarikan" && s.status === "Approved"
                )
                .reduce((sum, s) => sum + s.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Saldo</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(
              savings
                .filter((s) => s.type === "Setoran" && s.status === "Approved")
                .reduce((sum, s) => sum + s.amount, 0) -
                savings
                  .filter(
                    (s) => s.type === "Penarikan" && s.status === "Approved"
                  )
                  .reduce((sum, s) => sum + s.amount, 0)
            )}
          </p>
        </div>
      </div>

      {/* Filter dan Search */}
      <div className="bg-white rounded-lg shadow border border-pink-100 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search by Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Cari Nama Anggota
            </label>
            <input
              type="text"
              placeholder="Masukkan nama anggota..."
              value={searchTerm}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Filter Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Filter by Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 Filter Tanggal
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => handleFilterChange("date", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
                setDateFilter("");
                setCurrentPage(1);
              }}
              className="w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              🔄 Reset Filter
            </button>
          </div>
        </div>

        {/* Results Info */}
        <div className="mt-4 text-sm text-gray-600">
          Menampilkan {currentSavings.length} dari {filteredSavings.length} data
          {filteredSavings.length !== savings.length &&
            ` (difilter dari ${savings.length} total)`}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-pink-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-pink-50 to-rose-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Anggota
                </th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Produk
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Bukti Pembayaran
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentSavings.length > 0 ? (
                currentSavings.map((saving) => (
                  <tr
                    key={saving._id}
                    className="hover:bg-pink-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(saving.savingsDate), "dd MMM yyyy", {
                        locale: id,
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getMemberName(saving.memberId)}
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getProductName(saving.productId)}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {saving.installmentPeriod || 1} bulan
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {formatCurrency(saving.amount)}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          saving.type === "Setoran"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {saving.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(
                          saving.status
                        )}`}
                      >
                        {saving.status}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {saving.proofFile && saving.proofFile !== "0" ? (
                        <button
                          onClick={() =>
                            handleShowProof(saving.proofFile, saving)
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                        {saving.status === "Pending" && (
                          <button
                            onClick={() => handleApprove(saving._id)}
                            className="text-green-600 hover:text-green-900 transition-colors"
                          >
                            ✅ Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(saving)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(saving._id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <span className="text-4xl mb-4 block">📊</span>
                      <p className="text-lg font-medium">Tidak Ada Data</p>
                      <p className="text-sm">
                        {searchTerm || statusFilter || dateFilter
                          ? "Tidak ada data yang sesuai dengan filter"
                          : "Belum ada data simpanan"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredSavings.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-pink-100 p-4 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-600">
              Menampilkan {startIndex + 1}-
              {Math.min(endIndex, filteredSavings.length)} dari{" "}
              {filteredSavings.length} data
              {totalPages > 1 && ` (Halaman ${currentPage} dari ${totalPages})`}
            </div>

            {totalPages > 1 && (
              <div className="flex space-x-1">
                {/* Previous Button */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-pink-500 text-white hover:bg-pink-600"
                  } transition-colors`}
                >
                  ← Prev
                </button>

                {/* First page */}
                {currentPage > 3 && totalPages > 5 && (
                  <>
                    <button
                      onClick={() => setCurrentPage(1)}
                      className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      1
                    </button>
                    {currentPage > 4 && (
                      <span className="px-2 py-2 text-gray-500">...</span>
                    )}
                  </>
                )}

                {/* Page Numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentPage === pageNum
                          ? "bg-pink-500 text-white shadow-md"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      } transition-colors`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Last page */}
                {currentPage < totalPages - 2 && totalPages > 5 && (
                  <>
                    {currentPage < totalPages - 3 && (
                      <span className="px-2 py-2 text-gray-500">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                {/* Next Button */}
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-pink-500 text-white hover:bg-pink-600"
                  } transition-colors`}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Popup untuk Bukti Pembayaran */}
      {showProofModal && selectedProof && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] w-full overflow-hidden">
            {/* Header Modal */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-rose-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  📄 Bukti Pembayaran
                </h3>
                <p className="text-sm text-gray-600">
                  {getMemberName(selectedProof.saving.memberId)} -
                  {formatCurrency(selectedProof.saving.amount)} -
                  {format(
                    new Date(selectedProof.saving.savingsDate),
                    "dd MMM yyyy",
                    { locale: id }
                  )}
                </p>
              </div>
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
                      alt={`Bukti pembayaran ${getMemberName(
                        selectedProof.saving.memberId
                      )}`}
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
                      title={`Bukti pembayaran ${getMemberName(
                        selectedProof.saving.memberId
                      )}`}
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {editingId ? "Edit Data Simpanan" : "Tambah Data Simpanan"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Anggota <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.memberId}
                    onChange={(e) => {
                      setFormData({ ...formData, memberId: e.target.value });
                      if (errors.memberId) {
                        setErrors({ ...errors, memberId: "" });
                      }
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                      errors.memberId
                        ? "border-red-300 focus:border-red-500 bg-red-50"
                        : "border-gray-300 focus:border-blue-500"
                    }`}
                    required
                  >
                    <option value="">Pilih Anggota</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.uuid} - {member.name}{" "}
                        {member.product
                          ? `(${member.product.title})`
                          : "(Belum pilih produk)"}
                      </option>
                    ))}
                  </select>
                  {errors.memberId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.memberId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Produk Simpanan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        productId: e.target.value,
                      });
                      if (errors.productId) {
                        setErrors({ ...errors, productId: "" });
                      }
                    }}
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                      errors.productId
                        ? "border-red-300 focus:border-red-500 bg-red-50"
                        : "border-gray-300 focus:border-blue-500"
                    }`}
                    required
                  >
                    <option value="">Pilih Produk</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.title} - Min:{" "}
                        {formatCurrency(product.depositAmount)}
                      </option>
                    ))}
                  </select>
                  {errors.productId && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.productId}
                    </p>
                  )}
                  {formData.memberId && !editingId && !errors.productId && (
                    <p className="mt-1 text-sm text-blue-600">
                      💡 Produk otomatis dipilih berdasarkan anggota yang
                      dipilih
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Periode Angsuran <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.installmentPeriod}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          installmentPeriod: parseInt(e.target.value),
                        });
                        if (errors.installmentPeriod) {
                          setErrors({ ...errors, installmentPeriod: "" });
                        }
                      }}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                        errors.installmentPeriod
                          ? "border-red-300 focus:border-red-500 bg-red-50"
                          : "border-gray-300 focus:border-blue-500"
                      }`}
                      required
                    />
                    {errors.installmentPeriod && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {errors.installmentPeriod}
                      </p>
                    )}
                    {lastPeriod > 0 && !errors.installmentPeriod && (
                      <p className="mt-1 text-sm text-gray-500">
                        Periode terakhir: {lastPeriod}, otomatis diisi periode
                        berikutnya
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Jumlah <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          amount: parseInt(e.target.value),
                        });
                        if (errors.amount) {
                          setErrors({ ...errors, amount: "" });
                        }
                      }}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                        errors.amount
                          ? "border-red-300 focus:border-red-500 bg-red-50"
                          : "border-gray-300 focus:border-blue-500"
                      }`}
                      required
                    />
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {errors.amount}
                      </p>
                    )}
                    {formData.productId && !editingId && !errors.amount && (
                      <p className="mt-1 text-sm text-green-600">
                        💰 Jumlah otomatis diisi sesuai harga paket produk
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tanggal <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.savingsDate}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          savingsDate: e.target.value,
                        });
                        if (errors.savingsDate) {
                          setErrors({ ...errors, savingsDate: "" });
                        }
                      }}
                      className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                        errors.savingsDate
                          ? "border-red-300 focus:border-red-500 bg-red-50"
                          : "border-gray-300 focus:border-blue-500"
                      }`}
                      required
                    />
                    {errors.savingsDate && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {errors.savingsDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tipe
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="Setoran">Setoran</option>
                      <option value="Penarikan">Penarikan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Keterangan
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => {
                      setFormData({ ...formData, description: e.target.value });
                      if (errors.description) {
                        setErrors({ ...errors, description: "" });
                      }
                    }}
                    rows="3"
                    maxLength="500"
                    className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 ${
                      errors.description
                        ? "border-red-300 focus:border-red-500 bg-red-50"
                        : "border-gray-300 focus:border-blue-500"
                    }`}
                    placeholder="Masukkan keterangan tambahan (opsional)"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.description}
                    </p>
                  )}
                  {!errors.description && (
                    <p className="mt-1 text-xs text-gray-500 text-right">
                      {formData.description.length}/500 karakter
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={formData.status || "Pending"}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bukti Pembayaran
                    {formData.type === "Setoran" && !editingId && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="file"
                    onChange={(e) => {
                      handleFileChange(e);
                      // Note: error clearing is already handled in handleFileChange
                    }}
                    accept="image/*,.pdf"
                    className={`mt-1 block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold hover:file:bg-blue-100 ${
                      errors.proofFile
                        ? "text-red-500 file:bg-red-50 file:text-red-700"
                        : "text-gray-500 file:bg-blue-50 file:text-blue-700"
                    }`}
                  />
                  {errors.proofFile && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {errors.proofFile}
                    </p>
                  )}
                  {formData.proofFile && !errors.proofFile && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700 flex items-center">
                        <span className="mr-1">✅</span>
                        File dipilih: <strong className="ml-1">{formData.proofFile.name}</strong>
                      </p>
                      <p className="text-xs text-green-600">
                        Ukuran: {(formData.proofFile.size / (1024 * 1024)).toFixed(2)}MB
                      </p>
                    </div>
                  )}
                  {!errors.proofFile && !formData.proofFile && (
                    <p className="mt-1 text-sm text-gray-500">
                      Maksimal 5MB, format gambar atau PDF
                      {formData.type === "Setoran" && !editingId && (
                        <span className="text-red-500 font-medium"> (Wajib untuk setoran baru)</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan"
                    )}
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

export default Savings;
