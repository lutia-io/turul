import { record, type StoredRecord } from "@/data/files"
import { emitWorkspace } from "@/data/networks"
import type { JsonObject } from "@/lib/json-definition"
import { uniqueId } from "@/lib/slug"

function recordReady(hours: number, offsetHours: number) {
  return new Date(
    Date.now() - (hours - offsetHours) * 60 * 60 * 1000
  ).toISOString()
}

const logisticsPurchaseOrders: StoredRecord[] = [
  ["PO-8841", "Northwind Components", "BRK-220", 240, "confirmed", 30],
  ["PO-8848", "Cedar Parts Co", "HNG-014", 80, "open", 18],
  ["PO-8852", "Metro Auto", "FLT-9", 16, "received", 8],
].map(([poNumber, supplier, sku, quantity, status, hours], index) =>
  record({
    id: `rec-log-po-${String(index + 1).padStart(2, "0")}`,
    schemaId: "logistics-purchase-order",
    organizationId: "logistics-origin",
    networkId: "logistics",
    hours,
    data: { poNumber, supplier, sku, quantity, status },
  })
)

const logisticsShipments: StoredRecord[] = [
  record({
    id: "rec-log-ship-01",
    schemaId: "logistics-shipment",
    organizationId: "logistics-origin",
    networkId: "logistics",
    hours: 16,
    key: "logistics-origin:shipment:SHP-4412",
    data: {
      shipmentId: "SHP-4412",
      origin: "logistics-origin",
      destination: "logistics-hub",
      status: "in_transit",
      pieces: 4,
      weightKg: 18.4,
      consignee: "Harbor Retail",
      readyAt: recordReady(16, 2),
    },
  }),
  record({
    id: "rec-log-ship-02",
    schemaId: "logistics-shipment",
    organizationId: "logistics-origin",
    networkId: "logistics",
    hours: 10,
    data: {
      shipmentId: "SHP-4415",
      origin: "logistics-origin",
      destination: "logistics-last-mile",
      status: "ready",
      pieces: 2,
      weightKg: 9.1,
      consignee: "Pine Street Clinic",
      readyAt: recordReady(10, 0),
    },
  }),
  record({
    id: "rec-log-ship-03",
    schemaId: "logistics-shipment",
    organizationId: "logistics-hub",
    networkId: "logistics",
    hours: 2,
    key: "logistics-hub:shipment:SHP-4418",
    data: {
      shipmentId: "SHP-4418",
      origin: "logistics-origin",
      destination: "logistics-last-mile",
      status: "at_hub",
      pieces: 6,
      weightKg: 41.0,
      consignee: "Austin Grocery Co",
      readyAt: recordReady(14, 2),
    },
  }),
  record({
    id: "rec-log-ship-04",
    schemaId: "logistics-shipment",
    organizationId: "logistics-last-mile",
    networkId: "logistics",
    hours: 5,
    data: {
      shipmentId: "SHP-4409",
      origin: "logistics-hub",
      destination: "logistics-last-mile",
      status: "out_for_delivery",
      pieces: 1,
      weightKg: 3.2,
      consignee: "Elena Ruiz",
      readyAt: recordReady(20, 2),
    },
  }),
  record({
    id: "rec-log-ship-05",
    schemaId: "logistics-shipment",
    organizationId: "logistics-last-mile",
    networkId: "logistics",
    hours: 28,
    data: {
      shipmentId: "SHP-4398",
      origin: "logistics-origin",
      destination: "logistics-last-mile",
      status: "delivered",
      pieces: 3,
      weightKg: 12.8,
      consignee: "Westside Pharmacy",
      readyAt: recordReady(40, 2),
    },
  }),
]

const logisticsTracking: StoredRecord[] = [
  ["SHP-4412", "logistics-origin", "picked_up", 15],
  ["SHP-4412", "logistics-hub", "in_transit", 11],
  ["SHP-4418", "logistics-origin", "picked_up", 12],
  ["SHP-4418", "logistics-hub", "at_hub", 2],
  ["SHP-4409", "logistics-last-mile", "out_for_delivery", 4],
].map(([shipmentId, organizationId, milestone, hours], index) =>
  record({
    id: `rec-log-track-${String(index + 1).padStart(2, "0")}`,
    schemaId: "logistics-tracking-event",
    organizationId,
    networkId: "logistics",
    hours,
    data: {
      eventId: `EVT-7${20 + index}`,
      shipmentId,
      facilityId: organizationId,
      milestone,
      scannedAt: recordReady(hours, 0.1),
    },
  })
)

const logisticsDispatches: StoredRecord[] = [
  record({
    id: "rec-log-disp-01",
    schemaId: "logistics-dispatch-notice",
    organizationId: "logistics-hub",
    networkId: "logistics",
    hours: 2,
    key: "logistics-hub:dispatch:DSP-4418",
    data: {
      noticeId: "DSP-4418",
      shipmentId: "SHP-4418",
      carrierId: "logistics-last-mile",
      consigneeEmail: "receiving@austingrocery.example",
      status: "draft",
    },
  }),
  record({
    id: "rec-log-disp-02",
    schemaId: "logistics-dispatch-notice",
    organizationId: "logistics-hub",
    networkId: "logistics",
    hours: 6,
    data: {
      noticeId: "DSP-4409",
      shipmentId: "SHP-4409",
      carrierId: "logistics-last-mile",
      consigneeEmail: "elena.ruiz@example.com",
      status: "sent",
      sentAt: recordReady(5, 0.2),
    },
  }),
]

const cafeMenu: StoredRecord[] = [
  ["SKU-LAT", "Latte", "drink", 450, true, "cafe-downtown", 40],
  ["SKU-ESP", "Espresso", "drink", 300, true, "cafe-downtown", 40],
  ["SKU-AMR", "Americano", "drink", 350, true, "cafe-university", 36],
  ["SKU-MOC", "Mocha", "drink", 500, false, "cafe-airport", 30],
  ["SKU-CRS", "Almond croissant", "pastry", 425, true, "cafe-downtown", 28],
  ["SKU-MUF", "Blueberry muffin", "pastry", 375, true, "cafe-university", 24],
  ["SKU-BAG", "Everything bagel", "lunch", 550, true, "cafe-airport", 20],
  ["SKU-CBZ", "Chicken banh mi", "lunch", 950, true, "cafe-downtown", 18],
  ["SKU-OAT", "Overnight oats", "lunch", 650, false, "cafe-roastery", 12],
  ["SKU-CHP", "Chocolate chip cookie", "pastry", 325, true, "cafe-roastery", 8],
].map(
  (
    [sku, name, category, priceCents, available, organizationId, hours],
    index
  ) =>
    record({
      id: `rec-cafe-menu-${String(index + 1).padStart(2, "0")}`,
      schemaId: "cafe-menu-item",
      organizationId,
      networkId: "cafe",
      hours: hours as number,
      key: `${organizationId}:sku:${sku}`,
      data: { sku, name, category, priceCents, available },
    })
)

const cafeOrders: StoredRecord[] = [
  ["T-1041", "cafe-downtown", "in_shop", ["SKU-LAT", "SKU-CRS"], "ready", 6],
  ["T-1042", "cafe-downtown", "mobile", ["SKU-ESP"], "picked_up", 5],
  [
    "T-1043",
    "cafe-university",
    "kiosk",
    ["SKU-AMR", "SKU-MUF"],
    "in_progress",
    3,
  ],
  ["T-1044", "cafe-airport", "in_shop", ["SKU-BAG"], "queued", 2],
  ["T-1045", "cafe-downtown", "mobile", ["SKU-CBZ", "SKU-LAT"], "ready", 2],
  ["T-1046", "cafe-university", "in_shop", ["SKU-AMR"], "picked_up", 1],
  ["T-1047", "cafe-airport", "kiosk", ["SKU-MOC"], "queued", 1],
  [
    "T-1048",
    "cafe-downtown",
    "in_shop",
    ["SKU-CHP", "SKU-ESP"],
    "in_progress",
    0.5,
  ],
].map(([ticketId, organizationId, channel, itemSkus, status, hours], index) =>
  record({
    id: `rec-cafe-order-${String(index + 1).padStart(2, "0")}`,
    schemaId: "cafe-order-ticket",
    organizationId,
    networkId: "cafe",
    hours: hours as number,
    key: `${organizationId}:ticket:${ticketId}`,
    data: { ticketId, locationId: organizationId, channel, itemSkus, status },
  })
)

const cafeLoyalty: StoredRecord[] = [
  ["earn", 12, "cafe-downtown", 10],
  ["redeem", -40, "cafe-university", 8],
  ["earn", 8, "cafe-airport", 5],
  ["adjust", -4, "cafe-downtown", 3],
  ["earn", 15, "cafe-roastery", 1],
].map(([type, points, organizationId, hours], index) =>
  record({
    id: `rec-cafe-loyalty-${String(index + 1).padStart(2, "0")}`,
    schemaId: "cafe-loyalty-transaction",
    organizationId,
    networkId: "cafe",
    hours,
    data: {
      transactionId: `LYL-9${10 + index}`,
      memberId: `MBR-4${40 + index}`,
      type,
      points,
      locationId: organizationId,
    },
  })
)

const cafeCounts: StoredRecord[] = [
  record({
    id: "rec-cafe-count-01",
    schemaId: "cafe-inventory-count",
    organizationId: "cafe-downtown",
    networkId: "cafe",
    hours: 26,
    key: "cafe-downtown:count:CNT-19",
    data: {
      countId: "CNT-19",
      locationId: "cafe-downtown",
      sku: "SKU-LAT",
      onHand: 18,
      parLevel: 24,
      countedAt: recordReady(26, 0),
      countSheetFileId: "file-cafe-count-01",
    },
  }),
  record({
    id: "rec-cafe-count-02",
    schemaId: "cafe-inventory-count",
    organizationId: "cafe-roastery",
    networkId: "cafe",
    hours: 8,
    key: "cafe-roastery:count:CNT-20",
    data: {
      countId: "CNT-20",
      locationId: "cafe-roastery",
      sku: "SKU-CHP",
      onHand: 42,
      parLevel: 40,
      countedAt: recordReady(8, 0),
      countSheetFileId: "file-cafe-count-02",
    },
  }),
  record({
    id: "rec-cafe-count-03",
    schemaId: "cafe-inventory-count",
    organizationId: "cafe-university",
    networkId: "cafe",
    hours: 7,
    data: {
      countId: "CNT-21",
      locationId: "cafe-university",
      sku: "SKU-AMR",
      onHand: 9,
      parLevel: 16,
      countedAt: recordReady(7, 0),
    },
  }),
]

const gymMemberships: StoredRecord[] = [
  record({
    id: "rec-gym-mem-01",
    schemaId: "gym-membership",
    organizationId: "gym-flagship",
    networkId: "gym",
    hours: 40,
    key: "gym-flagship:member:MEM-2041",
    data: {
      memberId: "MEM-2041",
      planTier: "unlimited",
      status: "active",
      homeClubId: "gym-flagship",
      startsOn: "2026-01-12",
      endsOn: "2027-01-12",
      waiverFileId: "file-gym-waiver-01",
    },
  }),
  record({
    id: "rec-gym-mem-02",
    schemaId: "gym-membership",
    organizationId: "gym-strength",
    networkId: "gym",
    hours: 14,
    key: "gym-strength:member:MEM-2055",
    data: {
      memberId: "MEM-2055",
      planTier: "plus",
      status: "active",
      homeClubId: "gym-strength",
      startsOn: "2026-04-02",
      endsOn: "2026-10-02",
      waiverFileId: "file-gym-waiver-02",
    },
  }),
  record({
    id: "rec-gym-mem-03",
    schemaId: "gym-membership",
    organizationId: "gym-aqua",
    networkId: "gym",
    hours: 20,
    data: {
      memberId: "MEM-2060",
      planTier: "basic",
      status: "frozen",
      homeClubId: "gym-aqua",
      startsOn: "2025-11-01",
      endsOn: "2026-11-01",
    },
  }),
  record({
    id: "rec-gym-mem-04",
    schemaId: "gym-membership",
    organizationId: "gym-flagship",
    networkId: "gym",
    hours: 9,
    data: {
      memberId: "MEM-2066",
      planTier: "plus",
      status: "lapsed",
      homeClubId: "gym-flagship",
      startsOn: "2025-08-20",
      endsOn: "2026-08-20",
    },
  }),
  record({
    id: "rec-gym-mem-05",
    schemaId: "gym-membership",
    organizationId: "gym-pt",
    networkId: "gym",
    hours: 3,
    data: {
      memberId: "MEM-2071",
      planTier: "unlimited",
      status: "active",
      homeClubId: "gym-flagship",
      startsOn: "2026-08-01",
      endsOn: "2027-08-01",
    },
  }),
]

const gymBookings: StoredRecord[] = [
  ["MEM-2041", "CLS-SPIN-9", false, "gym-flagship", 6],
  ["MEM-2055", "CLS-LIFT-7", true, "gym-strength", 5],
  ["MEM-2041", "CLS-YOGA-2", false, "gym-aqua", 4],
  ["MEM-2071", "CLS-PT-12", false, "gym-pt", 2],
  ["MEM-2060", "CLS-SWIM-4", false, "gym-aqua", 1],
].map(([memberId, classId, waitlisted, organizationId, hours], index) =>
  record({
    id: `rec-gym-book-${String(index + 1).padStart(2, "0")}`,
    schemaId: "gym-class-booking",
    organizationId,
    networkId: "gym",
    hours,
    data: {
      bookingId: `BKG-5${10 + index}`,
      memberId,
      classId,
      waitlisted,
      startsAt: recordReady(hours, -2),
    },
  })
)

const gymCheckins: StoredRecord[] = [
  ["MEM-2041", "gym-flagship", "door", 5],
  ["MEM-2055", "gym-strength", "kiosk", 4],
  ["MEM-2071", "gym-flagship", "staff", 2],
  ["MEM-2041", "gym-aqua", "door", 1],
].map(([memberId, organizationId, source, hours], index) =>
  record({
    id: `rec-gym-checkin-${String(index + 1).padStart(2, "0")}`,
    schemaId: "gym-check-in",
    organizationId,
    networkId: "gym",
    hours,
    data: {
      checkInId: `CHK-8${20 + index}`,
      memberId,
      locationId: organizationId,
      source,
      checkedInAt: recordReady(hours, 0.05),
    },
  })
)

const dentistPatients: StoredRecord[] = [
  record({
    id: "rec-den-pat-01",
    schemaId: "dentist-patient-record",
    organizationId: "dentist-family",
    networkId: "dentist",
    hours: 58,
    key: "dentist-family:patient:PAT-301",
    data: {
      patientId: "PAT-301",
      givenName: "Grace",
      familyName: "Owens",
      dateOfBirth: "1988-03-14",
      insuranceMemberId: "BCBS-44019",
      consentOnFile: true,
      consentFileId: "file-dentist-consent-01",
    },
  }),
  record({
    id: "rec-den-pat-02",
    schemaId: "dentist-patient-record",
    organizationId: "dentist-pediatric",
    networkId: "dentist",
    hours: 22,
    key: "dentist-pediatric:patient:PAT-318",
    data: {
      patientId: "PAT-318",
      givenName: "Leo",
      familyName: "Nguyen",
      dateOfBirth: "2017-11-02",
      insuranceMemberId: "AETNA-91822",
      consentOnFile: true,
      consentFileId: "file-dentist-consent-02",
    },
  }),
  record({
    id: "rec-den-pat-03",
    schemaId: "dentist-patient-record",
    organizationId: "dentist-ortho",
    networkId: "dentist",
    hours: 12,
    data: {
      patientId: "PAT-327",
      givenName: "Maya",
      familyName: "Ibrahim",
      dateOfBirth: "2009-06-21",
      insuranceMemberId: "CIGNA-33108",
      consentOnFile: false,
    },
  }),
  record({
    id: "rec-den-pat-04",
    schemaId: "dentist-patient-record",
    organizationId: "dentist-family",
    networkId: "dentist",
    hours: 6,
    data: {
      patientId: "PAT-330",
      givenName: "Owen",
      familyName: "Clark",
      dateOfBirth: "1974-01-09",
      insuranceMemberId: "BCBS-55201",
      consentOnFile: true,
    },
  }),
]

const dentistAppointments: StoredRecord[] = [
  ["PAT-301", "PRV-CHO", "A2", "confirmed", "dentist-family", 8],
  ["PAT-318", "PRV-PARK", "B1", "sent", "dentist-pediatric", 6],
  ["PAT-327", "PRV-SHAH", "C3", "pending", "dentist-ortho", 4],
  ["PAT-330", "PRV-CHO", "A1", "confirmed", "dentist-family", 2],
  ["PAT-301", "PRV-CHO", "A3", "declined", "dentist-family", 1],
].map(
  (
    [patientId, providerId, operatory, reminderStatus, organizationId, hours],
    index
  ) =>
    record({
      id: `rec-den-appt-${String(index + 1).padStart(2, "0")}`,
      schemaId: "dentist-appointment",
      organizationId,
      networkId: "dentist",
      hours,
      data: {
        appointmentId: `APT-2${20 + index}`,
        patientId,
        providerId,
        operatory,
        startsAt: recordReady(hours, -24),
        reminderStatus,
      },
    })
)

const dentistPlans: StoredRecord[] = [
  record({
    id: "rec-den-plan-01",
    schemaId: "dentist-treatment-plan",
    organizationId: "dentist-family",
    networkId: "dentist",
    hours: 16,
    key: "dentist-family:plan:PLAN-91",
    data: {
      planId: "PLAN-91",
      patientId: "PAT-301",
      procedureCodes: ["D2391", "D2740"],
      estimatedCostCents: 184000,
      status: "accepted",
      planFileId: "file-dentist-plan-01",
    },
  }),
  record({
    id: "rec-den-plan-02",
    schemaId: "dentist-treatment-plan",
    organizationId: "dentist-ortho",
    networkId: "dentist",
    hours: 6,
    key: "dentist-ortho:plan:PLAN-97",
    data: {
      planId: "PLAN-97",
      patientId: "PAT-327",
      procedureCodes: ["D8080", "D8680"],
      estimatedCostCents: 520000,
      status: "in_progress",
      planFileId: "file-dentist-plan-02",
    },
  }),
  record({
    id: "rec-den-plan-03",
    schemaId: "dentist-treatment-plan",
    organizationId: "dentist-pediatric",
    networkId: "dentist",
    hours: 3,
    data: {
      planId: "PLAN-99",
      patientId: "PAT-318",
      procedureCodes: ["D1351"],
      estimatedCostCents: 18000,
      status: "proposed",
    },
  }),
]

const dentistClaims: StoredRecord[] = [
  ["CLM-610", "PAT-301", "BCBS", 124000, "submitted", "dentist-family", 10],
  ["CLM-618", "PAT-327", "CIGNA", 210000, "pending", "dentist-ortho", 7],
  ["CLM-622", "PAT-318", "AETNA", 18000, "paid", "dentist-pediatric", 4],
  ["CLM-629", "PAT-330", "BCBS", 64000, "denied", "dentist-family", 2],
].map(
  (
    [claimId, patientId, payerId, amountCents, status, organizationId, hours],
    index
  ) =>
    record({
      id: `rec-den-claim-${String(index + 1).padStart(2, "0")}`,
      schemaId: "dentist-insurance-claim",
      organizationId,
      networkId: "dentist",
      hours,
      data: { claimId, patientId, payerId, amountCents, status },
    })
)

const personalExpenses: StoredRecord[] = [
  record({
    id: "rec-pers-exp-01",
    schemaId: "personal-expense",
    organizationId: "personal-home",
    networkId: "personal",
    hours: 18,
    key: "personal-home:expense:EXP-410",
    data: {
      expenseId: "EXP-410",
      merchant: "PCC Market",
      amountCents: 8420,
      category: "groceries",
      status: "paid",
      dueOn: "2026-08-22",
      receiptFileId: "file-personal-receipt-01",
    },
  }),
  record({
    id: "rec-pers-exp-02",
    schemaId: "personal-expense",
    organizationId: "personal-home",
    networkId: "personal",
    hours: 10,
    key: "personal-home:expense:EXP-418",
    data: {
      expenseId: "EXP-418",
      merchant: "Seattle City Light",
      amountCents: 12650,
      category: "utilities",
      status: "due",
      dueOn: "2026-08-29",
    },
  }),
  record({
    id: "rec-pers-exp-03",
    schemaId: "personal-expense",
    organizationId: "personal-home",
    networkId: "personal",
    hours: 6,
    data: {
      expenseId: "EXP-421",
      merchant: "Capitol Hill Rentals",
      amountCents: 245000,
      category: "rent",
      status: "due",
      dueOn: "2026-09-01",
    },
  }),
  record({
    id: "rec-pers-exp-04",
    schemaId: "personal-expense",
    organizationId: "personal-work",
    networkId: "personal",
    hours: 4,
    data: {
      expenseId: "EXP-424",
      merchant: "Alaska Airlines",
      amountCents: 31800,
      category: "travel",
      status: "paid",
      dueOn: "2026-08-20",
      receiptFileId: "file-personal-receipt-02",
    },
  }),
  record({
    id: "rec-pers-exp-05",
    schemaId: "personal-expense",
    organizationId: "personal-family",
    networkId: "personal",
    hours: 2,
    data: {
      expenseId: "EXP-428",
      merchant: "Taco Time",
      amountCents: 2850,
      category: "dining",
      status: "reimbursed",
      dueOn: "2026-08-24",
    },
  }),
]

const personalTasks: StoredRecord[] = [
  ["Renew car tabs", "home", "open", "personal-home", 8],
  ["Send August invoice", "work", "doing", "personal-work", 5],
  ["Book dentist for Maya", "family", "open", "personal-family", 3],
  ["Replace furnace filter", "home", "done", "personal-home", 2],
  ["Prep client deck", "work", "open", "personal-work", 1],
].map(([title, area, status, organizationId, hours], index) =>
  record({
    id: `rec-pers-task-${String(index + 1).padStart(2, "0")}`,
    schemaId: "personal-task",
    organizationId,
    networkId: "personal",
    hours,
    data: {
      taskId: `TSK-3${10 + index}`,
      title,
      area,
      status,
      dueAt: recordReady(hours, -12),
    },
  })
)

const personalContacts: StoredRecord[] = [
  [
    "Jordan Hale",
    "family",
    "206-555-0142",
    "jordan@example.com",
    "personal-family",
    40,
  ],
  [
    "Maya Hale",
    "family",
    "206-555-0188",
    "maya@example.com",
    "personal-family",
    40,
  ],
  [
    "Northwind HVAC",
    "vendor",
    "206-555-2201",
    "service@northwind.example",
    "personal-home",
    20,
  ],
  [
    "Priya Shah",
    "work",
    "415-555-0190",
    "priya@studio.example",
    "personal-work",
    12,
  ],
].map(
  ([displayName, relationship, phone, email, organizationId, hours], index) =>
    record({
      id: `rec-pers-contact-${String(index + 1).padStart(2, "0")}`,
      schemaId: "personal-contact",
      organizationId,
      networkId: "personal",
      hours,
      data: {
        contactId: `CON-7${20 + index}`,
        displayName,
        relationship,
        phone,
        email,
      },
    })
)

const personalSubscriptions: StoredRecord[] = [
  ["iCloud+", 299, "monthly", "2026-09-04", "personal-home", 14],
  ["NYT", 1799, "monthly", "2026-09-12", "personal-home", 9],
  ["Figma", 14400, "yearly", "2026-11-01", "personal-work", 6],
].map(
  (
    [vendor, amountCents, cadence, nextChargeOn, organizationId, hours],
    index
  ) =>
    record({
      id: `rec-pers-sub-${String(index + 1).padStart(2, "0")}`,
      schemaId: "personal-subscription",
      organizationId,
      networkId: "personal",
      hours,
      data: {
        subscriptionId: `SUB-5${50 + index}`,
        vendor,
        amountCents,
        cadence,
        nextChargeOn,
      },
    })
)

const portfolioInvestors: StoredRecord[] = [
  record({
    id: "rec-pe-inv-01",
    schemaId: "portfolio-investor",
    organizationId: "portfolio-ir",
    networkId: "portfolio",
    hours: 80,
    key: "portfolio-ir:investor:INV-110",
    data: {
      investorId: "INV-110",
      legalName: "Northshore Family Office",
      email: "notices@northshore.example",
      type: "family_office",
    },
  }),
  record({
    id: "rec-pe-inv-02",
    schemaId: "portfolio-investor",
    organizationId: "portfolio-ir",
    networkId: "portfolio",
    hours: 80,
    key: "portfolio-ir:investor:INV-118",
    data: {
      investorId: "INV-118",
      legalName: "Helena Cho",
      email: "helena.cho@example.com",
      type: "individual",
    },
  }),
  record({
    id: "rec-pe-inv-03",
    schemaId: "portfolio-investor",
    organizationId: "portfolio-ir",
    networkId: "portfolio",
    hours: 72,
    data: {
      investorId: "INV-124",
      legalName: "Midwest Teachers Pension",
      email: "alts@mtp.example",
      type: "institution",
    },
  }),
  record({
    id: "rec-pe-inv-04",
    schemaId: "portfolio-investor",
    organizationId: "portfolio-ir",
    networkId: "portfolio",
    hours: 60,
    data: {
      investorId: "INV-131",
      legalName: "Riverbend Endowment",
      email: "invest@riverbend.example",
      type: "institution",
    },
  }),
]

const portfolioFunds: StoredRecord[] = [
  record({
    id: "rec-pe-fund-01",
    schemaId: "portfolio-fund",
    organizationId: "portfolio-fund-iii",
    networkId: "portfolio",
    hours: 90,
    key: "portfolio:fund:FUND-III",
    data: {
      fundId: "portfolio-fund-iii",
      name: "Alder Fund III",
      vintageYear: 2019,
      status: "harvesting",
    },
  }),
  record({
    id: "rec-pe-fund-02",
    schemaId: "portfolio-fund",
    organizationId: "portfolio-opportunity",
    networkId: "portfolio",
    hours: 90,
    key: "portfolio:fund:FUND-OPP",
    data: {
      fundId: "portfolio-opportunity",
      name: "Alder Opportunity Fund",
      vintageYear: 2023,
      status: "investing",
    },
  }),
]

const portfolioCommitments: StoredRecord[] = [
  ["CMT-201", "INV-110", "portfolio-fund-iii", 500000000, "funded", 70],
  ["CMT-202", "INV-118", "portfolio-fund-iii", 150000000, "funded", 70],
  ["CMT-203", "INV-124", "portfolio-fund-iii", 2500000000, "funded", 70],
  ["CMT-210", "INV-110", "portfolio-opportunity", 250000000, "committed", 40],
  ["CMT-211", "INV-131", "portfolio-opportunity", 800000000, "funded", 36],
].map(
  ([commitmentId, investorId, fundId, commitmentCents, status, hours], index) =>
    record({
      id: `rec-pe-cmt-${String(index + 1).padStart(2, "0")}`,
      schemaId: "portfolio-commitment",
      organizationId: "portfolio-ir",
      networkId: "portfolio",
      hours,
      data: { commitmentId, investorId, fundId, commitmentCents, status },
    })
)

const portfolioProperties: StoredRecord[] = [
  record({
    id: "rec-pe-prop-01",
    schemaId: "portfolio-property",
    organizationId: "portfolio-fund-iii",
    networkId: "portfolio",
    hours: 48,
    key: "portfolio-fund-iii:property:PROP-412",
    data: {
      propertyId: "PROP-412",
      name: "412 W Lake",
      city: "Chicago",
      fundId: "portfolio-fund-iii",
      status: "held",
      salePriceCents: 0,
    },
  }),
  record({
    id: "rec-pe-prop-02",
    schemaId: "portfolio-property",
    organizationId: "portfolio-opportunity",
    networkId: "portfolio",
    hours: 20,
    data: {
      propertyId: "PROP-088",
      name: "88 Harbor Blvd",
      city: "Tampa",
      fundId: "portfolio-opportunity",
      status: "under_contract",
      salePriceCents: 1840000000,
    },
  }),
  record({
    id: "rec-pe-prop-03",
    schemaId: "portfolio-property",
    organizationId: "portfolio-fund-iii",
    networkId: "portfolio",
    hours: 3,
    key: "portfolio-fund-iii:property:PROP-2100",
    data: {
      propertyId: "PROP-2100",
      name: "2100 Peachtree",
      city: "Atlanta",
      fundId: "portfolio-fund-iii",
      status: "sold",
      salePriceCents: 3125000000,
      soldOn: "2026-08-24",
      closingFileId: "file-pe-closing-01",
    },
  }),
  record({
    id: "rec-pe-prop-04",
    schemaId: "portfolio-property",
    organizationId: "portfolio-fund-iii",
    networkId: "portfolio",
    hours: 14,
    data: {
      propertyId: "PROP-014",
      name: "14 Pine Ridge",
      city: "Denver",
      fundId: "portfolio-fund-iii",
      status: "held",
      salePriceCents: 0,
    },
  }),
  record({
    id: "rec-pe-prop-05",
    schemaId: "portfolio-property",
    organizationId: "portfolio-opportunity",
    networkId: "portfolio",
    hours: 8,
    data: {
      propertyId: "PROP-901",
      name: "901 Market",
      city: "San Francisco",
      fundId: "portfolio-opportunity",
      status: "held",
      salePriceCents: 0,
    },
  }),
]

const portfolioNotices: StoredRecord[] = [
  record({
    id: "rec-pe-notice-01",
    schemaId: "portfolio-distribution-notice",
    organizationId: "portfolio-ir",
    networkId: "portfolio",
    hours: 2,
    key: "portfolio-ir:notice:N-2100-110",
    data: {
      noticeId: "N-2100-110",
      propertyId: "PROP-2100",
      fundId: "portfolio-fund-iii",
      investorId: "INV-110",
      amountCents: 49600000,
      status: "sent",
      sentAt: recordReady(2, 0.2),
      noticeFileId: "file-pe-notice-01",
    },
  }),
  record({
    id: "rec-pe-notice-02",
    schemaId: "portfolio-distribution-notice",
    organizationId: "portfolio-ir",
    networkId: "portfolio",
    hours: 2,
    data: {
      noticeId: "N-2100-118",
      propertyId: "PROP-2100",
      fundId: "portfolio-fund-iii",
      investorId: "INV-118",
      amountCents: 14880000,
      status: "sent",
      sentAt: recordReady(2, 0.2),
      noticeFileId: "file-pe-notice-02",
    },
  }),
  record({
    id: "rec-pe-notice-03",
    schemaId: "portfolio-distribution-notice",
    organizationId: "portfolio-ir",
    networkId: "portfolio",
    hours: 2,
    data: {
      noticeId: "N-2100-124",
      propertyId: "PROP-2100",
      fundId: "portfolio-fund-iii",
      investorId: "INV-124",
      amountCents: 248000000,
      status: "draft",
    },
  }),
]

export let records: StoredRecord[] = [
  ...logisticsPurchaseOrders,
  ...logisticsShipments,
  ...logisticsTracking,
  ...logisticsDispatches,
  ...cafeMenu,
  ...cafeOrders,
  ...cafeLoyalty,
  ...cafeCounts,
  ...gymMemberships,
  ...gymBookings,
  ...gymCheckins,
  ...dentistPatients,
  ...dentistAppointments,
  ...dentistPlans,
  ...dentistClaims,
  ...personalExpenses,
  ...personalTasks,
  ...personalContacts,
  ...personalSubscriptions,
  ...portfolioInvestors,
  ...portfolioFunds,
  ...portfolioCommitments,
  ...portfolioProperties,
  ...portfolioNotices,
]

export function getRecord(recordId: string) {
  return records.find((item) => item.id === recordId)
}

export function recordsForSchema(schemaId: string) {
  return records.filter((item) => item.schemaId === schemaId)
}

export function createRecord(input: {
  schemaId: string
  organizationId: string
  networkId: string
  data: JsonObject
  key?: string
}): StoredRecord {
  const created = record({
    id: uniqueId(`rec-${input.schemaId}`, (id) =>
      records.some((item) => item.id === id)
    ),
    schemaId: input.schemaId,
    organizationId: input.organizationId,
    networkId: input.networkId,
    data: input.data,
    hours: 0,
    key: input.key,
  })

  records = [created, ...records]
  emitWorkspace()
  return created
}
