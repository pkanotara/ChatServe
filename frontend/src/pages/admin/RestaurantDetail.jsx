import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "../../services/api";
import {
  ArrowLeft,
  Store,
  Wifi,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Wrench,
  Send,
  Loader2,
  Copy,
  Check,
  KeyRound,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import PasswordResetModal from "../../components/PasswordResetModal";

export default function AdminRestaurantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showActivateForm, setShowActivateForm] = useState(false);
  const [activateForm, setActivateForm] = useState({
    wabaId: "",
    phoneNumberId: "",
    accessToken: "",
  });
  const [testForm, setTestForm] = useState({ to: "", message: "" });
  const [showTestForm, setShowTestForm] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: restaurant, isLoading } = useQuery({
    queryKey: ["admin-restaurant", id],
    queryFn: () => api.get(`/admin/restaurants/${id}`).then((r) => r.data),
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-restaurant-orders", id],
    queryFn: () =>
      api.get(`/admin/orders?restaurantId=${id}&limit=10`).then((r) => r.data),
  });

  const toggleStatus = useMutation({
    mutationFn: (status) =>
      api.patch(`/admin/restaurants/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries(["admin-restaurant", id]);
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const manualActivate = useMutation({
    mutationFn: () =>
      api.post(`/embedded-signup/manual-activate/${id}`, activateForm),
    onSuccess: (res) => {
      qc.invalidateQueries(["admin-restaurant", id]);
      setShowActivateForm(false);
      toast.success(res.data.message);
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || "Activation failed"),
  });

  const refreshProfile = useMutation({
    mutationFn: () => api.post(`/admin/restaurants/${id}/refresh-profile`),
    onSuccess: () => toast.success("WhatsApp Business profile refreshed!"),
    onError: (err) =>
      toast.error(err.response?.data?.error || "Refresh failed"),
  });

  const testSend = useMutation({
    mutationFn: () => api.post(`/admin/restaurants/${id}/test-send`, testForm),
    onSuccess: () => {
      toast.success("Test message sent!");
      setShowTestForm(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || "Send failed"),
  });

  const deleteRestaurant = useMutation({
    mutationFn: () => api.delete(`/admin/restaurants/${id}`),
    onSuccess: (res) => {
      qc.invalidateQueries(["admin-restaurants"]);
      toast.success(res.data.message || "Business deleted successfully");
      navigate("/admin/restaurants");
    },
    onError: (err) =>
      toast.error(err.response?.data?.error || "Failed to delete business"),
  });

  const copyId = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    toast.success("Copied!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!restaurant)
    return (
      <div className="text-center py-12 text-zinc-400">
        Business not found
      </div>
    );

  const wa = restaurant.whatsappConfig;
  const isConfigured = wa?.signupStatus === "configured";
  const hasPendingIds =
    wa?.wabaId === "PENDING" ||
    wa?.phoneNumberId === "PENDING" ||
    wa?.wabaId === "DEMO_WABA_ID" ||
    wa?.phoneNumberId === "DEMO_PHONE_NUMBER_ID" ||
    !wa?.wabaId;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link
          to="/admin/restaurants"
          className="btn-secondary py-1.5 px-3 text-xs"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <h2 className="font-semibold text-zinc-900 text-xl">
          {restaurant.name}
        </h2>
        <span
          className={
            restaurant.status === "active" ? "badge-active" : "badge-pending"
          }
        >
          {restaurant.status?.replace("_", " ")}
        </span>
      </div>

      {/* Restaurant ID Banner */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Business ID</p>
          <p className="font-mono text-sm font-semibold text-zinc-900">{id}</p>
        </div>
        <button
          onClick={() => copyId(id)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-orange-50"
        >
          {copiedId ? (
            <Check size={14} className="text-green-500" />
          ) : (
            <Copy size={14} />
          )}
          {copiedId ? "Copied!" : "Copy ID"}
        </button>
      </div>

      {/* Manual Activation Banner */}
      {(hasPendingIds || !isConfigured) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Wrench size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 text-sm">
              WhatsApp Setup Incomplete
            </p>
            <p className="text-amber-700 text-xs mt-1">
              WABA ID and Phone Number ID not configured. Use Manual Activation
              to set them directly.
            </p>
          </div>
          <button
            onClick={() => setShowActivateForm(!showActivateForm)}
            className="btn-primary text-xs py-1.5 shrink-0"
          >
            <Wrench size={14} /> Manual Activate
          </button>
        </div>
      )}

      {/* Manual Activation Form */}
      {showActivateForm && (
        <div className="card p-6 border-2 border-orange-200">
          <h3 className="font-semibold text-zinc-900 mb-1">
            Manual WhatsApp Activation
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            Get values from: Meta Developer Console → WhatsApp → API Setup
          </p>
          <div className="space-y-3">
            <div>
              <label className="label">WABA ID *</label>
              <input
                className="input font-mono"
                placeholder="e.g. 2448725995583940"
                value={activateForm.wabaId}
                onChange={(e) =>
                  setActivateForm((f) => ({ ...f, wabaId: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="label">Phone Number ID *</label>
              <input
                className="input font-mono"
                placeholder="e.g. 937829752755417"
                value={activateForm.phoneNumberId}
                onChange={(e) =>
                  setActivateForm((f) => ({
                    ...f,
                    phoneNumberId: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="label">
                Access Token (leave empty to use platform token)
              </label>
              <input
                className="input font-mono text-xs"
                placeholder="EAAxxxxxxx..."
                value={activateForm.accessToken}
                onChange={(e) =>
                  setActivateForm((f) => ({
                    ...f,
                    accessToken: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => manualActivate.mutate()}
              disabled={
                !activateForm.wabaId ||
                !activateForm.phoneNumberId ||
                manualActivate.isPending
              }
              className="btn-primary"
            >
              {manualActivate.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {manualActivate.isPending ? "Activating..." : "Activate WhatsApp"}
            </button>
            <button
              onClick={() => setShowActivateForm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Restaurant Info */}
        <div className="card p-6 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Store size={16} className="text-orange-500" />
            <h3 className="font-semibold text-zinc-900">Business Details</h3>
          </div>
          <InfoRow
            label="Business ID"
            value={id}
            mono
            copyable
            onCopy={() => copyId(id)}
          />
          <InfoRow label="Name" value={restaurant.name} />
          <InfoRow label="Description" value={restaurant.description} />
          <InfoRow label="Address" value={restaurant.address} />
          <InfoRow label="Email" value={restaurant.email} />
          <InfoRow
            label="Categories"
            value={restaurant.categories?.join(", ")}
          />
          <InfoRow label="Tenant ID" value={restaurant.tenantId} mono />
        </div>

        {/* Owner Info */}
        <div className="card p-6 space-y-3">
          <h3 className="font-semibold text-zinc-900 mb-1">Owner Details</h3>
          <InfoRow label="Name" value={restaurant.owner?.name} />
          <InfoRow label="Email" value={restaurant.owner?.email} />
          <InfoRow label="WhatsApp" value={restaurant.owner?.whatsappNumber} />
          <InfoRow
            label="Last Login"
            value={
              restaurant.owner?.lastLogin
                ? new Date(restaurant.owner.lastLogin).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : "Never"
            }
          />{" "}
        </div>

        {/* WhatsApp Config */}
        <div className="card p-6 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Wifi
              size={16}
              className={
                isConfigured && !hasPendingIds
                  ? "text-green-500"
                  : "text-amber-500"
              }
            />
            <h3 className="font-semibold text-zinc-900">
              WhatsApp Configuration
            </h3>
            {isConfigured && !hasPendingIds ? (
              <span className="badge-active ml-auto">Fully Configured</span>
            ) : (
              <span className="badge-pending ml-auto">Needs Setup</span>
            )}
          </div>
          <InfoRow label="Target Number" value={wa?.targetBusinessNumber} />
          <InfoRow
            label="Signup Status"
            value={wa?.signupStatus?.replace("_", " ")}
          />
          <InfoRow
            label="WABA ID"
            value={wa?.wabaId}
            mono
            warn={hasPendingIds}
          />
          <InfoRow
            label="Phone Number ID"
            value={wa?.phoneNumberId}
            mono
            warn={hasPendingIds}
          />
          <InfoRow
            label="Bot Enabled"
            value={wa?.botEnabled ? "✅ Yes" : "❌ No"}
          />
          <InfoRow
            label="Webhook"
            value={
              wa?.webhookSubscribed ? "✅ Subscribed" : "❌ Not subscribed"
            }
          />
          <InfoRow
            label="Configured At"
            value={
              wa?.configuredAt
                ? (() => {
                    const d = new Date(wa.configuredAt);
                    const date = d.toLocaleDateString("en-GB"); // DD/MM/YYYY
                    const time = d.toLocaleTimeString("en-US"); // keeps AM/PM + seconds
                    return `${date}, ${time}`;
                  })()
                : "—"
            }
          />

          {/* Actions for configured restaurants */}
          {isConfigured && !hasPendingIds && (
            <div className="pt-3 border-t border-zinc-100 space-y-2">
              <button
                onClick={() => refreshProfile.mutate()}
                disabled={refreshProfile.isPending}
                className="btn-secondary text-xs w-full justify-center"
              >
                {refreshProfile.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Wifi size={13} />
                )}
                Refresh WhatsApp Profile
              </button>
              <button
                onClick={() => setShowTestForm(!showTestForm)}
                className="btn-secondary text-xs w-full justify-center"
              >
                <Send size={13} /> Send Test Message
              </button>
              {showTestForm && (
                <div className="space-y-2 pt-2">
                  <input
                    className="input text-xs"
                    placeholder="To: 919876543210"
                    value={testForm.to}
                    onChange={(e) =>
                      setTestForm((f) => ({ ...f, to: e.target.value }))
                    }
                  />
                  <input
                    className="input text-xs"
                    placeholder="Message"
                    value={testForm.message}
                    onChange={(e) =>
                      setTestForm((f) => ({ ...f, message: e.target.value }))
                    }
                  />
                  <button
                    onClick={() => testSend.mutate()}
                    disabled={
                      !testForm.to || !testForm.message || testSend.isPending
                    }
                    className="btn-primary text-xs w-full justify-center"
                  >
                    {testSend.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : null}{" "}
                    Send
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="card p-6">
          <h3 className="font-semibold text-zinc-900 mb-4">Actions</h3>
          <div className="space-y-3">
            {restaurant.status === "active" ? (
              <button
                onClick={() => toggleStatus.mutate("inactive")}
                disabled={toggleStatus.isPending}
                className="btn-danger w-full justify-center"
              >
                <XCircle size={16} /> Deactivate Business
              </button>
            ) : (
              <button
                onClick={() => toggleStatus.mutate("active")}
                disabled={toggleStatus.isPending}
                className="btn-primary w-full justify-center"
              >
                <CheckCircle2 size={16} /> Activate Business
              </button>
            )}
            <button
              onClick={() => setShowActivateForm(true)}
              className="btn-secondary w-full justify-center text-xs"
            >
              <Wrench size={14} /> Configure WhatsApp Manually
            </button>
            <button
              onClick={() => setShowPasswordReset(true)}
              className="btn-secondary w-full justify-center text-xs"
            >
              <KeyRound size={14} /> Reset Owner Password
            </button>

            {/* Delete Business */}
            <div className="pt-3 border-t border-zinc-100">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="btn-danger w-full justify-center text-xs"
                >
                  <Trash2 size={14} /> Delete Business Permanently
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-600 font-semibold text-center">
                    ⚠️ This will permanently delete the business and ALL related data
                    (owner, catalog, orders, customers, WhatsApp config, logs).
                    This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteRestaurant.mutate()}
                      disabled={deleteRestaurant.isPending}
                      className="btn-danger flex-1 justify-center text-xs"
                    >
                      {deleteRestaurant.isPending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      {deleteRestaurant.isPending ? "Deleting..." : "Yes, Delete Everything"}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="btn-secondary flex-1 justify-center text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showPasswordReset && restaurant.owner && (
        <PasswordResetModal
          ownerId={restaurant.owner._id}
          ownerName={restaurant.owner.name}
          ownerEmail={restaurant.owner.email}
          onClose={() => setShowPasswordReset(false)}
        />
      )}

      {/* Recent Orders */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag size={16} className="text-orange-500" />
          <h3 className="font-semibold text-zinc-900">Recent Orders</h3>
        </div>
        {orders?.data?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100">
                {["Order #", "Customer", "Total", "Status", "Date"].map((h) => (
                  <th
                    key={h}
                    className="text-left py-2 text-xs font-medium text-zinc-500 uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.data.map((o) => (
                <tr key={o._id}>
                  <td className="py-2.5 font-mono text-xs text-zinc-600">
                    {o.orderNumber}
                  </td>
                  <td className="py-2.5 font-mono text-xs text-zinc-600">
                    {o.customerNumber}
                  </td>
                  <td className="py-2.5 font-semibold text-zinc-900">
                    ₹{o.total}
                  </td>
                  <td className="py-2.5">
                    <span className="badge-active">{o.status}</span>
                  </td>
                  <td className="py-2.5 text-zinc-400 text-xs">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-zinc-400 text-sm">No orders yet</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, warn, copyable, onCopy }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-500 shrink-0">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs text-right break-all ${
            warn
              ? "text-amber-600 font-semibold"
              : mono
                ? "font-mono text-zinc-600"
                : "font-medium text-zinc-900"
          }`}
        >
          {value || "—"}
        </span>
        {copyable && value && (
          <button
            onClick={onCopy}
            className="text-zinc-400 hover:text-orange-500 transition-colors"
          >
            <Copy size={11} />
          </button>
        )}
      </div>
    </div>
  );
}
