import { describe, expect, it } from "vitest";
import { journeys } from "../data/journeys";

describe("KAGA spatial journey integrity", () => {
  it("defines the six deterministic journey families", () => {
    expect(journeys.map((journey) => journey.id)).toEqual(["workers", "mayor", "prince", "guests", "mayorMedia", "media"]);
  });

  it.each(journeys)("keeps $id traceable and internally complete", (journey) => {
    expect(journey.source.pdfPages.length).toBeGreaterThan(0);
    expect(journey.playbackPath.startsWith("M")).toBe(true);
    expect(journey.stops.length).toBeGreaterThan(1);
    expect(new Set(journey.stops.map((stop) => stop.id)).size).toBe(journey.stops.length);
    expect(journey.stops.every((stop) => stop.source.pdfPages.length > 0)).toBe(true);
    expect(journey.segments.every((segment) => segment.path.startsWith("M") && segment.source.pdfPages.length > 0)).toBe(true);
  });

  it("does not claim missing source distances", () => {
    const mayorExit = journeys.find((journey) => journey.id === "mayor")?.segments.find((segment) => segment.kind === "exit");
    const princeExit = journeys.find((journey) => journey.id === "prince")?.segments.find((segment) => segment.kind === "exit");
    expect(mayorExit?.distanceMeters).toBeUndefined();
    expect(princeExit?.distanceMeters).toBeUndefined();
  });
});
