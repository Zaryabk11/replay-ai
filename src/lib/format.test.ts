import { describe, expect, it } from "vitest";
import { formatDuration, formatMeetingDate, formatMeetingTime } from "@/lib/format";

describe("formatDuration", () => {
  it.each([
    [2538, "42:18"],
    [3767, "1:02:47"],
    [3251, "54:11"],
    [0, "0:00"],
    [9, "0:09"],
    [60, "1:00"],
    [3600, "1:00:00"],
    [36000, "10:00:00"],
  ])("formats %i seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it("drops sub-second precision rather than rounding up", () => {
    expect(formatDuration(59.9)).toBe("0:59");
  });

  // A meeting that has not been transcribed has no duration yet.
  it.each([null, undefined, NaN, Infinity, -1])("renders an em dash for %s", (value) => {
    expect(formatDuration(value)).toBe("—");
  });
});

describe("formatMeetingDate", () => {
  it("renders month and day, as the library column does", () => {
    expect(formatMeetingDate(new Date(2026, 4, 14, 16, 20))).toBe("May 14");
  });

  it("does not pad the day", () => {
    expect(formatMeetingDate(new Date(2026, 4, 9, 9, 0))).toBe("May 9");
  });
});

describe("formatMeetingTime", () => {
  it("renders a 12-hour clock with a padded minute", () => {
    expect(formatMeetingTime(new Date(2026, 4, 14, 16, 20))).toBe("4:20 PM");
    expect(formatMeetingTime(new Date(2026, 4, 14, 9, 5))).toBe("9:05 AM");
  });
});
