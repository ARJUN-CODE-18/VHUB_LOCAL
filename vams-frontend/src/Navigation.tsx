import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊', enabled: true },
    { path: '/aircraft', label: 'Aircraft', icon: '✈️', enabled: true },
    { path: '/pads', label: 'Pads', icon: '🅿️', enabled: true },
    { path: '/slots', label: 'Slots', icon: '📅', enabled: true },
    { path: '/weather', label: 'Weather', icon: '🌤️', enabled: true },
    { path: '/energy', label: 'Energy', icon: '🔋', enabled: true },
    { path: '/ground-ops', label: 'Ground Ops', icon: '🔧', enabled: true },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return (
      location.pathname === path ||
      location.pathname.startsWith(path + '/')
    );
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
              {navItems
                .filter(item => item.enabled)
                .map(item => (
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
            <span className="text-sm text-gray-500">
              Operator: test_operator
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
