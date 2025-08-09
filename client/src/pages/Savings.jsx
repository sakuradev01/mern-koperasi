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
  const [formData, setFormData] = useState({
    installmentPeriod: 1,
    memberId: "",
    productId: "",
    amount: "",
    savingsDate: format(new Date(), "yyyy-MM-dd"),
    type: "Setoran",
    description: "",
    proofFile: null,
  });

  // Fetch data
  const fetchSavings = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/savings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data || response.data || [];
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== null) {
        formDataToSend.append(key, formData[key]);
      }
    });

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/savings`, formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Data simpanan berhasil ditambahkan");
      setShowModal(false);
      resetForm();
      fetchSavings();
    } catch (error) {
      toast.error(error.response?.data?.message || "Gagal menambahkan data");
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
      description: "",
      proofFile: null,
    });
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File tidak boleh lebih dari 5MB");
      return;
    }
    setFormData({ ...formData, proofFile: file });
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

  // Get member name
  const getMemberName = (memberId) => {
    const member = members.find((m) => m._id === memberId);
    return member ? member.name : "Unknown";
  };

  // Get product name
  const getProductName = (productId) => {
    const product = products.find((p) => p._id === productId);
    return product ? product.title : "Unknown";
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Data Simpanan</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Tambah Simpanan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Setoran</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(
              savings
                .filter((s) => s.type === "Setoran")
                .reduce((sum, s) => sum + s.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Penarikan</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(
              savings
                .filter((s) => s.type === "Penarikan")
                .reduce((sum, s) => sum + s.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Saldo</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(
              savings
                .filter((s) => s.type === "Setoran")
                .reduce((sum, s) => sum + s.amount, 0) -
                savings
                  .filter((s) => s.type === "Penarikan")
                  .reduce((sum, s) => sum + s.amount, 0)
            )}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Anggota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {savings.map((saving) => (
                <tr key={saving._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(saving.savingsDate), "dd MMM yyyy", {
                      locale: id,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getMemberName(saving.memberId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getProductName(saving.productId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(saving.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleDelete(saving._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Tambah Data Simpanan
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Anggota
                  </label>
                  <select
                    value={formData.memberId}
                    onChange={(e) =>
                      setFormData({ ...formData, memberId: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Anggota</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Produk Simpanan
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) =>
                      setFormData({ ...formData, productId: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Produk</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.title} -{" "}
                        {formatCurrency(product.depositAmount)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Periode Angsuran
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.installmentPeriod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          installmentPeriod: parseInt(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Jumlah
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount: parseInt(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={formData.savingsDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          savingsDate: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
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
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bukti Pembayaran
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Maksimal 5MB, format gambar
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Simpan
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
