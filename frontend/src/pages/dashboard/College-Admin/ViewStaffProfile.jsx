// import React, { useState, useEffect, useMemo, useContext } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import { AuthContext } from "../../../auth/AuthContext";
// import api from "../../../api/axios";
// import Loading from "../../../components/Loading";
// import { Container, Row, Col, Card, Badge, Button } from "react-bootstrap";
// import {
//   FaUser,
//   FaPhone,
//   FaMapMarkerAlt,
//   FaBirthdayCake,
//   FaBriefcase,
//   FaBuilding,
//   FaCalendarAlt,
//   FaIdCard,
//   FaUsers,
//   FaGraduationCap,
//   FaCheckCircle,
// } from "react-icons/fa";
// import "./ViewStaffProfile.css";

// const BRAND_COLORS = {
//   primary: { main: "#1a4b6d", gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)" },
//   success: { main: "#28a745", gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)" },
//   info: { main: "#17a2b8", gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)" },
//   warning: { main: "#ffc107", gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)" },
// };



// export default function ViewStaffProfile() {
//   const { userId } = useParams();
//   const { user: currentUser } = useContext(AuthContext);
//   const navigate = useNavigate();

//   // If no userId param, use current user's ID (self route)
//   const actualUserId = userId || currentUser?.id;

//   const [profile, setProfile] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const canEdit = useMemo(() => {
//     if (!currentUser || !profile) return false;
//     const isSelf = currentUser.id === profile.user_id?._id?.toString();
//     const isCollegeAdmin = currentUser.role === "COLLEGE_ADMIN";
//     return isSelf || isCollegeAdmin;
//   }, [currentUser, profile]);

//   useEffect(() => {
//     const fetchProfile = async () => {
//       try {
//         console.log("[ViewStaffProfile] Fetching profile for userId:", actualUserId);
//         setLoading(true);
//         const res = await api.get(`/staff/profile/${actualUserId}`);
//         console.log("[ViewStaffProfile] API response:", res.data);
//         setProfile(res.data.data || res.data);
//       } catch (err) {
//         console.error("[ViewStaffProfile] API error:", err);
//         setError(err.response?.data?.message || "Failed to load profile");
//       } finally {
//         setLoading(false);
//       }
//     };
//     if (actualUserId) fetchProfile();
//   }, [actualUserId]);

//   if (loading) return <Loading />;
//   if (error) return <div className="text-center text-danger p-4">{error}</div>;
//   if (!profile) return <div className="text-center p-4">Profile not found</div>;

//   const personalFields = [
//     { icon: FaPhone, label: "Mobile", value: profile.mobileNumber || "-" },
//     { icon: FaBriefcase, label: "Designation", value: profile.designation || "-" },
//     { icon: FaBuilding, label: "Employment Type", value: profile.employmentType?.replace("_", " ") },
//     { icon: FaCalendarAlt, label: "Joining Date", value: profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : "-" },
//     { icon: FaUser, label: "Gender", value: profile.gender || "-" },
//     { icon: FaBirthdayCake, label: "Date of Birth", value: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "-" },
//     { icon: FaIdCard, label: "Blood Group", value: profile.bloodGroup || "-" },
//     { icon: FaMapMarkerAlt, label: "Address", value: profile.address || "-" },
//   ];

//   const emergencyFields = [
//     { label: "Emergency Contact", value: profile.emergencyContactName || "-", sub: profile.emergencyRelation ? ` (${profile.emergencyRelation})` : "" },
//     { label: "Emergency Phone", value: profile.emergencyContactPhone || "-" },
//   ];

//   return (
//     <div className="dashboard-wrapper">
//       <Container fluid className="py-4">
//         {/* Header */}
//         <Row className="mb-4">
//             <Col>
//               <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
//                 <div style={{
//                   width: 80, height: 80, borderRadius: "50%",
//                   background: BRAND_COLORS.primary.gradient,
//                   display: "flex", alignItems: "center", justifyContent: "center",
//                   color: "white", fontSize: "2rem"
//                 }}>
//                   <FaUser />
//                 </div>
//                 <div>
//                   <h2 style={{ color: BRAND_COLORS.primary.main, margin: 0 }}>
//                     {profile.user_id?.name || "Unnamed Staff"}
//                   </h2>
//                   <p className="text-muted mb-0">
//                     {profile.user_id?.role?.replace("_", " ")} • {profile.college_id?.name || "Unknown College"}
//                   </p>
//                   <p className="text-muted mb-0"><small>ID: {userId}</small></p>
//                 </div>
//               </div>
//             </Col>
//             <Col xs="auto">
//               {canEdit && (
//                 <Button
//                   variant="primary"
//                   onClick={() => navigate(`/staff/profile/edit/${userId}`)}
//                   style={{
//                     background: BRAND_COLORS.primary.gradient,
//                     border: "none",
//                     padding: "0.75rem 1.5rem",
//                   }}
//                 >
//                   Edit Profile
//                 </Button>
//               )}
//             </Col>
//           </Row>

//         {/* Staff Info Cards */}
//         <Row className="g-4">
//           {personalFields.map((field, i) => (
//             <Col md={6} lg={4} key={i}>
//               <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
//                 <Card.Body>
//                   <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
//                     <div style={{
//                       width: 48, height: 48, borderRadius: "0.75rem",
//                       background: BRAND_COLORS.info.gradient,
//                       display: "flex", alignItems: "center", justifyContent: "center", color: "white"
//                     }}>
//                       <field.icon size={20} />
//                     </div>
//         <div className="card-content">
//                       <div className="text-muted" style={{ fontSize: "0.85rem" }}>{field.label}</div>
//                       <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
//                         {field.value}
//                       </div>
//                     </div>
//                   </div>
//                 </Card.Body>
//               </Card>
//             </Col>
//           ))}

//           {/* Qualification & Experience */}
//           <Col md={6} lg={4}>
//             <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
//               <Card.Body>
//                 <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
//                   <div style={{
//                     width: 48, height: 48, borderRadius: "0.75rem",
//                     background: BRAND_COLORS.warning.gradient,
//                     display: "flex", alignItems: "center", justifyContent: "center", color: "white"
//                   }}>
//                     <FaGraduationCap size={20} />
//                   </div>
//                   <div className="card-content">
//                     <div className="text-muted" style={{ fontSize: "0.85rem" }}>Qualification</div>
//                     <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
//                       {profile.qualification || "-"}
//                     </div>
//                     <div className="text-muted" style={{ fontSize: "0.85rem" }}>Experience: {profile.experienceYears || 0} yrs</div>
//                   </div>
//                 </div>
//               </Card.Body>
//             </Card>
//           </Col>

//           {/* Emergency Contact */}
//           <Col md={6} lg={4}>
//             <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
//               <Card.Body>
//                 <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
//                   <div style={{
//                     width: 48, height: 48, borderRadius: "0.75rem",
//                     background: BRAND_COLORS.warning.gradient,
//                     display: "flex", alignItems: "center", justifyContent: "center", color: "white"
//                   }}>
//                     <FaUsers size={20} />
//                   </div>
//                   <div className="card-content" style={{ flex: 1 }}>
//                     <div className="text-muted" style={{ fontSize: "0.85rem" }}>Emergency Contact</div>
//                     <div className="fw-bold mb-1" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
//                       {emergencyFields[0].value}
//                       <small className="text-muted">{emergencyFields[0].sub}</small>
//                     </div>
//                     <div className="fw-medium" style={{ fontSize: "0.95rem" }}>
//                       {emergencyFields[1].value}
//                     </div>
//                   </div>
//                 </div>
//               </Card.Body>
//             </Card>
//           </Col>

//           {/* Location */}
//           <Col md={6} lg={4}>
//             <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
//               <Card.Body>
//                 <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
//                   <div style={{
//                     width: 48, height: 48, borderRadius: "0.75rem",
//                     background: BRAND_COLORS.success.gradient,
//                     display: "flex", alignItems: "center", justifyContent: "center", color: "white"
//                   }}>
//                     <FaMapMarkerAlt size={20} />
//                   </div>
//                   <div className="card-content" style={{ flex: 1 }}>
//                     <div className="text-muted" style={{ fontSize: "0.85rem" }}>Address</div>
//                     <div className="fw-medium" style={{ fontSize: "1rem", lineHeight: 1.5 }}>
//                       {profile.address || "-"} <br />
//                       {profile.city || ""} {profile.state || ""} {profile.pincode || ""}
//                     </div>
//                   </div>
//                 </div>
//               </Card.Body>
//             </Card>
//           </Col>

//           {/* College */}
//           <Col md={6} lg={4}>
//             <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
//               <Card.Body>
//                 <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
//                   <div style={{
//                     width: 48, height: 48, borderRadius: "0.75rem",
//                     background: BRAND_COLORS.primary.gradient,
//                     display: "flex", alignItems: "center", justifyContent: "center", color: "white"
//                   }}>
//                     <FaBuilding size={20} />
//                   </div>
//                     <div className="card-content">
//                       <div className="text-muted" style={{ fontSize: "0.85rem" }}>{field.label}</div>
//                       <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
//                         {field.value}
//                       </div>
//                     </div>
//                     <div className="text-muted" style={{ fontSize: "0.8rem" }}>
//                       {profile.college_id?.code || ""}
//                     </div>
//                   </div>
//                 </Card.Body>
//               </Card>
//             </Col>

//           {/* User Status */}
//           <Col md={6} lg={4}>
//             <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
//               <Card.Body>
//                 <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
//                   <div style={{
//                     width: 48, height: 48, borderRadius: "0.75rem",
//                     background: profile.user_id?.isActive ? BRAND_COLORS.success.gradient : "#6c757d",
//                     display: "flex", alignItems: "center", justifyContent: "center", color: "white"
//                   }}>
//                     <FaCheckCircle size={20} />
//                   </div>
//                   <div className="card-content">
//                     <div className="text-muted" style={{ fontSize: "0.85rem" }}>Account Status</div>
//                     <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
//                       {profile.user_id?.isActive ? "Active" : "Inactive"}
//                     </div>
//                     {profile.user_id?.mustChangePassword && (
//                       <Badge bg="warning" className="mt-1">Password change required</Badge>
//                     )}
//                   </div>
//                 </Card.Body>
//               </Card>
//             </Col>
//         </Row>
//       </Container>
//     </div>
//   );
// }


import React, { useState, useEffect, useMemo, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../auth/AuthContext";
import api from "../../../api/axios";
import Loading from "../../../components/Loading";
import { Container, Row, Col, Card, Badge, Button } from "react-bootstrap";
import {
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaBirthdayCake,
  FaBriefcase,
  FaBuilding,
  FaCalendarAlt,
  FaIdCard,
  FaUsers,
  FaGraduationCap,
  FaCheckCircle,
} from "react-icons/fa";
import "./ViewStaffProfile.css";

const BRAND_COLORS = {
  primary: { main: "#1a4b6d", gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)" },
  success: { main: "#28a745", gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)" },
  info: { main: "#17a2b8", gradient: "linear-gradient(135deg, #17a2b8 0%, #138496 100%)" },
  warning: { main: "#ffc107", gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)" },
};

export default function ViewStaffProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const actualUserId = userId || currentUser?.id;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const canEdit = useMemo(() => {
    if (!currentUser || !profile) return false;
    const isSelf = currentUser.id === profile.user_id?._id?.toString();
    const isCollegeAdmin = currentUser.role === "COLLEGE_ADMIN";
    return isSelf || isCollegeAdmin;
  }, [currentUser, profile]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("[ViewStaffProfile] Fetching profile for userId:", actualUserId);
        setLoading(true);
        const res = await api.get(`/staff/profile/${actualUserId}`);
        console.log("[ViewStaffProfile] API response:", res.data);
        setProfile(res.data.data || res.data);
      } catch (err) {
        console.error("[ViewStaffProfile] API error:", err);
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    if (actualUserId) fetchProfile();
  }, [actualUserId]);

  if (loading) return <Loading />;
  if (error) return <div className="text-center text-danger p-4">{error}</div>;
  if (!profile) return <div className="text-center p-4">Profile not found</div>;

  const personalFields = [
    { icon: FaPhone, label: "Mobile", value: profile.mobileNumber || "-" },
    { icon: FaBriefcase, label: "Designation", value: profile.designation || "-" },
    { icon: FaBuilding, label: "Employment Type", value: profile.employmentType?.replace("_", " ") || "-" },
    { icon: FaCalendarAlt, label: "Joining Date", value: profile.joiningDate ? new Date(profile.joiningDate).toLocaleDateString() : "-" },
    { icon: FaUser, label: "Gender", value: profile.gender || "-" },
    { icon: FaBirthdayCake, label: "Date of Birth", value: profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "-" },
    { icon: FaIdCard, label: "Blood Group", value: profile.bloodGroup || "-" },
    { icon: FaMapMarkerAlt, label: "Address", value: profile.address || "-" },
  ];

  const emergencyFields = [
    { label: "Emergency Contact", value: profile.emergencyContactName || "-", sub: profile.emergencyRelation ? ` (${profile.emergencyRelation})` : "" },
    { label: "Emergency Phone", value: profile.emergencyContactPhone || "-" },
  ];

  return (
    <div className="dashboard-wrapper">
      <Container fluid className="py-4">

        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: BRAND_COLORS.primary.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "2rem"
              }}>
                <FaUser />
              </div>
              <div>
                <h2 style={{ color: BRAND_COLORS.primary.main, margin: 0 }}>
                  {profile.user_id?.name || "Unnamed Staff"}
                </h2>
                <p className="text-muted mb-0">
                  {profile.user_id?.role?.replace("_", " ")} • {profile.college_id?.name || "Unknown College"}
                </p>
                <p className="text-muted mb-0">
                  <small>ID: {actualUserId}</small>
                </p>
              </div>
            </div>
          </Col>

          <Col xs="auto">
            {canEdit && (
              <Button
                variant="primary"
                onClick={() => navigate(`/staff/profile/edit/${actualUserId}`)}
                style={{
                  background: BRAND_COLORS.primary.gradient,
                  border: "none",
                  padding: "0.75rem 1.5rem",
                }}
              >
                Edit Profile
              </Button>
            )}
          </Col>
        </Row>

        {/* Cards */}
        <Row className="g-4">

          {personalFields.map((field, i) => {
            return (
              <Col md={6} lg={4} key={i}>
                <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
                  <Card.Body>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: "0.75rem",
                        background: BRAND_COLORS.info.gradient,
                        display: "flex", alignItems: "center", justifyContent: "center", color: "white"
                      }}>
                        <field.icon size={20} />
                      </div>
                      <div className="card-content">
                        <div className="text-muted" style={{ fontSize: "0.85rem" }}>{field.label}</div>
                        <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                          {field.value}
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}

          {/* Qualification */}
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: "0.75rem",
                    background: BRAND_COLORS.warning.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white"
                  }}>
                    <FaGraduationCap size={20} />
                  </div>
                  <div className="card-content">
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>Qualification</div>
                    <div className="fw-bold" style={{ fontSize: "1.1rem", color: "#1a4b6d" }}>
                      {profile.qualification || "-"}
                    </div>
                    <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                      Experience: {profile.experienceYears || 0} yrs
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Emergency */}
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <FaUsers size={20} />
                  <div>
                    <div>{emergencyFields[0].value}{emergencyFields[0].sub}</div>
                    <div>{emergencyFields[1].value}</div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* ✅ FIXED COLLEGE CARD */}
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm" style={{ borderRadius: "1rem" }}>
              <Card.Body>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <FaBuilding size={20} />
                  <div>
                    <div className="text-muted">College</div>
                    <div className="fw-bold">
                      {profile.college_id?.name || "-"}
                    </div>
                    <div className="text-muted">
                      {profile.college_id?.code || ""}
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Status */}
          <Col md={6} lg={4}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Body>
                <div>
                  {profile.user_id?.isActive ? "Active" : "Inactive"}
                </div>
              </Card.Body>
            </Card>
          </Col>

        </Row>
      </Container>
    </div>
  );
}