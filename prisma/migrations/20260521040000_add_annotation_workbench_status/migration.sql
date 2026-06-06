-- CreateIndex
CREATE UNIQUE INDEX "Annotation_sampleId_annotatorId_key" ON "Annotation"("sampleId", "annotatorId");
