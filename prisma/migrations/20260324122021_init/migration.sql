-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "NewsItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedDate" TEXT,
    "sourceUrl" TEXT,
    "screenshotPath" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "activities" TEXT NOT NULL,
    "medicalFields" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "sectors" TEXT NOT NULL,
    "city" TEXT,
    "district" TEXT,
    "source" TEXT,
    "sentiment" TEXT,
    "userId" TEXT,
    CONSTRAINT "NewsItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
