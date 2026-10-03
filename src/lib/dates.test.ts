import { describe, expect, it } from "vitest";
import { addDays, formatDay, weekDates } from "./dates";

describe("plan dates", () => {
  it("starts the 7 days on any day, e.g. a Sunday", () => {
    const days = weekDates("2026-10-04"); // a Sunday
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-10-04");
    expect(days[6]).toBe("2026-10-10");
    expect(formatDay(days[0], { weekday: "long" })).toBe("Sunday");
  });

  it("moves by a day or a week across month ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", -1)).toBe("2026-10-31");
    expect(addDays("2026-12-29", 7)).toBe("2027-01-05");
  });
});
