import type { PointTransaction, PointBalances } from '../types'

export const POINTS_PER_DOLLAR = 50

export function calcBalances(transactions: PointTransaction[]): PointBalances {
  const dollarTxns  = transactions.filter(t => t.currency === 'dollar')
  const qualityTxns = transactions.filter(t => t.currency === 'quality_time')

  const dollarEarned   = dollarTxns.filter(t => t.type !== 'redeemed').reduce((s, t) => s + t.amount, 0)
  const dollarRedeemed = dollarTxns.filter(t => t.type === 'redeemed').reduce((s, t) => s + t.amount, 0)
  const qualityEarned   = qualityTxns.filter(t => t.type !== 'redeemed').reduce((s, t) => s + t.amount, 0)
  const qualityRedeemed = qualityTxns.filter(t => t.type === 'redeemed').reduce((s, t) => s + t.amount, 0)

  return {
    dollarEarned,
    dollarRedeemed,
    dollarBalance:  Math.max(0, dollarEarned  - dollarRedeemed),
    qualityEarned,
    qualityRedeemed,
    qualityBalance: Math.max(0, qualityEarned - qualityRedeemed),
  }
}

export function toDollars(pts: number): string {
  return `$${(pts / POINTS_PER_DOLLAR).toFixed(2)}`
}

export function activitiesAvailable(pts: number, activityCost = 240): string {
  const full = Math.floor(pts / activityCost)
  const pct  = Math.round((pts % activityCost) / activityCost * 100)
  if (full >= 1) return `${full} activity${full > 1 ? ' + saving' : ''}`
  return `${pct}% to next activity`
}
