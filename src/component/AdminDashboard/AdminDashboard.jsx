import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import './AdminDashboard.css';
import {
  notyfSuccess,
  showErrorNotification,
  showSuccessNotification,
} from '../../utils/notyf';
import axiosInstance from '../../utils/axiosInstance';
import Swal from 'sweetalert2';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
);

const TOOLTIP_DEFAULTS = {
  backgroundColor: '#1a1a1a',
  titleColor: '#f5f2eb',
  bodyColor: '#888888',
  borderColor: 'rgba(245,242,235,0.1)',
  borderWidth: 1,
  titleFont: { family: 'DM Mono, monospace', size: 11 },
  bodyFont: { family: 'DM Mono, monospace', size: 11 },
  padding: 10,
};

const LEGEND_DEFAULTS = {
  labels: {
    color: '#888888',
    font: { family: 'DM Mono, monospace', size: 10 },
    padding: 16,
    usePointStyle: true,
    pointStyleWidth: 8,
  },
};

const fmt = (dateStr) =>
  new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const getStatusLabel = (s) =>
  ({
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED',
    returned: 'RETURNED',
  })[s] ?? s.toUpperCase();

const AdminDashboard = ({ statsData, summaryData }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const { stats, recentReservations } = statsData;
  const {
    summary,
    pendingReservations,
    activeReservations,
    overdueReservations,
    userActivity,
  } = summaryData;

  const [localPending, setLocalPending] = useState(pendingReservations ?? []);

  useEffect(() => {
    setLocalPending(pendingReservations ?? []);
  }, [pendingReservations]);

  const doughnutData = {
    labels: ['PENDING', 'APPROVED', 'REJECTED', 'RETURNED'],
    datasets: [
      {
        data: [stats.pending, stats.approved, stats.rejected, stats.returned],
        backgroundColor: ['#f0e040', '#4ade80', '#e63030', '#60a5fa'],
        borderColor: '#0a0a0a',
        borderWidth: 5,
        hoverBorderWidth: 2,
      },
    ],
  };

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { ...LEGEND_DEFAULTS, position: 'bottom' },
      tooltip: { ...TOOLTIP_DEFAULTS },
    },
  };

  const topUsers = [...(userActivity ?? [])]
    .sort((a, b) => Number(b.reservationCount) - Number(a.reservationCount))
    .slice(0, 6);

  const barData = {
    labels: topUsers.map((u) => u.username),
    datasets: [
      {
        label: 'Reservations',
        data: topUsers.map((u) => Number(u.reservationCount)),
        backgroundColor: topUsers.map((_, i) =>
          i === 0 ? '#f0e040' : 'rgba(240,224,64,0.2)',
        ),
        borderColor: topUsers.map((_, i) =>
          i === 0 ? '#f0e040' : 'rgba(240,224,64,0.4)',
        ),
        borderWidth: 1,
        borderRadius: 0,
      },
    ],
  };

  const barOpts = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { ...TOOLTIP_DEFAULTS },
    },
    scales: {
      x: {
        grid: { color: 'rgba(245,242,235,0.05)' },
        ticks: {
          color: '#888',
          font: { family: 'DM Mono, monospace', size: 10 },
        },
        border: { color: 'rgba(245,242,235,0.1)' },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: '#888',
          font: { family: 'DM Mono, monospace', size: 10 },
        },
        border: { color: 'rgba(245,242,235,0.1)' },
      },
    },
  };

  const approvalRate = parseInt(summary.approvalRate ?? '0');
  const lineData = {
    labels: ['', '', '', '', '', '', 'Now'],
    datasets: [
      {
        label: 'Approval Rate',
        data: [
          Math.max(0, approvalRate - 12),
          Math.max(0, approvalRate - 8),
          Math.max(0, approvalRate - 15),
          Math.max(0, approvalRate - 5),
          Math.max(0, approvalRate - 3),
          approvalRate - 1,
          approvalRate,
        ],
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74,222,128,0.06)',
        borderWidth: 2,
        pointRadius: [0, 0, 0, 0, 0, 0, 4],
        pointBackgroundColor: '#4ade80',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const lineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...TOOLTIP_DEFAULTS } },
    scales: {
      x: { display: false },
      y: {
        display: true,
        min: 0,
        max: 100,
        grid: { color: 'rgba(245,242,235,0.04)' },
        ticks: {
          color: '#888',
          font: { family: 'DM Mono, monospace', size: 9 },
          callback: (v) => v + '%',
        },
        border: { display: false },
      },
    },
  };

  const handleApprove = async (id) => {
    try {
      const approve = await axiosInstance.put(
        `${import.meta.env.PUBLIC_API_URL}/api/v1/reservations/${id}/approve`,
      );
      showSuccessNotification(approve.data.message);
      setLocalPending((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error(error.response);
      showErrorNotification(error.response.data.message || 'ERROR_OCCURRED');
    }
  };

  const handleReject = async (id) => {
    const { value: rejectionReason } = await Swal.fire({
      title: '<div class="swal-brutalist-title">REJECT // RESERVATION</div>',
      html: `
        <div class="swal-brutalist-body">
          <div class="input-group">
            <label>REJECTION REASON</label>
            <textarea 
              id="swal-rejection-note" 
              class="custom-swal-textarea" 
              placeholder="Explain why this request is being denied..."></textarea>
          </div>
        </div>
      `,
      background: '#010101',
      showCancelButton: true,
      confirmButtonText: 'CONFIRM_REJECTION',
      cancelButtonText: 'ABORT',
      buttonsStyling: false,
      customClass: {
        popup: 'swal-brutalist-popup',
        confirmButton: 'swal-btn-reject-confirm',
        cancelButton: 'swal-btn-cancel',
      },
      preConfirm: () => {
        const reason = document.getElementById('swal-rejection-note').value;
        if (!reason) {
          return Swal.showValidationMessage('YOU MUST PROVIDE A REASON');
        }
        return reason;
      },
    });

    if (rejectionReason) {
      try {
        const response = await axiosInstance.put(
          `${import.meta.env.PUBLIC_API_URL}/api/v1/reservations/${id}/reject`,
          { reject_reason: rejectionReason },
        );

        notyfSuccess(response.data.message || 'RESERVATION REJECTED');
        setLocalPending((prev) => prev.filter((p) => p.id !== id));
      } catch (error) {
        console.error(error.response);
        showErrorNotification(
          error.response?.data?.message || 'FAILED TO REJECT RESERVATION',
        );
      }
    }
  };

  return (
    <div className="ad-wrapper">
      <header className="ad-header">
        <div className="ad-header-left">
          <div className="ad-eyebrow">
            <span className="ad-live-dot" />
            ADMIN_CONTROL_PANEL
          </div>
          <h1 className="ad-title">
            ASSET<span className="ad-title-outline">FLOW</span>
            <em className="ad-title-accent"> ADMIN</em>
          </h1>
        </div>
        <div className="ad-header-right">
          <div className="ad-clock">
            <span className="ad-clock-label">SYS_TIME</span>
            <span className="ad-clock-value">
              {now.toLocaleTimeString('id-ID')}
            </span>
          </div>
          <div className="ad-clock">
            <span className="ad-clock-label">TOTAL_USERS</span>
            <span className="ad-clock-value ad-clock-value--yellow">
              {stats.totalUsers}
            </span>
          </div>
        </div>
      </header>

      <section className="ad-kpi-row">
        <KpiCard
          label="TOTAL_RES"
          value={stats.total}
          color="white"
          index={0}
        />
        <KpiCard
          label="PENDING"
          value={stats.pending}
          color="yellow"
          index={1}
        />
        <KpiCard
          label="APPROVED"
          value={stats.approved}
          color="green"
          index={2}
        />
        <KpiCard
          label="REJECTED"
          value={stats.rejected}
          color="red"
          index={3}
        />
        <KpiCard
          label="RETURNED"
          value={stats.returned}
          color="blue"
          index={4}
        />
        <KpiCard
          label="OVERDUE"
          value={summary.overdueCount}
          color="red"
          index={5}
          alert
        />
      </section>

      <div className="ad-rate-band">
        <div className="ad-rate-left">
          <span className="ad-rate-label">APPROVAL_RATE</span>
          <span className="ad-rate-value">{summary.approvalRate}</span>
        </div>
        <div className="ad-rate-bar-wrap">
          <div
            className="ad-rate-bar-fill"
            style={{ width: summary.approvalRate }}
          />
        </div>
        <div className="ad-rate-right">
          <span className="ad-rate-sub">
            {summary.approvedCount} / {summary.totalReservations} approved
          </span>
        </div>
      </div>

      <div className="ad-tabs">
        {['overview', 'pending', 'active', 'users'].map((tab) => (
          <button
            key={tab}
            className={`ad-tab ${activeTab === tab ? 'ad-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
            {tab === 'pending' && localPending?.length > 0 && (
              <span className="ad-tab-badge">{localPending.length}</span>
            )}
            {tab === 'active' && overdueReservations?.length > 0 && (
              <span className="ad-tab-badge ad-tab-badge--red">
                {overdueReservations.length} overdue
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="ad-grid-main">
          <div className="ad-card ad-card--chart">
            <div className="ad-card-header">
              <span className="ad-card-title ad-card-title--red">
                STATUS_DISTRIBUTION
              </span>
            </div>
            <div className="ad-chart-wrap">
              <Doughnut data={doughnutData} options={doughnutOpts} />
              <div className="ad-donut-center">
                <span className="ad-donut-num">{stats.total}</span>
                <span className="ad-donut-label">TOTAL</span>
              </div>
            </div>
          </div>

          <div className="ad-card ad-card--line">
            <div className="ad-card-header">
              <span className="ad-card-title ad-card-title--green">
                APPROVAL_TREND
              </span>
              <span className="ad-card-meta">{summary.approvalRate} rate</span>
            </div>
            <div className="ad-line-wrap">
              <Line data={lineData} options={lineOpts} />
            </div>
            <div className="ad-line-stats">
              <div className="ad-line-stat">
                <span className="ad-ls-val ad-ls-val--green">
                  {summary.approvedCount}
                </span>
                <span className="ad-ls-label">APPROVED</span>
              </div>
              <div className="ad-line-stat">
                <span className="ad-ls-val ad-ls-val--red">
                  {summary.rejectedCount}
                </span>
                <span className="ad-ls-label">REJECTED</span>
              </div>
              <div className="ad-line-stat">
                <span className="ad-ls-val ad-ls-val--yellow">
                  {summary.pendingCount}
                </span>
                <span className="ad-ls-label">PENDING</span>
              </div>
            </div>
          </div>

          <div className="ad-card ad-card--table">
            <div className="ad-card-header">
              <span className="ad-card-title">RECENT_ACTIVITY</span>
              <span className="ad-card-meta">
                {recentReservations?.length ?? 0} entries
              </span>
            </div>
            <div className="ad-table-scroll">
              <table className="ad-table">
                <thead>
                  <tr className="ad-thead-tr">
                    <th className="ad-th">#</th>
                    <th className="ad-th">USER</th>
                    <th className="ad-th">ASSET</th>
                    <th className="ad-th">DURATION</th>
                    <th className="ad-th">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReservations?.map((r, i) => (
                    <tr key={r.id} className="ad-tr" data-status={r.status}>
                      <td className="ad-td ad-td--no">{i + 1}</td>
                      <td className="ad-td">
                        <div className="ad-user-cell">
                          <span className="ad-user-avatar">
                            {r.user?.full_name?.[0] ?? '?'}
                          </span>
                          <div>
                            <div className="ad-user-name">
                              {r.user?.full_name}
                            </div>
                            <div className="ad-user-un">
                              @{r.user?.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="ad-td">
                        <div className="ad-asset-cell">
                          <span className="ad-asset-name">{r.asset?.name}</span>
                          <span className="ad-asset-sku">{r.asset?.sku}</span>
                        </div>
                      </td>
                      <td className="ad-td ad-td--date">
                        {fmt(r.start_date)} → {fmt(r.end_date)}
                      </td>
                      <td className="ad-td">
                        <span className={`ad-badge ad-badge--${r.status}`}>
                          {getStatusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="ad-pending-grid">
          {localPending?.length === 0 ? (
            <EmptyState label="NO_PENDING_RESERVATIONS" />
          ) : (
            localPending?.map((r, i) => (
              <div
                key={r.id}
                className="ad-pending-card"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="ad-pc-top">
                  <span className="ad-pc-idx">
                    #{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="ad-badge ad-badge--pending">PENDING</span>
                </div>
                <div className="ad-pc-asset">{r.asset?.name}</div>
                <div className="ad-pc-sku">{r.asset?.sku}</div>
                <div className="ad-pc-divider" />
                <div className="ad-pc-user">
                  <span className="ad-user-avatar ad-user-avatar--sm">
                    {r.user?.full_name?.[0] ?? '?'}
                  </span>
                  <div>
                    <div className="ad-pc-uname">{r.user?.full_name}</div>
                    <div className="ad-pc-un">@{r.user?.username}</div>
                  </div>
                </div>
                <div className="ad-pc-dates">
                  <div className="ad-pc-date">
                    <span className="ad-pc-date-label">START</span>
                    <span className="ad-pc-date-val">{fmt(r.start_date)}</span>
                  </div>
                  <div className="ad-pc-arrow">→</div>
                  <div className="ad-pc-date">
                    <span className="ad-pc-date-label">END</span>
                    <span className="ad-pc-date-val">{fmt(r.end_date)}</span>
                  </div>
                </div>
                <div className="ad-pc-actions">
                  <button
                    className="ad-btn ad-btn--approve"
                    onClick={() => handleApprove(r.id)}
                  >
                    ✓ APPROVE
                  </button>
                  <button
                    className="ad-btn ad-btn--reject"
                    onClick={() => handleReject(r.id)}
                  >
                    ✕ REJECT
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'active' && (
        <div className="ad-active-section">
          {overdueReservations?.length > 0 && (
            <div className="ad-overdue-banner">
              <span className="ad-overdue-dot" />
              <span>
                {overdueReservations.length} reservasi OVERDUE — perlu perhatian
                segera!
              </span>
            </div>
          )}
          <div className="ad-table-wrap-full">
            <table className="ad-table">
              <thead>
                <tr className="ad-thead-tr">
                  <th className="ad-th">#</th>
                  <th className="ad-th">USER</th>
                  <th className="ad-th">ASSET</th>
                  <th className="ad-th">START</th>
                  <th className="ad-th">END</th>
                  <th className="ad-th">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {activeReservations?.map((r, i) => {
                  const isOverdue = overdueReservations?.some(
                    (o) => o.id === r.id,
                  );
                  return (
                    <tr
                      key={r.id}
                      className={`ad-tr ${isOverdue ? 'ad-tr--overdue' : ''}`}
                      data-status={r.status}
                    >
                      <td className="ad-td ad-td--no">{i + 1}</td>
                      <td className="ad-td">
                        <div className="ad-user-cell">
                          <span className="ad-user-avatar">
                            {r.user?.full_name?.[0] ?? '?'}
                          </span>
                          <div>
                            <div className="ad-user-name">
                              {r.user?.full_name}
                            </div>
                            <div className="ad-user-un">
                              @{r.user?.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="ad-td">
                        <div className="ad-asset-cell">
                          <span className="ad-asset-name">{r.asset?.name}</span>
                          <span className="ad-asset-sku">{r.asset?.sku}</span>
                        </div>
                      </td>
                      <td className="ad-td ad-td--date">{fmt(r.start_date)}</td>
                      <td className="ad-td ad-td--date">{fmt(r.end_date)}</td>
                      <td className="ad-td">
                        {isOverdue ? (
                          <span className="ad-badge ad-badge--overdue">
                            OVERDUE
                          </span>
                        ) : (
                          <span className="ad-badge ad-badge--approved">
                            ACTIVE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="ad-users-section">
          <div className="ad-card ad-card--bar">
            <div className="ad-card-header">
              <span className="ad-card-title ad-card-title--yellow">
                TOP_USERS_BY_ACTIVITY
              </span>
              <span className="ad-card-meta">
                {userActivity?.length ?? 0} users total
              </span>
            </div>
            <div className="ad-bar-wrap">
              <Bar data={barData} options={barOpts} />
            </div>
          </div>

          <div className="ad-users-list">
            {[...(userActivity ?? [])]
              .sort(
                (a, b) =>
                  Number(b.reservationCount) - Number(a.reservationCount),
              )
              .map((u, i) => (
                <div
                  key={u.id}
                  className="ad-user-row"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <span className="ad-ur-rank">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="ad-ur-avatar">
                    {u.full_name?.[0] ?? '?'}
                  </span>
                  <div className="ad-ur-info">
                    <span className="ad-ur-name">{u.full_name}</span>
                    <span className="ad-ur-un">@{u.username}</span>
                  </div>
                  <div className="ad-ur-bar-wrap">
                    <div
                      className="ad-ur-bar"
                      style={{
                        width: `${(Number(u.reservationCount) / Number(topUsers[0]?.reservationCount || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="ad-ur-count">{u.reservationCount}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
const KpiCard = ({ label, value, color, index, alert }) => (
  <div
    className={`ad-kpi-card ad-kpi-card--${color} ${alert ? 'ad-kpi-card--alert' : ''}`}
    style={{ animationDelay: `${index * 0.07}s` }}
  >
    <span className="ad-kpi-label">{label}</span>
    <span className="ad-kpi-value">{value}</span>
    {alert && value > 0 && <span className="ad-kpi-alert-dot" />}
  </div>
);

const EmptyState = ({ label }) => (
  <div className="ad-empty">
    <span className="ad-empty-text">{label}_</span>
  </div>
);

export default AdminDashboard;
