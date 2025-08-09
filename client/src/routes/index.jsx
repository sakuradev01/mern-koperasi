import {
  createBrowserRouter,
  Route,
  createRoutesFromElements,
} from "react-router-dom";
import MainLayout from "../Layout/MainLayout";
import Home from "../pages/Home.jsx";
import Login from "../pages/Login.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Members from "../pages/Members.jsx";
import Products from "../pages/Products.jsx";
import Savings from "../pages/Savings.jsx";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="master/anggota" element={<Members />} />
        <Route path="master/produk" element={<Products />} />
        <Route path="simpanan" element={<Savings />} />
      </Route>
    </Route>
  )
);

export { router };
