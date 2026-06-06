import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertTransition,
  canTransition,
  getNextAvailableActions,
  SAMPLE_STATUS,
} from "./statusMachine";

describe("sample status machine", () => {
  it("allows the main production workflow transitions", () => {
    assert.equal(canTransition(SAMPLE_STATUS.PENDING, SAMPLE_STATUS.ASSIGNED), true);
    assert.equal(canTransition(SAMPLE_STATUS.ASSIGNED, SAMPLE_STATUS.IN_PROGRESS), true);
    assert.equal(canTransition(SAMPLE_STATUS.IN_PROGRESS, SAMPLE_STATUS.SUBMITTED), true);
    assert.equal(canTransition(SAMPLE_STATUS.SUBMITTED, SAMPLE_STATUS.AI_REVIEWING), true);
    assert.equal(canTransition(SAMPLE_STATUS.AI_REVIEWING, SAMPLE_STATUS.AI_REVIEWED), true);
    assert.equal(canTransition(SAMPLE_STATUS.AI_REVIEWED, SAMPLE_STATUS.HUMAN_REVIEWING), true);
    assert.equal(canTransition(SAMPLE_STATUS.HUMAN_REVIEWING, SAMPLE_STATUS.APPROVED), true);
    assert.equal(canTransition(SAMPLE_STATUS.HUMAN_REVIEWING, SAMPLE_STATUS.RETURNED), true);
    assert.equal(canTransition(SAMPLE_STATUS.HUMAN_REVIEWING, SAMPLE_STATUS.ESCALATED), true);
    assert.equal(canTransition(SAMPLE_STATUS.APPROVED, SAMPLE_STATUS.EXPORTED), true);
  });

  it("rejects invalid jumps", () => {
    assert.equal(canTransition(SAMPLE_STATUS.ASSIGNED, SAMPLE_STATUS.APPROVED), false);
    assert.throws(
      () => assertTransition(SAMPLE_STATUS.SUBMITTED, SAMPLE_STATUS.APPROVED),
      /Invalid sample status transition/,
    );
  });

  it("returns next actions for a status", () => {
    assert.deepEqual(
      getNextAvailableActions(SAMPLE_STATUS.HUMAN_REVIEWING).map((action) => action.status),
      [SAMPLE_STATUS.APPROVED, SAMPLE_STATUS.RETURNED, SAMPLE_STATUS.ESCALATED],
    );
  });
});
