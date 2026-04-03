import { useContext, useMemo } from "react";
import { AuthContext } from "../auth/AuthContext";

/**
 * Custom hook for notification permissions based on user role
 * Returns permission flags for create, edit, delete, view operations
 */
export function useNotificationPermissions() {
  const { user } = useContext(AuthContext);

  const permissions = useMemo(() => {
    if (!user?.role) {
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canView: false,
        canSeeOwnNotifications: false,
        role: null,
      };
    }

    switch (user.role) {
      case "SUPER_ADMIN":
        return {
          canCreate: true,
          canEdit: true,
          canDelete: true,
          canView: true,
          canSeeOwnNotifications: true,
          role: "SUPER_ADMIN",
        };

      case "COLLEGE_ADMIN":
        return {
          canCreate: true,
          canEdit: "own_only", // Can only edit their own notifications
          canDelete: "own_only", // Can only delete their own notifications
          canView: true,
          canSeeOwnNotifications: true,
          role: "COLLEGE_ADMIN",
        };

      case "TEACHER":
        return {
          canCreate: true,
          canEdit: "own_only", // Can only edit their own notifications
          canDelete: "own_only", // Can only delete their own notifications
          canView: true,
          canSeeOwnNotifications: true,
          role: "TEACHER",
        };

      case "STUDENT":
        return {
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canView: true,
          canSeeOwnNotifications: false,
          role: "STUDENT",
        };

      default:
        return {
          canCreate: false,
          canEdit: false,
          canDelete: false,
          canView: true,
          canSeeOwnNotifications: false,
          role: user.role,
        };
    }
  }, [user]);

  /**
   * Check if user can perform action on a specific notification
   * @param {Object} notification - The notification object
   * @returns {Object} - Permission flags for this specific notification
   */
  const canPerformAction = useMemo(() => {
    return (notification) => {
      if (!notification || !user) return { canEdit: false, canDelete: false };

      const isOwner = notification.isOwner || 
                      notification.createdBy === user.id || 
                      notification.createdBy === user._id;

      return {
        canEdit: permissions.canEdit === true || 
                 (permissions.canEdit === "own_only" && isOwner),
        canDelete: permissions.canDelete === true || 
                   (permissions.canDelete === "own_only" && isOwner),
        isOwner,
      };
    };
  }, [permissions, user]);

  return {
    permissions,
    canPerformAction,
    role: permissions.role,
  };
}

/**
 * Hook to get API endpoint based on user role
 * @returns {Object} - API endpoints for current role
 */
export function useNotificationEndpoints() {
  const { user } = useContext(AuthContext);

  const endpoints = useMemo(() => {
    if (!user?.role) return {};

    switch (user.role) {
      case "COLLEGE_ADMIN":
        return {
          list: "/notifications/admin/read",
          create: "/notifications/admin/create",
          count: "/notifications/count/admin",
          unread: "/notifications/unread/bell",
        };

      case "TEACHER":
        return {
          list: "/notifications/teacher/read",
          create: "/notifications/teacher/create",
          count: "/notifications/count/teacher",
          unread: "/notifications/unread/bell",
        };

      case "STUDENT":
        return {
          list: "/notifications/student/read",
          count: "/notifications/count/student",
          unread: "/notifications/unread/bell",
        };

      default:
        return {};
    }
  }, [user]);

  return endpoints;
}

export default useNotificationPermissions;
