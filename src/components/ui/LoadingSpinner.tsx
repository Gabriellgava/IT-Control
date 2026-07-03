export function LoadingSpinner({ size = 'default' }: { size?: 'small' | 'default' | 'large' }) {
  const sizeClasses = {
    small: 'h-4 w-4 border-2',
    default: 'h-8 w-8 border-b-2',
    large: 'h-12 w-12 border-b-3'
  }

  return (
    <div className={`animate-spin rounded-full ${sizeClasses[size]} border-blue-600`} />
  )
}
