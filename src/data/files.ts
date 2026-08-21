import type { JsonObject } from "@/lib/json-definition"
import { organizationList, emitWorkspace } from "@/data/networks"
import { uniqueId } from "@/lib/slug"

const t0 = Date.now()

export function hoursAgo(hours: number) {
  return new Date(t0 - hours * 60 * 60 * 1000).toISOString()
}

export type OrganizationUser = {
  id: string
  name: string
  email: string
  organizationId: string
}

const operatorNames: Record<string, { name: string; email: string }> = {
  "dhl-apac": { name: "Mei Tan", email: "mei.tan@dhl.com" },
  "dhl-emea": { name: "Jonas Weber", email: "jonas.weber@dhl.com" },
  "dhl-na": { name: "Priya Shah", email: "priya.shah@dhl.com" },
  "dhl-latam": { name: "Camila Rojas", email: "camila.rojas@dhl.com" },
  "dhl-africa": { name: "Thabo Nkosi", email: "thabo.nkosi@dhl.com" },
  "fedex-express": { name: "Chris Nguyen", email: "chris.nguyen@fedex.com" },
  "fedex-ground": { name: "Dana Brooks", email: "dana.brooks@fedex.com" },
  "fedex-freight": { name: "Luis Ortega", email: "luis.ortega@fedex.com" },
  "cafe-downtown": { name: "Avery Cole", email: "avery@cafe.example" },
  "cafe-university": { name: "Sam Patel", email: "sam@cafe.example" },
  "cafe-airport": { name: "Riley Chen", email: "riley@cafe.example" },
  "cafe-roastery": { name: "Jordan Blake", email: "jordan@cafe.example" },
  "gym-flagship": { name: "Alex Rivera", email: "alex@gym.example" },
  "gym-strength": { name: "Morgan Lee", email: "morgan@gym.example" },
  "gym-aqua": { name: "Casey Quinn", email: "casey@gym.example" },
  "gym-pt": { name: "Taylor Brooks", email: "taylor@gym.example" },
  "dentist-family": { name: "Dr. Hannah Cho", email: "hannah@dental.example" },
  "dentist-pediatric": { name: "Dr. Eli Park", email: "eli@dental.example" },
  "dentist-ortho": { name: "Dr. Nina Shah", email: "nina@dental.example" },
}

export const organizationUsers: OrganizationUser[] = organizationList.map(
  ({ organization }) => {
    const operator = operatorNames[organization.id]

    return {
      id: `${organization.id}-user`,
      name: operator?.name ?? `${organization.name} operator`,
      email: operator?.email ?? `ops@${organization.id}.example`,
      organizationId: organization.id,
    }
  }
)

export function getOrganizationUser(organizationId: string) {
  return organizationUsers.find(
    (user) => user.organizationId === organizationId
  )
}

export type StoredFile = {
  id: string
  filename: string
  contentType: string
  sizeBytes: number
  organizationId: string
  organizationUserId: string
  networkId: string
  idempotencyKey?: string
  createdAt: string
  updatedAt: string
}

function file(
  partial: Omit<StoredFile, "organizationUserId" | "updatedAt"> & {
    updatedAt?: string
  }
): StoredFile {
  return {
    ...partial,
    organizationUserId: `${partial.organizationId}-user`,
    updatedAt: partial.updatedAt ?? partial.createdAt,
  }
}

export let files: StoredFile[] = [
  file({
    id: "file-dhl-customs-01",
    filename: "DEC-4401-commercial-invoice.pdf",
    contentType: "application/pdf",
    sizeBytes: 312_448,
    organizationId: "dhl-apac",
    networkId: "dhl",
    idempotencyKey: "dhl-apac:customs:DEC-4401",
    createdAt: hoursAgo(18),
  }),
  file({
    id: "file-dhl-customs-02",
    filename: "DEC-4408-packing-list.pdf",
    contentType: "application/pdf",
    sizeBytes: 188_210,
    organizationId: "dhl-emea",
    networkId: "dhl",
    idempotencyKey: "dhl-emea:customs:DEC-4408",
    createdAt: hoursAgo(9),
  }),
  file({
    id: "file-dhl-pod-01",
    filename: "POD-DLV-8821.jpg",
    contentType: "image/jpeg",
    sizeBytes: 1_204_332,
    organizationId: "dhl-na",
    networkId: "dhl",
    idempotencyKey: "dhl-na:pod:DLV-8821",
    createdAt: hoursAgo(4),
  }),
  file({
    id: "file-dhl-pod-02",
    filename: "POD-DLV-8824.pdf",
    contentType: "application/pdf",
    sizeBytes: 96_441,
    organizationId: "dhl-apac",
    networkId: "dhl",
    idempotencyKey: "dhl-apac:pod:DLV-8824",
    createdAt: hoursAgo(2),
  }),
  file({
    id: "file-fedex-bol-01",
    filename: "BOL-77410-scan.pdf",
    contentType: "application/pdf",
    sizeBytes: 540_112,
    organizationId: "fedex-freight",
    networkId: "fedex",
    idempotencyKey: "fedex-freight:bol:77410",
    createdAt: hoursAgo(30),
  }),
  file({
    id: "file-fedex-bol-02",
    filename: "BOL-77418-scan.pdf",
    contentType: "application/pdf",
    sizeBytes: 488_900,
    organizationId: "fedex-freight",
    networkId: "fedex",
    idempotencyKey: "fedex-freight:bol:77418",
    createdAt: hoursAgo(11),
  }),
  file({
    id: "file-cafe-count-01",
    filename: "downtown-count-2026-08-19.xlsx",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    sizeBytes: 42_880,
    organizationId: "cafe-downtown",
    networkId: "cafe",
    idempotencyKey: "cafe-downtown:count:2026-08-19",
    createdAt: hoursAgo(26),
  }),
  file({
    id: "file-cafe-count-02",
    filename: "roastery-count-2026-08-20.csv",
    contentType: "text/csv",
    sizeBytes: 8_412,
    organizationId: "cafe-roastery",
    networkId: "cafe",
    idempotencyKey: "cafe-roastery:count:2026-08-20",
    createdAt: hoursAgo(8),
  }),
  file({
    id: "file-gym-waiver-01",
    filename: "waiver-MEM-2041.pdf",
    contentType: "application/pdf",
    sizeBytes: 210_004,
    organizationId: "gym-flagship",
    networkId: "gym",
    idempotencyKey: "gym-flagship:waiver:MEM-2041",
    createdAt: hoursAgo(40),
  }),
  file({
    id: "file-gym-waiver-02",
    filename: "waiver-MEM-2055.pdf",
    contentType: "application/pdf",
    sizeBytes: 198_332,
    organizationId: "gym-strength",
    networkId: "gym",
    idempotencyKey: "gym-strength:waiver:MEM-2055",
    createdAt: hoursAgo(14),
  }),
  file({
    id: "file-dentist-consent-01",
    filename: "consent-PAT-301.pdf",
    contentType: "application/pdf",
    sizeBytes: 156_770,
    organizationId: "dentist-family",
    networkId: "dentist",
    idempotencyKey: "dentist-family:consent:PAT-301",
    createdAt: hoursAgo(60),
  }),
  file({
    id: "file-dentist-consent-02",
    filename: "consent-PAT-318.pdf",
    contentType: "application/pdf",
    sizeBytes: 149_220,
    organizationId: "dentist-pediatric",
    networkId: "dentist",
    idempotencyKey: "dentist-pediatric:consent:PAT-318",
    createdAt: hoursAgo(22),
  }),
  file({
    id: "file-dentist-plan-01",
    filename: "treatment-PLAN-91.pdf",
    contentType: "application/pdf",
    sizeBytes: 1_088_441,
    organizationId: "dentist-family",
    networkId: "dentist",
    idempotencyKey: "dentist-family:plan:PLAN-91",
    createdAt: hoursAgo(16),
  }),
  file({
    id: "file-dentist-plan-02",
    filename: "treatment-PLAN-97.pdf",
    contentType: "application/pdf",
    sizeBytes: 902_110,
    organizationId: "dentist-ortho",
    networkId: "dentist",
    idempotencyKey: "dentist-ortho:plan:PLAN-97",
    createdAt: hoursAgo(6),
  }),
]

export function getFile(fileId: string) {
  return files.find((item) => item.id === fileId)
}

export function createFile(input: {
  filename: string
  contentType: string
  sizeBytes: number
  organizationId: string
  networkId: string
}): StoredFile {
  const created = file({
    id: uniqueId(`file-${input.filename}`, (id) =>
      files.some((item) => item.id === id)
    ),
    filename: input.filename.trim(),
    contentType: input.contentType.trim() || "application/octet-stream",
    sizeBytes: Math.max(0, Math.round(input.sizeBytes)),
    organizationId: input.organizationId,
    networkId: input.networkId,
    createdAt: hoursAgo(0),
  })

  files = [created, ...files]
  emitWorkspace()
  return created
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
