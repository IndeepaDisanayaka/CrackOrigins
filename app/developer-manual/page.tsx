import React from 'react';
import { Metadata } from 'next';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { checkAdminStatus } from '@/lib/admin-actions';
import ManualContent from './ManualContent';

export const metadata: Metadata = {
  title: 'Developer Manual | Crack Origins',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DeveloperManualPage() {
  const session = await auth();

  if (!session || !session.user?.id) {
    redirect('/login?callbackUrl=/developer-manual');
  }

  const status = await checkAdminStatus(session.user.id);

  if (!status.success || !status.isAdmin) {
    // If not admin/owner, redirect to home or a restricted page
    redirect('/');
  }

  return <ManualContent />;
}
