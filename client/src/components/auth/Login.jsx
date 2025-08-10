import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logIn } from "../../api/authApi";
import { login } from "../../store/authSlice";
import Input from "../../utils/Input.jsx";
import Button from "../../utils/Button.jsx";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await logIn(formData);

      if (response.success) {
        // Update Redux store
        dispatch(login(response.data.user));
        // Arahkan ke dashboard setelah Redux diperbarui
        navigate("/dashboard");
      } else {
        setError(response.message || "Login gagal");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Username atau password salah");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col sm:flex-row">
      {/* Site Info Section (Desktop) */}
      <div className="hidden sm:flex sm:w-1/2 bg-blue-600 justify-center items-center text-white p-10 transition-all duration-300 ease-in-out">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-blue-600 text-2xl font-bold">K</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Sistem Koperasi</h1>
          <p className="text-lg">Sistem Manajemen Koperasi Digital</p>
          <p className="text-sm mt-4 opacity-80">
            Kelola anggota, simpanan, dan transaksi dengan mudah
          </p>
        </div>
      </div>

      {/* Login Form Section */}
      <div className="flex sm:w-1/2 justify-center items-center bg-white p-10 transition-all duration-300 ease-in-out">
        <div className="max-w-md w-full">
          {/* Mobile Logo */}
          <div className="sm:hidden text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl font-bold">K</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Sistem Koperasi
            </h1>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Masuk ke Sistem
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Username
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Masukkan username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Masukkan password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? "Memproses..." : "Masuk"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600 text-center">
              <strong>Admin Default:</strong>
            </p>
            <p className="text-sm text-gray-600 text-center">
              Username: <code className="bg-gray-200 px-1 rounded">admin</code>
            </p>
            <p className="text-sm text-gray-600 text-center">
              Password:{" "}
              <code className="bg-gray-200 px-1 rounded">admin123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
