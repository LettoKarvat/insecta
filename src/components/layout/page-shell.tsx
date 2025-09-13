import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PageShellProps {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
}

export function PageShell({ title, description, children, action }: PageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.12 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      
      {children}
    </motion.div>
  )
}