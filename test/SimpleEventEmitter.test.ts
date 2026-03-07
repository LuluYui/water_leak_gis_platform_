import { describe, it, expect, beforeEach } from "vitest";
import { SimpleEventEmitter } from "../src/core/SimpleEventEmitter";

describe("SimpleEventEmitter", () => {
  let emitter: SimpleEventEmitter;

  beforeEach(() => {
    emitter = new SimpleEventEmitter();
  });

  it("should call callback when event is emitted", () => {
    const callback = vi.fn();
    emitter.on("testEvent", callback);
    emitter.emit("testEvent", "arg1", "arg2");
    expect(callback).toHaveBeenCalledWith("arg1", "arg2");
  });

  it("should call multiple callbacks for same event", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    emitter.on("testEvent", callback1);
    emitter.on("testEvent", callback2);
    emitter.emit("testEvent");
    expect(callback1).toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });

  it("should not call callback after being removed", () => {
    const callback = vi.fn();
    emitter.on("testEvent", callback);
    emitter.removeListener("testEvent", callback);
    emitter.emit("testEvent");
    expect(callback).not.toHaveBeenCalled();
  });

  it("should clear all listeners for event when no event specified", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    emitter.on("event1", callback1);
    emitter.on("event2", callback2);
    emitter.removeAllListeners();
    emitter.emit("event1");
    emitter.emit("event2");
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it("should clear only specified event listeners", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();
    emitter.on("event1", callback1);
    emitter.on("event2", callback2);
    emitter.removeAllListeners("event1");
    emitter.emit("event1");
    emitter.emit("event2");
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalled();
  });
});
