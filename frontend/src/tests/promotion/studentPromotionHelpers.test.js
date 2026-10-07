import { describe, it, expect } from 'vitest';
import {
  getResultStatus,
  getAttendanceStatus,
} from '../../pages/dashboard/College-Admin/StudentPromotion';

describe('StudentPromotion helpers - attendance & result status (RCA-3)', () => {
  describe('getAttendanceStatus', () => {
    it('Test A: required = 0 and status = ATTENDANCE_NOT_AVAILABLE yields passed = true with no attendance requirement message', () => {
      const data = {
        attendance_snapshot: {
          percentage: 0,
          requiredPercentage: 0,
          totalSessions: 0,
          status: 'ATTENDANCE_NOT_AVAILABLE',
          passed: true,
        },
      };

      const result = getAttendanceStatus(data);
      expect(result).not.toBeNull();
      expect(result.passed).toBe(true);
      expect(result.label).toBe('Attendance');
      expect(result.message).toContain('No attendance requirement');
      expect(result.value).toBe('Not required');
    });

    it('Test B: required = 75 and status = ATTENDANCE_NOT_AVAILABLE yields passed = false with data not available', () => {
      const data = {
        attendance_snapshot: {
          percentage: 0,
          requiredPercentage: 75,
          totalSessions: 0,
          status: 'ATTENDANCE_NOT_AVAILABLE',
          passed: false,
        },
      };

      const result = getAttendanceStatus(data);
      expect(result).not.toBeNull();
      expect(result.passed).toBe(false);
      expect(result.label).toBe('Attendance');
      expect(result.value).toBe('Data not available');
      expect(result.reason).toContain('75% required');
    });
  });

  describe('getResultStatus', () => {
    it('Test C: result_status = PUBLISHED with 0 KTs displays Result is clear even when promotion_outcome = BLOCKED', () => {
      const data = {
        result_status: 'PUBLISHED',
        failed_subject_count: 0,
        kt_count: 0,
        promotion_outcome: 'BLOCKED',
        decision_reason: 'ATTENDANCE_NOT_AVAILABLE',
      };

      const result = getResultStatus(data);
      expect(result).not.toBeNull();
      expect(result.passed).toBe(true);
      expect(result.label).toBe('Result');
      expect(result.message).toBe('Result is clear');
    });

    it('Test D: No published result yields no-result behavior', () => {
      const data = {
        result_status: 'NO_RESULT',
        promotion_outcome: 'NO_RESULT',
        decision_reason: 'NO_RESULT',
      };

      const result = getResultStatus(data);
      expect(result).not.toBeNull();
      expect(result.passed).toBe(false);
      expect(result.label).toBe('Result');
      expect(result.reason).toBe('No published semester result available');
    });

    it('Test E: Incomplete result yields incomplete marks behavior', () => {
      const data = {
        result_status: 'INCOMPLETE',
        promotion_outcome: 'INCOMPLETE',
        decision_reason: 'RESULT_INCOMPLETE',
      };

      const result = getResultStatus(data);
      expect(result).not.toBeNull();
      expect(result.passed).toBe(false);
      expect(result.label).toBe('Result');
      expect(result.reason).toBe('Semester result contains incomplete marks');
    });

    it('Preserves ATKT display when failed subjects within limit even if blocked by fee', () => {
      const data = {
        result_status: 'PUBLISHED',
        failed_subject_count: 1,
        kt_count: 1,
        policy_snapshot: { maxAllowedKTs: 2 },
        promotion_outcome: 'BLOCKED',
        decision_reason: 'FEE_NOT_CLEARED',
      };

      const result = getResultStatus(data);
      expect(result).not.toBeNull();
      expect(result.passed).toBe(true);
      expect(result.label).toBe('KT');
      expect(result.message).toBe('1 KT — Allowed: 2');
    });

    it('Preserves KT limit exceeded failure display', () => {
      const data = {
        result_status: 'PUBLISHED',
        failed_subject_count: 3,
        kt_count: 3,
        policy_snapshot: { maxAllowedKTs: 2 },
        promotion_outcome: 'BLOCKED',
        decision_reason: 'KT_LIMIT_EXCEEDED',
      };

      const result = getResultStatus(data);
      expect(result).not.toBeNull();
      expect(result.passed).toBe(false);
      expect(result.label).toBe('KT');
      expect(result.reason).toBe('KT limit exceeded');
    });
  });
});
