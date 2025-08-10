import { useEffect, useState } from "react";
import api from "../api/index.jsx";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    depositAmount: "",
    returnProfit: "",
    termDuration: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/v1/products");
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (err) {
      setError("Gagal memuat data produk");
      console.error("Products fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...formData,
        depositAmount: Number(formData.depositAmount),
        returnProfit: Number(formData.returnProfit),
        termDuration: Number(formData.termDuration),
      };

      if (editingProduct) {
        const productId = editingProduct._id;
        if (productId) {
          const response = await api.put(
            `/api/v1/products/${productId}`,
            productData
          );
          console.log("Update response:", response.data);
          if (response.data.success) {
            fetchProducts();
            setShowModal(false);
            setEditingProduct(null);
          } else {
            setError(response.data.message || "Gagal menyimpan data");
          }
        } else {
          setError("ID produk tidak valid");
          return;
        }
      } else {
        const response = await api.post("/api/v1/products", productData);
        console.log("Create response:", response.data);
        if (response.data.success) {
          fetchProducts();
          setShowModal(false);
          setFormData({
            title: "",
            depositAmount: "",
            returnProfit: "",
            termDuration: "",
            description: "",
            isActive: true,
          });
        } else {
          setError(response.data.message || "Gagal menyimpan data");
        }
      }
    } catch (err) {
      setError("Gagal menyimpan data");
      console.error("Submit error:", err);
    }
  };

  const handleEdit = (product) => {
    console.log("Edit product:", product);
    if (!product || !product._id) {
      setError("Data produk tidak valid");
      return;
    }
    setEditingProduct(product);
    setFormData({
      title: product.title || "",
      depositAmount: product.depositAmount || "",
      returnProfit: product.returnProfit || "",
      termDuration: product.termDuration || "",
      description: product.description || "",
      isActive: product.isActive !== undefined ? product.isActive : true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    console.log("Delete product ID:", id);
    if (!id) {
      setError("ID produk tidak valid");
      return;
    }

    if (window.confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      try {
        const response = await api.delete(`/api/v1/products/${id}`);
        console.log("Delete response:", response.data);
        if (response.data.success) {
          fetchProducts();
        } else {
          setError(response.data.message || "Gagal menghapus data");
        }
      } catch (err) {
        console.error("Delete error:", err);
        if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError("Gagal menghapus data");
        }
      }
    }
  };

  const handleToggleStatus = async (id) => {
    console.log("Toggle status product ID:", id);
    if (!id) {
      setError("ID produk tidak valid");
      return;
    }

    try {
      const response = await api.put(`/api/v1/products/${id}/toggle`);
      console.log("Toggle status response:", response.data);
      if (response.data.success) {
        fetchProducts();
      } else {
        setError(response.data.message || "Gagal mengubah status produk");
      }
    } catch (err) {
      console.error("Toggle status error:", err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError("Gagal mengubah status produk");
      }
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setFormData({
      title: "",
      depositAmount: "",
      returnProfit: "",
      termDuration: "",
      description: "",
      isActive: true,
    });
    setShowModal(true);
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600 text-xl">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Manajemen Produk Simpanan
        </h1>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tambah Produk
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Produk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Setoran Min
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Keuntungan
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Durasi (bulan)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product._id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product._id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatRupiah(product.depositAmount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.returnProfit}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.termDuration}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {product.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(product._id)}
                    className={`mr-3 ${
                      product.isActive
                        ? "text-yellow-600 hover:text-yellow-900"
                        : "text-green-600 hover:text-green-900"
                    }`}
                  >
                    {product.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    onClick={() => handleDelete(product._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {editingProduct ? "Edit Produk" : "Tambah Produk"}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Produk *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Setoran Minimum (Rp) *
                  </label>
                  <input
                    type="number"
                    value={formData.depositAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        depositAmount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Persentase Keuntungan (%) *
                  </label>
                  <input
                    type="number"
                    value={formData.returnProfit}
                    onChange={(e) =>
                      setFormData({ ...formData, returnProfit: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durasi Masa Berlaku (bulan) *
                  </label>
                  <input
                    type="number"
                    value={formData.termDuration}
                    onChange={(e) =>
                      setFormData({ ...formData, termDuration: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingProduct ? "Update" : "Simpan"}
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

export default Products;
