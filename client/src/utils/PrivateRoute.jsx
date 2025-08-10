// File: client/src/utils/PrivateRoute.jsx

import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";

const PrivateRoute = ({ children }) => {
  PrivateRoute.propTypes = {
    children: PropTypes.node.isRequired,
  };
  // Ganti `isAuthenticated` dengan `status`
  const { status } = useSelector((state) => state.auth);

  // Periksa status autentikasi yang benar dari Redux store
  if (!status) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
