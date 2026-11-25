// Run with: npm test   (Node's built-in test runner, no extra packages)
import test from "node:test";
import assert from "node:assert/strict";
import { getAttendanceState } from "../src/lib/attendanceState.js";
import { holidayInfo } from "../src/lib/holidays.js";

test("not started: can check in, can't check out", () => {
  const s = getAttendanceState(null);
  assert.equal(s.canCheckIn, true);
  assert.equal(s.canCheckOut, false);
});

test("checked in (in-progress): check-in locked, check-out allowed", () => {
  const s = getAttendanceState({ status: "in-progress", checkInTime: { seconds: 1 } });
  assert.equal(s.canCheckIn, false);
  assert.equal(s.canCheckOut, true);
  assert.equal(s.isWorking, true);
});

test("checked out: check-in still locked, check-out can be redone", () => {
  const s = getAttendanceState({ status: "present", checkInTime: 1, checkOutTime: 2 });
  assert.equal(s.canCheckIn, false);
  assert.equal(s.canCheckOut, true);
  assert.equal(s.hasCheckedOut, true);
});

test("holidays: Sundays, 2nd/4th Saturday, national days", () => {
  assert.equal(holidayInfo("2026-11-08").isHoliday, true);   // Sunday
  assert.equal(holidayInfo("2026-11-14").name, "2nd Saturday");
  assert.equal(holidayInfo("2026-11-28").name, "4th Saturday");
  assert.equal(holidayInfo("2026-11-07").isHoliday, false);  // 1st Saturday
  assert.equal(holidayInfo("2026-11-21").isHoliday, false);  // 3rd Saturday
  assert.equal(holidayInfo("2026-12-25").name, "Christmas");
  assert.equal(holidayInfo("2027-01-26").name, "Republic Day");
  assert.equal(holidayInfo("2026-08-15").name, "Independence Day");
  assert.equal(holidayInfo("2026-11-05").isHoliday, false);
});
