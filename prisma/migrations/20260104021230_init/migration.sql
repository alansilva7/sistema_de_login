-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "Queues" (
    "id" SERIAL NOT NULL,
    "description" TEXT,
    "method" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "response" TEXT,
    "index" TEXT,
    "params" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 10,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "executed_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "scheduled_at" TIMESTAMP(3),
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "cron_expr" TEXT,

    CONSTRAINT "Queues_pkey" PRIMARY KEY ("id")
);
