// components/StatCard.tsx
import React from 'react'; // Import React

// Define the props the StatCard component accepts
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType; // Accept any Lucide icon component (or other React component)
  description?: string;
}

// Export the component function
export default function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    // Styling using Tailwind to mimic shadcn/ui Card appearance
    <div className="rounded-xl border bg-card text-card-foreground shadow dark:bg-gray-800 dark:border-gray-700">
      {/* Card Header Area */}
      <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
        {/* Icon for the card */}
        <Icon className="h-5 w-5 text-muted-foreground dark:text-gray-500" />
      </div>
      {/* Card Content Area */}
      <div className="p-6 pt-0">
        {/* Main value */}
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        {/* Optional description text */}
        {description && <p className="text-xs text-muted-foreground dark:text-gray-400 pt-1">{description}</p>}
      </div>
    </div>
  );
}
