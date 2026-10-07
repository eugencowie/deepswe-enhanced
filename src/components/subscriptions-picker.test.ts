import { describe, expect, test } from "vite-plus/test";

import { formatTierDiscount, formatUsdPerMonth } from "./subscriptions-picker.tsx";

// Only the rung formatters are unit-tested: the picker's trigger and route
// card are exercised by the e2e filter tests, since the popover is a portal
// that renders nothing outside a browser.

describe("formatTierDiscount", () => {
  test("renders the discount as a negative percentage", () => {
    expect(formatTierDiscount(0.95)).toBe("−95%");
    expect(formatTierDiscount(0.9)).toBe("−90%");
  });

  test("rounds to the nearest whole percent", () => {
    expect(formatTierDiscount(1 - 20 / 211)).toBe("−91%");
    expect(formatTierDiscount(1 - 80 / 830)).toBe("−90%");
    expect(formatTierDiscount(0.975)).toBe("−98%");
  });

  // A model the tier excludes (Fable on Pro) runs at API rates.
  test("renders no discount as full price, matching the API rung", () => {
    expect(formatTierDiscount(0)).toBe("full price");
  });
});

describe("formatUsdPerMonth", () => {
  test("renders the published monthly price without rounding", () => {
    expect(formatUsdPerMonth(20)).toBe("$20/mo");
    expect(formatUsdPerMonth(200)).toBe("$200/mo");
    expect(formatUsdPerMonth(22.5)).toBe("$22.5/mo");
  });
});
