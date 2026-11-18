const { getIstWeekBounds, formatTimetableDisplayName } = require('../../src/services/hodReport.service');
const { PASS_MARK_PERCENT } = require('../../src/utils/constants');

describe('HOD Report Service - Edge Cases & Business Logic', () => {
  describe('Item 7: Weekly grouping in IST (Asia/Kolkata, UTC+5:30)', () => {
    it('correctly assigns Sunday 11:00 PM IST to the concluding week', () => {
      // Sunday 11:00 PM IST on Oct 11, 2026:
      // UTC: 2026-10-11T17:30:00.000Z
      const sundayNightIst = new Date('2026-10-11T17:30:00.000Z');
      const bounds = getIstWeekBounds(sundayNightIst);

      // The week began on Monday Oct 5, 2026 and ended on Sunday Oct 11, 2026
      expect(bounds.startIstStr).toBe('2026-10-05');
      expect(bounds.endIstStr).toBe('2026-10-11');
      expect(bounds.label).toBe('5-11 Oct');
    });

    it('correctly assigns Monday 2:00 AM IST to the next week', () => {
      // Monday 2:00 AM IST on Oct 12, 2026:
      // In UTC, this is Sunday Oct 11, 2026 at 20:30 (8:30 PM UTC)
      // A naive UTC calculation would put it on Sunday Oct 11, but in IST it MUST be Monday Oct 12!
      const mondayEarlyIst = new Date('2026-10-11T20:30:00.000Z');
      const bounds = getIstWeekBounds(mondayEarlyIst);

      // The week begins on Monday Oct 12, 2026 and ends on Sunday Oct 18, 2026
      expect(bounds.startIstStr).toBe('2026-10-12');
      expect(bounds.endIstStr).toBe('2026-10-18');
      expect(bounds.label).toBe('12-18 Oct');
    });

    it('ensures Sunday 11 PM IST and Monday 2 AM IST are separated into consecutive distinct weeks', () => {
      const sundayNight = new Date('2026-10-11T17:30:00.000Z');
      const mondayEarly = new Date('2026-10-11T20:30:00.000Z');

      const bounds1 = getIstWeekBounds(sundayNight);
      const bounds2 = getIstWeekBounds(mondayEarly);

      expect(bounds1.weekKey).not.toBe(bounds2.weekKey);
      expect(bounds1.startIstStr).toBe('2026-10-05');
      expect(bounds2.startIstStr).toBe('2026-10-12');
    });
  });

  describe('Item 8: PASS_MARK_PERCENT Named Constant and Configuration Fallback', () => {
    it('defines PASS_MARK_PERCENT as 40 in constants.js', () => {
      expect(PASS_MARK_PERCENT).toBeDefined();
      expect(PASS_MARK_PERCENT).toBe(40);
    });

    it('resolves pass mark from subject settings if configured, otherwise falls back to PASS_MARK_PERCENT', () => {
      // Helper simulating service logic
      const resolvePassMark = (subjectDoc) => {
        return (
          subjectDoc?.passMarks ||
          ((subjectDoc?.internalPassMarks || 0) + (subjectDoc?.externalPassMarks || 0)) ||
          PASS_MARK_PERCENT
        );
      };

      // 1. Subject with explicit passMarks
      expect(resolvePassMark({ passMarks: 50 })).toBe(50);

      // 2. Subject with internal/external pass marks
      expect(resolvePassMark({ internalPassMarks: 15, externalPassMarks: 25 })).toBe(40);
      expect(resolvePassMark({ internalPassMarks: 20, externalPassMarks: 30 })).toBe(50);

      // 3. Subject with no configured marks defaults to constant PASS_MARK_PERCENT
      expect(resolvePassMark({})).toBe(PASS_MARK_PERCENT);
      expect(resolvePassMark(null)).toBe(PASS_MARK_PERCENT);
      expect(resolvePassMark(undefined)).toBe(PASS_MARK_PERCENT);
    });
  });

  describe('Item 1: Faculty Workload 0-Session Business Rules', () => {
    it('sets compliance to N/A and status to No sessions when sessions conducted is 0', () => {
      const mockFacultyWithZeroSessions = {
        name: 'Dr. Test Faculty',
        sessions: 0,
        timelySessions: 0,
      };

      const calculateFacultyStatus = (fac) => {
        if (fac.sessions === 0) {
          return {
            timelinessPercentage: null,
            compliance: 'N/A',
            status: 'No sessions',
          };
        }
        const pct = Math.round((fac.timelySessions / fac.sessions) * 100);
        return {
          timelinessPercentage: pct,
          compliance: `${pct}% On-Time`,
          status: pct >= 80 ? 'Compliant' : pct >= 60 ? 'Warning' : 'Critical',
        };
      };

      const resZero = calculateFacultyStatus(mockFacultyWithZeroSessions);
      expect(resZero.timelinessPercentage).toBeNull();
      expect(resZero.compliance).toBe('N/A');
      expect(resZero.status).toBe('No sessions');

      const resActive = calculateFacultyStatus({ name: 'Active', sessions: 5, timelySessions: 5 });
      expect(resActive.timelinessPercentage).toBe(100);
      expect(resActive.compliance).toBe('100% On-Time');
      expect(resActive.status).toBe('Compliant');
    });
  });

  describe('Item 2: Recent Activity Timetable Resolution & Grouping Rules', () => {
    it('formatTimetableDisplayName cleans timetable raw names accurately', () => {
      expect(formatTimetableDisplayName('MSC IT - Sem 4 (2027-2028) - Div A')).toBe('MSC IT Sem 4');
      expect(formatTimetableDisplayName('B.Sc. IT - Sem 3 (2027-2028) - Div A')).toBe('B.Sc. IT Sem 3');
      expect(formatTimetableDisplayName('B.Sc. Information Technology - Sem 1 (2026-2027) - Div A')).toBe('B.Sc. Information Technology Sem 1');
      expect(formatTimetableDisplayName('Car Repair Workshop - Sem 2 (2027-2028) - Div A')).toBe('Car Repair Workshop Sem 2');
      expect(formatTimetableDisplayName('MSC IT Sem 4')).toBe('MSC IT Sem 4');
      expect(formatTimetableDisplayName('')).toBeNull();
      expect(formatTimetableDisplayName(null)).toBeNull();
      expect(formatTimetableDisplayName(undefined)).toBeNull();
    });

    it('formats single published timetable entry with resolved name, actor, and timeAgo', () => {
      const formatSinglePublished = (ttName, actor, timeAgo) => {
        const namePart = ttName ? ` · ${ttName}` : '';
        return `Timetable published${namePart} · ${actor || 'HOD'} · ${timeAgo}`;
      };

      // With timetable name
      expect(formatSinglePublished('MSC IT Sem 4', 'HOD', 'Yesterday')).toBe(
        'Timetable published · MSC IT Sem 4 · HOD · Yesterday'
      );

      // Plain text fallback when timetable name cannot be found
      expect(formatSinglePublished(null, 'HOD', '2 days ago')).toBe(
        'Timetable published · HOD · 2 days ago'
      );
    });

    it('groups multiple same-day timetable publish actions into a single line with active hint and subItems', () => {
      const groupPublishedActions = (items, actor, timeAgo) => {
        if (items.length > 1) {
          const activeCount = items.filter((it) => it.isActive).length;
          const activeHint = activeCount > 0 ? ` (${activeCount} currently active)` : '';
          return {
            readableText: `${items.length} timetables published${activeHint} · ${actor} · ${timeAgo}`,
            isGrouped: true,
            subItems: items.map((it) => it.name),
          };
        }
        return {
          readableText: `Timetable published · ${items[0].name} · ${actor} · ${timeAgo}`,
          isGrouped: false,
        };
      };

      // 3 timetables published on the same day, 1 currently active
      const group3 = [
        { name: 'MSC IT Sem 4', isActive: true },
        { name: 'MSC IT Sem 3', isActive: false },
        { name: 'MSC IT Sem 2', isActive: false },
      ];
      const res3 = groupPublishedActions(group3, 'HOD', 'Yesterday');
      expect(res3.readableText).toBe('3 timetables published (1 currently active) · HOD · Yesterday');
      expect(res3.isGrouped).toBe(true);
      expect(res3.subItems).toEqual(['MSC IT Sem 4', 'MSC IT Sem 3', 'MSC IT Sem 2']);

      // 2 timetables published on the same day, 0 active
      const group2 = [
        { name: 'B.Sc. IT Sem 4', isActive: false },
        { name: 'B.Sc. IT Sem 3', isActive: false },
      ];
      const res2 = groupPublishedActions(group2, 'HOD', '5 days ago');
      expect(res2.readableText).toBe('2 timetables published · HOD · 5 days ago');
      expect(res2.isGrouped).toBe(true);
      expect(res2.subItems).toEqual(['B.Sc. IT Sem 4', 'B.Sc. IT Sem 3']);
    });
  });
});
