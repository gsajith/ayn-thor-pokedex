import { describe, expect, it } from "vitest";
import { MAX_SELECTED_TYPES, toggleType } from "./typeSelection";

describe("toggleType", () => {
  it("adds a type to an empty selection", () => {
    expect(toggleType([], "fire")).toEqual(["fire"]);
  });

  it("adds a second type", () => {
    expect(toggleType(["fire"], "flying")).toEqual(["fire", "flying"]);
  });

  it("ignores a third tap rather than evicting an earlier pick", () => {
    expect(toggleType(["fire", "flying"], "water")).toEqual(["fire", "flying"]);
  });

  it("removes a type that is already selected", () => {
    expect(toggleType(["fire", "flying"], "fire")).toEqual(["flying"]);
  });

  it("can deselect down to empty", () => {
    expect(toggleType(["fire"], "fire")).toEqual([]);
  });

  it("still allows deselection when at the cap", () => {
    expect(toggleType(["fire", "flying"], "flying")).toEqual(["fire"]);
  });

  it("never mutates the input", () => {
    const current: readonly string[] = ["fire", "flying"];
    const before = [...current];
    toggleType(current as never, "water");
    expect(current).toEqual(before);
  });

  it("caps at two", () => {
    expect(MAX_SELECTED_TYPES).toBe(2);
    let selection = toggleType([], "fire");
    selection = toggleType(selection, "flying");
    selection = toggleType(selection, "water");
    selection = toggleType(selection, "ice");
    expect(selection).toHaveLength(2);
  });
});
