import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/index.jsx";

const Members = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [products, setProducts] = useState([]);
  const [upgradeStatuses, setUpgradeStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // States untuk UUID dropdown
  const [availableUuids, setAvailableUuids] = useState([]);
  const [filteredUuids, setFilteredUuids] = useState([]);
  const [showUuidDropdown, setShowUuidDropdown] = useState(false);
  const [loadingUuids, setLoadingUuids] = useState(false);
  
  // Filter dan sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    uuid: "",
    name: "",
    gender: "L",
    phone: "",
    city: "",
    completeAddress: "",
    username: "",
    password: "",
    productId: "",
  });

  useEffect(() => {
    fetchMembers();
    fetchProducts();
    fetchAvailableUuids();
  }, []);

  // Fetch UUIDs dari API student
  const fetchAvailableUuids = async () => {
    setLoadingUuids(true);
    try {
      const response = await fetch('https://student.samit.co.id/api/students/uuids');
      const data = await response.json();
      if (data.success) {
        setAvailableUuids(data.data);
        setFilteredUuids(data.data);
      }
    } catch (error) {
      console.error('Error fetching UUIDs:', error);
    } finally {
      setLoadingUuids(false);
    }
  };

  // Fetch student info berdasarkan UUID
  const fetchStudentInfo = async (uuid) => {
    try {
      const response = await fetch(`https://student.samit.co.id/api/students/info/${uuid}`);
      const data = await response.json();
      if (data.success) {
        const studentData = data.data;
        
        // Auto-fill form dengan data student
        setFormData(prev => ({
          ...prev,
          uuid: uuid,
          name: studentData.name,
          phone: studentData.phone,
          city: studentData.birth_place, // birth_place -> city
          gender: studentData.gender === 'l' ? 'L' : 'P', // Convert gender format
          completeAddress: '-', // Default alamat
          username: generateUsername(studentData.name) // Generate username dari nama
        }));
      }
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  };

  // Generate username dari nama (lowercase, replace spaces with dots)
  const generateUsername = (name) => {
    return name.toLowerCase()
      .replace(/\s+/g, '.') // Replace spaces with dots
      .replace(/[^a-z0-9.]/g, ''); // Remove special characters except dots
  };

  // Handle UUID input change dengan filtering
  const handleUuidChange = (value) => {
    setFormData({ ...formData, uuid: value });
    
    // Filter UUIDs berdasarkan input
    const filtered = availableUuids.filter(uuid => 
      uuid.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredUuids(filtered);
    setShowUuidDropdown(value.length > 0 && filtered.length > 0);
  };

  // Handle UUID selection dari dropdown
  const handleUuidSelect = (selectedUuid) => {
    setShowUuidDropdown(false);
    fetchStudentInfo(selectedUuid);
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get("/api/products");
      if (response.data.success) {
        setProducts(response.data.data.filter(product => product.isActive));
      }
    } catch (err) {
      console.error("Products fetch error:", err);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await api.get("/api/members");
      if (response.data.success) {
        const membersData = response.data.data;
        setMembers(membersData);
        
        // Fetch upgrade status untuk setiap member
        await fetchUpgradeStatuses(membersData);
      }
    } catch (err) {
      setError("Gagal memuat data anggota");
      console.error("Members fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpgradeStatuses = async (membersData) => {
    const statuses = {};
    
    // Fetch upgrade status untuk setiap member secara parallel
    const promises = membersData.map(async (member) => {
      try {
        const response = await api.get(`/api/product-upgrade/history/${member.uuid}`);
        if (response.data.success && response.data.data.upgradeHistory) {
          const history = response.data.data.upgradeHistory;
          const activeUpgrade = response.data.data.activeUpgrade;
          
          statuses[member.uuid] = {
            hasUpgradeHistory: history.length > 0,
            upgradeCount: history.length,
            hasActiveUpgrade: !!activeUpgrade,
            latestUpgrade: history.length > 0 ? history[0] : null
          };
        } else {
          statuses[member.uuid] = {
            hasUpgradeHistory: false,
            upgradeCount: 0,
            hasActiveUpgrade: false,
            latestUpgrade: null
          };
        }
      } catch (error) {
        // Jika error, anggap tidak ada upgrade
        statuses[member.uuid] = {
          hasUpgradeHistory: false,
          upgradeCount: 0,
          hasActiveUpgrade: false,
          latestUpgrade: null
        };
      }
    });

    await Promise.all(promises);
    setUpgradeStatuses(statuses);
  };

  // Fungsi untuk sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset ke halaman pertama
  };

  // Fungsi untuk filtering dan sorting data
  const getFilteredAndSortedMembers = () => {
    let filteredMembers = members.filter((member) => {
      // Filter berdasarkan search term (nama)
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter berdasarkan gender
      const matchesGender = !genderFilter || member.gender === genderFilter;
      
      // Filter berdasarkan produk
      const matchesProduct = !productFilter || member.productId === productFilter;
      
      return matchesSearch && matchesGender && matchesProduct;
    });

    // Sorting
    if (sortField) {
      filteredMembers.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortField) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "gender":
            aValue = a.gender;
            bValue = b.gender;
            break;
          case "product":
            aValue = a.product?.title || "";
            bValue = b.product?.title || "";
            break;
          case "totalSavings":
            aValue = a.totalSavings || 0;
            bValue = b.totalSavings || 0;
            break;
          case "city":
            aValue = a.city || "";
            bValue = b.city || "";
            break;
          default:
            return 0;
        }
        
        if (sortDirection === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    return filteredMembers;
  };

  // Pagination
  const filteredMembers = getFilteredAndSortedMembers();
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + itemsPerPage);

  // Reset halaman saat filter berubah
  const handleFilterChange = (filterType, value) => {
    setCurrentPage(1);
    switch (filterType) {
      case "search":
        setSearchTerm(value);
        break;
      case "gender":
        setGenderFilter(value);
        break;
      case "product":
        setProductFilter(value);
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) {
        const response = await api.put(
          `/api/members/${editingMember.uuid}`,
          formData
        );
        if (response.data.success) {
          fetchMembers();
          setShowModal(false);
          setEditingMember(null);
        }
      } else {
        // Ensure password is provided for new member
        const memberData = {
          ...formData,
          password: formData.password || "default123",
        };
        const response = await api.post("/api/members", memberData);
        if (response.data.success) {
          fetchMembers();
          setShowModal(false);
          setShowUuidDropdown(false);
          setFormData({
            uuid: "",
            name: "",
            gender: "L",
            phone: "",
            city: "",
            completeAddress: "",
            username: "",
            password: "",
            productId: "",
          });
        }
      }
    } catch (err) {
      setError("Gagal menyimpan data");
      console.error("Submit error:", err);
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      uuid: member.uuid,
      name: member.name,
      gender: member.gender,
      phone: member.phone || "",
      city: member.city || "",
      completeAddress: member.completeAddress || "",
      username: member.user.username,
      password: "",
      productId: member.productId || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (uuid) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus anggota ini?")) {
      try {
        const response = await api.delete(`/api/members/${uuid}`);
        if (response.data.success) {
          fetchMembers();
        }
      } catch (err) {
        setError("Gagal menghapus data");
        console.error("Delete error:", err);
      }
    }
  };

  const handleAddNew = () => {
    setEditingMember(null);
    setFormData({
      uuid: "",
      name: "",
      gender: "L",
      phone: "",
      city: "",
      completeAddress: "",
      username: "",
      password: "",
      productId: "",
    });
    setShowModal(true);
    setShowUuidDropdown(false);
  };

  // Close dropdown ketika klik di luar
  const handleClickOutside = (e) => {
    if (!e.target.closest('.uuid-dropdown-container')) {
      setShowUuidDropdown(false);
    }
  };

  // Add event listener untuk close dropdown
  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">🌸 Memuat data anggota...</p>
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
          <p className="text-sm sm:text-base text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          🌸 Manajemen Anggota
        </h1>
        <button
          onClick={handleAddNew}
          className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all duration-200 font-medium text-sm sm:text-base shadow-lg hover:shadow-xl"
        >
          ➕ Tambah Anggota
        </button>
      </div>

      {/* Filter dan Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔍 Cari Nama
            </label>
            <input
              type="text"
              placeholder="Ketik nama anggota..."
              value={searchTerm}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          {/* Filter Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              👤 Filter Gender
            </label>
            <select
              value={genderFilter}
              onChange={(e) => handleFilterChange("gender", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">Semua Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          {/* Filter Produk */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📦 Filter Produk
            </label>
            <select
              value={productFilter}
              onChange={(e) => handleFilterChange("product", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">Semua Produk</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.title}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filter */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm("");
                setGenderFilter("");
                setProductFilter("");
                setSortField("");
                setSortDirection("asc");
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              🔄 Reset Filter
            </button>
          </div>
        </div>

        {/* Info hasil filter */}
        <div className="mt-4 text-sm text-gray-600">
          Menampilkan {paginatedMembers.length} dari {filteredMembers.length} anggota
          {filteredMembers.length !== members.length && ` (difilter dari ${members.length} total)`}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-pink-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-pink-50 to-rose-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                UUID
              </th>
              <th 
                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer hover:bg-pink-100 transition-colors"
                onClick={() => handleSort("name")}
              >
                <div className="flex items-center gap-1">
                  Nama
                  {sortField === "name" && (
                    <span className="text-pink-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
              <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                Username
              </th>
              <th 
                className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer hover:bg-pink-100 transition-colors"
                onClick={() => handleSort("gender")}
              >
                <div className="flex items-center gap-1">
                  Gender
                  {sortField === "gender" && (
                    <span className="text-pink-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
              <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                Phone
              </th>
              <th 
                className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer hover:bg-pink-100 transition-colors"
                onClick={() => handleSort("city")}
              >
                <div className="flex items-center gap-1">
                  City
                  {sortField === "city" && (
                    <span className="text-pink-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer hover:bg-pink-100 transition-colors"
                onClick={() => handleSort("product")}
              >
                <div className="flex items-center gap-1">
                  Produk
                  {sortField === "product" && (
                    <span className="text-pink-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider cursor-pointer hover:bg-pink-100 transition-colors"
                onClick={() => handleSort("totalSavings")}
              >
                <div className="flex items-center gap-1">
                  Total
                  {sortField === "totalSavings" && (
                    <span className="text-pink-600">
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedMembers.map((member) => (
              <tr key={member._id} className="hover:bg-pink-50 transition-colors">
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-mono">
                  {member.uuid}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/master/anggota/${member.uuid}`)}
                      className="text-pink-600 hover:text-pink-800 hover:underline font-medium transition-colors"
                    >
                      {member.name}
                    </button>
                    
                    {/* Indikator Upgrade */}
                    {upgradeStatuses[member.uuid]?.hasUpgradeHistory && (
                      <div className="flex items-center gap-1">
                        {upgradeStatuses[member.uuid]?.hasActiveUpgrade ? (
                          <span 
                            className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium"
                            title={`Upgrade aktif - ${upgradeStatuses[member.uuid]?.upgradeCount} kali upgrade`}
                          >
                            🚀 Aktif
                          </span>
                        ) : (
                          <span 
                            className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium"
                            title={`Pernah upgrade ${upgradeStatuses[member.uuid]?.upgradeCount} kali`}
                          >
                            📈 {upgradeStatuses[member.uuid]?.upgradeCount}x
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                  {member.user.username}
                </td>
                <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded-full text-xs ${member.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                    {member.gender === 'L' ? '👨 L' : '👩 P'}
                  </span>
                </td>
                <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                  {member.phone || "-"}
                </td>
                <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                  {member.city || "-"}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                  {member.product ? (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                      🌸 {member.product.title}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 font-semibold">
                  <span className={`${member.totalSavings > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    {member.totalSavings ? `Rp ${member.totalSavings.toLocaleString('id-ID')}` : "Rp 0"}
                  </span>
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                  <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-2">
                    <button
                      onClick={() => handleEdit(member)}
                      className="text-pink-600 hover:text-pink-900 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(member.uuid)}
                      className="text-red-600 hover:text-red-900 transition-colors"
                    >
                      🗑️ Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredMembers.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-pink-100 p-4 mt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-sm text-gray-600">
              Menampilkan {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredMembers.length)} dari {filteredMembers.length} data
              {totalPages > 1 && ` (Halaman ${currentPage} dari ${totalPages})`}
            </div>

            {totalPages > 1 && (
              <div className="flex space-x-1">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === 1 
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                      : "bg-pink-500 text-white hover:bg-pink-600"
                  }`}
                >
                  ← Prev
                </button>

                {/* Page Numbers with Ellipsis */}
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
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-pink-500 text-white hover:bg-pink-600"
                  }`}
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                {editingMember ? "Edit Anggota" : "Tambah Anggota"}
              </h3>
              <form onSubmit={handleSubmit}>
                {!editingMember && (
                  <div className="mb-4 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🔍 UUID Student (Pilih dari database)
                    </label>
                    <div className="relative uuid-dropdown-container">
                      <input
                        type="text"
                        value={formData.uuid}
                        onChange={(e) => handleUuidChange(e.target.value)}
                        onFocus={() => setShowUuidDropdown(filteredUuids.length > 0)}
                        placeholder="Ketik untuk mencari UUID... (contoh: JPTG0001)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 pr-10"
                      />
                      {loadingUuids && (
                        <div className="absolute right-3 top-2">
                          <div className="animate-spin h-4 w-4 border-2 border-pink-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      
                      {/* Dropdown UUID */}
                      {showUuidDropdown && filteredUuids.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredUuids.slice(0, 20).map((uuid) => (
                            <div
                              key={uuid}
                              onClick={() => handleUuidSelect(uuid)}
                              className="px-3 py-2 hover:bg-pink-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                            >
                              <span className="font-mono text-pink-600">{uuid}</span>
                            </div>
                          ))}
                          {filteredUuids.length > 20 && (
                            <div className="px-3 py-2 text-sm text-gray-500 bg-gray-50">
                              ... dan {filteredUuids.length - 20} UUID lainnya
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <small className="text-gray-500 mt-1 block">
                      💡 Data akan otomatis terisi setelah memilih UUID
                    </small>
                  </div>
                )}

                {editingMember && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UUID
                    </label>
                    <input
                      type="text"
                      value={formData.uuid}
                      onChange={(e) =>
                        setFormData({ ...formData, uuid: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                {editingMember && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password (kosongkan jika tidak ingin mengubah)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produk Simpanan (Opsional)
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) =>
                      setFormData({ ...formData, productId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Pilih Produk Simpanan</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.title} - Min. Rp {product.depositAmount.toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat Lengkap
                  </label>
                  <textarea
                    value={formData.completeAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        completeAddress: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setShowUuidDropdown(false);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingMember ? "Update" : "Simpan"}
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

export default Members;
