// Parent Dashboard - Main overview page for parents
import { useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { toast } from "react-toastify";
import Breadcrumb from "../../../components/Breadcrumb";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import "./ParentPortal.css";

import {
  FaUsers,
  FaUserGraduate,
  FaCalendarCheck,
  FaRupeeSign,
  FaBell,
  FaChild,
  FaSyncAlt,
  FaClock,
  FaArrowRight,
  FaIdCard,
  FaBookOpen,
  FaClipboardCheck,
  FaCheckCircle,
  FaExclamationCircle,
  FaMoneyCheckAlt,
  FaRegBell,
} from "react-icons/fa";

const ACTIVE_STATUSES = ["APPROVED", "ENROLLED", "OFFER_MADE", "SEAT_CONFIRMED"];

const fadeInVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: "easeOut" },
  }),
};

export default function ParentDashboard() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    totalChildren: 0,
    activeChildren: 0,
    avgAttendance: 0,
    totalFees: 0,
    pendingFees: 0,
  });

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const isChildActive = (status) => ACTIVE_STATUSES.includes(String(status || "").toUpperCase());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.role === "PARENT_GUARDIAN") {
      fetchChildren();
      fetchNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, user?.role]);

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const res = await api.get("/notifications/parent/read");
      const data = res.data || {};
      const primary = Array.isArray(data.adminNotifications) ? data.adminNotifications : [];
      const secondary = Array.isArray(data.teacherNotifications) ? data.teacherNotifications : [];
      const tertiary = Array.isArray(data.hodNotifications) ? data.hodNotifications : [];
      const merged = [...primary, ...secondary, ...tertiary];
      const seen = new Set();
      const unique = merged.filter((n) => {
        const id = n?._id || `${n?.title}-${n?.createdAt}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      unique.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
      setNotifications(unique);
    } catch {
      // keep dashboard functional; recent updates will show empty/error-safe state
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const response = await api.get("/parent/children");
      const childrenData = response.data.children || [];
      setChildren(childrenData);

      const activeChildren = childrenData.filter((child) => isChildActive(child.status)).length;

      let totalFees = 0;
      let pendingFees = 0;
      let totalAttendancePercentage = 0;
      let childrenWithAttendance = 0;

      for (const child of childrenData) {
        if (isChildActive(child.status)) {
          try {
            const feeResponse = await api.get(`/parent/student/${child._id}/fees`);
            const feeData = feeResponse.data;
            if (feeData) {
              totalFees += Number(feeData.totalFee) || 0;
              const paid = Number(feeData.paidAmount) || 0;
              const due = feeData.dueAmount != null ? Number(feeData.dueAmount) : (Number(feeData.totalFee) || 0) - paid;
              pendingFees += due || 0;
            }
          } catch {
            // preserve resilience per child
          }

          try {
            const attResponse = await api.get(`/parent/student/${child._id}/attendance`);
            const attData = Array.isArray(attResponse.data) ? attResponse.data : (attResponse.data?.data || []);
            const present = attData.filter((rec) => String(rec.status).toUpperCase() === "PRESENT").length;
            const total = attData.length;
            if (total > 0) {
              totalAttendancePercentage += (present / total) * 100;
              childrenWithAttendance++;
            }
          } catch {
            // preserve resilience per child
          }
        }
      }

      const avgAttendance = childrenWithAttendance > 0
        ? Math.round(totalAttendancePercentage / childrenWithAttendance)
        : 0;

      setStats({
        totalChildren: childrenData.length,
        activeChildren,
        avgAttendance,
        totalFees,
        pendingFees,
      });
    } catch {
      toast.error("Failed to load children information");
    } finally {
      setLoading(false);
    }
  };

  const parentName = user?.name || user?.fullName || "Parent";

  const quickAccessItems = useMemo(() => {
    const singleChildId = children.length === 1 ? children[0]?._id : null;
    return [
      {
        key: "attendance",
        title: "Child Attendance",
        description: "Track daily and overall attendance records",
        icon: FaCalendarCheck,
        tone: "blue",
        onClick: () => navigate(singleChildId ? `/dashboard/parent/child/${singleChildId}/attendance` : "/dashboard/parent/children"),
      },
      {
        key: "fees",
        title: "Child Fees",
        description: "Review dues, payments, and fee status",
        icon: FaMoneyCheckAlt,
        tone: "amber",
        onClick: () => navigate(singleChildId ? `/dashboard/parent/child/${singleChildId}/fees` : "/dashboard/parent/children"),
      },
      {
        key: "notifications",
        title: "Notifications",
        description: "Stay updated with school announcements",
        icon: FaRegBell,
        tone: "teal",
        onClick: () => navigate("/parent/notifications"),
      },
      {
        key: "children",
        title: "My Children",
        description: "View and manage linked student profiles",
        icon: FaUsers,
        tone: "green",
        onClick: () => navigate("/dashboard/parent/children"),
      },
    ];
  }, [children, navigate]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "PARENT_GUARDIAN") {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="parent-portal-wrapper parent-portal-wrapper--dashboard">
        <div className="parent-portal-container parent-dashboard-page parent-loading-container" style={{ minHeight: "70vh", width: "100%", maxWidth: "none" }}>
          <Loading size="md" color="primary" text="Loading your dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="parent-portal-wrapper parent-portal-wrapper--dashboard">
        <div className="parent-portal-container parent-dashboard-page" style={{ width: "100%", maxWidth: "none" }}>
          <Breadcrumb
            items={[
              { label: "Dashboard", path: "/dashboard/parent" },
              { label: "Parent Overview" },
            ]}
          />

          {/* Welcome Banner */}
          <motion.section
            variants={fadeInVariants}
            custom={0}
            initial="hidden"
            animate="visible"
            className="pd-welcome-banner"
          >
            <div className="pd-welcome-main">
              <div className="pd-welcome-icon" aria-hidden="true">
                <FaChild />
              </div>
              <div className="pd-welcome-copy">
                <h1 className="pd-welcome-title">Parent Dashboard</h1>
                <p className="pd-welcome-subtitle">
                  Welcome back, {parentName}. Here&apos;s an overview of your children&apos;s academic progress.
                </p>
              </div>
            </div>
            <div className="pd-welcome-actions">
              <div className="pd-time-card" aria-label="Current time">
                <div className="pd-time-label"><FaClock /> Time</div>
                <div className="pd-time-value">
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </div>
              </div>
              <button
                type="button"
                className="pd-refresh-btn"
                onClick={() => setRefreshKey((prev) => prev + 1)}
              >
                <FaSyncAlt />
                <span>Refresh</span>
              </button>
            </div>
          </motion.section>

          {/* KPI Cards */}
          <motion.section
            variants={fadeInVariants}
            custom={1}
            initial="hidden"
            animate="visible"
            className="pd-kpi-grid"
            aria-label="Parent summary"
          >
            <KpiCard icon={FaUsers} label="Total Children" value={stats.totalChildren} subtitle="Linked student profiles" tone="blue" />
            <KpiCard icon={FaUserGraduate} label="Active Students" value={stats.activeChildren} subtitle="Currently active/enrolled" tone="green" />
            <KpiCard
              icon={FaCalendarCheck}
              label="Average Attendance"
              value={`${stats.avgAttendance || 0}%`}
              subtitle="Across linked active students"
              tone="amber"
            />
            <KpiCard
              icon={FaRupeeSign}
              label="Pending Fees"
              value={`₹${Number(stats.pendingFees || 0).toLocaleString("en-IN")}`}
              subtitle="Outstanding across linked students"
              tone="red"
            />
          </motion.section>


          {/* Quick Access */}
          <motion.section
            variants={fadeInVariants}
            custom={3}
            initial="hidden"
            animate="visible"
            className="pd-section-card"
          >
            <div className="pd-section-head">
              <div>
                <h2 className="pd-section-title"><FaArrowRight /> Quick Access</h2>
                <p className="pd-section-subtitle">Navigate to frequently used parent services</p>
              </div>
            </div>
            <div className="pd-section-body">
              <div className="pd-quick-grid">
                {quickAccessItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`pd-quick-card tone-${item.tone}`}
                    onClick={item.onClick}
                  >
                    <span className="pd-quick-icon"><item.icon /></span>
                    <span className="pd-quick-text">
                      <span className="pd-quick-title">{item.title}</span>
                      <span className="pd-quick-desc">{item.description}</span>
                    </span>
                    <span className="pd-quick-arrow"><FaArrowRight /></span>
                  </button>
                ))}
              </div>
            </div>
          </motion.section>
          
          {/* Children Overview */}
          <motion.section
            variants={fadeInVariants}
            custom={2}
            initial="hidden"
            animate="visible"
            className="pd-section-card"
          >
            <div className="pd-section-head">
              <div>
                <h2 className="pd-section-title"><FaChild /> Children Overview</h2>
                <p className="pd-section-subtitle">View your children&apos;s academic information</p>
              </div>
              <span className="pd-count-badge">
                {children.length} {children.length === 1 ? "Child" : "Children"}
              </span>
            </div>
            <div className="pd-section-body">
              {children.length === 0 ? (
                <div className="pd-empty-state">
                  <div className="pd-empty-icon"><FaChild /></div>
                  <h3>No children linked</h3>
                  <p>No student accounts are linked to your parent account yet.</p>
                </div>
              ) : (
                <div className="pd-children-grid">
                  {children.map((child, idx) => {
                    const active = isChildActive(child.status);
                    const courseName = child?.course_id?.name || child?.course?.name || child?.courseName || "Course not assigned";
                    const academicStatus = child?.academicStatus || child?.status || "—";
                    const enrollment = child?.enrollmentNumber || child?.enrollmentNo || child?.rollNumber || child?.admissionNumber || "Student profile";
                    const profileImage = child?.profileImage || child?.photo || child?.avatar || child?.image || null;
                    return (
                      <motion.article
                        key={child._id || idx}
                        variants={fadeInVariants}
                        custom={idx}
                        initial="hidden"
                        animate="visible"
                        className="pd-child-card"
                      >
                        <div className="pd-child-top">
                          <div className="pd-child-avatar" aria-hidden="true">
                            {profileImage ? (
                              <img src={profileImage} alt="" />
                            ) : (
                              <span>{getInitials(child.fullName || child.name)}</span>
                            )}
                          </div>
                          <div className="pd-child-identity">
                            <h3 className="pd-child-name" title={child.fullName || child.name || "Student"}>
                              {child.fullName || child.name || "Student"}
                            </h3>
                            <div className="pd-child-enrollment">
                              <FaIdCard /> <span>{enrollment}</span>
                            </div>
                          </div>
                          <span className={`pd-status-pill ${active ? "is-active" : "is-inactive"}`}>
                            {active ? <FaCheckCircle /> : <FaExclamationCircle />}
                            {active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <div className="pd-child-meta">
                          <div className="pd-meta-item">
                            <span className="pd-meta-label"><FaBookOpen /> Course</span>
                            <span className="pd-meta-value">{courseName}</span>
                          </div>
                          <div className="pd-meta-item">
                            <span className="pd-meta-label"><FaClipboardCheck /> Academic Status</span>
                            <span className="pd-meta-value">{String(academicStatus).replace(/_/g, " ")}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="pd-view-profile-btn"
                          onClick={() => navigate(`/dashboard/parent/child/${child._id}`)}
                        >
                          View Child Profile <FaArrowRight />
                        </button>
                      </motion.article>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>



          {/* Recent Updates */}
          <motion.section
            variants={fadeInVariants}
            custom={4}
            initial="hidden"
            animate="visible"
            className="pd-section-card"
          >
            <div className="pd-section-head">
              <div>
                <h2 className="pd-section-title"><FaBell /> Recent Updates</h2>
                <p className="pd-section-subtitle">Latest relevant notifications and announcements</p>
              </div>
              <button type="button" className="pd-link-btn" onClick={() => navigate("/parent/notifications")}>
                View All <FaArrowRight />
              </button>
            </div>
            <div className="pd-section-body">
              {notificationsLoading ? (
                <div className="pd-inline-state" role="status">Loading recent updates...</div>
              ) : notifications.length === 0 ? (
                <div className="pd-empty-state compact">
                  <div className="pd-empty-icon"><FaBell /></div>
                  <h3>No recent updates</h3>
                  <p>There are no notifications or announcements at the moment.</p>
                </div>
              ) : (
                <div className="pd-notif-list">
                  {notifications.slice(0, 5).map((n) => {
                    const created = n?.createdAt ? new Date(n.createdAt) : null;
                    const dateLabel = created && !Number.isNaN(created.getTime())
                      ? created.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      : null;
                    const category = n?.type || n?.category || "General";
                    const description = n?.message || n?.description || "";
                    const handleClick = () => {
                      if (n?.actionUrl && typeof n.actionUrl === "string" && n.actionUrl.startsWith("/")) {
                        navigate(n.actionUrl);
                      } else if (n?._id) {
                        navigate(`/notification/view/${n._id}`);
                      } else {
                        navigate("/parent/notifications");
                      }
                    };
                    return (
                      <button key={n?._id || `${n?.title}-${n?.createdAt}`} type="button" className="pd-notif-item" onClick={handleClick}>
                        <div className="pd-notif-icon"><FaBell /></div>
                        <div className="pd-notif-content">
                          <div className="pd-notif-top">
                            <h3 className="pd-notif-title">{n?.title || "Notification"}</h3>
                            {dateLabel && <span className="pd-notif-date">{dateLabel}</span>}
                          </div>
                          {description && <p className="pd-notif-desc">{description}</p>}
                          <div className="pd-notif-meta">
                            <span className="pd-notif-cat">{String(category).replace(/_/g, " ")}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.section>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function KpiCard({ icon: IconComp, label, value, subtitle, tone }) {
  // eslint-disable-next-line no-unused-vars
  const Icon = IconComp;
  return (
    <article className={`pd-kpi-card tone-${tone}`}>
      <div className="pd-kpi-icon"><Icon /></div>
      <div className="pd-kpi-body">
        <span className="pd-kpi-label">{label}</span>
        <span className="pd-kpi-value">{value}</span>
        {subtitle && <span className="pd-kpi-sub">{subtitle}</span>}
      </div>
    </article>
  );
}
