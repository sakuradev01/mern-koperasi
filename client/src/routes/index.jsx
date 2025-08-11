// File: client/src/routes/index.jsx

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
      {/* Rute untuk halaman login */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Rute untuk halaman utama (landing page) */}
      <Route path="/" element={<Home />} />

      {/* Rute-rute yang dilindungi, hanya dapat diakses setelah login */}
      <Route element={<PrivateRoute />}>
        <Route element={<MainLayout />}>
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
