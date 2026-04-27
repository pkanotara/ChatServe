import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import {
  ShoppingBag,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Link } from "react-router-dom";

const STATUS_COLORS = {
  pending: "badge-pending",
  confirmed: "badge-active",
  preparing: "badge-pending",
  ready: "badge-active",
  delivered: "badge-active",
  cancelled: "badge-error",
};

export default function RestaurantDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["restaurant-stats"],
    queryFn: () => api.get("/restaurant/stats").then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: orders } = useQuery({
    queryKey: ["restaurant-orders-recent"],
    queryFn: () => api.get("/restaurant/orders?limit=3").then((r) => r.data),
    refetchInterval: 15000,
  });

  const { data: dailyOrders } = useQuery({
    queryKey: ["restaurant-daily-orders"],
    queryFn: () =>
      api.get("/analytics/daily-orders?days=7").then((r) => r.data),
  });

  const { data: waStatus } = useQuery({
    queryKey: ["restaurant-whatsapp"],
    queryFn: () => api.get("/restaurant/whatsapp").then((r) => r.data),
  });

  const fmt = (n) => n?.toLocaleString("en-IN") ?? "0";
  const fmtCur = (n) => (n != null ? `₹${n.toLocaleString("en-IN")}` : "₹0");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-surface-900">
          Dashboard
        </h2>
        <p className="text-surface-500 text-sm mt-0.5">
          Your restaurant at a glance
        </p>
      </div>

      {/* WhatsApp Setup Alert */}
      {waStatus && waStatus.signupStatus !== "configured" && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-amber-800 text-sm">
              WhatsApp Business Setup Incomplete
            </p>
            <p className="text-amber-700 text-xs mt-1">
              Complete the Meta Embedded Signup to activate your ordering
              chatbot.
            </p>
          </div>
          <Link to="/dashboard/whatsapp" className="btn-primary text-xs py-1.5">
            Complete Setup →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Orders"
          value={fmt(stats?.totalOrders)}
          icon={ShoppingBag}
          color="brand"
        />
        <StatCard
          label="Today's Orders"
          value={fmt(stats?.todayOrders)}
          icon={Clock}
          color="blue"
        />
        <StatCard
          label="Pending Orders"
          value={fmt(stats?.pendingOrders)}
          icon={AlertCircle}
          color="amber"
        />
        <StatCard
          label="Total Customers"
          value={fmt(stats?.totalCustomers)}
          icon={Users}
          color="green"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="This Month Revenue"
          value={fmtCur(stats?.monthRevenue)}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="All-Time Revenue"
          value={fmtCur(stats?.totalRevenue)}
          icon={TrendingUp}
          color="brand"
        />
      </div>

      {/* Orders Chart */}
      <div className="card p-6">
        <h3 className="font-semibold text-surface-900 mb-4">
          Orders — Last 7 Days
        </h3>
        {dailyOrders?.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, dataMax => Math.max(2, dataMax+1)]}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e4e4e7",
                }}
              />
              <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-surface-400 text-sm">
            No orders yet — share your WhatsApp number to start!
          </div>
        )}
      </div>



      {/* Top Items */}
      {stats?.topItems?.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-surface-900 mb-4">
            🏆 Top Menu Items
          </h3>
          <div className="space-y-2">
            {stats.topItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-surface-900">
                      {item.name}
                    </span>
                    <span className="text-surface-500">
                      {item.count} orders
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-100 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-brand-400 rounded-full"
                      style={{
                        width: `${Math.min(100, (item.count / stats.topItems[0].count) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

            {/* Recent Orders */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-surface-900">Recent Orders</h3>
          <Link
            to="/dashboard/orders"
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            View all →
          </Link>
        </div>
        {orders?.data?.length ? (
          <div className="space-y-3">
            {orders.data.map((o) => (
              <div
                key={o._id}
                className="flex items-center justify-between p-3 bg-surface-50 rounded-xl"
              >
                <div>
                  <p className="font-mono text-xs font-medium text-surface-700">
                    {o.orderNumber}
                  </p>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {o.items?.length} items · {o.customerNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-surface-900">₹{o.total}</p>
                  <span
                    className={`${STATUS_COLORS[o.status] || "badge-inactive"} mt-0.5`}
                  >
                    {o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-surface-400 text-sm text-center py-8">
            No orders yet
          </p>
        )}
      </div>


      
    </div>
  );
}
