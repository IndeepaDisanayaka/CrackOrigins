import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Log In | Crack Origins',
  description: 'Access your Crack Origins account to track your progress, unlock rewards, and join the chronicles.',
  alternates: {
    canonical: 'https://crackorigins.com/login',
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
