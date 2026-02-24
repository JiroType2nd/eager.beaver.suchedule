-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivitySchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "title" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "placeName" TEXT NOT NULL,
    "placeUrl" TEXT,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivitySchedule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivitySchedule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ActivitySchedule" ("createdAt", "createdByUserId", "endAt", "id", "notes", "placeName", "placeUrl", "startAt", "teamId", "title", "updatedAt") SELECT "createdAt", "createdByUserId", "endAt", "id", "notes", "placeName", "placeUrl", "startAt", "teamId", "title", "updatedAt" FROM "ActivitySchedule";
DROP TABLE "ActivitySchedule";
ALTER TABLE "new_ActivitySchedule" RENAME TO "ActivitySchedule";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
