// File: client/src/pages/Home.jsx

import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const { status } = useSelector((state) => state.auth);

  useEffect(() => {
    // Jika pengguna sudah login, arahkan ke dashboard
    if (status) {
      navigate("/dashboard", { replace: true });
    } else {
      // Jika pengguna belum login, arahkan ke halaman login
      navigate("/login", { replace: true });
    }
  }, [status, navigate]);

  return <div className=" bg-gray-100 flex items-center justify-center"></div>;
};

export default Home;
