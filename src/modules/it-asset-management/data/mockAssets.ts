export type AssetCategory = string
export type AssetStatus = 'In Stock' | 'Assigned' | 'In Use' | 'Maintenance' | 'Retired'
export type AssetTransactionType = 'Issue' | 'Return' | 'Transfer' | 'Update'

export interface AssetAssignmentEvent {
  id: string
  transactionDocumentId?: string
  type: AssetTransactionType
  assignedTo: string
  department: string
  location: string
  assignedAt: string
  returnedAt?: string | null
  note: string
  assignedBy: string
  fromAssignedTo?: string
  fromDepartment?: string
  fromLocation?: string
}

export interface AssetRecord {
  id: string
  name: string
  category: AssetCategory
  subcategory: string
  serialNumber: string
  imeiNumber: string
  brandModel: string
  vendor: string
  purchaseDate: string
  purchaseCost: number
  expiryDate: string
  warrantyExpiry: string
  assignedTo: string
  department: string
  location: string
  status: AssetStatus
  notes: string
  assignmentHistory: AssetAssignmentEvent[]
}

export const mockAssets: AssetRecord[] = [
  {
    id: 'AST-001',
    name: 'Dell Latitude Laptop',
    category: 'Hardware',
    subcategory: 'Laptop',
    serialNumber: 'DL7440-2025-001',
    imeiNumber: '',
    brandModel: 'Dell Latitude 7440',
    vendor: 'Dell',
    purchaseDate: '2025-01-10',
    purchaseCost: 1450,
    expiryDate: '2027-01-10',
    warrantyExpiry: '2028-01-10',
    assignedTo: 'John Doe',
    department: 'IT',
    location: 'Head Office',
    status: 'In Use',
    notes: 'Primary device for the infrastructure lead. Future barcode tagging can be attached to this record.',
    assignmentHistory: [
      {
        id: 'AH-001',
        type: 'Issue',
        assignedTo: 'John Doe',
        department: 'IT',
        location: 'Head Office',
        assignedAt: '2025-01-15',
        note: 'Issued as a permanent workstation asset.',
        assignedBy: 'Priya Nair',
      },
    ],
  },
  {
    id: 'AST-002',
    name: 'Microsoft 365 E5',
    category: 'Software',
    subcategory: 'Productivity Suite',
    serialNumber: '',
    imeiNumber: '',
    brandModel: 'E5 Annual Subscription',
    vendor: 'Microsoft',
    purchaseDate: '2025-04-01',
    purchaseCost: 680,
    expiryDate: '2026-03-25',
    warrantyExpiry: '2026-03-25',
    assignedTo: 'Finance Shared Pool',
    department: 'Finance',
    location: 'Cloud Tenant',
    status: 'Assigned',
    notes: 'Renewal reminder candidate. Useful baseline record for future email reminders.',
    assignmentHistory: [
      {
        id: 'AH-002',
        type: 'Issue',
        assignedTo: 'Finance Shared Pool',
        department: 'Finance',
        location: 'Cloud Tenant',
        assignedAt: '2025-04-01',
        note: 'Provisioned to cover the finance operations team.',
        assignedBy: 'Amina Paul',
      },
    ],
  },
  {
    id: 'AST-003',
    name: 'Cisco Firewall Support Contract',
    category: 'Contract',
    subcategory: 'Support Renewal',
    serialNumber: 'CISCO-SFC-3110',
    imeiNumber: '',
    brandModel: 'Secure Firewall 3110',
    vendor: 'Cisco',
    purchaseDate: '2024-02-20',
    purchaseCost: 9200,
    expiryDate: '2026-02-20',
    warrantyExpiry: '2026-02-20',
    assignedTo: 'Network Operations',
    department: 'IT',
    location: 'Data Center',
    status: 'Maintenance',
    notes: 'Already expired and awaiting procurement action.',
    assignmentHistory: [
      {
        id: 'AH-003',
        type: 'Issue',
        assignedTo: 'Network Operations',
        department: 'IT',
        location: 'Data Center',
        assignedAt: '2024-02-20',
        note: 'Contract attached to core perimeter infrastructure.',
        assignedBy: 'Priya Nair',
      },
    ],
  },
  {
    id: 'AST-004',
    name: 'AWS Production Account',
    category: 'Cloud',
    subcategory: 'Compute Platform',
    serialNumber: '',
    imeiNumber: '',
    brandModel: 'AWS Enterprise Support',
    vendor: 'Amazon Web Services',
    purchaseDate: '2025-06-12',
    purchaseCost: 2400,
    expiryDate: '2026-11-30',
    warrantyExpiry: '2026-11-30',
    assignedTo: 'Platform Team',
    department: 'Engineering',
    location: 'Cloud',
    status: 'In Use',
    notes: 'Production subscription for cloud infrastructure management.',
    assignmentHistory: [
      {
        id: 'AH-004',
        type: 'Issue',
        assignedTo: 'Platform Team',
        department: 'Engineering',
        location: 'Cloud',
        assignedAt: '2025-06-12',
        note: 'Allocated to the DevOps and cloud engineering team.',
        assignedBy: 'Amina Paul',
      },
    ],
  },
  {
    id: 'AST-005',
    name: 'HP LaserJet Pro',
    category: 'Hardware',
    subcategory: 'Printer',
    serialNumber: 'HP-M404DN-7781',
    imeiNumber: '',
    brandModel: 'HP LaserJet Pro M404dn',
    vendor: 'HP',
    purchaseDate: '2023-09-05',
    purchaseCost: 420,
    expiryDate: '2026-04-10',
    warrantyExpiry: '2026-04-10',
    assignedTo: 'Admin Front Desk',
    department: 'Administration',
    location: 'Branch Office',
    status: 'Assigned',
    notes: 'Lease review due next month. Good candidate for document uploads when warranties are digitized.',
    assignmentHistory: [
      {
        id: 'AH-005',
        type: 'Issue',
        assignedTo: 'Admin Front Desk',
        department: 'Administration',
        location: 'Branch Office',
        assignedAt: '2023-09-07',
        note: 'Assigned to branch reception and visitor management.',
        assignedBy: 'Omar Khan',
      },
    ],
  },
  {
    id: 'AST-006',
    name: 'Juniper Core Switch',
    category: 'Network',
    subcategory: 'Switch',
    serialNumber: 'JNP-EX4650-0106',
    imeiNumber: '',
    brandModel: 'Juniper EX4650',
    vendor: 'Juniper',
    purchaseDate: '2025-08-02',
    purchaseCost: 7600,
    expiryDate: '2028-08-02',
    warrantyExpiry: '2028-08-02',
    assignedTo: '',
    department: 'IT',
    location: 'Warehouse',
    status: 'In Stock',
    notes: 'Stored as expansion inventory for the next network refresh wave.',
    assignmentHistory: [],
  },
]
