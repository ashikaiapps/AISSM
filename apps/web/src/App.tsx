import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AccountsPage } from './pages/AccountsPage';
import { ComposerPage } from './pages/ComposerPage';
import { DashboardPage } from './pages/DashboardPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-2">
          <h1 className="text-xl font-bold text-indigo-600 mb-6">🔑 SocialKeys.ai</h1>
          <Link to="/" className="px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 font-medium">
            📊 Dashboard
          </Link>
          <Link to="/accounts" className="px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 font-medium">
            🔗 Accounts
          </Link>
          <Link to="/compose" className="px-3 py-2 rounded-lg hover:bg-indigo-50 text-indigo-600 font-medium">
            ✏️ New Post
          </Link>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/compose" element={<ComposerPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
