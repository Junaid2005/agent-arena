'use client';
import dynamic from 'next/dynamic';
const VenueTour = dynamic(() => import('../../components/tour/VenueTour'), {
  ssr: false,
  loading: () => <main className="scene-loading">Loading Hoxton Docks…</main>,
});
export default function TourPage() { return <VenueTour />; }
