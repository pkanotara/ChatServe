import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Auth
import LoginPage from './pages/auth/LoginPage'

// Admin
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminRestaurants from './pages/admin/Restaurants'
import AdminRestaurantDetail from './pages/admin/RestaurantDetail'
import AdminBroadcast from './pages/admin/Broadcast'
import AdminOnboarding from './pages/admin/Onboarding'

// Restaurant Owner
import RestaurantLayout from './layouts/RestaurantLayout'
import RestaurantDashboard from './pages/restaurant/Dashboard'
import RestaurantMenu from './pages/restaurant/Menu'
import RestaurantOrders from './pages/restaurant/Orders'
import RestaurantProfile from './pages/restaurant/Profile'
import RestaurantWhatsApp from './pages/restaurant/WhatsApp'
import RestaurantBroadcast from './pages/restaurant/Broadcast'
import RestaurantCustomers from './pages/restaurant/Customers'

// Onboarding public pages
import OnboardPage from './pages/auth/OnboardPage'
import OnboardSuccess from './pages/auth/OnboardSuccess'
import OnboardError from './pages/auth/OnboardError'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboard/:restaurantId" element={<OnboardPage />} />
          <Route path="/onboard/success" element={<OnboardSuccess />} />
          <Route path="/onboard/error" element={<OnboardError />} />

          {/* Super Admin */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="restaurants" element={<AdminRestaurants />} />
            <Route path="restaurants/:id" element={<AdminRestaurantDetail />} />
            <Route path="broadcast" element={<AdminBroadcast />} />
            <Route path="onboarding" element={<AdminOnboarding />} />
          </Route>

          {/* Restaurant Owner */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['restaurant_owner']}>
              <RestaurantLayout />
            </ProtectedRoute>
          }>
            <Route index element={<RestaurantDashboard />} />
            <Route path="menu" element={<RestaurantMenu />} />
            <Route path="orders" element={<RestaurantOrders />} />
            <Route path="profile" element={<RestaurantProfile />} />
            <Route path="whatsapp" element={<RestaurantWhatsApp />} />
            <Route path="customers" element={<RestaurantCustomers />} />
            <Route path="broadcast" element={<RestaurantBroadcast />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'super_admin') return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}
