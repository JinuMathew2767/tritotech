import type { AssetAssignmentEvent, AssetRecord } from '../data/mockAssets'

type SupportedTransactionType = 'Issue' | 'Transfer'
type SupportedTransactionEntry = AssetAssignmentEvent & { type: SupportedTransactionType }

export interface HistoryTransactionDocumentItem {
  id: string
  assetId: string
  assetName: string
  assignedTo: string
  department: string
  location: string
  assignedAt: string
  note: string
  assignedBy: string
  fromAssignedTo: string
  fromDepartment: string
  fromLocation: string
}

export interface HistoryTransactionDocument {
  id: string
  transactionNumber: string
  transactionType: SupportedTransactionType
  transactionDate: string
  assetCount: number
  issuedTo: string
  department: string
  location: string
  note: string
  createdBy: string
  items: HistoryTransactionDocumentItem[]
}

const toKeyPart = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')

const buildHistoryGroupKey = (entry: AssetAssignmentEvent) =>
  entry.transactionDocumentId?.trim()
    ? `doc|${entry.transactionDocumentId.trim()}`
    :
  [
    entry.type,
    entry.assignedAt,
    entry.assignedTo,
    entry.department,
    entry.location,
    entry.assignedBy,
    entry.note,
  ]
    .map((value) => toKeyPart(value))
    .join('|')

const createTransactionNumber = (entry: AssetAssignmentEvent, index: number) => {
  if (entry.transactionDocumentId?.trim()) {
    return `ATX-${entry.transactionDocumentId.trim().padStart(6, '0')}`
  }
  const datePart = entry.assignedAt.slice(0, 10).replace(/-/g, '')
  const typePart = entry.type === 'Issue' ? 'ISS' : 'TRF'
  return `${typePart}-${datePart}-${String(index + 1).padStart(3, '0')}`
}

const isSupportedTransactionType = (type: AssetAssignmentEvent['type']): type is SupportedTransactionType =>
  type === 'Issue' || type === 'Transfer'

export const buildHistoryTransactionDocuments = (assets: AssetRecord[]) => {
  const grouped = new Map<string, HistoryTransactionDocumentItem[]>()
  const entryLookup = new Map<string, SupportedTransactionEntry>()

  for (const asset of assets) {
    for (const entry of asset.assignmentHistory) {
      if (!isSupportedTransactionType(entry.type)) continue
      const supportedEntry = entry as SupportedTransactionEntry

      const groupKey = buildHistoryGroupKey(supportedEntry)
      const items = grouped.get(groupKey) ?? []

      items.push({
        id: supportedEntry.id,
        assetId: asset.id,
        assetName: asset.name,
        assignedTo: supportedEntry.assignedTo,
        department: supportedEntry.department,
        location: supportedEntry.location,
        assignedAt: supportedEntry.assignedAt,
        note: supportedEntry.note,
        assignedBy: supportedEntry.assignedBy,
        fromAssignedTo: supportedEntry.fromAssignedTo || '',
        fromDepartment: supportedEntry.fromDepartment || '',
        fromLocation: supportedEntry.fromLocation || '',
      })

      grouped.set(groupKey, items)
      if (!entryLookup.has(groupKey)) {
        entryLookup.set(groupKey, supportedEntry)
      }
    }
  }

  return Array.from(grouped.entries())
    .map(([groupKey, items], index) => {
      const seed = entryLookup.get(groupKey)!
      const sortedItems = [...items].sort((left, right) => left.assetId.localeCompare(right.assetId))

      return {
        id: groupKey,
        transactionNumber: createTransactionNumber(seed, index),
        transactionType: seed.type,
        transactionDate: seed.assignedAt,
        assetCount: sortedItems.length,
        issuedTo: seed.assignedTo,
        department: seed.department,
        location: seed.location,
        note: seed.note,
        createdBy: seed.assignedBy,
        items: sortedItems,
      } satisfies HistoryTransactionDocument
    })
    .sort((left, right) => {
      const dateCompare = right.transactionDate.localeCompare(left.transactionDate)
      if (dateCompare !== 0) return dateCompare
      return right.transactionNumber.localeCompare(left.transactionNumber)
    })
    .map((document, index) => ({
      ...document,
      transactionNumber: createTransactionNumber(
        {
          id: document.id,
          type: document.transactionType,
          assignedTo: document.issuedTo,
          department: document.department,
          location: document.location,
          assignedAt: document.transactionDate,
          note: document.note,
          assignedBy: document.createdBy,
        } as AssetAssignmentEvent,
        index
      ),
    }))
}

export const findHistoryTransactionDocument = (assets: AssetRecord[], transactionNumber: string) =>
  buildHistoryTransactionDocuments(assets).find((document) => document.transactionNumber === transactionNumber) ?? null
