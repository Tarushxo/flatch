import type { Match } from "@repo/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { useCelebrations } from "./celebrations";

const match = (id: string) => ({ id }) as Match;
const state = () => useCelebrations.getState();

describe("match celebrations", () => {
  beforeEach(() => {
    useCelebrations.setState({ known: null, queue: [] });
  });

  it("does not replay matches that already existed when the app opened", () => {
    state().observe([match("a"), match("b")]);
    expect(state().queue).toEqual([]);
  });

  it("celebrates a match that appears later, once", () => {
    state().observe([]);
    state().observe([match("a")]);
    state().observe([match("a")]);
    expect(state().queue.map((item) => item.id)).toEqual(["a"]);
  });

  it("queues several new matches in the order they happened", () => {
    state().observe([]);
    // The server lists the most recent first.
    state().observe([match("newer"), match("older")]);
    expect(state().queue.map((item) => item.id)).toEqual(["older", "newer"]);
  });

  it("moves to the next match when one is dismissed", () => {
    state().observe([]);
    state().observe([match("b"), match("a")]);
    state().dismiss();
    expect(state().queue.map((item) => item.id)).toEqual(["b"]);
    state().dismiss();
    expect(state().queue).toEqual([]);
  });
});
