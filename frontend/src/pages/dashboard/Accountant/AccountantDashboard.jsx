import React, { useState, useMemo, useEffect, useContext } from "react";
import { Navigate, Link } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { Container, Row, Col, Card, Badge, Table } from "react-bootstrap";
import {
  FaMoneyBillWave,
  FaFileAlt,
  FaCalendarAlt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaPlus,
  FaSyncAlt,
  FaRupeeSign,
  FaChartLine,
  FaBell,
  FaDownload,
  FaHistory,
  FaUserGraduate,
} from "react-icons/fa";
import { motion } from "framer-motion";
import "./AccountantDashboard.css";

const BRAND_COLORS = {
  primary: { main: "#1a4b6d", dark: "#0f3a4a", gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)" },
  success: { main: "#28a745", gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)" },
  warning: { main: "#ffc107", gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)" },
  danger: { main: "#dc3545", gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)" },
  info: { main: "#17a2b8", gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)" },
};

const fadeInVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" } }),
};

export default function AccountantDashboard() {
  const { user } = useContext(AuthContext);

  // Security
  if (!user) return <Navigate to="/login" />;
  if (user.role !== "ACCOUNTANT") return <Navigate to="/dashboard" />;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ totalFees: 0, totalCollected: 0, pendingAmount: 0, overdueInstallments: 0 });
  const [pendingStudents, setPendingStudents] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        // Parallel fetch: summary + detailed payment report
        const [summaryRes, reportRes] = await Promise.all([
          api.get("/accountant/dashboard"),
          api.get("/admin/payments/report"),
        ]);

        const summaryData = summaryRes.data?.data || summaryRes.data || {};
        const reportData = reportRes.data?.report || [];

        // Extract summary stats
        setStats({
          totalFees: summaryData.totalFees || 0,
          totalCollected: summaryData.totalCollected || 0,
          pendingAmount: summaryData.pendingAmount || 0,
          overdueInstallments: summaryData.overdueInstallments || 0,
        });

        // Compute students with pending/overdue installments
        const pendingList = reportData
          .filter((r) => {
            // Include if any installment is pending OR if total pending > 0
            const hasPendingInstallment = r.installments?.some((inst) => inst.status === "PENDING");
            const hasPendingAmount = r.pendingAmount > 0;
            return hasPendingInstallment || hasPendingAmount;
          })
          .map((r) => ({
            studentId: r.student?._id,
            studentName: r.student?.fullName || "Unknown",
            email: r.student?.email || "",
            course: r.course?.name || "N/A",
            totalFee: r.totalFee,
            paidAmount: r.paidAmount,
            pendingAmount: r.pendingAmount,
            overdueCount: r.installments?.filter((i) => i.status === "PENDING" && new Date(i.dueDate) < new Date()).length || 0,
          }))
          .sort((a, b) => b.pendingAmount - a.pendingAmount)
          .slice(0, 10); // Top 10 highest pending

        setPendingStudents(pendingList);
      } catch (err) {
        console.error("Accountant dashboard error:", err);
        setError(err.response?.data?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <Loading />;
  if (error) return <div className="text-center text-danger mt-4 p-4">{error}</div>;

  const { totalFees, totalCollected, pendingAmount, overdueInstallments } = stats;

  return (
    <div className="dashboard-wrapper">
      <Container fluid className="dashboard-container-inner">
        {/* HEADER */}
        <motion.div className="dashboard-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="dashboard-header-hero">
            <Row className="align-items-center">
              <Col>
                <h2 className="mb-1" style={{ fontWeight: 700 }}>📊 Accountant Dashboard</h2>
                <p className="mb-0" style={{ opacity: 0.85, fontSize: "0.95rem" }}>
                  Manage fee structures, track payments, and monitor pending dues
                </p>
              </Col>
              <Col xs="auto">
                <div className="header-icon-wrapper"><FaChartLine size={28} /></div>
              </Col>
            </Row>
          </div>
        </motion.div>

        {/* ERROR */}
        {error && (
          <motion.div className="alert alert-danger" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <FaExclamationTriangle className="me-2" />{error}
          </motion.div>
        )}

        {/* STATS CARDS */}
        <Row className="g-4 mb-4">
          {[
            { label: "Total Collected", value: `₹${(totalCollected || 0).toLocaleString()}`, icon: FaCheckCircle, color: BRAND_COLORS.success.main, gradient: BRAND_COLORS.success.gradient },
            { label: "Pending Amount", value: `₹${(pendingAmount || 0).toLocaleString()}`, icon: FaExclamationTriangle, color: BRAND_COLORS.warning.main, gradient: BRAND_COLORS.warning.gradient },
            { label: "Fee Structures", value: totalFees, icon: FaMoneyBillWave, color: BRAND_COLORS.info.main, gradient: BRAND_COLORS.info.gradient },
            { label: "Overdue Installments", value: overdueInstallments, icon: FaCalendarAlt, color: BRAND_COLORS.danger.main, gradient: BRAND_COLORS.danger.gradient },
          ].map((stat, i) => (
            <Col key={i} md={6} lg={3}>
              <motion.div custom={i} initial="hidden" animate="visible" variants={fadeInVariants}>
                <Card className="stat-card" style={{ border: "none", borderRadius: "1rem" }}>
                  <Card.Body>
                    <div className="d-flex align-items-center">
                      <div className="stat-icon-wrapper me-3" style={{ background: stat.gradient, width: 56, height: 56, borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                        <stat.icon size={24} />
                      </div>
                      <div>
                        <div className="text-muted" style={{ fontSize: "0.85rem" }}>{stat.label}</div>
                        <div className="fw-bold" style={{ fontSize: "1.5rem", color: stat.color }}>{stat.value}</div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        {/* QUICK ACTIONS */}
        <Row className="g-4 mb-4">
          <Col>
            <h5 className="mb-3" style={{ color: BRAND_COLORS.primary.dark }}>Quick Actions</h5>
          </Col>
        </Row>
        <Row className="g-3 mb-4">
          {[
            { id: 1, icon: FaPlus, label: "Create Fee Structure", path: "/fees/create", gradient: BRAND_COLORS.primary.gradient },
            { id: 2, icon: FaMoneyBillWave, label: "View Fee Structures", path: "/fees/list", gradient: BRAND_COLORS.info.gradient },
            { id: 3, icon: FaHistory, label: "Payment History", path: "/college-admin/payment-history", gradient: BRAND_COLORS.warning.gradient },
            { id: 4, icon: FaFileAlt, label: "Payment Reports", path: "/admin/payments/report", gradient: BRAND_COLORS.success.gradient },
            { id: 5, icon: FaBell, label: "Send Reminders", path: "/admin/payments/trigger-reminders", gradient: BRAND_COLORS.danger.gradient },
            { id: 6, icon: FaDownload, label: "Reconciliation", path: "/admin/payments/reconciliation-report", gradient: "linear-gradient(135deg, #718096 0%, #4a5568 100%)" },
          ].map((action, i) => (
            <Col key={action.id} md={4} lg={3}>
              <motion.div custom={i + 4} initial="hidden" animate="visible" variants={fadeInVariants}>
                <Link to={action.path} className="quick-action-card" style={{ display: "block", textDecoration: "none", background: action.gradient, color: "white", borderRadius: "0.75rem", padding: "1.25rem", transition: "transform 0.2s, box-shadow 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 24px rgba(0,0,0,0.15)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                  <div className="mb-2" style={{ width: 40, height: 40, borderRadius: "0.5rem", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}><action.icon size={20} /></div>
                  <div className="fw-bold" style={{ fontSize: "0.95rem" }}>{action.label}</div>
                  <div className="mt-2" style={{ fontSize: "0.75rem", opacity: 0.8 }}>Click to access →</div>
                </Link>
              </motion.div>
            </Col>
          ))}
        </Row>

        {/* PENDING INSTALLMENTS */}
        <Row className="g-4">
          <Col>
            <Card className="shadow-sm" style={{ borderRadius: "1rem", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              <Card.Header style={{ background: "transparent", borderBottom: "1px solid #e2e8f0", padding: "1rem 1.5rem", fontWeight: 600, color: BRAND_COLORS.primary.dark, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FaExclamationTriangle /> Students with Pending Installments
              </Card.Header>
              <Card.Body style={{ padding: 0 }}>
                {pendingStudents.length === 0 ? (
                  <div className="text-center p-4 text-muted">No pending installments. All students are up to date!</div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0" style={{ borderRadius: "1rem" }}>
                      <thead style={{ background: "#f8fafc" }}>
                        <tr>
                          <th className="ps-4">Student</th>
                          <th>Course</th>
                          <th>Pending Amount</th>
                          <th>Overdue</th>
                          <th className="text-end pe-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingStudents.map((student, idx) => (
                          <tr key={student.studentId || idx}>
                            <td className="ps-4 fw-medium">{student.studentName}</td>
                            <td>{student.course}</td>
                            <td className="text-danger fw-medium">₹{student.pendingAmount?.toLocaleString()}</td>
                            <td>
                              <Badge bg={student.overdueCount > 0 ? "danger" : "warning"}>
                                {student.overdueCount} pending
                              </Badge>
                            </td>
                            <td className="text-end pe-4">
                              <Link to={`/college/view-approved-student/${student.studentId}`} className="btn btn-sm btn-outline-primary">
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

      </Container>
    </div>
  );
}
