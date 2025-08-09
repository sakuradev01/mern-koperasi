import { Link, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const menuItems = [
    {
      title: "Dashboard",
      icon: "📊",
      path: "/dashboard",
    },
    {
      title: "Simpanan",
      icon: "💰",
      path: "/simpanan",
    },
    {
      title: "Master Data",
      icon: "📋",
      children: [
        {
          title: "Anggota",
          path: "/master/anggota",
        },
        {
          title: "Produk",
          path: "/master/produk",
        },
      ],
    },
  ];

  const isActive = (path) => location.pathname === path;

  const renderMenuItems = (items) => {
    return items.map((item) => {
      if (item.children) {
        return (
          <div key={item.title} className="mb-2">
            <div className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 cursor-pointer">
              <span className="mr-3">{item.icon}</span>
              <span className="font-medium">{item.title}</span>
            </div>
            <div className="ml-8">{renderMenuItems(item.children)}</div>
          </div>
        );
      }

      return (
        <Link
          key={item.path}
          to={item.path}
          className={`flex items-center px-4 py-2 mb-1 rounded-lg transition-colors ${
            isActive(item.path)
              ? "bg-blue-100 text-blue-700"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <span className="mr-3">{item.icon}</span>
          <span>{item.title}</span>
        </Link>
      );
    });
  };

  return (
    <div className="w-64 bg-white shadow-lg">
      <div className="p-6">
        <div className="flex items-center mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white text-xl font-bold">K</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Koperasi</h1>
            <p className="text-sm text-gray-500">Digital</p>
          </div>
        </div>

        <nav className="space-y-1">{renderMenuItems(menuItems)}</nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
            <span className="text-gray-600 text-sm font-bold">
              {user?.name?.charAt(0)}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
