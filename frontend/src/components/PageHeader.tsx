import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="page-header">
      <h2>{title}</h2>
      <div className="page-header-actions">{children}</div>
    </div>
  );
}
