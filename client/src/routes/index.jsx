import {
  createBrowserRouter,
  Route,
  createRoutesFromElements,
} from "react-router-dom";
import MainLayout from "../Layout/MainLayout";
import AuthLayout from "../Layout/AuthLayout";
import Home from "../pages/Home.jsx";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Members from "../pages/Members.jsx";
import Products from "../pages/Products.jsx";
import Savings from "../pages/Savings.jsx";
import PrivateRoute from "../utils/PrivateRoute.jsx";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      {/* Auth Layout - untuk halaman login tanpa sidebar/header */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Main Layout - untuk halaman dengan sidebar/header yang dilindungi */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="master/anggota" element={<Members />} />
          <Route path="master/produk" element={<Products />} />
          <Route path="simpanan" element={<Savings />} />
        </Route>
      </Route>
    </Route>
  )
);

export { router };
