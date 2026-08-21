import { record, type StoredRecord } from "@/data/files"

const dhlManifests: StoredRecord[] = [
  ["SIN", "HKG", 4, 18.4, "DAP", "dhl-apac", 20],
  ["HKG", "NRT", 2, 9.1, "DDP", "dhl-apac", 18],
  ["PVG", "SIN", 6, 41.0, "FOB", "dhl-apac", 16],
  ["FRA", "AMS", 3, 12.8, "DAP", "dhl-emea", 15],
  ["AMS", "LHR", 1, 3.2, "EXW", "dhl-emea", 12],
  ["MAD", "FRA", 8, 55.6, "DDP", "dhl-emea", 10],
  ["JFK", "ORD", 5, 22.0, "DAP", "dhl-na", 9],
  ["LAX", "DFW", 2, 7.7, "FOB", "dhl-na", 7],
  ["GRU", "BOG", 4, 19.5, "DAP", "dhl-latam", 6],
  ["MEX", "GRU", 3, 14.2, "EXW", "dhl-latam", 5],
  ["JNB", "LOS", 7, 38.9, "DDP", "dhl-africa", 4],
  ["LOS", "NBO", 2, 8.4, "DAP", "dhl-africa", 2],
].map(
  (
    [
      originHub,
      destinationHub,
      pieces,
      weightKg,
      incoterms,
      organizationId,
      hours,
    ],
    index
  ) =>
    record({
      id: `rec-dhl-manifest-${String(index + 1).padStart(2, "0")}`,
      schemaId: "dhl-shipment-manifest",
      organizationId,
      networkId: "dhl",
      hours: hours as number,
      key: `${organizationId}:manifest:SHP-10${120 + index}`,
      data: {
        shipmentId: `SHP-10${120 + index}`,
        originHub,
        destinationHub,
        pieces,
        weightKg,
        incoterms,
        readyAt: recordReady(hours as number, 2),
      },
    })
)

function recordReady(hours: number, offsetHours: number) {
  return new Date(
    Date.now() - (hours - offsetHours) * 60 * 60 * 1000
  ).toISOString()
}

const dhlTracking: StoredRecord[] = [
  ["SHP-10120", "SIN", "picked_up", "dhl-apac", 19],
  ["SHP-10120", "HKG", "in_transit", "dhl-apac", 14],
  ["SHP-10123", "FRA", "at_hub", "dhl-emea", 11],
  ["SHP-10126", "JFK", "picked_up", "dhl-na", 8],
  ["SHP-10126", "ORD", "in_transit", "dhl-na", 6],
  ["SHP-10128", "GRU", "at_hub", "dhl-latam", 5],
  ["SHP-10130", "JNB", "out_for_delivery", "dhl-africa", 3],
  ["SHP-10121", "NRT", "delivered", "dhl-apac", 1],
].map(([shipmentId, facilityCode, milestone, organizationId, hours], index) =>
  record({
    id: `rec-dhl-track-${String(index + 1).padStart(2, "0")}`,
    schemaId: "dhl-tracking-event",
    organizationId,
    networkId: "dhl",
    hours,
    key: `${organizationId}:scan:${shipmentId}:${facilityCode}`,
    data: {
      eventId: `EVT-7${400 + index}`,
      shipmentId,
      facilityCode,
      milestone,
      scannedAt: recordReady(hours, 0.2),
    },
  })
)

const dhlCustoms: StoredRecord[] = [
  record({
    id: "rec-dhl-customs-01",
    schemaId: "dhl-customs-declaration",
    organizationId: "dhl-apac",
    networkId: "dhl",
    hours: 17,
    key: "dhl-apac:customs:DEC-4401",
    data: {
      declarationId: "DEC-4401",
      shipmentId: "SHP-10120",
      originCountry: "SG",
      destinationCountry: "HK",
      declaredValue: 4200,
      currency: "USD",
      hsCodes: ["8471.30", "8517.62"],
      documentFileId: "file-dhl-customs-01",
    },
  }),
  record({
    id: "rec-dhl-customs-02",
    schemaId: "dhl-customs-declaration",
    organizationId: "dhl-emea",
    networkId: "dhl",
    hours: 11,
    key: "dhl-emea:customs:DEC-4408",
    data: {
      declarationId: "DEC-4408",
      shipmentId: "SHP-10123",
      originCountry: "DE",
      destinationCountry: "NL",
      declaredValue: 890,
      currency: "EUR",
      hsCodes: ["6204.42"],
      documentFileId: "file-dhl-customs-02",
    },
  }),
  record({
    id: "rec-dhl-customs-03",
    schemaId: "dhl-customs-declaration",
    organizationId: "dhl-emea",
    networkId: "dhl",
    hours: 8,
    data: {
      declarationId: "DEC-4412",
      shipmentId: "SHP-10125",
      originCountry: "ES",
      destinationCountry: "DE",
      declaredValue: 15600,
      currency: "EUR",
      hsCodes: ["8708.29", "4016.93"],
    },
  }),
  record({
    id: "rec-dhl-customs-04",
    schemaId: "dhl-customs-declaration",
    organizationId: "dhl-latam",
    networkId: "dhl",
    hours: 5,
    data: {
      declarationId: "DEC-4420",
      shipmentId: "SHP-10128",
      originCountry: "BR",
      destinationCountry: "CO",
      declaredValue: 2100,
      currency: "USD",
      hsCodes: ["0901.11"],
    },
  }),
]

const dhlLastMile: StoredRecord[] = [
  record({
    id: "rec-dhl-delivery-01",
    schemaId: "dhl-last-mile-delivery",
    organizationId: "dhl-na",
    networkId: "dhl",
    hours: 4,
    key: "dhl-na:pod:DLV-8821",
    data: {
      deliveryId: "DLV-8821",
      shipmentId: "SHP-10126",
      recipientName: "Elena Vasquez",
      status: "delivered",
      signatureCaptured: true,
      completedAt: recordReady(4, 0.1),
      proofFileId: "file-dhl-pod-01",
    },
  }),
  record({
    id: "rec-dhl-delivery-02",
    schemaId: "dhl-last-mile-delivery",
    organizationId: "dhl-apac",
    networkId: "dhl",
    hours: 2,
    key: "dhl-apac:pod:DLV-8824",
    data: {
      deliveryId: "DLV-8824",
      shipmentId: "SHP-10121",
      recipientName: "Hiro Sato",
      status: "delivered",
      signatureCaptured: true,
      completedAt: recordReady(2, 0.05),
      proofFileId: "file-dhl-pod-02",
    },
  }),
  record({
    id: "rec-dhl-delivery-03",
    schemaId: "dhl-last-mile-delivery",
    organizationId: "dhl-emea",
    networkId: "dhl",
    hours: 6,
    data: {
      deliveryId: "DLV-8819",
      shipmentId: "SHP-10124",
      recipientName: "Amira Hassan",
      status: "attempted",
      signatureCaptured: false,
      completedAt: recordReady(6, 0.2),
    },
  }),
  record({
    id: "rec-dhl-delivery-04",
    schemaId: "dhl-last-mile-delivery",
    organizationId: "dhl-africa",
    networkId: "dhl",
    hours: 3,
    data: {
      deliveryId: "DLV-8830",
      shipmentId: "SHP-10130",
      recipientName: "Lerato Mokoena",
      status: "attempted",
      signatureCaptured: false,
      completedAt: recordReady(3, 0),
    },
  }),
  record({
    id: "rec-dhl-delivery-05",
    schemaId: "dhl-last-mile-delivery",
    organizationId: "dhl-latam",
    networkId: "dhl",
    hours: 1,
    data: {
      deliveryId: "DLV-8833",
      shipmentId: "SHP-10129",
      recipientName: "Mateo Silva",
      status: "refused",
      signatureCaptured: false,
      completedAt: recordReady(1, 0.1),
    },
  }),
]

const fedexWaybills: StoredRecord[] = [
  ["7741 1234 8901", "MEM", "LHR", "priority", 3, 24.5, "fedex-express", 22],
  ["7741 1234 8908", "MEM", "CDG", "standard", 1, 6.2, "fedex-express", 16],
  ["7741 1234 8915", "IND", "NRT", "priority", 5, 41.0, "fedex-express", 12],
  ["7741 1234 8922", "MEM", "FRA", "economy", 2, 11.8, "fedex-express", 8],
  ["7741 1234 8930", "LAX", "SYD", "priority", 4, 33.4, "fedex-express", 5],
  ["7741 1234 8937", "EWR", "MEX", "standard", 2, 9.9, "fedex-express", 2],
].map(
  (
    [
      waybillNumber,
      originAirport,
      destinationAirport,
      serviceLevel,
      pieces,
      chargeableWeightKg,
      organizationId,
      hours,
    ],
    index
  ) =>
    record({
      id: `rec-fedex-awb-${String(index + 1).padStart(2, "0")}`,
      schemaId: "fedex-air-waybill",
      organizationId,
      networkId: "fedex",
      hours: hours as number,
      key: `${organizationId}:awb:${waybillNumber}`,
      data: {
        waybillNumber,
        originAirport,
        destinationAirport,
        serviceLevel,
        pieces,
        chargeableWeightKg,
      },
    })
)

const fedexScans: StoredRecord[] = [
  ["7948 1001", "MEMG", "pickup", "fedex-ground", 10],
  ["7948 1001", "IND1", "sort", "fedex-ground", 8],
  ["7948 1014", "LAXG", "pickup", "fedex-ground", 6],
  ["7948 1022", "DFW3", "sort", "fedex-ground", 4],
  ["7948 1022", "AUS2", "delivery", "fedex-ground", 1],
].map(([trackingNumber, facilityId, scanType, organizationId, hours], index) =>
  record({
    id: `rec-fedex-scan-${String(index + 1).padStart(2, "0")}`,
    schemaId: "fedex-ground-scan",
    organizationId,
    networkId: "fedex",
    hours,
    data: {
      scanId: `SCN-3${200 + index}`,
      trackingNumber,
      facilityId,
      scanType,
      scannedAt: recordReady(hours, 0.1),
    },
  })
)

const fedexBols: StoredRecord[] = [
  record({
    id: "rec-fedex-bol-01",
    schemaId: "fedex-freight-bol",
    organizationId: "fedex-freight",
    networkId: "fedex",
    hours: 28,
    key: "fedex-freight:bol:77410",
    data: {
      bolNumber: "BOL-77410",
      shipperName: "Summit Industrial",
      consigneeName: "Prairie Distribution",
      freightClass: "70",
      handlingUnits: 6,
      weightLbs: 1840,
      scanFileId: "file-fedex-bol-01",
    },
  }),
  record({
    id: "rec-fedex-bol-02",
    schemaId: "fedex-freight-bol",
    organizationId: "fedex-freight",
    networkId: "fedex",
    hours: 11,
    key: "fedex-freight:bol:77418",
    data: {
      bolNumber: "BOL-77418",
      shipperName: "Northline Foods",
      consigneeName: "Harbor Grocers",
      freightClass: "55",
      handlingUnits: 12,
      weightLbs: 2460,
      scanFileId: "file-fedex-bol-02",
    },
  }),
  record({
    id: "rec-fedex-bol-03",
    schemaId: "fedex-freight-bol",
    organizationId: "fedex-freight",
    networkId: "fedex",
    hours: 4,
    data: {
      bolNumber: "BOL-77425",
      shipperName: "Cedar Parts Co",
      consigneeName: "Metro Auto",
      freightClass: "85",
      handlingUnits: 3,
      weightLbs: 620,
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

export const records: StoredRecord[] = [
  ...dhlManifests,
  ...dhlTracking,
  ...dhlCustoms,
  ...dhlLastMile,
  ...fedexWaybills,
  ...fedexScans,
  ...fedexBols,
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
]

export function getRecord(recordId: string) {
  return records.find((item) => item.id === recordId)
}

export function recordsForSchema(schemaId: string) {
  return records.filter((item) => item.schemaId === schemaId)
}
