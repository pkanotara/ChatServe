import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import StatCard from "../../components/common/StatCard";
import { Store, DollarSign, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/stats").then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: restaurants } = useQuery({
    queryKey: ["admin-restaurants-recent"],
    queryFn: () => api.get("/admin/restaurants?limit=8").then((r) => r.data),
  });

  const fmt = (n) => n?.toLocaleString("en-IN") ?? "—";
  const fmtCur = (n) => (n != null ? `₹${n.toLocaleString("en-IN")}` : "—");

  const statusBadge = (s) => {
    const map = {
      active: "badge-active",
      pending_meta: "badge-pending",
      inactive: "badge-inactive",
      onboarding: "badge-pending",
    };
    return (
      <span className={map[s] || "badge-inactive"}>{s?.replace("_", " ")}</span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-surface-900">
          Platform Overview
        </h2>
        <p className="text-surface-500 text-sm mt-0.5">
          Real-time metrics across all restaurants
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Businesses"
          value={fmt(stats?.totalRestaurants)}
          icon={Store}
          color="brand"
          sub={`${stats?.activeRestaurants ?? 0} active`}
        />
        <StatCard
          label="Active Businesses"
          value={fmt(stats?.activeRestaurants)}
          icon={Store}
          color="green"
        />
        <StatCard
          label="Pending Setup"
          value={fmt(stats?.pendingRestaurants)}
          icon={Clock}
          color="amber"
          sub="awaiting Meta signup"
        />
        <StatCard
          label="Business Owners"
          value={fmt(stats?.totalOwners)}
          icon={Users}
          color="purple"
        />
      </div>

      {/* Restaurants list */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-surface-900">Recent Businesses</h3>
          <Link to="/admin/restaurants" className="text-xs text-orange-500 hover:text-orange-600 font-medium">
            View all →
          </Link>
        </div>
        <div className="space-y-3">
          {restaurants?.data?.length ? (
            restaurants.data.map((r) => (
              <Link
                key={r._id}
                to={`/admin/restaurants/${r._id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <span className="text-orange-600 font-bold text-sm">{r.name?.[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-surface-900">{r.name}</p>
                    <p className="text-xs text-surface-400">{r.owner?.email}</p>
                  </div>
                </div>
                {statusBadge(r.status)}
              </Link>
            ))
          ) : (
            <p className="text-sm text-surface-400 text-center py-6">No businesses yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
