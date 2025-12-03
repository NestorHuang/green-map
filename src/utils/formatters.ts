import { SubmitterInfo } from '@/types/location'

export function getSubmitterDisplay(submitter: SubmitterInfo): string {
  if (
    submitter.isWildernessPartner &&
    submitter.groupName &&
    submitter.natureName
  ) {
    return `${submitter.groupName}-${submitter.natureName}`
  }
  return submitter.displayName
}

export function formatAddress(address: string, maxLength: number = 50): string {
  return address.length > maxLength ? `${address.substring(0, maxLength)}...` : address
}

export function formatPhoneNumber(phone: string): string {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')
}
