import { describe, it, expect, beforeEach, vi } from "vitest";
import { SimulationController } from "../src/utils/io/SimulationController";
import { LiveFlowMeter, HistoricalDataPoint } from "../src/types";
import * as THREE from "three";

describe("SimulationController", () => {
  let controller: SimulationController;

  beforeEach(() => {
    controller = new SimulationController();
  });

  describe("setUpdateInterval", () => {
    it("should set the update interval", () => {
      controller.setUpdateInterval(1000);
      expect(controller.getUpdateInterval()).toBe(1000);
    });
  });

  describe("calculateDiurnalFactor", () => {
    it("should return low factor for night hours (3-5 AM)", () => {
      expect(controller.calculateDiurnalFactor(4)).toBe(0.2);
    });

    it("should return morning factor for 6-9 AM", () => {
      const factor = controller.calculateDiurnalFactor(7);
      expect(factor).toBe(0.8);
    });

    it("should return peak factor for 10 AM - 12 PM", () => {
      const factor = controller.calculateDiurnalFactor(11);
      expect(factor).toBe(1.2);
    });

    it("should return afternoon factor for 1-5 PM", () => {
      const factor = controller.calculateDiurnalFactor(15);
      expect(factor).toBe(0.9);
    });

    it("should return evening factor for 6-9 PM", () => {
      const factor = controller.calculateDiurnalFactor(19);
      expect(factor).toBe(1.1);
    });

    it("should return night factor for 10 PM - 3 AM", () => {
      expect(controller.calculateDiurnalFactor(23)).toBe(0.3);
      expect(controller.calculateDiurnalFactor(1)).toBe(0.3);
    });
  });

  describe("calculateBaseFlowRate", () => {
    it("should return daytime flow rate during day hours", () => {
      vi.spyOn(Date.prototype, "getHours").mockReturnValue(12);
      const flowRate = controller.calculateBaseFlowRate();
      expect(flowRate).toBeGreaterThanOrEqual(50);
      expect(flowRate).toBeLessThanOrEqual(150);
    });

    it("should return lower flow rate during night hours", () => {
      vi.spyOn(Date.prototype, "getHours").mockReturnValue(2);
      const flowRate = controller.calculateBaseFlowRate();
      expect(flowRate).toBeGreaterThanOrEqual(5);
      expect(flowRate).toBeLessThanOrEqual(15);
    });
  });

  describe("calculateBasePressure", () => {
    it("should return pressure within expected range", () => {
      const pressure = controller.calculateBasePressure();
      expect(pressure).toBeGreaterThanOrEqual(3.5);
      expect(pressure).toBeLessThan(5.0);
    });
  });

  describe("updateMeterData", () => {
    it("should update meter flow rate and pressure", () => {
      const meter: LiveFlowMeter = {
        id: "test-1",
        position: new THREE.Vector3(0, 0, 0),
        name: "Test Meter",
        flowRate: 50,
        flowPressure: 4.0,
        timestamp: new Date(),
        isOnline: true,
        baseFlowRate: 50,
      };
      const historicalData = new Map<string, HistoricalDataPoint[]>();

      controller.updateMeterData(meter, [], 100, historicalData);

      expect(meter.flowRate).toBeDefined();
      expect(meter.flowPressure).toBeDefined();
      expect(historicalData.has("test-1")).toBe(true);
    });

    it("should limit history to maxHistoryPoints", () => {
      const meter: LiveFlowMeter = {
        id: "test-2",
        position: new THREE.Vector3(0, 0, 0),
        name: "Test Meter",
        flowRate: 50,
        flowPressure: 4.0,
        timestamp: new Date(),
        isOnline: true,
        baseFlowRate: 50,
      };
      const historicalData = new Map<string, HistoricalDataPoint[]>();

      for (let i = 0; i < 150; i++) {
        controller.updateMeterData(meter, [], 100, historicalData);
      }

      const history = historicalData.get("test-2");
      expect(history?.length).toBeLessThanOrEqual(100);
    });
  });

  describe("isRunning", () => {
    it("should return false initially", () => {
      expect(controller.isRunning()).toBe(false);
    });

    it("should return true after start", () => {
      controller.start(() => {});
      expect(controller.isRunning()).toBe(true);
    });

    it("should return false after stop", () => {
      controller.start(() => {});
      controller.stop();
      expect(controller.isRunning()).toBe(false);
    });
  });
});
