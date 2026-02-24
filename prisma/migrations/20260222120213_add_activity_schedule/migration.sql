-- CreateTable
CREATE TABLE "ActivitySchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "ActivityAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityScheduleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "lateAt" DATETIME,
    "leaveAt" DATETIME,
    "comment" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityAttendance_activityScheduleId_fkey" FOREIGN KEY ("activityScheduleId") REFERENCES "ActivitySchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ActivityAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityAttendance_activityScheduleId_userId_key" ON "ActivityAttendance"("activityScheduleId", "userId");
