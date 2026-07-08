'use client'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './index'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const showEllipsis = totalPages > 7

    if (!showEllipsis) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 3) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push('...')
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        Mostrando <span className="font-medium text-gray-900 dark:text-white">{startItem}</span> a{' '}
        <span className="font-medium text-gray-900 dark:text-white">{endItem}</span> de{' '}
        <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> itens
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          icon={<ChevronsLeft className="w-4 h-4" />}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          icon={<ChevronLeft className="w-4 h-4" />}
        />

        {getPageNumbers().map((page, index) => (
          typeof page === 'number' ? (
            <Button
              key={index}
              variant={page === currentPage ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onPageChange(page)}
              className="min-w-[32px]"
            >
              {page}
            </Button>
          ) : (
            <span key={index} className="px-2 text-sm text-gray-400">
              {page}
            </span>
          )
        ))}

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          icon={<ChevronRight className="w-4 h-4" />}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          icon={<ChevronsRight className="w-4 h-4" />}
        />
      </div>
    </div>
  )
}
