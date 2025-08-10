import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";

const AuthLayout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Always redirect to login for new users or private browsing
    navigate("/login");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
