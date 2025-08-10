import { Outlet, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useEffect, useState } from "react";

const AuthLayout = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if auth state is loaded from localStorage
    const timer = setTimeout(() => {
      setIsCheckingAuth(false);
      if (!isAuthenticated) {
        navigate("/login");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
