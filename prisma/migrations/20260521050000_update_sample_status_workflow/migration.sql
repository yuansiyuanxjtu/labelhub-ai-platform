-- Align Sample.status with the centralized workflow state machine.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Sample" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "externalId" TEXT,
    "rawData" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedToId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sample_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sample_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Sample" (
    "id",
    "taskId",
    "externalId",
    "rawData",
    "status",
    "assignedToId",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "taskId",
    "externalId",
    "rawData",
    CASE "status"
        WHEN 'UNASSIGNED' THEN 'PENDING'
        WHEN 'ANNOTATED' THEN 'SUBMITTED'
        WHEN 'HUMAN_REVIEWED' THEN 'HUMAN_REVIEWING'
        WHEN 'REJECTED' THEN 'RETURNED'
        ELSE "status"
    END,
    "assignedToId",
    "createdAt",
    "updatedAt"
FROM "Sample";

DROP TABLE "Sample";
ALTER TABLE "new_Sample" RENAME TO "Sample";

CREATE INDEX "Sample_taskId_idx" ON "Sample"("taskId");
CREATE INDEX "Sample_assignedToId_idx" ON "Sample"("assignedToId");
CREATE INDEX "Sample_status_idx" ON "Sample"("status");
CREATE UNIQUE INDEX "Sample_taskId_externalId_key" ON "Sample"("taskId", "externalId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
