-- CreateTable
CREATE TABLE "FormSchemaVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "schema" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeNote" TEXT,
    CONSTRAINT "FormSchemaVersion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FormSchemaVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Annotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "annotatorId" TEXT NOT NULL,
    "formSchemaVersionId" TEXT,
    "annotationData" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Annotation_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Annotation_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Annotation_annotatorId_fkey" FOREIGN KEY ("annotatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Annotation_formSchemaVersionId_fkey" FOREIGN KEY ("formSchemaVersionId") REFERENCES "FormSchemaVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Annotation" ("annotationData", "annotatorId", "createdAt", "id", "sampleId", "status", "submittedAt", "taskId", "updatedAt") SELECT "annotationData", "annotatorId", "createdAt", "id", "sampleId", "status", "submittedAt", "taskId", "updatedAt" FROM "Annotation";
DROP TABLE "Annotation";
ALTER TABLE "new_Annotation" RENAME TO "Annotation";
CREATE INDEX "Annotation_taskId_idx" ON "Annotation"("taskId");
CREATE INDEX "Annotation_sampleId_idx" ON "Annotation"("sampleId");
CREATE INDEX "Annotation_annotatorId_idx" ON "Annotation"("annotatorId");
CREATE INDEX "Annotation_formSchemaVersionId_idx" ON "Annotation"("formSchemaVersionId");
CREATE INDEX "Annotation_status_idx" ON "Annotation"("status");
CREATE UNIQUE INDEX "Annotation_sampleId_annotatorId_key" ON "Annotation"("sampleId", "annotatorId");
CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'QA_QUALITY',
    "instruction" TEXT NOT NULL,
    "formSchema" TEXT NOT NULL,
    "currentFormSchemaVersionId" TEXT,
    "reviewRubric" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_currentFormSchemaVersionId_fkey" FOREIGN KEY ("currentFormSchemaVersionId") REFERENCES "FormSchemaVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("createdAt", "description", "formSchema", "id", "instruction", "name", "ownerId", "projectId", "reviewRubric", "status", "type", "updatedAt") SELECT "createdAt", "description", "formSchema", "id", "instruction", "name", "ownerId", "projectId", "reviewRubric", "status", "type", "updatedAt" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX "Task_ownerId_idx" ON "Task"("ownerId");
CREATE INDEX "Task_status_idx" ON "Task"("status");
CREATE INDEX "Task_currentFormSchemaVersionId_idx" ON "Task"("currentFormSchemaVersionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "FormSchemaVersion_taskId_idx" ON "FormSchemaVersion"("taskId");

-- CreateIndex
CREATE INDEX "FormSchemaVersion_createdById_idx" ON "FormSchemaVersion"("createdById");

-- CreateIndex
CREATE INDEX "FormSchemaVersion_createdAt_idx" ON "FormSchemaVersion"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FormSchemaVersion_taskId_version_key" ON "FormSchemaVersion"("taskId", "version");
