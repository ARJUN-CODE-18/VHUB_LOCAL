import { Link, useLocation } from 'react-router-dom';
import { clearAuthentication, useAuthStore } from '../../store/authStore';

const Navigation = () => {
  const location = useLocation();
  const { userid } = useAuthStore();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/aircraft', label: 'Aircraft', icon: '✈️' },
    { path: '/pads', label: 'Pads', icon: '🅿️' },
    { path: '/slots', label: 'Slots', icon: '📅' },
    { path: '/weather', label: 'Weather', icon: '🌤️' },
    { path: '/energy', label: 'Energy', icon: '🔋' },
    { path: '/ground-ops', label: 'Ground Ops', icon: '🔧' },
    { path: '/emergency', label: 'Emergency', icon: '🚨' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    clearAuthentication();
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-primary-600">VAMS</h1>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-gray-500 mr-4">Operator: {userid ?? 'N/A'}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-white bg-slate-700 rounded-md hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;