import type { StoredFile } from "@/data/files"

export type DocumentPage = {
  heading: string
  subheading?: string
  meta: { label: string; value: string }[]
  sections: { title?: string; lines: string[] }[]
  footer?: string
}

export type SheetPreview = {
  name: string
  headers: string[]
  rows: string[][]
}

export type FilePreview =
  | { kind: "image"; alt: string; src: string }
  | { kind: "pdf"; pages: DocumentPage[] }
  | { kind: "csv"; headers: string[]; rows: string[][] }
  | { kind: "spreadsheet"; sheets: SheetPreview[] }

export function fileKindLabel(file: StoredFile) {
  if (file.contentType.startsWith("image/")) {
    return "Image"
  }

  if (file.contentType === "application/pdf") {
    return "PDF"
  }

  if (file.contentType === "text/csv") {
    return "CSV"
  }

  if (
    file.contentType.includes("spreadsheet") ||
    file.filename.endsWith(".xlsx")
  ) {
    return "Spreadsheet"
  }

  return file.contentType
}

export function getFilePreview(file: StoredFile): FilePreview {
  return previews[file.id] ?? fallbackPreview(file)
}

function fallbackPreview(file: StoredFile): FilePreview {
  if (file.contentType.startsWith("image/")) {
    return {
      kind: "image",
      alt: file.filename,
      src: photoSvg({
        title: file.filename,
        caption: file.id,
        sky: "#7e9bb8",
        wall: "#cbbba6",
      }),
    }
  }

  if (file.contentType === "text/csv") {
    return {
      kind: "csv",
      headers: ["column", "value"],
      rows: [["filename", file.filename]],
    }
  }

  if (
    file.contentType.includes("spreadsheet") ||
    file.filename.endsWith(".xlsx")
  ) {
    return {
      kind: "spreadsheet",
      sheets: [
        {
          name: "Sheet1",
          headers: ["column", "value"],
          rows: [["filename", file.filename]],
        },
      ],
    }
  }

  return {
    kind: "pdf",
    pages: [
      {
        heading: file.filename,
        meta: [
          { label: "File", value: file.id },
          { label: "Type", value: file.contentType },
        ],
        sections: [
          {
            lines: ["Preview is not available for this file type."],
          },
        ],
      },
    ],
  }
}

function photoSvg({
  title,
  caption,
  sky,
  wall,
}: {
  title: string
  caption: string
  sky: string
  wall: string
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
    <rect width="960" height="720" fill="${sky}"/>
    <rect x="0" y="430" width="960" height="290" fill="#8a8f86"/>
    <rect x="210" y="180" width="540" height="360" fill="${wall}"/>
    <rect x="250" y="230" width="140" height="110" fill="#8fb4c9"/>
    <rect x="430" y="230" width="140" height="110" fill="#8fb4c9"/>
    <rect x="400" y="360" width="120" height="180" fill="#4a3428"/>
    <rect x="430" y="500" width="86" height="58" fill="#c4a046" stroke="#8a6a20" stroke-width="3"/>
    <rect x="24" y="24" width="912" height="48" fill="#000" opacity="0.18"/>
    <text x="40" y="56" fill="white" font-size="20" font-family="ui-sans-serif, system-ui">${escapeXml(title)}</text>
    <rect x="24" y="636" width="520" height="60" rx="8" fill="#000" opacity="0.55"/>
    <text x="40" y="672" fill="white" font-size="16" font-family="ui-sans-serif, system-ui">${escapeXml(caption)}</text>
  </svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

const previews: Record<string, FilePreview> = {
  "file-dhl-customs-01": {
    kind: "pdf",
    pages: [
      {
        heading: "Commercial Invoice",
        subheading: "DHL Express · Asia Pacific",
        meta: [
          { label: "Declaration", value: "DEC-4401" },
          { label: "Origin", value: "SIN" },
          { label: "Destination", value: "NRT" },
          { label: "Date", value: "19 Aug 2026" },
        ],
        sections: [
          {
            title: "Shipper",
            lines: [
              "DHL APAC Hub, 1 Airport Boulevard, Singapore 819829",
              "VAT SG-2049188",
            ],
          },
          {
            title: "Goods",
            lines: [
              "Electronics components · HS 8542.31 · 12 cartons",
              "Declared value USD 18,400.00 · Incoterms DAP",
            ],
          },
          {
            title: "Certification",
            lines: [
              "I certify that the information on this invoice is true and correct.",
              "Signed: Mei Tan, Customs Broker",
            ],
          },
        ],
        footer: "Page 1 of 1 · DEC-4401-commercial-invoice.pdf",
      },
    ],
  },
  "file-dhl-customs-02": {
    kind: "pdf",
    pages: [
      {
        heading: "Packing List",
        subheading: "DHL Express · EMEA",
        meta: [
          { label: "Declaration", value: "DEC-4408" },
          { label: "Origin", value: "FRA" },
          { label: "Destination", value: "LHR" },
          { label: "Date", value: "20 Aug 2026" },
        ],
        sections: [
          {
            title: "Packages",
            lines: [
              "PKG-01  40 × 30 × 28 cm  8.4 kg  Medical supplies",
              "PKG-02  40 × 30 × 28 cm  7.9 kg  Medical supplies",
              "PKG-03  60 × 40 × 32 cm  12.1 kg  Cold-chain reagents",
            ],
          },
          {
            title: "Notes",
            lines: [
              "Keep upright. Temperature range 2–8°C.",
              "Prepared by Jonas Weber, EMEA Hub.",
            ],
          },
        ],
        footer: "Page 1 of 1 · DEC-4408-packing-list.pdf",
      },
    ],
  },
  "file-dhl-pod-01": {
    kind: "image",
    alt: "Proof of delivery photo for DLV-8821",
    src: photoSvg({
      title: "POD-DLV-8821",
      caption: "Delivered · 14 Oakridge Ave · 20 Aug 2026, 4:12 PM",
      sky: "#6ea0c4",
      wall: "#d7c4a8",
    }),
  },
  "file-dhl-pod-02": {
    kind: "pdf",
    pages: [
      {
        heading: "Proof of Delivery",
        subheading: "Shipment DLV-8824",
        meta: [
          { label: "Recipient", value: "A. Nakamura" },
          { label: "Location", value: "Tokyo, JP" },
          { label: "Signed", value: "20 Aug 2026, 09:41" },
          { label: "Courier", value: "Mei Tan" },
        ],
        sections: [
          {
            title: "Delivery notes",
            lines: [
              "Left with receptionist. ID checked.",
              "No damage observed at handover.",
            ],
          },
          {
            title: "Signature",
            lines: ["A. Nakamura"],
          },
        ],
        footer: "Page 1 of 1 · POD-DLV-8824.pdf",
      },
    ],
  },
  "file-fedex-bol-01": {
    kind: "pdf",
    pages: [
      {
        heading: "Bill of Lading",
        subheading: "FedEx Freight",
        meta: [
          { label: "BOL", value: "77410" },
          { label: "Shipper", value: "Northstar Parts Co." },
          { label: "Consignee", value: "Harbor Assembly" },
          { label: "Weight", value: "1,240 lb" },
        ],
        sections: [
          {
            title: "Commodities",
            lines: [
              "Steel fittings · Class 70 · 8 pallets",
              "NMFC 094160 · Seal 44821",
            ],
          },
          {
            title: "Scan",
            lines: [
              "Origin dock scan 19 Aug 2026 06:14",
              "Driver: Luis Ortega",
            ],
          },
        ],
        footer: "Page 1 of 2 · BOL-77410-scan.pdf",
      },
      {
        heading: "Bill of Lading",
        subheading: "Terms and conditions",
        meta: [
          { label: "BOL", value: "77410" },
          { label: "Page", value: "2 of 2" },
        ],
        sections: [
          {
            lines: [
              "Liability is limited as provided in the FedEx Freight rules tariff.",
              "Shipper certifies that the materials are properly classified, described, packaged, marked, and labeled.",
            ],
          },
        ],
        footer: "Page 2 of 2 · BOL-77410-scan.pdf",
      },
    ],
  },
  "file-fedex-bol-02": {
    kind: "pdf",
    pages: [
      {
        heading: "Bill of Lading",
        subheading: "FedEx Freight",
        meta: [
          { label: "BOL", value: "77418" },
          { label: "Shipper", value: "Cedar Millworks" },
          { label: "Consignee", value: "Westside Retail DC" },
          { label: "Weight", value: "880 lb" },
        ],
        sections: [
          {
            title: "Commodities",
            lines: ["Finished lumber · Class 55 · 4 pallets · NMFC 03410"],
          },
        ],
        footer: "Page 1 of 1 · BOL-77418-scan.pdf",
      },
    ],
  },
  "file-cafe-count-01": {
    kind: "spreadsheet",
    sheets: [
      {
        name: "Count",
        headers: ["SKU", "Item", "On hand", "Par", "Unit"],
        rows: [
          ["BEAN-ETH", "Ethiopia Yirgacheffe", "12", "20", "lb"],
          ["BEAN-COL", "Colombia Supremo", "18", "20", "lb"],
          ["MILK-OAT", "Oat milk", "9", "16", "carton"],
          ["CUP-12", "12oz cups", "240", "400", "sleeve"],
          ["SYR-VAN", "Vanilla syrup", "3", "4", "bottle"],
        ],
      },
      {
        name: "Notes",
        headers: ["Time", "Counter", "Note"],
        rows: [
          ["06:10", "Avery Cole", "Espresso hopper 40%"],
          ["06:18", "Avery Cole", "Reorder oat milk today"],
        ],
      },
    ],
  },
  "file-cafe-count-02": {
    kind: "csv",
    headers: ["sku", "item", "on_hand", "par", "reorder"],
    rows: [
      ["BEAN-ETH", "Ethiopia Yirgacheffe", "22", "24", "no"],
      ["BEAN-BRA", "Brazil Santos", "7", "18", "yes"],
      ["MILK-WHOLE", "Whole milk", "14", "20", "yes"],
      ["CUP-08", "8oz cups", "510", "400", "no"],
      ["LID-HOT", "Hot lids", "88", "120", "yes"],
    ],
  },
  "file-gym-waiver-01": {
    kind: "pdf",
    pages: [
      {
        heading: "Liability Waiver",
        subheading: "Flagship Club",
        meta: [
          { label: "Member", value: "MEM-2041" },
          { label: "Name", value: "Jordan Hale" },
          { label: "Signed", value: "18 Aug 2026" },
        ],
        sections: [
          {
            title: "Acknowledgement",
            lines: [
              "I understand that use of the facility involves inherent risk of injury.",
              "I release the gym and its staff from liability to the fullest extent permitted by law.",
            ],
          },
          {
            title: "Signature",
            lines: ["Jordan Hale"],
          },
        ],
        footer: "Page 1 of 1 · waiver-MEM-2041.pdf",
      },
    ],
  },
  "file-gym-waiver-02": {
    kind: "pdf",
    pages: [
      {
        heading: "Liability Waiver",
        subheading: "Strength Annex",
        meta: [
          { label: "Member", value: "MEM-2055" },
          { label: "Name", value: "Priya Nair" },
          { label: "Signed", value: "19 Aug 2026" },
        ],
        sections: [
          {
            title: "Acknowledgement",
            lines: [
              "I agree to follow posted safety rules and staff instructions.",
              "I confirm I am physically able to participate in strength training.",
            ],
          },
          {
            title: "Signature",
            lines: ["Priya Nair"],
          },
        ],
        footer: "Page 1 of 1 · waiver-MEM-2055.pdf",
      },
    ],
  },
  "file-dentist-consent-01": {
    kind: "pdf",
    pages: [
      {
        heading: "Informed Consent",
        subheading: "Family Practice",
        meta: [
          { label: "Patient", value: "PAT-301" },
          { label: "Procedure", value: "Composite restoration, #14" },
          { label: "Date", value: "17 Aug 2026" },
        ],
        sections: [
          {
            title: "Risks discussed",
            lines: [
              "Sensitivity, need for further treatment, and possible root canal therapy.",
              "Patient asked questions and elected to proceed.",
            ],
          },
          {
            title: "Consent",
            lines: ["Signed by patient. Witnessed by Dr. Hannah Cho."],
          },
        ],
        footer: "Page 1 of 1 · consent-PAT-301.pdf",
      },
    ],
  },
  "file-dentist-consent-02": {
    kind: "pdf",
    pages: [
      {
        heading: "Informed Consent",
        subheading: "Pediatric Practice",
        meta: [
          { label: "Patient", value: "PAT-318" },
          { label: "Procedure", value: "Sealants, #3 #14 #19 #30" },
          { label: "Date", value: "19 Aug 2026" },
        ],
        sections: [
          {
            title: "Guardian consent",
            lines: [
              "Parent/guardian present. Procedure, benefits, and alternatives reviewed.",
              "Signed: L. Park, parent.",
            ],
          },
        ],
        footer: "Page 1 of 1 · consent-PAT-318.pdf",
      },
    ],
  },
  "file-dentist-plan-01": {
    kind: "pdf",
    pages: [
      {
        heading: "Treatment Plan",
        subheading: "PLAN-91",
        meta: [
          { label: "Patient", value: "PAT-301" },
          { label: "Provider", value: "Dr. Hannah Cho" },
          { label: "Estimate", value: "$1,840" },
        ],
        sections: [
          {
            title: "Proposed treatment",
            lines: [
              "Visit 1: #14 composite restoration",
              "Visit 2: Prophylaxis and bitewing radiographs",
              "Visit 3: Night guard delivery if indicated",
            ],
          },
        ],
        footer: "Page 1 of 2 · treatment-PLAN-91.pdf",
      },
      {
        heading: "Treatment Plan",
        subheading: "Insurance notes",
        meta: [{ label: "Plan", value: "PLAN-91" }],
        sections: [
          {
            lines: [
              "Estimate assumes in-network PPO benefits.",
              "Patient responsible for non-covered services.",
            ],
          },
        ],
        footer: "Page 2 of 2 · treatment-PLAN-91.pdf",
      },
    ],
  },
  "file-dentist-plan-02": {
    kind: "pdf",
    pages: [
      {
        heading: "Orthodontic Plan",
        subheading: "PLAN-97",
        meta: [
          { label: "Patient", value: "PAT-412" },
          { label: "Provider", value: "Dr. Nina Shah" },
          { label: "Duration", value: "18 months" },
        ],
        sections: [
          {
            title: "Phases",
            lines: [
              "Aligner series 1–12, two-week wear.",
              "Mid-course correction at month 6.",
              "Retention: nighttime retainers.",
            ],
          },
        ],
        footer: "Page 1 of 1 · treatment-PLAN-97.pdf",
      },
    ],
  },
}
