import React from 'react';

export function Skeleton({ width = '100%', height = 12, style }) {
  return <div className="skeleton" style={{ width, height, ...style }} />;
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton height={14} width="60%" />
      <Skeleton height={12} width="92%" style={{ marginTop: 10 }} />
      <Skeleton height={12} width="85%" style={{ marginTop: 8 }} />
      <Skeleton height={10} width="40%" style={{ marginTop: 14 }} />
    </div>
  );
}

