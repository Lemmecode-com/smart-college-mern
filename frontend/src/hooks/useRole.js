import { useContext } from "react";
import { AuthContext } from "../auth/AuthContext";
import { rolePermissions } from "../components/Sidebar/config/rolePermissions";

/**
 * Custom hook to check user permissions
 * @returns {Object} Role checking functions
 */
export default function useRole() {
  const { user } = useContext(AuthContext);

  const canCreate = (sectionId) => {
    if (!user) return false;
    return rolePermissions[user.role]?.canCreate?.includes(sectionId) || false;
  };

  const canEdit = (sectionId) => {
    if (!user) return false;
    return rolePermissions[user.role]?.canEdit?.includes(sectionId) || false;
  };

  const canDelete = (sectionId) => {
    if (!user) return false;
    return rolePermissions[user.role]?.canDelete?.includes(sectionId) || false;
  };

  const hasAccess = (sectionId) => {
    if (!user) return false;
    const perms = rolePermissions[user.role];
    if (!perms) return false;
    if (perms.canAccess.includes('all')) return true;
    return perms.canAccess.includes(sectionId);
  };

  const isPrincipal = user?.role === "PRINCIPAL";
  const isCollegeAdmin = user?.role === "COLLEGE_ADMIN";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isTeacher = user?.role === "TEACHER";
  const isStudent = user?.role === "STUDENT";

  return {
    user,
    role: user?.role,
    canCreate,
    canEdit,
    canDelete,
    hasAccess,
    isPrincipal,
    isCollegeAdmin,
    isSuperAdmin,
    isTeacher,
    isStudent,
  };
}
