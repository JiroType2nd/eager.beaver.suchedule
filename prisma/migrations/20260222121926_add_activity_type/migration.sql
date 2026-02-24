-- AlterTable
ALTER TABLE "ActivitySchedule" ADD COLUMN "activityType" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "address" TEXT;
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "fullName" TEXT;
ALTER TABLE "User" ADD COLUMN "height" INTEGER;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "position" TEXT;

-- CreateTable
CREATE TABLE "UserUniform" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" TEXT,
    CONSTRAINT "UserUniform_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
