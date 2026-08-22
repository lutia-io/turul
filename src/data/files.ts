import type { JsonObject } from "@/lib/json-definition"

const t0 = Date.now()

export function hoursAgo(hours: number) {
  return new Date(t0 - hours * 60 * 60 * 1000).toISOString()
}

export type StoredFile = {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
  organizationId: string
  organizationUserId: string
  networkId: string
  createdAt: string
  updatedAt: string
}

export type StoredRecord = {
  id: string
  data: JsonObject
  schemaId: string
  organizationId: string
  organizationUserId: string
  networkId: string
  idempotencyKey?: string
  createdAt: string
  updatedAt: string
}

export function record({
  id,
  schemaId,
  organizationId,
  networkId,
  data,
  hours,
  key,
}: {
  id: string
  schemaId: string
  organizationId: string
  networkId: string
  data: JsonObject
  hours: number
  key?: string
}): StoredRecord {
  const createdAt = hoursAgo(hours)

  return {
    id,
    schemaId,
    organizationId,
    organizationUserId: `${organizationId}-user`,
    networkId,
    data,
    idempotencyKey: key,
    createdAt,
    updatedAt: createdAt,
  }
}
